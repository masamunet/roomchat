import { sseManager } from '$lib/server/sse/manager.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const roomId = params.roomId;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			// Send initial connection message
			const connectMsg = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
			controller.enqueue(new TextEncoder().encode(connectMsg));

			sseManager.subscribe(roomId, controller);
		},
		cancel() {
			// Will be called when client disconnects
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
