import * as arctic from 'arctic';
import { env } from '$env/dynamic/private';
import { nanoid } from 'nanoid';
import { getDb } from '$lib/server/db/index.js';
import type { User, Session } from '$lib/types/index.js';

let google: arctic.Google | null = null;

export function getGoogleOAuth(): arctic.Google {
	if (!google) {
		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;
		const origin = env.ORIGIN || 'http://localhost:5173';

		if (!clientId || !clientSecret) {
			throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
		}

		google = new arctic.Google(clientId, clientSecret, `${origin}/auth/google/callback`);
	}
	return google;
}

export async function createSession(userId: string): Promise<Session> {
	const db = await getDb();
	const sessionId = nanoid(64);
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

	await db.query(
		`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
		[sessionId, userId, expiresAt.toISOString()]
	);

	return { id: sessionId, userId, expiresAt };
}

export async function deleteSession(sessionId: string): Promise<void> {
	const db = await getDb();
	await db.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}

export async function findOrCreateUser(googleUser: {
	sub: string;
	email: string;
	name?: string;
	picture?: string;
}): Promise<User> {
	const db = await getDb();

	// Upsert: INSERT ON CONFLICT to avoid TOCTOU race
	const result = await db.query<{
		id: string;
		google_id: string;
		email: string;
		name: string | null;
		avatar_url: string | null;
		created_at: Date;
	}>(
		`INSERT INTO users (google_id, email, name, avatar_url)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (google_id) DO UPDATE
		 SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
		 RETURNING *`,
		[googleUser.sub, googleUser.email, googleUser.name ?? null, googleUser.picture ?? null]
	);

	const row = result.rows[0];
	return {
		id: row.id,
		googleId: row.google_id,
		email: row.email,
		name: row.name,
		avatarUrl: row.avatar_url,
		createdAt: new Date(row.created_at)
	};
}
