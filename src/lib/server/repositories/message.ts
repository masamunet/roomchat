import { getDb } from '$lib/server/db/index.js';
import type { Message } from '$lib/types/index.js';

interface MessageRow {
	id: string;
	room_id: string;
	participant_id: string;
	content: string;
	created_at: Date;
	nickname: string;
}

function toMessage(row: MessageRow): Message {
	return {
		id: row.id,
		roomId: row.room_id,
		participantId: row.participant_id,
		content: row.content,
		createdAt: new Date(row.created_at),
		nickname: row.nickname
	};
}

export async function createMessage(roomId: string, participantId: string, content: string): Promise<Message> {
	const db = await getDb();
	const result = await db.query<MessageRow>(
		`INSERT INTO messages (room_id, participant_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING *, (SELECT nickname FROM participants WHERE id = $2) as nickname`,
		[roomId, participantId, content]
	);
	return toMessage(result.rows[0]);
}

export async function getMessagesByRoom(roomId: string, limit = 100, before?: string, after?: string): Promise<Message[]> {
	const db = await getDb();

	let sql = `SELECT m.*, p.nickname
		FROM messages m
		JOIN participants p ON m.participant_id = p.id
		WHERE m.room_id = $1`;
	const params: unknown[] = [roomId];

	if (before) {
		params.push(before);
		sql += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
	}

	if (after) {
		params.push(after);
		sql += ` AND m.created_at > (SELECT created_at FROM messages WHERE id = $${params.length})`;
	}

	// Fetch the most recent N messages using DESC, then reverse for chronological order
	sql += ` ORDER BY m.created_at DESC`;
	params.push(limit);
	sql += ` LIMIT $${params.length}`;

	const result = await db.query<MessageRow>(sql, params);
	return result.rows.map(toMessage).reverse();
}
