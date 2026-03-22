/**
 * Simple in-memory rate limiter.
 * Tracks timestamps of recent actions per key, sliding window.
 */
class RateLimiter {
	private windows = new Map<string, number[]>();

	/**
	 * Check if an action is allowed.
	 * @param key Unique key (e.g. participantId)
	 * @param maxRequests Max requests in the window
	 * @param windowMs Window duration in milliseconds
	 * @returns true if allowed, false if rate-limited
	 */
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
