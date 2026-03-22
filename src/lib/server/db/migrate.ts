import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DbClient } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(db: DbClient): Promise<void> {
	const migrationPath = join(__dirname, 'migrations', '001_initial.sql');
	const sql = readFileSync(migrationPath, 'utf-8');

	const statements = sql
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		await db.query(statement);
	}
}
