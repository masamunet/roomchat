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
	const inviteCode = generateInviteCode();

	const result = await db.query<RoomRow>(
		`INSERT INTO rooms (name, invite_code, creator_id)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[name, inviteCode, creatorId]
	);

	return toRoom(result.rows[0]);
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

export async function deleteExpiredRooms(): Promise<number> {
	const db = await getDb();
	const result = await db.query<{ count: string }>(
		`WITH deleted AS (
			DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '6 hours'
			RETURNING id
		) SELECT count(*)::text as count FROM deleted`
	);
	return parseInt(result.rows[0]?.count ?? '0', 10);
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
