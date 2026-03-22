import type { Message } from '$lib/types/index.js';

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const encoder = new TextEncoder();

class SSEManager {
	private rooms = new Map<string, Set<SSEController>>();
	private keepaliveInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// Send keepalive comment every 30 seconds to prevent proxy/LB timeouts
		this.keepaliveInterval = setInterval(() => {
			const keepalive = encoder.encode(': keepalive\n\n');
			for (const [, controllers] of this.rooms) {
				for (const controller of controllers) {
					try {
						controller.enqueue(keepalive);
					} catch {
						controllers.delete(controller);
					}
				}
			}
		}, 30_000);
	}

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
		const encoded = encoder.encode(data);

		for (const controller of controllers) {
			try {
				controller.enqueue(encoded);
			} catch {
				controllers.delete(controller);
			}
		}
	}

	getConnectionCount(roomId: string): number {
		return this.rooms.get(roomId)?.size ?? 0;
	}
}

export const sseManager = new SSEManager();
