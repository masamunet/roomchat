<script lang="ts">
	import { enhance } from '$app/forms';
	import { getRemainingTime } from '$lib/utils/remaining-time.js';

	let { data, form } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-6">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">ルーム管理</h1>

	<!-- Create Room Form -->
	<form method="POST" action="?/create" use:enhance class="mb-8">
		<div class="bg-white rounded-xl border border-gray-200 p-4">
			<h2 class="text-lg font-semibold text-gray-800 mb-3">新しいルームを作成</h2>
			<div class="flex gap-3">
				<input
					type="text"
					name="name"
					placeholder="ルーム名を入力"
					required
					maxlength="100"
					class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<button
					type="submit"
					class="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 whitespace-nowrap"
				>
					作成
				</button>
			</div>
			{#if form?.error}
				<p class="mt-2 text-sm text-red-600">{form.error}</p>
			{/if}
		</div>
	</form>

	<!-- Room List -->
	<div class="space-y-3">
		<h2 class="text-lg font-semibold text-gray-800">ルーム一覧</h2>
		{#if data.rooms.length === 0}
			<p class="text-gray-500 text-sm py-8 text-center">ルームがありません</p>
		{:else}
			{#each data.rooms as room}
				<div class="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
					<div class="flex-1 min-w-0">
						<a href="/admin/{room.id}" class="text-base font-medium text-gray-900 hover:text-blue-600 truncate block">
							{room.name}
						</a>
						<div class="flex items-center gap-3 mt-1">
							<span class="text-xs text-gray-500">
								招待コード: <code class="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{room.inviteCode}</code>
							</span>
							<span class="text-xs text-orange-600 font-medium">
								{getRemainingTime(room.createdAt)}
							</span>
						</div>
					</div>
					<div class="flex items-center gap-2 ml-4">
						<a
							href="/admin/{room.id}"
							class="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
						>
							詳細
						</a>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="roomId" value={room.id} />
							<button
								type="submit"
								class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
								onclick={(e) => { if (!confirm('このルームを削除しますか？')) e.preventDefault(); }}
							>
								削除
							</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
