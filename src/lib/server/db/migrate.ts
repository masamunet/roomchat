import type { DbClient } from './index.js';

/**
 * Embedded migration SQL.
 * Using embedded strings instead of readFileSync so migrations work
 * after adapter-node builds (where the migrations/ directory is not available).
 * Each migration contains an array of individual statements for PGlite compatibility.
 */
const migrations: { name: string; statements: string[] }[] = [
	{
		name: '001_initial.sql',
		statements: [
			`CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`,
			`CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
)`,
			`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
			`CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(8) NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
)`,
			`CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code)`,
			`CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id, created_at)`,
			`CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, nickname)
)`,
			`CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id)`,
			`CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`,
			`CREATE INDEX IF NOT EXISTS idx_messages_room_id_created ON messages(room_id, created_at)`
		]
	}
];

export async function runMigrations(db: DbClient): Promise<void> {
	// Create migrations tracking table
	await db.query(`
		CREATE TABLE IF NOT EXISTS _migrations (
			name VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`);

	for (const migration of migrations) {
		// Check if already applied
		const applied = await db.query<{ name: string }>(
			`SELECT name FROM _migrations WHERE name = $1`,
			[migration.name]
		);
		if (applied.rows.length > 0) continue;

		// Execute each statement individually in a transaction
		await db.query('BEGIN');
		try {
			for (const statement of migration.statements) {
				await db.query(statement);
			}
			await db.query(`INSERT INTO _migrations (name) VALUES ($1)`, [migration.name]);
			await db.query('COMMIT');
		} catch (e) {
			await db.query('ROLLBACK');
			throw new Error(
				`Migration ${migration.name} failed: ${e instanceof Error ? e.message : e}`
			);
		}
	}
}
