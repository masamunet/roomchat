<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>エラー - RoomChat</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[calc(100dvh-60px)] px-4">
	<div class="w-full max-w-sm text-center">
		<p class="text-6xl font-bold text-gray-300 mb-4">{$page.status}</p>

		<h1 class="text-xl font-bold text-gray-900 mb-2">
			{#if $page.status === 404}
				ページが見つかりません
			{:else if $page.status === 403}
				アクセスが拒否されました
			{:else}
				エラーが発生しました
			{/if}
		</h1>

		{#if $page.error?.message}
			<p class="text-gray-500 mb-8">{$page.error.message}</p>
		{/if}

		<a
			href="/"
			class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800"
		>
			トップに戻る
		</a>
	</div>
</div>
