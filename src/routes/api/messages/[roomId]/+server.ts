import { json, error } from '@sveltejs/kit';
import { createMessage, getMessagesByRoom } from '$lib/server/repositories/message.js';
import { getParticipantById } from '$lib/server/repositories/participant.js';
import { sseManager } from '$lib/server/sse/manager.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
	const before = url.searchParams.get('before') ?? undefined;

	const messages = await getMessagesByRoom(params.roomId, limit, before);
	return json(messages);
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const roomParticipants = JSON.parse(cookies.get('room_participants') ?? '{}');
	const participantId = roomParticipants[params.roomId];

	if (!participantId) {
		error(401, '入室が必要です');
	}

	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== params.roomId) {
		error(403, 'このルームに参加していません');
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
