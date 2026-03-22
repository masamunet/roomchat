import pg from 'pg';
import type { DbClient } from './index.js';

let pool: pg.Pool | null = null;

export async function createPostgresClient(connectionString: string): Promise<DbClient> {
	if (!pool) {
		pool = new pg.Pool({
			connectionString,
			max: 10,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 5_000
		});
	}

	// Graceful shutdown
	const shutdown = () => {
		pool?.end().catch(() => {});
	};
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);

	return {
		async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
			const result = await pool!.query(sql, params);
			return { rows: result.rows as T[] };
		}
	};
}
