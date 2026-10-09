<script lang="ts">
	import { onDestroy } from 'svelte';
	import QrCode from '$lib/components/QrCodeDisplay.svelte';
	import { getRemainingTime } from '$lib/utils/remaining-time.js';

	let { data } = $props();
	let copied = $state<'code' | 'invitation' | null>(null);
	let copyError = $state('');
	let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(copyFeedbackTimer));

	async function copyInvitation(mode: 'code' | 'invitation') {
		clearTimeout(copyFeedbackTimer);
		copied = null;
		copyError = '';
		const text = mode === 'code'
			? data.room.inviteCode
			: `参加URL: ${data.joinUrl}\n招待コード: ${data.room.inviteCode}`;
		try {
			await navigator.clipboard.writeText(text);
			copied = mode;
			copyFeedbackTimer = setTimeout(() => copied = null, 2000);
		} catch {
			copyError = 'コピーできませんでした。表示されているURLと招待コードを選択してコピーしてください。';
		}
	}

</script>

<svelte:head>
	<title>{data.room.name} - RoomChat</title>
</svelte:head>

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
				type="button"
				aria-label="招待コードのみをコピー"
				onclick={() => copyInvitation('code')}
				class="text-2xl font-mono font-bold tracking-widest text-gray-900 bg-gray-100 px-6 py-3 rounded-lg hover:bg-gray-200 active:bg-gray-300"
			>
				{data.room.inviteCode}
			</button>
			<p class="text-xs text-gray-500 mt-2">クリックで招待コードのみをコピー</p>
		</div>

		<!-- Join URL -->
		<div class="text-center mb-6">
			<p class="text-sm text-gray-500 mb-1">参加URL</p>
			<code class="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded block break-all">{data.joinUrl}</code>
			<button
				type="button"
				onclick={() => copyInvitation('invitation')}
				class="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
			>URLと招待コードをコピー</button>
			<p class="mt-2 text-sm text-green-600" role="status">{copied === 'code' ? '招待コードをコピーしました' : copied === 'invitation' ? 'URLと招待コードをコピーしました' : ''}</p>
			{#if copyError}<p class="mt-2 text-sm text-red-600" role="alert">{copyError}</p>{/if}
		</div>

		<!-- Enter Room -->
		<a
			href="/join/{data.room.inviteCode}"
			class="block w-full text-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
		>
			入室する
		</a>

		<!-- CSV Download -->
		<a
			href="/api/rooms/{data.room.id}/logs.csv"
			download
			class="block w-full text-center px-4 py-3 mt-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
		>
			ログをCSVダウンロード
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
