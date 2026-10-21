import { redirect, error } from '@sveltejs/kit';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantsByRoom } from '$lib/server/repositories/participant.js';
import { getMessageActivityByRoom, getPaidExtensionsByRoom } from '$lib/server/repositories/stats.js';
import { computeRoomStats } from '$lib/server/room-stats.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
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

	if (room.creatorId !== locals.user.id) {
		error(403, 'このルームの管理権限がありません');
	}

	const [participants, messages, extensions] = await Promise.all([
		getParticipantsByRoom(room.id),
		getMessageActivityByRoom(room.id),
		getPaidExtensionsByRoom(room.id)
	]);

	return {
		room,
		stats: computeRoomStats(room, participants, messages, extensions),
		connections: sseManager.getConnectionCount(room.id)
	};
};
