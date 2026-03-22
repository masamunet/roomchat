import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantsByRoom } from '$lib/server/repositories/participant.js';
import { getLocalIpAddress } from '$lib/server/network.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { PageServerLoad } from './$types';

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

	return { room, participants, joinUrl };
};
