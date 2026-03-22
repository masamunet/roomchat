import { json, error } from '@sveltejs/kit';
import { createMessage, getMessagesByRoom } from '$lib/server/repositories/message.js';
import { getParticipantById } from '$lib/server/repositories/participant.js';
import { getRoomById } from '$lib/server/repositories/room.js';
import { sseManager } from '$lib/server/sse/manager.js';
import { parseRoomParticipants } from '$lib/server/cookies.js';
import { messageRateLimiter, MESSAGE_RATE_LIMIT } from '$lib/server/rate-limit.js';
import type { RequestHandler } from './$types';

function getParticipantIdFromCookies(cookies: { get: (name: string) => string | undefined }, roomId: string): string | null {
	const roomParticipants = parseRoomParticipants(cookies.get('room_participants'));
	return roomParticipants[roomId] ?? null;
}

export const GET: RequestHandler = async ({ params, url, cookies }) => {
	// Verify room is active
	const room = await getRoomById(params.roomId);
	if (!room || !room.isActive) {
		error(404, 'ルームが見つかりません');
	}

	// Verify participant
	const participantId = getParticipantIdFromCookies(cookies, params.roomId);
	if (!participantId) {
		error(401, '入室が必要です');
	}
	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		error(403, 'このルームに参加していません');
	}

	const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
	const before = url.searchParams.get('before') ?? undefined;

	const messages = await getMessagesByRoom(params.roomId, limit, before);
	return json(messages);
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	// Verify room is active
	const room = await getRoomById(params.roomId);
	if (!room || !room.isActive) {
		error(404, 'ルームが見つかりません');
	}

	const participantId = getParticipantIdFromCookies(cookies, params.roomId);

	if (!participantId) {
		error(401, '入室が必要です');
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		error(403, 'このルームに参加していません');
	}

	// Rate limiting
	if (!messageRateLimiter.check(participantId, MESSAGE_RATE_LIMIT.maxRequests, MESSAGE_RATE_LIMIT.windowMs)) {
		error(429, 'メッセージの送信が速すぎます。少し待ってから再度お試しください');
	}

	const body = await request.json();
	const content = body.content?.trim();

	if (!content || content.length === 0) {
		error(400, 'メッセージを入力してください');
	}

	if (content.length > 2000) {
		error(400, 'メッセージは2000文字以内で入力してください');
	}

	const message = await createMessage(params.roomId, participantId, content);

	// Broadcast to all SSE subscribers
	sseManager.broadcast(params.roomId, message);

	return json(message);
};
