<script lang="ts">
	import { format } from 'date-fns';
	import { getRemainingTime } from '$lib/utils/remaining-time.js';
	import { formatYen } from '$lib/plans.js';
	import ColumnChart from '$lib/components/dashboard/ColumnChart.svelte';
	import StepLineChart from '$lib/components/dashboard/StepLineChart.svelte';

	let { data } = $props();
	const stats = $derived(data.stats);

	function formatDuration(minutes: number): string {
		if (minutes < 60) return `${minutes}分`;
		if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
		return `${Math.floor(minutes / 1440)}日${Math.floor((minutes % 1440) / 60)}時間`;
	}

	const bucketLabel = $derived(
		stats.bucketMinutes % 1440 === 0
			? `${stats.bucketMinutes / 1440}日`
			: stats.bucketMinutes % 60 === 0
				? `${stats.bucketMinutes / 60}時間`
				: `${stats.bucketMinutes}分`
	);

	const tiles = $derived([
		{ label: 'メッセージ', value: stats.totals.messages.toLocaleString('ja-JP'), note: `1時間あたり${stats.totals.messagesPerHour}件` },
		{ label: '参加者', value: `${stats.totals.participants}人`, note: `うち発言者${stats.totals.speakers}人` },
		{ label: '接続中', value: `${data.connections}`, note: 'いまチャット画面を開いている数' },
		{ label: '平均文字数', value: `${stats.totals.avgLength}字`, note: `合計${stats.totals.characters.toLocaleString('ja-JP')}字` },
		{ label: '経過時間', value: formatDuration(stats.totals.elapsedMinutes), note: getRemainingTime(data.room.expiresAt) },
		{
			label: '延長',
			value: stats.extensions.count > 0 ? `${stats.extensions.count}回` : 'なし',
			note: stats.extensions.count > 0 ? `+${formatDuration(stats.extensions.hours * 60)}・${formatYen(stats.extensions.amount)}` : '無料期間で利用中'
		}
	]);

	const timeline = $derived(stats.timeline.map((b) => ({ label: b.label, value: b.messages, tooltip: b.range })));
	const joins = $derived(stats.timeline.map((b) => ({ label: b.label, value: b.participants, tooltip: `${b.range}までの参加者` })));
	const hours = $derived(stats.hourOfDay.map((v, h) => ({ label: `${h}時`, value: v, tooltip: `${h}:00〜${h}:59` })));
	const ranking = $derived(stats.participants.filter((p) => p.messages > 0).slice(0, 10));
	const rankingMax = $derived(Math.max(1, ...ranking.map((p) => p.messages)));
	const silent = $derived(stats.participants.filter((p) => p.messages === 0).length);
</script>

<svelte:head>
	<title>{data.room.name} のダッシュボード - RoomChat</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-6">
	<a href="/admin/{data.room.id}" class="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">&larr; ルーム詳細に戻る</a>

	<div class="mb-6">
		<h1 class="text-xl font-bold text-gray-900">{data.room.name}</h1>
		<p class="text-sm text-gray-500 mt-1">
			{format(new Date(data.room.createdAt), 'yyyy/MM/dd HH:mm')} 作成・<span class="text-orange-600 font-medium">{getRemainingTime(data.room.expiresAt)}</span>
		</p>
	</div>

	<!-- KPI tiles -->
	<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
		{#each tiles as tile}
			<div class="ui-card bg-white rounded-xl border border-gray-200 px-4 py-3">
				<p class="text-xs text-gray-500">{tile.label}</p>
				<p class="text-2xl font-bold text-gray-900 tabular-nums mt-1">{tile.value}</p>
				<p class="text-xs text-gray-400 mt-1 truncate">{tile.note}</p>
			</div>
		{/each}
	</div>

	{#if stats.totals.messages === 0}
		<div class="ui-card bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
			<p class="text-sm text-gray-500">まだメッセージがありません。参加者が発言するとグラフが表示されます。</p>
		</div>
	{:else}
		<section class="ui-card bg-white rounded-xl border border-gray-200 p-5 mb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
				<h2 class="text-base font-semibold text-gray-800">メッセージ数の推移</h2>
				<p class="text-xs text-gray-500">{bucketLabel}ごと{#if stats.peak}・ピーク {stats.peak.range}（{stats.peak.messages}件）{/if}</p>
			</div>
			<ColumnChart items={timeline} unit="件" ariaLabel="{bucketLabel}ごとのメッセージ数" />
		</section>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
			<section class="ui-card bg-white rounded-xl border border-gray-200 p-5 min-w-0">
				<h2 class="text-base font-semibold text-gray-800 mb-3">発言ランキング</h2>
				<ol class="space-y-2">
					{#each ranking as p, i}
						<li class="text-sm">
							<div class="flex items-baseline justify-between gap-2">
								<span class="truncate text-gray-700"><span class="text-gray-400 tabular-nums mr-1.5">{i + 1}</span>{p.nickname}</span>
								<span class="shrink-0 text-gray-900 font-medium tabular-nums">{p.messages}件</span>
							</div>
							<div class="mt-1 h-1.5 rounded-full bg-slate-100">
								<div class="h-1.5 rounded-full bg-blue-600" style="width: {(p.messages / rankingMax) * 100}%"></div>
							</div>
						</li>
					{/each}
				</ol>
				{#if silent > 0}
					<p class="text-xs text-gray-400 mt-3">発言していない参加者: {silent}人</p>
				{/if}
			</section>

			<section class="ui-card bg-white rounded-xl border border-gray-200 p-5 min-w-0">
				<h2 class="text-base font-semibold text-gray-800 mb-3">参加者数の推移</h2>
				<StepLineChart points={joins} unit="人" ariaLabel="参加者数の累計" />
			</section>
		</div>

		<section class="ui-card bg-white rounded-xl border border-gray-200 p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-800 mb-3">時間帯別のメッセージ数</h2>
			<ColumnChart items={hours} unit="件" height={150} ariaLabel="時間帯別のメッセージ数" />
		</section>
	{/if}

	{#if stats.participants.length > 0}
		<section class="ui-card bg-white rounded-xl border border-gray-200 p-5 min-w-0">
			<h2 class="text-base font-semibold text-gray-800 mb-3">参加者一覧</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-xs text-gray-500 border-b border-gray-100">
							<th class="py-2 pr-3 font-medium">ニックネーム</th>
							<th class="py-2 pr-3 font-medium text-right">発言</th>
							<th class="py-2 pr-3 font-medium text-right">文字数</th>
							<th class="py-2 pr-3 font-medium whitespace-nowrap">参加</th>
							<th class="py-2 font-medium whitespace-nowrap">最終発言</th>
						</tr>
					</thead>
					<tbody>
						{#each stats.participants as p}
							<tr class="border-b border-gray-50 last:border-0">
								<td class="py-2 pr-3 text-gray-800 max-w-[10rem] truncate">{p.nickname}</td>
								<td class="py-2 pr-3 text-right tabular-nums">{p.messages}</td>
								<td class="py-2 pr-3 text-right tabular-nums">{p.characters.toLocaleString('ja-JP')}</td>
								<td class="py-2 pr-3 text-gray-500 whitespace-nowrap tabular-nums">{p.joinedAt}</td>
								<td class="py-2 text-gray-500 whitespace-nowrap tabular-nums">{p.lastPostAt ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
