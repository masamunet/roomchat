import type { Message } from '$lib/types/index.js';

type SSEController = ReadableStreamDefaultController<Uint8Array>;

interface ControllerInfo {
	controller: SSEController;
	participantId: string;
}

const encoder = new TextEncoder();

class SSEManager {
	private rooms = new Map<string, Set<ControllerInfo>>();
	private keepaliveInterval: ReturnType<typeof setInterval>;

	constructor() {
		this.keepaliveInterval = setInterval(() => {
			const keepalive = encoder.encode(': keepalive\n\n');
			for (const [, infos] of this.rooms) {
				for (const info of infos) {
					try {
						info.controller.enqueue(keepalive);
					} catch {
						infos.delete(info);
					}
				}
			}
		}, 30_000);
	}

	subscribe(roomId: string, controller: SSEController, participantId: string): void {
		if (!this.rooms.has(roomId)) {
			this.rooms.set(roomId, new Set());
		}
		this.rooms.get(roomId)!.add({ controller, participantId });
	}

	unsubscribe(roomId: string, controller: SSEController): void {
		const infos = this.rooms.get(roomId);
		if (infos) {
			for (const info of infos) {
				if (info.controller === controller) {
					infos.delete(info);
					break;
				}
			}
			if (infos.size === 0) {
				this.rooms.delete(roomId);
			}
		}
	}

	broadcast(roomId: string, message: Message, senderParticipantId?: string): void {
		const infos = this.rooms.get(roomId);
		if (!infos) return;

		const data = `data: ${JSON.stringify(message)}\n\n`;
		const encoded = encoder.encode(data);

		for (const info of infos) {
			// Skip sending back to the sender
			if (senderParticipantId && info.participantId === senderParticipantId) continue;
			try {
				info.controller.enqueue(encoded);
			} catch {
				infos.delete(info);
			}
		}
	}

	getConnectionCount(roomId: string): number {
		return this.rooms.get(roomId)?.size ?? 0;
	}

	destroy(): void {
		clearInterval(this.keepaliveInterval);
		this.rooms.clear();
	}
}

// Module-level singleton with HMR guard
const globalKey = '__roomchat_sse_manager__';
const g = globalThis as Record<string, unknown>;

if (g[globalKey]) {
	(g[globalKey] as SSEManager).destroy();
}

export const sseManager = new SSEManager();
g[globalKey] = sseManager;
