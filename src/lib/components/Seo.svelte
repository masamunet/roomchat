<script lang="ts">
	import { page } from '$app/state';

	type Props = {
		title: string;
		description?: string;
		ogTitle?: string;
		ogType?: 'website' | 'article';
		noindex?: boolean;
		jsonLd?: Record<string, unknown>;
	};

	const DEFAULT_DESCRIPTION =
		'4文字の招待コードを共有するだけで、登録不要・匿名ですぐに参加できるリアルタイムチャット。Slack・LINE・ニコニコ風の3つの表示モードに対応。';

	let {
		title,
		description = DEFAULT_DESCRIPTION,
		ogTitle,
		ogType = 'website',
		noindex = false,
		jsonLd
	}: Props = $props();

	const origin = $derived(page.url.origin);
	const pageUrl = $derived(`${origin}${page.url.pathname}`);
	const ogImageUrl = $derived(`${origin}/ogp.png`);
	const resolvedOgTitle = $derived(ogTitle ?? title);
	const serializedJsonLd = $derived(
		jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : null
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
	{#if !noindex}
		<link rel="canonical" href={pageUrl} />
	{/if}

	<meta property="og:site_name" content="RoomChat" />
	<meta property="og:locale" content="ja_JP" />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={resolvedOgTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="RoomChat - 4文字の招待コードで、すぐに始める匿名チャット" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={resolvedOgTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImageUrl} />

	{#if serializedJsonLd}
		{@html `<script type="application/ld+json">${serializedJsonLd}</script>`}
	{/if}
</svelte:head>
