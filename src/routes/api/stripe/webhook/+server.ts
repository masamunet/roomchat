import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getStripe } from '$lib/server/stripe.js';
import { handleCompletedSession, handleExpiredSession } from '$lib/server/billing.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
		error(503, 'Billing is not configured');
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		error(400, 'Missing signature');
	}

	const payload = await request.text();
	let event;
	try {
		event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
	} catch {
		error(400, 'Invalid signature');
	}

	switch (event.type) {
		case 'checkout.session.completed':
		case 'checkout.session.async_payment_succeeded':
			await handleCompletedSession(event.data.object);
			break;
		case 'checkout.session.expired':
		case 'checkout.session.async_payment_failed':
			await handleExpiredSession(event.data.object);
			break;
	}

	return json({ received: true });
};
