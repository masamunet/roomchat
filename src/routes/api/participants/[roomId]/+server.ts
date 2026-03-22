import { json, error } from '@sveltejs/kit';
import { getParticipantById, updateParticipantNickname } from '$lib/server/repositories/participant.js';
import { getRoomById } from '$lib/server/repositories/room.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { parseRoomParticipants } from '$lib/server/cookies.js';
import { isValidUUID } from '$lib/server/validation.js';
import { nicknameRateLimiter, NICKNAME_RATE_LIMIT } from '$lib/server/rate-limit.js';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	if (!isValidUUID(params.roomId)) {
		error(400, '無効なルームIDです');
	}

	const room = await getRoomById(params.roomId);
	if (!room || !room.isActive) {
		error(404, 'ルームが見つかりません');
	}

	const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
	const participantId = roomParticipants[params.roomId];
	if (!participantId || !isValidUUID(participantId)) {
		error(401, '入室が必要です');
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		error(403, 'このルームに参加していません');
	}

	// Rate limiting
	if (!nicknameRateLimiter.check(participantId, NICKNAME_RATE_LIMIT.maxRequests, NICKNAME_RATE_LIMIT.windowMs)) {
		error(429, 'ニックネームの変更が速すぎます。少し待ってからお試しください');
	}

	// Reject oversized request bodies
	const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
	if (contentLength > 1024) {
		error(413, 'リクエストが大きすぎます');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		error(400, '不正なリクエスト形式です');
	}

	// Sanitize: trim and strip Unicode control characters
	const nickname = (typeof body.nickname === 'string' ? body.nickname : '')
		.trim()
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

	if (!nickname || nickname.length === 0) {
		error(400, 'ニックネームを入力してください');
	}

	if (nickname.length > 50) {
		error(400, 'ニックネームは50文字以内で入力してください');
	}

	if (nickname === participant.nickname) {
		return json(participant);
	}

	// updateParticipantNickname enforces 5-minute window atomically in SQL
	let updated;
	try {
		updated = await updateParticipantNickname(participantId, nickname);
	} catch (e: unknown) {
		const isUniqueViolation =
			e instanceof Error && 'code' in e && (e as { code: string }).code === '23505';
		if (isUniqueViolation) {
			error(409, 'このニックネームは既に使用されています');
		}
		throw e;
	}

	if (!updated) {
		error(403, 'ニックネームの変更可能時間（入室後5分）を過ぎています');
	}

	sseManager.broadcastNicknameChange(params.roomId, participantId, nickname);

	return json(updated);
};
