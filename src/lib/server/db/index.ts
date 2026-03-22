import { env } from '$env/dynamic/private';

export interface DbClient {
	query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let dbClient: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
	if (dbClient) return dbClient;

	if (env.DATABASE_URL) {
		const { createPostgresClient } = await import('./postgres.js');
		dbClient = await createPostgresClient(env.DATABASE_URL);
	} else {
		const { createPGLiteClient } = await import('./pglite.js');
		dbClient = await createPGLiteClient();
	}

	return dbClient;
}
