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

export async function createParticipant(roomId: string, nickname: string, maxParticipants = 100): Promise<Participant | null> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`INSERT INTO participants (room_id, nickname)
		 SELECT $1, $2
		 WHERE (SELECT count(*) FROM participants WHERE room_id = $1) < $3
		 RETURNING *`,
		[roomId, nickname, maxParticipants]
	);
	return result.rows.length > 0 ? toParticipant(result.rows[0]) : null;
}

export async function getParticipantById(participantId: string): Promise<Participant | null> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`SELECT * FROM participants WHERE id = $1`,
		[participantId]
	);
	return result.rows.length > 0 ? toParticipant(result.rows[0]) : null;
}

export async function updateParticipantNickname(participantId: string, newNickname: string): Promise<Participant | null> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`UPDATE participants SET nickname = $2 WHERE id = $1 RETURNING *`,
		[participantId, newNickname]
	);
	return result.rows.length > 0 ? toParticipant(result.rows[0]) : null;
}

export async function getParticipantsByRoom(roomId: string): Promise<Participant[]> {
	const db = await getDb();
	const result = await db.query<ParticipantRow>(
		`SELECT * FROM participants WHERE room_id = $1 ORDER BY joined_at`,
		[roomId]
	);
	return result.rows.map(toParticipant);
}

