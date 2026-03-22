import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');
	if (sessionId) {
		await deleteSession(sessionId);
		cookies.delete('session_id', { path: '/' });
	}
	redirect(302, '/');
};
