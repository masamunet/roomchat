import { redirect, fail } from '@sveltejs/kit';
import { listArchivedRoomsByCreator, getArchivedRoomById } from '$lib/server/repositories/room.js';
import { listPaidArchiveCsvRoomIds, hasPaidArchiveCsv } from '$lib/server/repositories/payment.js';
import { isBillingEnabled } from '$lib/server/stripe.js';
import { createCheckout } from '$lib/server/billing.js';
import { ARCHIVE_CSV_PLAN } from '$lib/plans.js';
import { isValidUUID } from '$lib/server/validation.js';
import { cleanupExpiredRooms } from '$lib/server/room-cleanup.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	// So a room that just ended shows up here even if the room list wasn't opened since.
	await cleanupExpiredRooms();

	const [archived, paidRoomIds] = await Promise.all([
		listArchivedRoomsByCreator(locals.user.id),
		listPaidArchiveCsvRoomIds(locals.user.id)
	]);
	return {
		archivedRooms: archived.map((r) => ({ ...r, csvPurchased: paidRoomIds.has(r.id) })),
		billingEnabled: isBillingEnabled(),
		purchased: url.searchParams.get('purchased') === 'archive_csv'
	};
};

export const actions: Actions = {
	buyArchiveCsv: async ({ request, locals, url }) => {
		if (!locals.user) {
			redirect(302, '/');
		}
		if (!isBillingEnabled()) {
			return fail(503, { error: '決済は現在利用できません' });
		}

		const formData = await request.formData();
		const roomId = formData.get('roomId')?.toString();
		if (!roomId || !isValidUUID(roomId)) {
			return fail(400, { error: '無効なルームIDです' });
		}

		const room = await getArchivedRoomById(roomId);
		if (!room || room.creatorId !== locals.user.id) {
			return fail(403, { error: '権限がありません' });
		}
		if (await hasPaidArchiveCsv(locals.user.id, room.id)) {
			return fail(400, { error: 'このルームの過去ログは購入済みです' });
		}

		let checkoutUrl: string;
		try {
			checkoutUrl = await createCheckout({
				origin: url.origin,
				user: locals.user,
				roomId: room.id,
				kind: 'archive_csv',
				lookupKey: ARCHIVE_CSV_PLAN.lookupKey,
				amount: ARCHIVE_CSV_PLAN.amount,
				extensionHours: null,
				cancelPath: '/admin/archived'
			});
		} catch (e) {
			console.error('Checkout creation failed:', e);
			return fail(502, { error: '決済ページを開けませんでした。時間をおいて再度お試しください' });
		}
		redirect(303, checkoutUrl);
	}
};
