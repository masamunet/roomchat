import { redirect, error, fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantsByRoom } from '$lib/server/repositories/participant.js';
import { getLocalIpAddress } from '$lib/server/network.js';
import { isValidUUID } from '$lib/server/validation.js';
import { isBillingEnabled } from '$lib/server/stripe.js';
import { createCheckout } from '$lib/server/billing.js';
import { ROOM_EXTENSION_PLANS } from '$lib/plans.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	if (!isValidUUID(params.roomId)) {
		error(400, '無効なルームIDです');
	}

	const room = await getRoomById(params.roomId);
	if (!room) {
		error(404, 'ルームが見つかりません');
	}

	// Verify ownership
	if (room.creatorId !== locals.user.id) {
		error(403, 'このルームの管理権限がありません');
	}

	const participants = await getParticipantsByRoom(room.id);

	let origin = url.origin;
	if (dev) {
		const localIp = getLocalIpAddress();
		if (localIp) {
			origin = `${url.protocol}//${localIp}:${url.port}`;
		}
	}
	const joinUrl = `${origin}/join/${room.inviteCode}`;

	return {
		room,
		participants,
		joinUrl,
		billingEnabled: isBillingEnabled(),
		purchased: url.searchParams.get('purchased') === 'extension'
	};
};

export const actions: Actions = {
	extend: async ({ request, params, locals, url }) => {
		if (!locals.user) {
			redirect(302, '/');
		}
		if (!isBillingEnabled()) {
			return fail(503, { error: '決済は現在利用できません' });
		}
		if (!isValidUUID(params.roomId)) {
			return fail(400, { error: '無効なルームIDです' });
		}

		const room = await getRoomById(params.roomId);
		if (!room || room.creatorId !== locals.user.id) {
			return fail(403, { error: '権限がありません' });
		}
		if (room.expiresAt.getTime() <= Date.now()) {
			return fail(400, { error: 'このルームは期限切れのため延長できません' });
		}

		const formData = await request.formData();
		const plan = ROOM_EXTENSION_PLANS.find((p) => p.id === formData.get('plan'));
		if (!plan) {
			return fail(400, { error: 'プランを選択してください' });
		}

		let checkoutUrl: string;
		try {
			checkoutUrl = await createCheckout({
				origin: url.origin,
				user: locals.user,
				roomId: room.id,
				kind: 'room_extension',
				lookupKey: plan.lookupKey,
				amount: plan.amount,
				extensionHours: plan.hours,
				cancelPath: `/admin/${room.id}`
			});
		} catch (e) {
			console.error('Checkout creation failed:', e);
			return fail(502, { error: '決済ページを開けませんでした。時間をおいて再度お試しください' });
		}
		redirect(303, checkoutUrl);
	}
};
