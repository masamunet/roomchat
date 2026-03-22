<script lang="ts">
	import { addHours, differenceInMinutes } from 'date-fns';
	import QrCode from '$lib/components/QrCodeDisplay.svelte';

	let { data } = $props();
	let copied = $state(false);

	function getRemainingTime(createdAt: Date): string {
		const expiresAt = addHours(new Date(createdAt), 6);
		const minutesLeft = differenceInMinutes(expiresAt, new Date());
		if (minutesLeft <= 0) return '期限切れ';
		const hours = Math.floor(minutesLeft / 60);
		const mins = minutesLeft % 60;
		if (hours > 0) return `残り${hours}時間${mins}分`;
		return `残り${mins}分`;
	}

	async function copyInviteCode() {
		await navigator.clipboard.writeText(data.room.inviteCode);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<div class="max-w-md mx-auto px-4 py-6">
	<a href="/admin" class="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; ルーム一覧に戻る</a>

	<div class="bg-white rounded-xl border border-gray-200 p-6">
		<h1 class="text-xl font-bold text-gray-900 mb-1">{data.room.name}</h1>
		<p class="text-sm text-orange-600 font-medium mb-6">{getRemainingTime(data.room.createdAt)}</p>

		<!-- QR Code -->
		<div class="flex justify-center mb-6">
			<QrCode value={data.joinUrl} />
		</div>

		<!-- Invite Code -->
		<div class="text-center mb-6">
			<p class="text-sm text-gray-500 mb-1">招待コード</p>
			<button
				onclick={copyInviteCode}
				class="text-2xl font-mono font-bold tracking-widest text-gray-900 bg-gray-100 px-6 py-3 rounded-lg hover:bg-gray-200 active:bg-gray-300"
			>
				{data.room.inviteCode}
			</button>
			{#if copied}
				<p class="text-sm text-green-600 mt-1">コピーしました!</p>
			{/if}
		</div>

		<!-- Join URL -->
		<div class="text-center mb-6">
			<p class="text-sm text-gray-500 mb-1">参加URL</p>
			<code class="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded block break-all">{data.joinUrl}</code>
		</div>

		<!-- Enter Room -->
		<a
			href="/room/{data.room.id}"
			class="block w-full text-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
		>
			入室する
		</a>

		<!-- Participants -->
		{#if data.participants.length > 0}
			<div class="mt-6 pt-4 border-t border-gray-100">
				<p class="text-sm text-gray-500 mb-2">参加者 ({data.participants.length}人)</p>
				<div class="flex flex-wrap gap-2">
					{#each data.participants as p}
						<span class="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">{p.nickname}</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
