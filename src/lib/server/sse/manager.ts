import type { Message } from '$lib/types/index.js';

type SSEController = ReadableStreamDefaultController<Uint8Array>;

class SSEManager {
	private rooms = new Map<string, Set<SSEController>>();

	subscribe(roomId: string, controller: SSEController): void {
		if (!this.rooms.has(roomId)) {
			this.rooms.set(roomId, new Set());
		}
		this.rooms.get(roomId)!.add(controller);
	}

	unsubscribe(roomId: string, controller: SSEController): void {
		const controllers = this.rooms.get(roomId);
		if (controllers) {
			controllers.delete(controller);
			if (controllers.size === 0) {
				this.rooms.delete(roomId);
			}
		}
	}

	broadcast(roomId: string, message: Message): void {
		const controllers = this.rooms.get(roomId);
		if (!controllers) return;

		const data = `data: ${JSON.stringify(message)}\n\n`;
		const encoded = new TextEncoder().encode(data);

		for (const controller of controllers) {
			try {
				controller.enqueue(encoded);
			} catch {
				// Controller might be closed, remove it
				controllers.delete(controller);
			}
		}
	}

	getConnectionCount(roomId: string): number {
		return this.rooms.get(roomId)?.size ?? 0;
	}
}

export const sseManager = new SSEManager();
