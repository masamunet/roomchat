import { error } from '@sveltejs/kit';
import { sseManager } from '$lib/server/sse/manager.js';
import { getParticipantById } from '$lib/server/repositories/participant.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const roomId = params.roomId;

	// Verify participant
	const roomParticipants = JSON.parse(cookies.get('room_participants') ?? '{}');
	const participantId = roomParticipants[roomId];
	if (!participantId) {
		error(401, '入室が必要です');
	}
	const participant = await getParticipantById(participantId);
	if (!participant || participant.roomId !== roomId) {
		error(403, 'このルームに参加していません');
	}

	let sseController: ReadableStreamDefaultController<Uint8Array>;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			sseController = controller;

			// Send initial connection message
			const connectMsg = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
			controller.enqueue(new TextEncoder().encode(connectMsg));

			sseManager.subscribe(roomId, controller);
		},
		cancel() {
			sseManager.unsubscribe(roomId, sseController);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
