import pg from 'pg';
import type { DbClient } from './index.js';

let pool: pg.Pool | null = null;

export async function createPostgresClient(connectionString: string): Promise<DbClient> {
	if (!pool) {
		pool = new pg.Pool({ connectionString });
	}

	return {
		async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
			const result = await pool!.query(sql, params);
			return { rows: result.rows as T[] };
		}
	};
}
