import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { networkInterfaces } from 'os';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getParticipantsByRoom } from '$lib/server/repositories/participant.js';
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

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const room = await getRoomById(params.roomId);
	if (!room) {
		error(404, 'ルームが見つかりません');
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
