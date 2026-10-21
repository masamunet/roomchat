<script lang="ts">
	import { niceTicks, labelEvery } from './chart-scale.js';

	interface Point {
		label: string;
		value: number;
		tooltip: string;
	}

	let { points, unit, height = 160, ariaLabel }: { points: Point[]; unit: string; height?: number; ariaLabel: string } = $props();

	let width = $state(600);
	let hover = $state<number | null>(null);

	const pad = { top: 8, right: 8, bottom: 22, left: 32 };
	const ticks = $derived(niceTicks(Math.max(0, ...points.map((p) => p.value))));
	const top = $derived(ticks[ticks.length - 1]);
	const plotW = $derived(Math.max(1, width - pad.left - pad.right));
	const plotH = $derived(height - pad.top - pad.bottom);
	const slot = $derived(plotW / Math.max(1, points.length));
	const every = $derived(labelEvery(points.length, Math.max(2, Math.floor(plotW / 48))));
	const y = (v: number) => pad.top + plotH - (v / top) * plotH;
	// Each value holds across its bucket, then steps at the boundary.
	const line = $derived(
		points.map((p, i) => `${i === 0 ? 'M' : 'V'}${y(p.value)}H${pad.left + (i + 1) * slot}`).join('').replace(/^M/, `M${pad.left},`)
	);
	const area = $derived(`${line}V${pad.top + plotH}H${pad.left}Z`);

	function onMove(e: PointerEvent) {
		const svg = e.currentTarget as SVGElement;
		const x = e.clientX - svg.getBoundingClientRect().left - pad.left;
		hover = x < 0 || x > plotW ? null : Math.min(points.length - 1, Math.floor(x / slot));
	}
</script>

<div class="relative min-w-0" bind:clientWidth={width}>
	<svg {width} {height} role="img" aria-label={ariaLabel} class="block overflow-visible" onpointermove={onMove} onpointerleave={() => (hover = null)}>
		{#each ticks as t}
			<line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#cbd5e1' : '#f1f5f9'} />
			<text x={pad.left - 6} y={y(t)} dy="0.32em" text-anchor="end" class="fill-slate-400 text-[10px] tabular-nums">{t}</text>
		{/each}
		{#if points.length > 0}
			<path d={area} fill="#2563eb" opacity="0.08" />
			<path d={line} fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />
		{/if}
		{#each points as p, i}
			{#if i % every === 0}
				<text x={pad.left + i * slot + slot / 2} y={height - 6} text-anchor="middle" class="fill-slate-500 text-[10px]">{p.label}</text>
			{/if}
		{/each}
		{#if hover !== null}
			{@const cx = pad.left + hover * slot + slot / 2}
			<line x1={cx} x2={cx} y1={pad.top} y2={pad.top + plotH} stroke="#94a3b8" stroke-dasharray="3 3" />
			<circle {cx} cy={y(points[hover].value)} r="4" fill="#2563eb" stroke="white" stroke-width="2" />
		{/if}
	</svg>
	{#if hover !== null}
		{@const p = points[hover]}
		<div
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
			style="left: {Math.min(Math.max(pad.left + hover * slot + slot / 2, 60), width - 60)}px; top: {y(p.value) - 8}px"
		>
			<p class="text-slate-500">{p.tooltip}</p>
			<p class="font-semibold text-slate-900 tabular-nums">{p.value}{unit}</p>
		</div>
	{/if}
</div>
