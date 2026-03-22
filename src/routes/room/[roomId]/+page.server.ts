import { redirect, error } from '@sveltejs/kit';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantById } from '$lib/server/repositories/participant.js';
import { getMessagesByRoom } from '$lib/server/repositories/message.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const room = await getRoomById(params.roomId);
	if (!room) {
		error(404, 'ルームが見つかりません');
	}

	// Check participant cookie
	const roomParticipants = JSON.parse(cookies.get('room_participants') ?? '{}');
	const participantId = roomParticipants[params.roomId];

	if (!participantId) {
		redirect(302, `/join/${room.inviteCode}`);
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		redirect(302, `/join/${room.inviteCode}`);
	}

	const messages = await getMessagesByRoom(params.roomId);

	return {
		room,
		participant,
		messages
	};
};
