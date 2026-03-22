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

	destroy(): void {
		clearInterval(this.cleanupInterval);
		this.windows.clear();
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

// Module-level singleton with HMR guard
const globalKey = '__roomchat_rate_limiter__';
const g = globalThis as Record<string, unknown>;

if (g[globalKey]) {
	(g[globalKey] as RateLimiter).destroy();
}

// 10 messages per 10 seconds per participant
export const messageRateLimiter = new RateLimiter();
g[globalKey] = messageRateLimiter;

export const MESSAGE_RATE_LIMIT = { maxRequests: 10, windowMs: 10_000 };

// 5 join attempts per 60 seconds per IP
const joinGlobalKey = '__roomchat_join_rate_limiter__';
if (g[joinGlobalKey]) {
	(g[joinGlobalKey] as RateLimiter).destroy();
}
export const joinRateLimiter = new RateLimiter();
g[joinGlobalKey] = joinRateLimiter;

export const JOIN_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };
