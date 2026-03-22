import { redirect, fail } from '@sveltejs/kit';
import { listRoomsByCreator, createRoom, deleteRoom, deleteExpiredRooms, countActiveRoomsByCreator, getRoomById } from '$lib/server/repositories/room.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	// Auto-delete expired rooms
	await deleteExpiredRooms();

	const rooms = await listRoomsByCreator(locals.user.id);
	return { rooms };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/');
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name || name.length === 0) {
			return fail(400, { error: 'ルーム名を入力してください' });
		}

		if (name.length > 100) {
			return fail(400, { error: 'ルーム名は100文字以内で入力してください' });
		}

		const activeCount = await countActiveRoomsByCreator(locals.user.id);
		if (activeCount >= 3) {
			return fail(400, { error: '作成できるルームは最大3つまでです（6時間で自動削除されます）' });
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

		if (!roomId) {
			return fail(400, { error: '無効なルームIDです' });
		}

		const room = await getRoomById(roomId);
		if (!room || room.creatorId !== locals.user.id) {
			return fail(403, { error: '権限がありません' });
		}

		await deleteRoom(roomId);
		return { success: true };
	}
};
