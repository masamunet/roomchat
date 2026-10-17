import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let client: Stripe | null = null;

export function isBillingEnabled(): boolean {
	return Boolean(env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
	if (!env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is not set');
	}
	if (!client) {
		client = new Stripe(env.STRIPE_SECRET_KEY);
	}
	return client;
}

const priceCache = new Map<string, string>();

/**
 * Resolve a roomchat price by lookup_key and check it still matches the amount
 * the app advertises, so a changed price in the dashboard can't silently charge
 * a different amount than the UI shows.
 */
export async function resolvePriceId(lookupKey: string, expectedAmount: number): Promise<string> {
	const cached = priceCache.get(lookupKey);
	if (cached) return cached;

	const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
	const price = prices.data[0];
	if (!price) {
		throw new Error(`Stripe price not found for lookup_key ${lookupKey}`);
	}
	if (price.currency !== 'jpy' || price.unit_amount !== expectedAmount || price.metadata.app !== 'roomchat') {
		throw new Error(`Stripe price ${price.id} does not match roomchat plan ${lookupKey}`);
	}
	priceCache.set(lookupKey, price.id);
	return price.id;
}
