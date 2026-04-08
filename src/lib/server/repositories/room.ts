import { getDb } from '$lib/server/db/index.js';
import { generateInviteCode } from '$lib/utils/invite-code.js';
import type { Room } from '$lib/types/index.js';


interface RoomRow {
	id: string;
	name: string;
	invite_code: string;
	creator_id: string;
	created_at: string | Date;
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
				e instanceof Error && 'code' in e && (e as { code?: string }).code === '23505';
			if (!isUniqueViolation) throw e;
			// Continue loop on invite code collision
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
		`SELECT * FROM rooms WHERE invite_code = $1 AND is_active = TRUE
		 AND created_at > NOW() - INTERVAL '6 hours'`,
		[inviteCode]
	);
	return result.rows.length > 0 ? toRoom(result.rows[0]) : null;
}

/**
 * Archive then hard-delete a single room atomically using a CTE.
 * If the room does not exist, all CTEs produce zero rows and the DELETE is a no-op;
 * the caller is responsible for verifying room ownership before calling this function.
 * On concurrent calls for the same room, archive INSERTs are idempotent (DO NOTHING)
 * because the CTE guarantees the archival runs once within a single atomic statement.
 */
export async function deleteRoom(roomId: string): Promise<void> {
	const db = await getDb();

	await db.query(
		`WITH archive_rooms AS (
		   INSERT INTO archived_rooms
		     (id, name, invite_code, creator_id, creator_email, created_at, is_active, archived_at)
		   -- COALESCE handles the rare case where the creator account was deleted
		   SELECT r.id, r.name, r.invite_code, r.creator_id, COALESCE(u.email, ''),
		          COALESCE(r.created_at, NOW()), r.is_active, NOW()
		   FROM rooms r
		   LEFT JOIN users u ON u.id = r.creator_id
		   WHERE r.id = $1
		   ON CONFLICT (id) DO NOTHING
		 ),
		 archive_participants AS (
		   INSERT INTO archived_participants
		     (id, room_id, nickname, joined_at, last_seen_at, archived_at)
		   SELECT id, room_id, nickname, joined_at, last_seen_at, NOW()
		   FROM participants
		   WHERE room_id = $1
		   ON CONFLICT (id) DO NOTHING
		 ),
		 archive_messages AS (
		   INSERT INTO archived_messages
		     (id, room_id, participant_id, nickname, content, created_at, archived_at)
		   SELECT m.id, m.room_id, m.participant_id, p.nickname, m.content, m.created_at, NOW()
		   FROM messages m
		   JOIN participants p ON p.id = m.participant_id
		   WHERE m.room_id = $1
		   ON CONFLICT (id) DO NOTHING
		 )
		 DELETE FROM rooms WHERE id = $1`,
		[roomId]
	);
}

/**
 * Archive then hard-delete all rooms older than 6 hours.
 * Uses a single CTE so the archive and delete are atomic — no TOCTOU window.
 * On concurrent calls the archive INSERTs are idempotent (DO NOTHING) because
 * each CTE is a single atomic statement; the second concurrent DELETE simply
 * finds no matching rows and returns an empty result.
 * Returns the IDs of deleted rooms.
 */
export async function deleteExpiredRooms(): Promise<string[]> {
	const db = await getDb();

	const result = await db.query<{ id: string }>(
		`WITH expired AS (
		   SELECT id FROM rooms WHERE created_at < NOW() - INTERVAL '6 hours'
		 ),
		 archive_rooms AS (
		   INSERT INTO archived_rooms
		     (id, name, invite_code, creator_id, creator_email, created_at, is_active, archived_at)
		   -- COALESCE handles the rare case where the creator account was deleted
		   SELECT r.id, r.name, r.invite_code, r.creator_id, COALESCE(u.email, ''),
		          COALESCE(r.created_at, NOW()), r.is_active, NOW()
		   FROM rooms r
		   LEFT JOIN users u ON u.id = r.creator_id
		   WHERE r.id IN (SELECT id FROM expired)
		   ON CONFLICT (id) DO NOTHING
		 ),
		 archive_participants AS (
		   INSERT INTO archived_participants
		     (id, room_id, nickname, joined_at, last_seen_at, archived_at)
		   SELECT id, room_id, nickname, joined_at, last_seen_at, NOW()
		   FROM participants
		   WHERE room_id IN (SELECT id FROM expired)
		   ON CONFLICT (id) DO NOTHING
		 ),
		 archive_messages AS (
		   INSERT INTO archived_messages
		     (id, room_id, participant_id, nickname, content, created_at, archived_at)
		   SELECT m.id, m.room_id, m.participant_id, p.nickname, m.content, m.created_at, NOW()
		   FROM messages m
		   JOIN participants p ON p.id = m.participant_id
		   WHERE m.room_id IN (SELECT id FROM expired)
		   ON CONFLICT (id) DO NOTHING
		 )
		 DELETE FROM rooms WHERE id IN (SELECT id FROM expired)
		 RETURNING id`
	);

	return result.rows.map((r) => r.id);
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
