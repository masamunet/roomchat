import type { RequestHandler } from './$types';

const PUBLIC_PAGES = [
	{ path: '/', changefreq: 'weekly', priority: '1.0' },
	{ path: '/legal/terms', changefreq: 'monthly', priority: '0.3' },
	{ path: '/legal/privacy', changefreq: 'monthly', priority: '0.3' },
	{ path: '/legal/commerce', changefreq: 'monthly', priority: '0.3' }
];

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;
	const urls = PUBLIC_PAGES.map(
		({ path, changefreq, priority }) =>
			`\t<url>\n\t\t<loc>${origin}${path}</loc>\n\t\t<changefreq>${changefreq}</changefreq>\n\t\t<priority>${priority}</priority>\n\t</url>`
	).join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
