import { getDb } from '$lib/server/db/index.js';
import { generateInviteCode } from '$lib/utils/invite-code.js';
import type { Room } from '$lib/types/index.js';

interface RoomRow {
	id: string;
	name: string;
	invite_code: string;
	creator_id: string;
	created_at: Date;
	is_active: boolean;
}

function toRoom(row: RoomRow): Room {
	return {
		id: row.id,
		name: row.name,
		inviteCode: row.invite_code,
		creatorId: row.creator_id,
		createdAt: new Date(row.created_at),
		isActive: row.is_active
	};
}

export async function createRoom(name: string, creatorId: string): Promise<Room> {
	const db = await getDb();

	// Retry on invite code collision (unique constraint)
	for (let attempt = 0; attempt < 3; attempt++) {
		const inviteCode = generateInviteCode();
		try {
			const result = await db.query<RoomRow>(
				`INSERT INTO rooms (name, invite_code, creator_id)
				 VALUES ($1, $2, $3)
				 RETURNING *`,
				[name, inviteCode, creatorId]
			);
			return toRoom(result.rows[0]);
		} catch (e: unknown) {
			const isUniqueViolation =
				e instanceof Error && ('code' in e) && (e as { code: string }).code === '23505';
			if (!isUniqueViolation || attempt === 2) throw e;
		}
	}

	throw new Error('招待コードの生成に失敗しました');
}

export async function listRoomsByCreator(creatorId: string): Promise<Room[]> {
	const db = await getDb();
	const result = await db.query<RoomRow>(
		`SELECT * FROM rooms WHERE creator_id = $1 AND is_active = TRUE
		 ORDER BY created_at DESC`,
		[creatorId]
	);
	return result.rows.map(toRoom);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
	const db = await getDb();
	const result = await db.query<RoomRow>(
		`SELECT * FROM rooms WHERE id = $1`,
		[roomId]
	);
	return result.rows.length > 0 ? toRoom(result.rows[0]) : null;
}

export async function getRoomByInviteCode(inviteCode: string): Promise<Room | null> {
	const db = await getDb();
	const result = await db.query<RoomRow>(
		`SELECT * FROM rooms WHERE invite_code = $1 AND is_active = TRUE`,
		[inviteCode]
	);
	return result.rows.length > 0 ? toRoom(result.rows[0]) : null;
}

export async function deleteRoom(roomId: string): Promise<void> {
	const db = await getDb();
	await db.query(`DELETE FROM rooms WHERE id = $1`, [roomId]);
}

export async function deleteExpiredRooms(): Promise<string[]> {
	const db = await getDb();

	// Find expired room IDs
	const expired = await db.query<{ id: string }>(
		`SELECT id FROM rooms WHERE created_at < NOW() - INTERVAL '6 hours'`
	);
	if (expired.rows.length === 0) return [];

	const expiredIds = expired.rows.map((r) => r.id);
	const placeholders = expiredIds.map((_, i) => `$${i + 1}`).join(', ');

	// Archive rooms
	await db.query(
		`INSERT INTO archived_rooms (id, name, invite_code, creator_id, created_at, is_active, archived_at)
		 SELECT id, name, invite_code, creator_id, created_at, is_active, NOW()
		 FROM rooms WHERE id IN (${placeholders})
		 ON CONFLICT (id) DO NOTHING`,
		expiredIds
	);

	// Archive participants
	await db.query(
		`INSERT INTO archived_participants (id, room_id, nickname, joined_at, last_seen_at, archived_at)
		 SELECT id, room_id, nickname, joined_at, last_seen_at, NOW()
		 FROM participants WHERE room_id IN (${placeholders})
		 ON CONFLICT (id) DO NOTHING`,
		expiredIds
	);

	// Archive messages with nickname
	await db.query(
		`INSERT INTO archived_messages (id, room_id, participant_id, nickname, content, created_at, archived_at)
		 SELECT m.id, m.room_id, m.participant_id, p.nickname, m.content, m.created_at, NOW()
		 FROM messages m
		 JOIN participants p ON p.id = m.participant_id
		 WHERE m.room_id IN (${placeholders})
		 ON CONFLICT (id) DO NOTHING`,
		expiredIds
	);

	// Delete expired rooms (cascades to participants and messages)
	await db.query(
		`DELETE FROM rooms WHERE id IN (${placeholders})`,
		expiredIds
	);

	return expiredIds;
}

export async function countActiveRoomsByCreator(creatorId: string): Promise<number> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`SELECT count(*)::text as count FROM rooms
		 WHERE creator_id = $1 AND is_active = TRUE
		 AND created_at > NOW() - INTERVAL '6 hours'`,
		[creatorId]
	);
	return parseInt(result.rows[0]?.count ?? '0', 10);
}
