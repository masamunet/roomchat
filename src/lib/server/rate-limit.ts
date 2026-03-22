/**
 * Simple in-memory rate limiter with periodic cleanup.
 * Tracks timestamps of recent actions per key, sliding window.
 */
class RateLimiter {
	private windows = new Map<string, number[]>();
	private cleanupInterval: ReturnType<typeof setInterval>;

	constructor() {
		// Clean up stale keys every 60 seconds
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			for (const [key, timestamps] of this.windows) {
				const valid = timestamps.filter((t) => now - t < 60_000);
				if (valid.length === 0) {
					this.windows.delete(key);
				} else {
					this.windows.set(key, valid);
				}
			}
		}, 60_000);
	}

	check(key: string, maxRequests: number, windowMs: number): boolean {
		const now = Date.now();
		const timestamps = this.windows.get(key) ?? [];

		// Remove expired entries
		const valid = timestamps.filter((t) => now - t < windowMs);

		if (valid.length >= maxRequests) {
			this.windows.set(key, valid);
			return false;
		}

		valid.push(now);
		this.windows.set(key, valid);
		return true;
	}
}

// 10 messages per 10 seconds per participant
export const messageRateLimiter = new RateLimiter();
export const MESSAGE_RATE_LIMIT = { maxRequests: 10, windowMs: 10_000 };
