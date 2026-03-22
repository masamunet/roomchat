import { redirect, error } from '@sveltejs/kit';
import * as arctic from 'arctic';
import { getGoogleOAuth, findOrCreateUser, createSession } from '$lib/server/auth.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('google_oauth_state');
	const codeVerifier = cookies.get('google_code_verifier');

	if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
		error(400, '無効なリクエストです');
	}

	// Clean up OAuth cookies
	cookies.delete('google_oauth_state', { path: '/' });
	cookies.delete('google_code_verifier', { path: '/' });

	try {
		const google = getGoogleOAuth();
		const tokens = await google.validateAuthorizationCode(code, codeVerifier);
		const accessToken = tokens.accessToken();

		// Fetch user profile
		const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${accessToken}` }
		});

		if (!response.ok) {
			error(500, 'Googleプロフィール取得に失敗しました');
		}

		const googleUser = await response.json();
		const user = await findOrCreateUser({
			sub: googleUser.sub,
			email: googleUser.email,
			name: googleUser.name,
			picture: googleUser.picture
		});

		const session = await createSession(user.id);

		cookies.set('session_id', session.id, {
			path: '/',
			httpOnly: true,
			secure: false,
			maxAge: 30 * 24 * 60 * 60,
			sameSite: 'lax'
		});
	} catch (e) {
		if (e instanceof arctic.OAuth2RequestError) {
			error(400, '認証に失敗しました');
		}
		throw e;
	}

	redirect(302, '/admin');
};
