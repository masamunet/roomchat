import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const body = [
		'User-agent: *',
		'Disallow: /admin',
		'Disallow: /room/',
		'Disallow: /api/',
		'Disallow: /auth/',
		'Disallow: /billing/',
		'',
		`Sitemap: ${url.origin}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
