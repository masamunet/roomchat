/** Round a maximum up to a "nice" axis top and return evenly spaced ticks from 0. */
export function niceTicks(max: number, target = 4): number[] {
	if (max <= 0) return [0, 1];
	const raw = max / target;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10);
	const top = Math.ceil(max / step) * step;
	return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Show roughly `max` x-axis labels: every n-th index. */
export function labelEvery(count: number, max: number): number {
	return Math.max(1, Math.ceil(count / max));
}
