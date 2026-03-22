import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/index.js';
import { runMigrations } from '$lib/server/db/migrate.js';

let initPromise: Promise<void> | null = null;

function initializeDb() {
	if (!initPromise) {
		initPromise = (async () => {
			const db = await getDb();
			await runMigrations(db);
		})();
	}
	return initPromise;
}

// Periodically clean expired sessions (at most once per 10 minutes)
let lastSessionCleanup = 0;
async function cleanExpiredSessions() {
	const now = Date.now();
	if (now - lastSessionCleanup < 600_000) return;
	lastSessionCleanup = now;
	const db = await getDb();
	await db.query(`DELETE FROM sessions WHERE expires_at < NOW()`);
}

export const handle: Handle = async ({ event, resolve }) => {
	await initializeDb();

	// Read session cookie
	const sessionId = event.cookies.get('session_id');
	event.locals.user = null;

	if (sessionId) {
		const db = await getDb();
		const result = await db.query<{
			user_id: string;
			name: string | null;
			email: string;
			avatar_url: string | null;
			expires_at: Date;
		}>(
			`SELECT s.user_id, s.expires_at, u.name, u.email, u.avatar_url
			 FROM sessions s JOIN users u ON s.user_id = u.id
			 WHERE s.id = $1 AND s.expires_at > NOW()`,
			[sessionId]
		);

		if (result.rows.length > 0) {
			const row = result.rows[0];
			event.locals.user = {
				id: row.user_id,
				name: row.name,
				email: row.email,
				avatarUrl: row.avatar_url
			};
		} else {
			// Expired session, clear cookie
			event.cookies.delete('session_id', { path: '/' });
		}
	}

	// Periodic session cleanup (non-blocking)
	cleanExpiredSessions().catch(() => {});

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; img-src 'self' https://*.googleusercontent.com data:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'"
	);

	return response;
};
