import { getDb } from '$lib/server/db/index.js';

export interface MessageActivity {
	participantId: string;
	createdAt: Date;
	length: number;
}

/** Timestamps, authors and lengths of every message in a live room (no content). */
export async function getMessageActivityByRoom(roomId: string): Promise<MessageActivity[]> {
	const db = await getDb();
	const result = await db.query<{ participant_id: string; created_at: string | Date; length: number | string }>(
		`SELECT participant_id, created_at, char_length(content) AS length
		 FROM messages
		 WHERE room_id = $1
		 ORDER BY created_at ASC`,
		[roomId]
	);
	return result.rows.map((r) => ({
		participantId: r.participant_id,
		createdAt: new Date(r.created_at),
		length: Number(r.length)
	}));
}

export interface PaidExtensions {
	count: number;
	hours: number;
	amount: number;
}

export async function getPaidExtensionsByRoom(roomId: string): Promise<PaidExtensions> {
	const db = await getDb();
	const result = await db.query<{ count: number | string; hours: number | string | null; amount: number | string | null }>(
		`SELECT count(*) AS count, sum(extension_hours) AS hours, sum(amount) AS amount
		 FROM payments
		 WHERE room_id = $1 AND kind = 'room_extension' AND status = 'paid'`,
		[roomId]
	);
	const row = result.rows[0];
	return { count: Number(row?.count ?? 0), hours: Number(row?.hours ?? 0), amount: Number(row?.amount ?? 0) };
}
