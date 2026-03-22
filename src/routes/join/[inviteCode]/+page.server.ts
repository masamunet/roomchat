import { redirect, fail, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getRoomByInviteCode } from '$lib/server/repositories/room.js';
import { createParticipant, isNicknameTaken } from '$lib/server/repositories/participant.js';
import { parseRoomParticipants, pruneRoomParticipants } from '$lib/server/cookies.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const room = await getRoomByInviteCode(params.inviteCode.toUpperCase());
	if (!room) {
		error(404, 'ルームが見つかりません。招待コードを確認してください。');
	}
	return { room };
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const room = await getRoomByInviteCode(params.inviteCode.toUpperCase());
		if (!room) {
			return fail(404, { error: 'ルームが見つかりません' });
		}

		const formData = await request.formData();
		const nickname = formData.get('nickname')?.toString().trim();

		if (!nickname || nickname.length === 0) {
			return fail(400, { error: 'ニックネームを入力してください' });
		}

		if (nickname.length > 50) {
			return fail(400, { error: 'ニックネームは50文字以内で入力してください' });
		}

		const taken = await isNicknameTaken(room.id, nickname);
		if (taken) {
			return fail(400, { error: 'このニックネームは既に使用されています' });
		}

		const participant = await createParticipant(room.id, nickname);

		// Store room-participant mapping
		const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
		roomParticipants[room.id] = participant.id;
		cookies.set('room_participants', JSON.stringify(pruneRoomParticipants(roomParticipants)), {
			path: '/',
			httpOnly: true,
			secure: !dev,
			maxAge: 24 * 60 * 60,
			sameSite: 'lax'
		});

		redirect(302, `/room/${room.id}`);
	}
};
