import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

function getSecret(): string {
	return env.COOKIE_SECRET || 'roomchat-dev-secret-change-in-production';
}

function sign(data: string): string {
	const hmac = createHmac('sha256', getSecret());
	hmac.update(data);
	return hmac.digest('hex');
}

/**
 * Encode and sign room_participants data for cookie storage.
 */
export function encodeRoomParticipants(map: Record<string, string>): string {
	const pruned = pruneRoomParticipants(map);
	const json = JSON.stringify(pruned);
	const signature = sign(json);
	return `${signature}.${json}`;
}

/**
 * Safely parse and verify the room_participants cookie.
 * Returns a Record mapping roomId → participantId, or empty object on failure.
 */
export function parseRoomParticipants(
	raw: string | undefined
): Record<string, string> {
	if (!raw) return {};
	try {
		const dotIndex = raw.indexOf('.');
		if (dotIndex === -1) return {};

		const sig = raw.slice(0, dotIndex);
		const json = raw.slice(dotIndex + 1);

		// Verify signature with timing-safe comparison
		const expected = sign(json);
		const sigBuf = Buffer.from(sig, 'hex');
		const expectedBuf = Buffer.from(expected, 'hex');
		if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return {};

		const parsed = JSON.parse(json);
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
 */
const MAX_ENTRIES = 20;

export function pruneRoomParticipants(
	map: Record<string, string>
): Record<string, string> {
	const entries = Object.entries(map);
	if (entries.length <= MAX_ENTRIES) return map;
	const pruned = entries.slice(-MAX_ENTRIES);
	return Object.fromEntries(pruned);
}
