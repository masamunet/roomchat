import { getDb } from '$lib/server/db/index.js';
import type { Participant } from '$lib/types/index.js';

interface ParticipantRow {
	id: string;
	room_id: string;
	nickname: string;
	joined_at: Date;
	last_seen_at: Date;
}

function toParticipant(row: ParticipantRow): Participant {
	return {
		id: row.id,
		roomId: row.room_id,
		nickname: row.nickname,
		joinedAt: new Date(row.joined_at),
		lastSeenAt: new Date(row.last_seen_at)
	};
}

export async function createParticipant(roomId: string, nickname: string): Promise<Participant> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`INSERT INTO participants (room_id, nickname)
		 VALUES ($1, $2)
		 RETURNING *`,
		[roomId, nickname]
	);
	return toParticipant(result.rows[0]);
}

export async function isNicknameTaken(roomId: string, nickname: string): Promise<boolean> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`SELECT count(*)::text as count FROM participants
		 WHERE room_id = $1 AND nickname = $2`,
		[roomId, nickname]
	);
	return parseInt(result.rows[0].count, 10) > 0;
}

export async function getParticipantById(participantId: string): Promise<Participant | null> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`SELECT * FROM participants WHERE id = $1`,
		[participantId]
	);
	return result.rows.length > 0 ? toParticipant(result.rows[0]) : null;
}

export async function countParticipantsByRoom(roomId: string): Promise<number> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`SELECT count(*)::text as count FROM participants WHERE room_id = $1`,
		[roomId]
	);
	return parseInt(result.rows[0].count, 10);
}

export async function getParticipantsByRoom(roomId: string): Promise<Participant[]> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`SELECT * FROM participants WHERE room_id = $1 ORDER BY joined_at`,
		[roomId]
	);
	return result.rows.map(toParticipant);
}

export async function updateLastSeen(participantId: string): Promise<void> {
	const db = await getDb();
	await db.query(
		`UPDATE participants SET last_seen_at = NOW() WHERE id = $1`,
		[participantId]
	);
}
