<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onDestroy } from 'svelte';
	import QrCode from '$lib/components/QrCodeDisplay.svelte';
	import { getRemainingTime } from '$lib/utils/remaining-time.js';
	import { ROOM_EXTENSION_PLANS, formatYen } from '$lib/plans.js';

	let { data, form } = $props();
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

	<div class="ui-card bg-white rounded-xl border border-gray-200 p-6">
		<h1 class="text-xl font-bold text-gray-900 mb-1">{data.room.name}</h1>
		<p class="text-sm text-orange-600 font-medium mb-6">{getRemainingTime(data.room.expiresAt)}</p>

		{#if data.purchased}
			<p class="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700" role="status">ルームを延長しました。ご購入ありがとうございます。</p>
		{/if}

		<!-- QR Code -->
		<div class="flex justify-center mb-6">
			<QrCode value={data.joinUrl} />
		</div>

		<!-- Invite Code -->
		<div class="text-center mb-6">
			<p class="text-sm text-gray-500 mb-1">招待コード</p>
			<Button variant="secondary"
				type="button"
				aria-label="招待コードのみをコピー"
				onclick={() => copyInvitation('code')}
				class="text-2xl font-mono font-bold tracking-widest text-gray-900 bg-gray-100 px-6 py-3 rounded-lg hover:bg-gray-200 active:bg-gray-300"
			>
				{data.room.inviteCode}
			</Button>
			<p class="text-xs text-gray-500 mt-2">クリックで招待コードのみをコピー</p>
		</div>

		<!-- Join URL -->
		<div class="text-center mb-6">
			<p class="text-sm text-gray-500 mb-1">参加URL</p>
			<code class="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded block break-all">{data.joinUrl}</code>
			<Button variant="secondary"
				type="button"
				onclick={() => copyInvitation('invitation')}
				class="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
			>URLと招待コードをコピー</Button>
			<p class="mt-2 text-sm text-green-600" role="status">{copied === 'code' ? '招待コードをコピーしました' : copied === 'invitation' ? 'URLと招待コードをコピーしました' : ''}</p>
			{#if copyError}<p class="mt-2 text-sm text-red-600" role="alert">{copyError}</p>{/if}
		</div>

		<!-- Enter Room -->
		<a
			href="/join/{data.room.inviteCode}"
			class="ui-button ui-button-primary block w-full text-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
		>
			入室する
		</a>

		<!-- CSV Download -->
		<a
			href="/api/rooms/{data.room.id}/logs.csv"
			download
			class="ui-button ui-button-secondary block w-full text-center px-4 py-3 mt-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
		>
			ログをCSVダウンロード
		</a>

		<!-- Room Extension -->
		{#if data.billingEnabled}
			<div class="mt-6 pt-4 border-t border-gray-100">
				<p class="text-sm font-medium text-gray-700">ルームを延長する</p>
				<p class="text-xs text-gray-500 mt-1 mb-3">残り時間に追加されます。お支払いはStripeの決済ページで行います。</p>
				<form method="POST" action="?/extend" class="grid grid-cols-3 gap-2">
					{#each ROOM_EXTENSION_PLANS as plan}
						<button
							type="submit"
							name="plan"
							value={plan.id}
							class="ui-button ui-button-secondary flex flex-col items-center rounded-lg border border-gray-200 bg-white px-2 py-3 hover:border-blue-300 hover:bg-blue-50"
						>
							<span class="text-sm font-medium text-gray-900">{plan.label}</span>
							<span class="text-xs text-gray-500 mt-0.5">{formatYen(plan.amount)}（税込）</span>
						</button>
					{/each}
				</form>
				{#if form?.error}<p class="mt-2 text-sm text-red-600" role="alert">{form.error}</p>{/if}
				<p class="mt-2 text-xs text-gray-400"><a href="/legal/commerce" class="underline hover:text-gray-600">特定商取引法に基づく表記</a></p>
			</div>
		{/if}

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
