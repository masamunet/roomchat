import { mkdirSync } from 'fs';
import { join } from 'path';
import { PGlite } from '@electric-sql/pglite';
import type { DbClient } from './index.js';

let instance: PGlite | null = null;

export async function createPGLiteClient(): Promise<DbClient> {
	if (!instance) {
		const dataDir = join(process.cwd(), 'data', 'pglite');
		mkdirSync(dataDir, { recursive: true });
		instance = new PGlite(dataDir);
		await instance.waitReady;
	}

	return {
		async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> {
			const result = await instance!.query<T>(sql, params);
			return { rows: result.rows };
		}
	};
}
