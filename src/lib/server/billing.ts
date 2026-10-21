import type Stripe from 'stripe';
import { getStripe, resolvePriceId } from '$lib/server/stripe.js';
import { CANCELLATION_POLICY, CHECKOUT_EXPIRES_MINUTES, DELIVERY_TIMING } from '$lib/plans.js';
import { createPendingPayment, fulfillPayment, transitionPaymentStatus, type PaymentKind } from '$lib/server/repositories/payment.js';

interface CheckoutInput {
	origin: string;
	user: { id: string; email: string };
	roomId: string;
	kind: PaymentKind;
	lookupKey: string;
	amount: number;
	extensionHours: number | null;
	cancelPath: string;
}

/** Create a Stripe Checkout session for one roomchat purchase and record it as pending. */
export async function createCheckout(input: CheckoutInput): Promise<string> {
	const priceId = await resolvePriceId(input.lookupKey, input.amount);
	const metadata = {
		app: 'roomchat',
		kind: input.kind,
		room_id: input.roomId,
		user_id: input.user.id,
		lookup_key: input.lookupKey
	};

	const session = await getStripe().checkout.sessions.create({
		mode: 'payment',
		line_items: [{ price: priceId, quantity: 1 }],
		customer_email: input.user.email,
		client_reference_id: input.user.id,
		locale: 'ja',
		metadata,
		payment_intent_data: { metadata },
		success_url: `${input.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${input.origin}${input.cancelPath}`,
		// Checkout is the final confirmation screen, so it repeats the delivery and cancellation terms.
		custom_text: {
			submit: { message: `${DELIVERY_TIMING}${CANCELLATION_POLICY[input.kind]}` }
		},
		// Short-lived so an extension is rarely paid for after its room has expired.
		expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_MINUTES * 60
	});

	await createPendingPayment({
		stripeCheckoutSessionId: session.id,
		userId: input.user.id,
		roomId: input.roomId,
		kind: input.kind,
		lookupKey: input.lookupKey,
		amount: input.amount,
		currency: 'jpy',
		extensionHours: input.extensionHours
	});

	if (!session.url) {
		throw new Error('Stripe did not return a checkout URL');
	}
	return session.url;
}

/**
 * Apply a completed checkout session. Safe to call from both the webhook and the
 * success redirect: only the first call changes anything. If an extension was
 * paid for a room that has already been deleted, the payment is refunded.
 */
export async function handleCompletedSession(session: Stripe.Checkout.Session): Promise<Awaited<ReturnType<typeof fulfillPayment>>> {
	if (session.metadata?.app !== 'roomchat' || session.payment_status !== 'paid') {
		return { applied: false };
	}
	const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
	const result = await fulfillPayment(session.id, paymentIntentId);

	if (result.applied && result.kind === 'room_extension' && result.newExpiresAt === null && paymentIntentId) {
		await getStripe().refunds.create(
			{ payment_intent: paymentIntentId, metadata: { app: 'roomchat', reason: 'room_expired' } },
			{ idempotencyKey: `roomchat-refund-${session.id}` }
		);
		await transitionPaymentStatus(session.id, 'paid', 'refunded');
	}
	return result;
}

export async function handleExpiredSession(session: Stripe.Checkout.Session): Promise<void> {
	if (session.metadata?.app !== 'roomchat') return;
	await transitionPaymentStatus(session.id, 'pending', 'expired');
}
