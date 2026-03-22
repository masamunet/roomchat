/**
 * Safely parse the room_participants cookie.
 * Returns a Record mapping roomId → participantId, or empty object on failure.
 */
export function parseRoomParticipants(
	raw: string | undefined
): Record<string, string> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, string>;
		}
		return {};
	} catch {
		return {};
	}
}

/**
 * Prune room_participants to keep only the most recent MAX_ENTRIES entries.
 * Since JS objects preserve insertion order, we keep the last N entries.
 */
const MAX_ENTRIES = 20;

export function pruneRoomParticipants(
	map: Record<string, string>
): Record<string, string> {
	const entries = Object.entries(map);
	if (entries.length <= MAX_ENTRIES) return map;
	// Keep the last MAX_ENTRIES
	const pruned = entries.slice(-MAX_ENTRIES);
	return Object.fromEntries(pruned);
}
