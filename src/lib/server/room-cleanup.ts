import { deleteExpiredRooms } from '$lib/server/repositories/room.js';
import { sseManager } from '$lib/server/sse/manager.js';

let lastCleanup = 0;

/** Archive and delete expired rooms (throttled: at most once per minute). */
export async function cleanupExpiredRooms(): Promise<void> {
	const now = Date.now();
	if (now - lastCleanup <= 60_000) return;
	lastCleanup = now;
	const deletedIds = await deleteExpiredRooms();
	for (const id of deletedIds) {
		sseManager.closeRoom(id);
	}
}
