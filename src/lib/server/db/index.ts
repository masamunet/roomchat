import { env } from '$env/dynamic/private';

export interface DbClient {
	query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let dbPromise: Promise<DbClient> | null = null;

export function getDb(): Promise<DbClient> {
	if (!dbPromise) {
		dbPromise = (async () => {
			if (env.DATABASE_URL) {
				const { createPostgresClient } = await import('./postgres.js');
				return createPostgresClient(env.DATABASE_URL);
			} else {
				const { createPGLiteClient } = await import('./pglite.js');
				return createPGLiteClient();
			}
		})();
	}
	return dbPromise;
}
