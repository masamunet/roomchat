import { redirect, error } from '@sveltejs/kit';
import { getStripe, isBillingEnabled } from '$lib/server/stripe.js';
import { handleCompletedSession } from '$lib/server/billing.js';
import type { RequestHandler } from './$types';

// Applies the purchase as soon as the buyer returns, so it doesn't depend on
// the webhook arriving first. The webhook makes the same call; only one applies.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}
	if (!isBillingEnabled()) {
		error(503, '決済は現在利用できません');
	}

	const sessionId = url.searchParams.get('session_id');
	if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
		error(400, '無効なリクエストです');
	}

	const session = await getStripe().checkout.sessions.retrieve(sessionId);
	if (session.metadata?.app !== 'roomchat' || session.metadata.user_id !== locals.user.id) {
		error(404, '購入情報が見つかりません');
	}

	await handleCompletedSession(session);

	const roomId = session.metadata.room_id;
	if (session.metadata.kind === 'room_extension') {
		redirect(303, `/admin/${roomId}?purchased=extension`);
	}
	redirect(303, `/admin/archived?purchased=archive_csv`);
};
