import { redirect, fail } from '@sveltejs/kit';
import { listRoomsByCreator, createRoom, deleteRoom, countActiveRoomsByCreator, getRoomById, countArchivedRoomsByCreator } from '$lib/server/repositories/room.js';
import { cleanupExpiredRooms } from '$lib/server/room-cleanup.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	await cleanupExpiredRooms();

	const [rooms, archivedRoomCount] = await Promise.all([
		listRoomsByCreator(locals.user.id),
		countArchivedRoomsByCreator(locals.user.id)
	]);
	return { rooms, archivedRoomCount };
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
	}
};
