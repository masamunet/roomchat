<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { enhance } from '$app/forms';
	import { getRemainingTime } from '$lib/utils/remaining-time.js';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { ARCHIVE_CSV_PLAN, formatYen } from '$lib/plans.js';
	import PurchaseConfirmDialog, { type PurchaseItem } from '$lib/components/PurchaseConfirmDialog.svelte';
	import { format } from 'date-fns';

	let { data, form } = $props();

	let deleteTargetRoomId = $state<string | null>(null);
	let deleteFormRefs: Record<string, HTMLFormElement> = {};
	let purchase = $state<PurchaseItem | null>(null);
</script>

<svelte:head>
	<title>ルーム管理 - RoomChat</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">ルーム管理</h1>

	<!-- Create Room Form -->
	<form method="POST" action="?/create" use:enhance class="mb-8">
		<div class="ui-card bg-white rounded-xl border border-gray-200 p-4">
			<h2 class="text-lg font-semibold text-gray-800 mb-3">新しいルームを作成</h2>
			<div class="flex gap-3">
				<input
					type="text"
					name="name"
					placeholder="ルーム名を入力"
					required
					maxlength="100"
					aria-label="ルーム名"
					aria-describedby={form?.error && form?.action === 'create' ? 'room-create-error' : undefined}
					class="ui-input flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<Button variant="primary"
					type="submit"
					class="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 whitespace-nowrap"
				>
					作成
				</Button>
			</div>
			<p class="mt-2 text-xs text-gray-500">作成により<a href="/legal/terms" class="underline">利用規約</a>と<a href="/legal/privacy" class="underline">プライバシーポリシー</a>に同意したものとみなします。</p>
		{#if form?.error && form?.action === 'create'}
				<p id="room-create-error" class="mt-2 text-sm text-red-600" role="alert">{form.error}</p>
			{/if}
		</div>
	</form>

	<!-- Room List -->
	<div class="space-y-3">
		<h2 class="text-lg font-semibold text-gray-800">ルーム一覧</h2>
		{#if form?.error && form?.action === 'delete'}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}
		{#if data.rooms.length === 0}
			<p class="text-gray-500 text-sm py-8 text-center">ルームがありません</p>
		{:else}
			{#each data.rooms as room}
				<div class="ui-card bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
					<div class="flex-1 min-w-0">
						<a href="/admin/{room.id}" class="text-base font-medium text-gray-900 hover:text-blue-600 truncate block">
							{room.name}
						</a>
						<div class="flex flex-wrap items-center gap-3 mt-1">
							<span class="text-xs text-gray-500">
								招待コード: <code class="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{room.inviteCode}</code>
							</span>
							<span class="text-xs text-orange-600 font-medium">
								{getRemainingTime(room.expiresAt)}
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
						<form method="POST" action="?/delete" use:enhance bind:this={deleteFormRefs[room.id]}>
							<input type="hidden" name="roomId" value={room.id} />
							<Button variant="danger"
								type="button"
								class="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
								onclick={() => { deleteTargetRoomId = room.id; }}
							>
								削除
							</Button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Archived Rooms -->
	{#if data.archivedRooms.length > 0}
		<div id="archived" class="space-y-3 mt-10">
			<h2 class="text-lg font-semibold text-gray-800">過去のルーム</h2>
			<p class="text-xs text-gray-500">終了したルームのログをCSVでダウンロードできます（1ルームにつき{formatYen(ARCHIVE_CSV_PLAN.amount)}・税込）。</p>
			{#if data.purchased}
				<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700" role="status">ご購入ありがとうございます。CSVをダウンロードできます。</p>
			{/if}
			{#if form?.error && form?.action === 'buyArchiveCsv'}
				<p class="text-sm text-red-600" role="alert">{form.error}</p>
			{/if}
			{#each data.archivedRooms as room}
				<div class="ui-card bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
					<div class="flex-1 min-w-0">
						<p class="text-base font-medium text-gray-900 truncate">{room.name}</p>
						<p class="text-xs text-gray-500 mt-1">
							{format(new Date(room.createdAt), 'yyyy/MM/dd HH:mm')} 作成・{room.messageCount}件のメッセージ
						</p>
					</div>
					{#if room.csvPurchased}
						<a
							href="/api/rooms/{room.id}/archive.csv"
							download
							class="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
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
					{/if}
				</div>
			{/each}
			{#if data.billingEnabled}
				<p class="text-xs text-gray-400"><a href="/legal/commerce" class="underline hover:text-gray-600">特定商取引法に基づく表記</a></p>
			{/if}
		</div>
	{/if}
</div>

<ConfirmDialog
	open={deleteTargetRoomId !== null}
	title="ルームの削除"
	message="このルームを削除しますか？この操作は取り消せません。"
	confirmLabel="削除"
	cancelLabel="キャンセル"
	onConfirm={() => {
		if (deleteTargetRoomId && deleteFormRefs[deleteTargetRoomId]) {
			deleteFormRefs[deleteTargetRoomId].requestSubmit();
		}
		deleteTargetRoomId = null;
	}}
	onCancel={() => { deleteTargetRoomId = null; }}
/>

<PurchaseConfirmDialog item={purchase} onCancel={() => purchase = null} />
