import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { networkInterfaces } from 'os';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantById } from '$lib/server/repositories/participant.js';
import { getMessagesByRoom } from '$lib/server/repositories/message.js';
import { parseRoomParticipants } from '$lib/server/cookies.js';
import type { PageServerLoad } from './$types';

function getLocalIpAddress(): string | null {
	const nets = networkInterfaces();
	for (const name of Object.keys(nets)) {
		for (const net of nets[name] ?? []) {
			if (net.family === 'IPv4' && !net.internal) {
				return net.address;
			}
		}
	}
	return null;
}

export const load: PageServerLoad = async ({ params, cookies, locals, url }) => {
	const room = await getRoomById(params.roomId);
	if (!room || !room.isActive) {
		error(404, 'ルームが見つかりません');
	}

	// Check participant cookie
	const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
	const participantId = roomParticipants[params.roomId];

	if (!participantId) {
		redirect(302, `/join/${room.inviteCode}`);
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		redirect(302, `/join/${room.inviteCode}`);
	}

	const messages = await getMessagesByRoom(params.roomId);

	// Check if current user is the room creator
	const isCreator = locals.user?.id === room.creatorId;

	let joinUrl: string | null = null;
	if (isCreator) {
		let origin = url.origin;
		if (dev) {
			const localIp = getLocalIpAddress();
			if (localIp) {
				origin = `${url.protocol}//${localIp}:${url.port}`;
			}
		}
		joinUrl = `${origin}/join/${room.inviteCode}`;
	}

	return {
		room,
		participant,
		messages,
		isCreator,
		joinUrl
	};
};
