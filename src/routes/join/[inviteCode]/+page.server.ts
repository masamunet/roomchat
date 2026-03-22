import { redirect, fail, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getRoomByInviteCode } from '$lib/server/repositories/room.js';
import { createParticipant, getParticipantById } from '$lib/server/repositories/participant.js';
import { parseRoomParticipants, encodeRoomParticipants } from '$lib/server/cookies.js';
import { isValidInviteCode } from '$lib/server/validation.js';
import { joinRateLimiter, JOIN_RATE_LIMIT } from '$lib/server/rate-limit.js';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const code = params.inviteCode.toUpperCase();
	if (!isValidInviteCode(code)) {
		error(400, '無効な招待コードです');
	}
	const room = await getRoomByInviteCode(code);
	if (!room) {
		error(404, 'ルームが見つかりません。招待コードを確認してください。');
	}

	// 既にCookieに有効な参加者情報がある場合、ルームに直接リダイレクト
	const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
	const participantId = roomParticipants[room.id];
	if (participantId) {
		const participant = await getParticipantById(participantId);
		if (participant && participant.roomId === room.id) {
			redirect(302, `/room/${room.id}`);
		}
	}

	return { room };
};

export const actions: Actions = {
	default: async ({ request, params, cookies, getClientAddress }) => {
		const clientIp = getClientAddress();
		if (!joinRateLimiter.check(clientIp, JOIN_RATE_LIMIT.maxRequests, JOIN_RATE_LIMIT.windowMs)) {
			return fail(429, { error: 'アクセスが集中しています。しばらくしてからお試しください。' });
		}

		const code = params.inviteCode.toUpperCase();
		if (!isValidInviteCode(code)) {
			return fail(400, { error: '無効な招待コードです' });
		}
		const room = await getRoomByInviteCode(code);
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

		let participant;
		try {
			participant = await createParticipant(room.id, nickname);
		} catch (e: unknown) {
			const isUniqueViolation =
				e instanceof Error && 'code' in e && (e as { code: string }).code === '23505';
			if (isUniqueViolation) {
				return fail(400, { error: 'このニックネームは既に使用されています' });
			}
			throw e;
		}

		if (!participant) {
			return fail(400, { error: 'このルームは参加者数の上限に達しています' });
		}

		// Store room-participant mapping (delete + re-add to keep insertion order fresh)
		const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
		delete roomParticipants[room.id];
		roomParticipants[room.id] = participant.id;
		cookies.set('room_participants', encodeRoomParticipants(roomParticipants), {
			path: '/',
			httpOnly: true,
			secure: !dev,
			maxAge: 6 * 60 * 60,
			sameSite: 'lax'
		});

		redirect(302, `/room/${room.id}`);
	}
};
