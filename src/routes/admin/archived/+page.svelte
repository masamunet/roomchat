<script lang="ts">
	import { ARCHIVE_CSV_PLAN, ARCHIVE_RETENTION_YEARS, formatYen } from '$lib/plans.js';
	import PurchaseConfirmDialog, { type PurchaseItem } from '$lib/components/PurchaseConfirmDialog.svelte';
	import { addYears, format } from 'date-fns';

	let { data, form } = $props();

	let purchase = $state<PurchaseItem | null>(null);
</script>

<svelte:head>
	<title>過去のチャットルーム - RoomChat</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
	<a href="/admin" class="text-sm text-blue-600 hover:underline">&larr; ルーム管理に戻る</a>
	<h1 class="text-2xl font-bold text-gray-900 mt-2 mb-2">過去のチャットルーム</h1>
	<p class="text-sm text-gray-600 mb-6">
		終了したルームのログをCSVでダウンロードできます（1ルームにつき{formatYen(ARCHIVE_CSV_PLAN.amount)}・税込）。一度購入したルームは、何度でもダウンロードできます。ログはルーム終了から{ARCHIVE_RETENTION_YEARS}年で削除されます。
	</p>

	{#if data.purchased}
		<p class="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700" role="status">ご購入ありがとうございます。CSVをダウンロードできます。</p>
	{/if}
	{#if form?.error}
		<p class="mb-4 text-sm text-red-600" role="alert">{form.error}</p>
	{/if}

	{#if data.archivedRooms.length === 0}
		<p class="text-gray-500 text-sm py-8 text-center">終了したルームはまだありません</p>
	{:else}
		<div class="space-y-3">
			{#each data.archivedRooms as room}
				<div class="ui-card bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
					<div class="flex-1 min-w-0">
						<p class="text-base font-medium text-gray-900 truncate">{room.name}</p>
						<p class="text-xs text-gray-500 mt-1">
							{format(new Date(room.createdAt), 'yyyy/MM/dd HH:mm')} 作成・{format(new Date(room.archivedAt), 'yyyy/MM/dd HH:mm')} 終了・{room.messageCount}件のメッセージ
						</p>
						<p class="text-xs text-gray-400 mt-0.5">
							{format(addYears(new Date(room.archivedAt), ARCHIVE_RETENTION_YEARS), 'yyyy/MM/dd')} にログ削除予定
						</p>
					</div>
					{#if room.csvPurchased}
						<a
							href="/api/rooms/{room.id}/archive.csv"
							download
							class="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
						>
							CSVダウンロード
						</a>
					{:else if data.billingEnabled}
						<button
							type="button"
							onclick={() => purchase = {
								kind: 'archive_csv',
								name: `${ARCHIVE_CSV_PLAN.label}（${room.name}）`,
								detail: `終了したこのルームのメッセージ${room.messageCount}件をCSVファイルでダウンロードできるようになります。`,
								amount: ARCHIVE_CSV_PLAN.amount,
								action: '?/buyArchiveCsv',
								fields: { roomId: room.id }
							}}
							class="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg"
						>
							CSVを購入（{formatYen(ARCHIVE_CSV_PLAN.amount)}）
						</button>
					{:else}
						<span class="text-xs text-gray-400">現在購入できません</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if data.billingEnabled}
		<p class="mt-6 text-xs text-gray-400"><a href="/legal/commerce" class="underline hover:text-gray-600">特定商取引法に基づく表記</a></p>
	{/if}
</div>

<PurchaseConfirmDialog item={purchase} onCancel={() => purchase = null} />
