import { getDb } from '$lib/server/db/index.js';
import { generateInviteCode } from '$lib/utils/invite-code.js';
import type { Room } from '$lib/types/index.js';
import { ARCHIVE_RETENTION_YEARS } from '$lib/plans.js';


interface RoomRow {
	id: string;
	name: string;
	invite_code: string;
	creator_id: string;
	created_at: string | Date;
	expires_at: string | Date;
	is_active: boolean;
}

function toRoom(row: RoomRow): Room {
	return {
		id: row.id,
		name: row.name,
		inviteCode: row.invite_code,
		creatorId: row.creator_id,
		createdAt: new Date(row.created_at),
		expiresAt: new Date(row.expires_at),
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
		 AND expires_at > NOW()`,
		[inviteCode.toUpperCase()]
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
		     (id, name, invite_code, creator_id, creator_email, created_at, expires_at, is_active, archived_at)
		   -- COALESCE handles the rare case where the creator account was deleted
		   SELECT r.id, r.name, r.invite_code, r.creator_id, COALESCE(u.email, ''),
		          COALESCE(r.created_at, NOW()), r.expires_at, r.is_active, NOW()
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
 * Archive then hard-delete all rooms past their expires_at.
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
		   SELECT id FROM rooms WHERE expires_at < NOW()
		 ),
		 archive_rooms AS (
		   INSERT INTO archived_rooms
		     (id, name, invite_code, creator_id, creator_email, created_at, expires_at, is_active, archived_at)
		   -- COALESCE handles the rare case where the creator account was deleted
		   SELECT r.id, r.name, r.invite_code, r.creator_id, COALESCE(u.email, ''),
		          COALESCE(r.created_at, NOW()), r.expires_at, r.is_active, NOW()
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

/** Permanently delete archived rooms (and their participants and messages) past the retention period. */
export async function purgeOldArchives(): Promise<void> {
	const db = await getDb();
	await db.query(
		`WITH old AS (
		   DELETE FROM archived_rooms WHERE archived_at < NOW() - make_interval(years => $1) RETURNING id
		 ),
		 old_messages AS (
		   DELETE FROM archived_messages WHERE room_id IN (SELECT id FROM old)
		 )
		 DELETE FROM archived_participants WHERE room_id IN (SELECT id FROM old)`,
		[ARCHIVE_RETENTION_YEARS]
	);
}

export async function countActiveRoomsByCreator(creatorId: string): Promise<number> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`SELECT count(*)::text as count FROM rooms
		 WHERE creator_id = $1 AND is_active = TRUE
		 AND expires_at > NOW()`,
		[creatorId]
	);
	return parseInt(result.rows[0]?.count ?? '0', 10);
}

export interface ArchivedRoom {
	id: string;
	name: string;
	createdAt: Date;
	archivedAt: Date;
	messageCount: number;
}

interface ArchivedRoomRow {
	id: string;
	name: string;
	created_at: string | Date;
	archived_at: string | Date;
	message_count: string;
}

function toArchivedRoom(row: ArchivedRoomRow): ArchivedRoom {
	return {
		id: row.id,
		name: row.name,
		createdAt: new Date(row.created_at),
		archivedAt: new Date(row.archived_at),
		messageCount: parseInt(row.message_count, 10)
	};
}

export async function countArchivedRoomsByCreator(creatorId: string): Promise<number> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`SELECT count(*)::text as count FROM archived_rooms WHERE creator_id = $1`,
		[creatorId]
	);
	return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function listArchivedRoomsByCreator(creatorId: string, limit = 500): Promise<ArchivedRoom[]> {
	const db = await getDb();
	const result = await db.query<ArchivedRoomRow>(
		`SELECT r.id, r.name, r.created_at, r.archived_at,
		        (SELECT count(*) FROM archived_messages m WHERE m.room_id = r.id)::text AS message_count
		 FROM archived_rooms r
		 WHERE r.creator_id = $1
		 ORDER BY r.archived_at DESC
		 LIMIT $2`,
		[creatorId, limit]
	);
	return result.rows.map(toArchivedRoom);
}

export async function getArchivedRoomById(roomId: string): Promise<(ArchivedRoom & { creatorId: string }) | null> {
	const db = await getDb();
	const result = await db.query<ArchivedRoomRow & { creator_id: string }>(
		`SELECT r.id, r.name, r.created_at, r.archived_at, r.creator_id,
		        (SELECT count(*) FROM archived_messages m WHERE m.room_id = r.id)::text AS message_count
		 FROM archived_rooms r
		 WHERE r.id = $1`,
		[roomId]
	);
	if (result.rows.length === 0) return null;
	return { ...toArchivedRoom(result.rows[0]), creatorId: result.rows[0].creator_id };
}
