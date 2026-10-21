<script lang="ts">
	import { niceTicks, labelEvery } from './chart-scale.js';

	interface Item {
		label: string;
		value: number;
		tooltip: string;
	}

	let { items, unit, height = 180, ariaLabel }: { items: Item[]; unit: string; height?: number; ariaLabel: string } = $props();

	let width = $state(600);
	let hover = $state<number | null>(null);

	const pad = { top: 8, right: 4, bottom: 22, left: 32 };
	const ticks = $derived(niceTicks(Math.max(0, ...items.map((i) => i.value))));
	const top = $derived(ticks[ticks.length - 1]);
	const plotW = $derived(Math.max(1, width - pad.left - pad.right));
	const plotH = $derived(height - pad.top - pad.bottom);
	const slot = $derived(plotW / Math.max(1, items.length));
	const barW = $derived(Math.max(1, Math.min(28, slot - 2)));
	const every = $derived(labelEvery(items.length, Math.max(2, Math.floor(plotW / 48))));
	const y = (v: number) => pad.top + plotH - (v / top) * plotH;

	// Column with 4px rounded top corners, square at the baseline.
	function columnPath(x: number, w: number, v: number): string {
		const y0 = pad.top + plotH;
		const y1 = y(v);
		const r = Math.min(4, w / 2, y0 - y1);
		return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
	}
</script>

<div class="relative min-w-0" bind:clientWidth={width}>
	<svg {width} {height} role="img" aria-label={ariaLabel} class="block overflow-visible">
		{#each ticks as t}
			<line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#cbd5e1' : '#f1f5f9'} />
			<text x={pad.left - 6} y={y(t)} dy="0.32em" text-anchor="end" class="fill-slate-400 text-[10px] tabular-nums">{t}</text>
		{/each}
		{#each items as item, i}
			{@const x = pad.left + i * slot + (slot - barW) / 2}
			{#if item.value > 0}
				<path d={columnPath(x, barW, item.value)} fill="#2563eb" opacity={hover === null || hover === i ? 1 : 0.45} />
			{/if}
			{#if i % every === 0}
				<text x={x + barW / 2} y={height - 6} text-anchor="middle" class="fill-slate-500 text-[10px]">{item.label}</text>
			{/if}
			<rect
				x={pad.left + i * slot}
				y={pad.top}
				width={slot}
				height={plotH}
				fill="transparent"
				role="presentation"
				onpointerenter={() => (hover = i)}
				onpointerleave={() => (hover = null)}
			/>
		{/each}
	</svg>
	{#if hover !== null}
		{@const item = items[hover]}
		{@const left = pad.left + hover * slot + slot / 2}
		<div
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
			style="left: {Math.min(Math.max(left, 60), width - 60)}px; top: {y(item.value) - 6}px"
		>
			<p class="text-slate-500">{item.tooltip}</p>
			<p class="font-semibold text-slate-900 tabular-nums">{item.value}{unit}</p>
		</div>
	{/if}
</div>
