import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import * as arctic from 'arctic';
import { getGoogleOAuth } from '$lib/server/auth.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const google = getGoogleOAuth();
	const state = arctic.generateState();
	const codeVerifier = arctic.generateCodeVerifier();
	const scopes = ['openid', 'profile', 'email'];

	const url = google.createAuthorizationURL(state, codeVerifier, scopes);

	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	cookies.set('google_code_verifier', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	redirect(302, url.toString());
};
