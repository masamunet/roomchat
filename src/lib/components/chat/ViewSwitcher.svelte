<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import type { ChatViewMode } from '$lib/types/index.js';

	type Props = {
		current: ChatViewMode;
		onChange: (mode: ChatViewMode) => void;
	};

	let { current, onChange }: Props = $props();

	const modes: { value: ChatViewMode; label: string }[] = [
		{ value: 'list', label: 'リスト' },
		{ value: 'bubble', label: '吹き出し' },
		{ value: 'danmaku', label: '弾幕' }
	];
</script>

<ToggleGroup.Root type="single" value={current} onValueChange={(value) => { if (value === 'list' || value === 'bubble' || value === 'danmaku') onChange(value); }} class="inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-100/80 p-1" aria-label="チャット表示モード">
	{#each modes as mode}
		<ToggleGroup.Item value={mode.value} class="rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-slate-900 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
			{mode.label}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
