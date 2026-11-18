<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { page } from '$app/state';

	let { data, children } = $props();
</script>

<div class="min-h-dvh bg-gray-50 flex flex-col">
	<Header user={data.user} />
	<main class="flex-1">
		{@render children()}
	</main>
	{#if !page.url.pathname.startsWith('/room/')}
		<Footer />
	{/if}
</div>
