<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>RoomChat</title>
</svelte:head>

<div class="min-h-dvh bg-gray-50 flex flex-col">
	<Header user={data.user} />
	<main class="flex-1">
		{@render children()}
	</main>
</div>
