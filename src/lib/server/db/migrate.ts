import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DbClient } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(db: DbClient): Promise<void> {
	// Create migrations tracking table
	await db.query(`
		CREATE TABLE IF NOT EXISTS _migrations (
			name VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`);

	const migrationsDir = join(__dirname, 'migrations');
	const files = readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		// Check if already applied
		const applied = await db.query<{ name: string }>(
			`SELECT name FROM _migrations WHERE name = $1`,
			[file]
		);
		if (applied.rows.length > 0) continue;

		const sql = readFileSync(join(migrationsDir, file), 'utf-8');

		// Execute entire migration in a transaction
		await db.query('BEGIN');
		try {
			await db.query(sql);
			await db.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
			await db.query('COMMIT');
		} catch (e) {
			await db.query('ROLLBACK');
			throw new Error(`Migration ${file} failed: ${e instanceof Error ? e.message : e}`);
		}
	}
}
