import { getDb } from '$lib/server/db/index.js';

export type PaymentKind = 'room_extension' | 'archive_csv';

export interface NewPayment {
	stripeCheckoutSessionId: string;
	userId: string;
	roomId: string;
	kind: PaymentKind;
	lookupKey: string;
	amount: number;
	currency: string;
	extensionHours: number | null;
}

export async function createPendingPayment(p: NewPayment): Promise<void> {
	const db = await getDb();
	await db.query(
		`INSERT INTO payments
		   (stripe_checkout_session_id, user_id, room_id, kind, lookup_key, amount, currency, extension_hours)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (stripe_checkout_session_id) DO NOTHING`,
		[p.stripeCheckoutSessionId, p.userId, p.roomId, p.kind, p.lookupKey, p.amount, p.currency, p.extensionHours]
	);
}

export interface FulfillResult {
	/** False when the payment was already fulfilled (or is unknown), so the call was a no-op. */
	applied: boolean;
	kind?: PaymentKind;
	roomId?: string;
	/** For room extensions: the new expiry, or null if the room no longer exists. */
	newExpiresAt?: Date | null;
}

/**
 * Mark a pending payment as paid and apply what was bought, in one statement so
 * a webhook and the success redirect racing each other can only apply it once.
 * An extension adds its hours on top of the later of now and the current expiry.
 */
export async function fulfillPayment(stripeCheckoutSessionId: string, paymentIntentId: string | null): Promise<FulfillResult> {
	const db = await getDb();
	const result = await db.query<{
		kind: PaymentKind;
		room_id: string;
		new_expires_at: string | Date | null;
	}>(
		`WITH p AS (
		   UPDATE payments
		   SET status = 'paid', paid_at = NOW(), stripe_payment_intent_id = $2
		   WHERE stripe_checkout_session_id = $1 AND status = 'pending'
		   RETURNING kind, room_id, extension_hours
		 ),
		 r AS (
		   UPDATE rooms
		   SET expires_at = GREATEST(rooms.expires_at, NOW()) + make_interval(hours => p.extension_hours)
		   FROM p
		   WHERE rooms.id = p.room_id AND p.kind = 'room_extension'
		   RETURNING rooms.expires_at
		 )
		 SELECT p.kind, p.room_id, (SELECT expires_at FROM r) AS new_expires_at FROM p`,
		[stripeCheckoutSessionId, paymentIntentId]
	);
	const row = result.rows[0];
	if (!row) return { applied: false };
	return {
		applied: true,
		kind: row.kind,
		roomId: row.room_id,
		newExpiresAt: row.new_expires_at ? new Date(row.new_expires_at) : null
	};
}

/** Move a payment from one status to another; does nothing if it is no longer in `from`. */
export async function transitionPaymentStatus(
	stripeCheckoutSessionId: string,
	from: 'pending' | 'paid',
	to: 'refunded' | 'expired'
): Promise<void> {
	const db = await getDb();
	await db.query(
		`UPDATE payments SET status = $3 WHERE stripe_checkout_session_id = $1 AND status = $2`,
		[stripeCheckoutSessionId, from, to]
	);
}

export async function hasPaidArchiveCsv(userId: string, roomId: string): Promise<boolean> {
	const db = await getDb();
	const result = await db.query<{ id: string }>(
		`SELECT id FROM payments
		 WHERE user_id = $1 AND room_id = $2 AND kind = 'archive_csv' AND status = 'paid'
		 LIMIT 1`,
		[userId, roomId]
	);
	return result.rows.length > 0;
}

export async function listPaidArchiveCsvRoomIds(userId: string): Promise<Set<string>> {
	const db = await getDb();
	const result = await db.query<{ room_id: string }>(
		`SELECT DISTINCT room_id FROM payments
		 WHERE user_id = $1 AND kind = 'archive_csv' AND status = 'paid'`,
		[userId]
	);
	return new Set(result.rows.map((r) => r.room_id));
}
