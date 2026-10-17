<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, updated, children }: { title: string; updated: string; children: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} - RoomChat</title>
</svelte:head>

<article class="legal max-w-2xl mx-auto px-4 py-8 text-sm leading-relaxed text-gray-700">
	<h1 class="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
	<p class="text-xs text-gray-400 mb-8">最終更新日: {updated}</p>
	{@render children()}
</article>

<style>
	.legal :global(h2) {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-gray-900);
		margin: 1.75rem 0 0.5rem;
	}
	.legal :global(p),
	.legal :global(ol),
	.legal :global(ul) {
		margin-bottom: 0.75rem;
	}
	.legal :global(ol) {
		list-style: decimal;
		padding-left: 1.5rem;
	}
	.legal :global(ul) {
		list-style: disc;
		padding-left: 1.5rem;
	}
	.legal :global(dl) {
		display: grid;
		grid-template-columns: minmax(7rem, 11rem) 1fr;
		border-top: 1px solid var(--color-gray-200);
	}
	.legal :global(dt),
	.legal :global(dd) {
		padding: 0.75rem 0.5rem;
		border-bottom: 1px solid var(--color-gray-200);
	}
	.legal :global(dt) {
		font-weight: 600;
		color: var(--color-gray-900);
		background: var(--color-gray-50);
	}
	@media (max-width: 480px) {
		.legal :global(dl) {
			grid-template-columns: 1fr;
		}
		.legal :global(dt) {
			border-bottom: none;
		}
	}
</style>
