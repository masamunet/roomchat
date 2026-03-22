import { json, error } from '@sveltejs/kit';
import { getParticipantById, updateParticipantNickname } from '$lib/server/repositories/participant.js';
import { getRoomById } from '$lib/server/repositories/room.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { parseRoomParticipants } from '$lib/server/cookies.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { RequestHandler } from './$types';

const NICKNAME_CHANGE_WINDOW_MS = 5 * 60 * 1000;

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
	if (!participantId) {
		error(401, '入室が必要です');
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		error(403, 'このルームに参加していません');
	}

	// Check 5-minute window
	const elapsed = Date.now() - participant.joinedAt.getTime();
	if (elapsed > NICKNAME_CHANGE_WINDOW_MS) {
		error(403, 'ニックネームの変更可能時間（入室後5分）を過ぎています');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		error(400, '不正なリクエスト形式です');
	}

	const nickname = (typeof body.nickname === 'string' ? body.nickname : '').trim();

	if (!nickname || nickname.length === 0) {
		error(400, 'ニックネームを入力してください');
	}

	if (nickname.length > 50) {
		error(400, 'ニックネームは50文字以内で入力してください');
	}

	if (nickname === participant.nickname) {
		return json(participant);
	}

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
		error(500, 'ニックネームの更新に失敗しました');
	}

	sseManager.broadcastNicknameChange(params.roomId, participantId, participant.nickname, nickname);

	return json(updated);
};
