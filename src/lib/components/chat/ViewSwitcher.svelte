<script lang="ts">
	import type { ChatViewMode } from '$lib/types/index.js';

	type Props = {
		current: ChatViewMode;
		onChange: (mode: ChatViewMode) => void;
	};

	let { current, onChange }: Props = $props();

	const modes: { value: ChatViewMode; label: string }[] = [
		{ value: 'slack', label: 'Slack風' },
		{ value: 'line', label: 'LINE風' },
		{ value: 'niconico', label: 'ニコニコ風' }
	];
</script>

<div class="flex bg-gray-100 rounded-lg p-0.5" role="group" aria-label="チャット表示モード">
	{#each modes as mode}
		<button
			type="button"
			aria-pressed={current === mode.value}
			onclick={() => onChange(mode.value)}
			class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
			class:bg-white={current === mode.value}
			class:text-gray-900={current === mode.value}
			class:shadow-sm={current === mode.value}
			class:text-gray-500={current !== mode.value}
			class:hover:text-gray-700={current !== mode.value}
		>
			{mode.label}
		</button>
	{/each}
</div>
