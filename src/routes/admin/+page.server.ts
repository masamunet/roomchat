import { redirect, fail } from '@sveltejs/kit';
import { listRoomsByCreator, createRoom, deleteRoom, deleteExpiredRooms, countActiveRoomsByCreator, getRoomById, listArchivedRoomsByCreator, getArchivedRoomById } from '$lib/server/repositories/room.js';
import { listPaidArchiveCsvRoomIds, hasPaidArchiveCsv } from '$lib/server/repositories/payment.js';
import { isBillingEnabled } from '$lib/server/stripe.js';
import { createCheckout } from '$lib/server/billing.js';
import { ARCHIVE_CSV_PLAN } from '$lib/plans.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { PageServerLoad, Actions } from './$types';

let lastCleanup = 0;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	// Auto-delete expired rooms (throttled: at most once per minute)
	const now = Date.now();
	if (now - lastCleanup > 60_000) {
		lastCleanup = now;
		const deletedIds = await deleteExpiredRooms();
		for (const id of deletedIds) {
			sseManager.closeRoom(id);
		}
	}

	const [rooms, archived, paidRoomIds] = await Promise.all([
		listRoomsByCreator(locals.user.id),
		listArchivedRoomsByCreator(locals.user.id),
		listPaidArchiveCsvRoomIds(locals.user.id)
	]);
	return {
		rooms,
		archivedRooms: archived.map((r) => ({ ...r, csvPurchased: paidRoomIds.has(r.id) })),
		billingEnabled: isBillingEnabled(),
		purchased: url.searchParams.get('purchased') === 'archive_csv'
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name || name.length === 0) {
			return fail(400, { error: 'ルーム名を入力してください', action: 'create' as const });
		}

		if (name.length > 100) {
			return fail(400, { error: 'ルーム名は100文字以内で入力してください', action: 'create' as const });
		}

		const activeCount = await countActiveRoomsByCreator(locals.user.id);
		if (activeCount >= 3) {
			return fail(400, { error: '作成できるルームは最大3つまでです（6時間で自動削除されます）', action: 'create' as const });
		}

		const room = await createRoom(name, locals.user.id);
		redirect(302, `/admin/${room.id}`);
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/');
		}

		const formData = await request.formData();
		const roomId = formData.get('roomId')?.toString();

		if (!roomId || !isValidUUID(roomId)) {
			return fail(400, { error: '無効なルームIDです', action: 'delete' as const });
		}

		const room = await getRoomById(roomId);
		if (!room || room.creatorId !== locals.user.id) {
			return fail(403, { error: '権限がありません', action: 'delete' as const });
		}

		try {
			await deleteRoom(roomId);
		} catch {
			return fail(500, { error: '削除に失敗しました。再度お試しください', action: 'delete' as const });
		}
		sseManager.closeRoom(roomId);
		return { success: true };
	},

	buyArchiveCsv: async ({ request, locals, url }) => {
		if (!locals.user) {
			redirect(302, '/');
		}
		if (!isBillingEnabled()) {
			return fail(503, { error: '決済は現在利用できません', action: 'buyArchiveCsv' as const });
		}

		const formData = await request.formData();
		const roomId = formData.get('roomId')?.toString();
		if (!roomId || !isValidUUID(roomId)) {
			return fail(400, { error: '無効なルームIDです', action: 'buyArchiveCsv' as const });
		}

		const room = await getArchivedRoomById(roomId);
		if (!room || room.creatorId !== locals.user.id) {
			return fail(403, { error: '権限がありません', action: 'buyArchiveCsv' as const });
		}
		if (await hasPaidArchiveCsv(locals.user.id, room.id)) {
			return fail(400, { error: 'このルームの過去ログは購入済みです', action: 'buyArchiveCsv' as const });
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
				cancelPath: '/admin#archived'
			});
		} catch (e) {
			console.error('Checkout creation failed:', e);
			return fail(502, { error: '決済ページを開けませんでした。時間をおいて再度お試しください', action: 'buyArchiveCsv' as const });
		}
		redirect(303, checkoutUrl);
	}
};
