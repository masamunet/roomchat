import type { Participant, Room } from '$lib/types/index.js';
import type { MessageActivity, PaidExtensions } from '$lib/server/repositories/stats.js';

const MINUTE = 60_000;
const JST_OFFSET = 9 * 60 * MINUTE;
/** Candidate bucket widths in minutes; the smallest that keeps the chart at MAX_BUCKETS or fewer wins. */
const BUCKET_MINUTES = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080];
const MAX_BUCKETS = 36;

export interface TimeBucket {
	/** Short axis label (JST). */
	label: string;
	/** Full range for the tooltip (JST). */
	range: string;
	messages: number;
	/** Participants who had joined by the end of this bucket. */
	participants: number;
}

export interface ParticipantStats {
	nickname: string;
	joinedAt: string;
	messages: number;
	characters: number;
	lastPostAt: string | null;
}

export interface RoomStats {
	totals: {
		messages: number;
		participants: number;
		speakers: number;
		characters: number;
		avgLength: number;
		elapsedMinutes: number;
		messagesPerHour: number;
	};
	bucketMinutes: number;
	timeline: TimeBucket[];
	peak: TimeBucket | null;
	hourOfDay: number[];
	participants: ParticipantStats[];
	extensions: PaidExtensions;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false, ...opts });
const fmtTime = fmt({ hour: '2-digit', minute: '2-digit' });
const fmtDay = fmt({ month: 'numeric', day: 'numeric' });
const fmtDayTime = fmt({ month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function jstHour(d: Date): number {
	return new Date(d.getTime() + JST_OFFSET).getUTCHours();
}

export function computeRoomStats(
	room: Room,
	participants: Participant[],
	messages: MessageActivity[],
	extensions: PaidExtensions,
	now = new Date()
): RoomStats {
	const start = room.createdAt.getTime();
	const end = Math.max(start + MINUTE, Math.min(now.getTime(), room.expiresAt.getTime()));
	const spanMinutes = (end - start) / MINUTE;

	const bucketMinutes =
		BUCKET_MINUTES.find((m) => Math.ceil(spanMinutes / m) <= MAX_BUCKETS) ?? BUCKET_MINUTES[BUCKET_MINUTES.length - 1];
	const step = bucketMinutes * MINUTE;
	// Align buckets to JST wall-clock boundaries so hourly/daily buckets start on the hour/midnight.
	const first = Math.floor((start + JST_OFFSET) / step) * step - JST_OFFSET;
	const count = Math.max(1, Math.ceil((end - first) / step));

	const daily = bucketMinutes >= 1440;
	const multiDay = fmtDay.format(new Date(first)) !== fmtDay.format(new Date(end));
	const timeline: TimeBucket[] = Array.from({ length: count }, (_, i) => {
		const from = new Date(first + i * step);
		const to = new Date(first + (i + 1) * step);
		return {
			label: daily ? fmtDay.format(from) : multiDay && jstHour(from) === 0 && from.getUTCMinutes() === 0 ? fmtDay.format(from) : fmtTime.format(from),
			range: daily ? `${fmtDay.format(from)}〜${fmtDay.format(new Date(to.getTime() - MINUTE))}` : `${fmtDayTime.format(from)}〜${fmtTime.format(to)}`,
			messages: 0,
			participants: 0
		};
	});

	const hourOfDay = new Array<number>(24).fill(0);
	const byParticipant = new Map<string, { messages: number; characters: number; last: Date | null }>();
	let characters = 0;
	for (const m of messages) {
		const i = Math.min(count - 1, Math.max(0, Math.floor((m.createdAt.getTime() - first) / step)));
		timeline[i].messages++;
		hourOfDay[jstHour(m.createdAt)]++;
		characters += m.length;
		const s = byParticipant.get(m.participantId) ?? { messages: 0, characters: 0, last: null };
		s.messages++;
		s.characters += m.length;
		s.last = m.createdAt;
		byParticipant.set(m.participantId, s);
	}

	for (const p of participants) {
		const i = Math.min(count - 1, Math.max(0, Math.floor((p.joinedAt.getTime() - first) / step)));
		timeline[i].participants++;
	}
	let running = 0;
	for (const b of timeline) {
		running += b.participants;
		b.participants = running;
	}

	const peak = messages.length > 0 ? timeline.reduce((a, b) => (b.messages > a.messages ? b : a)) : null;
	const elapsedMinutes = Math.round((Math.min(now.getTime(), room.expiresAt.getTime()) - start) / MINUTE);

	return {
		totals: {
			messages: messages.length,
			participants: participants.length,
			speakers: byParticipant.size,
			characters,
			avgLength: messages.length > 0 ? Math.round(characters / messages.length) : 0,
			elapsedMinutes,
			messagesPerHour: elapsedMinutes > 0 ? Math.round((messages.length / elapsedMinutes) * 60 * 10) / 10 : 0
		},
		bucketMinutes,
		timeline,
		peak,
		hourOfDay,
		participants: participants
			.map((p) => {
				const s = byParticipant.get(p.id);
				return {
					nickname: p.nickname,
					joinedAt: fmtDayTime.format(p.joinedAt),
					messages: s?.messages ?? 0,
					characters: s?.characters ?? 0,
					lastPostAt: s?.last ? fmtDayTime.format(s.last) : null
				};
			})
			.sort((a, b) => b.messages - a.messages || b.characters - a.characters),
		extensions
	};
}
