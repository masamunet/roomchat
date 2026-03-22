import pg from 'pg';
import { env } from '$env/dynamic/private';
import type { DbClient } from './index.js';

let pool: pg.Pool | null = null;

const VALID_SSL_MODES = ['disable', 'no-verify', 'prefer', 'require'] as const;

function buildSslConfig(): pg.PoolConfig['ssl'] {
	let sslMode = env.DB_SSL_MODE ?? 'prefer';
	if (!VALID_SSL_MODES.includes(sslMode as (typeof VALID_SSL_MODES)[number])) {
		console.warn(`[WARN] Unknown DB_SSL_MODE "${sslMode}", defaulting to "prefer"`);
		sslMode = 'prefer';
	}
	if (sslMode === 'disable') return false;
	return {
		rejectUnauthorized: sslMode !== 'no-verify'
	};
}

export async function createPostgresClient(connectionString: string): Promise<DbClient> {
	if (!pool) {
		pool = new pg.Pool({
			connectionString,
			max: 10,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 5_000,
			ssl: buildSslConfig()
		});

		pool.on('error', (err) => {
			console.error('Unexpected pool error:', err);
		});

		// Graceful shutdown (registered once with pool creation)
		const shutdown = () => {
			pool?.end().catch((e) => console.error('Pool shutdown error:', e));
		};
		process.on('SIGTERM', shutdown);
		process.on('SIGINT', shutdown);
	}

	return {
		async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
			const result = await pool!.query(sql, params);
			return { rows: result.rows as T[] };
		}
	};
}
