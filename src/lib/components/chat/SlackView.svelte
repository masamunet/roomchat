<script lang="ts">
	import { format } from 'date-fns';
	import type { Message } from '$lib/types/index.js';

	type Props = {
		messages: Message[];
		currentParticipantId: string;
	};

	let { messages, currentParticipantId }: Props = $props();
	let scrollContainer: HTMLDivElement;

	$effect(() => {
		// Auto-scroll on new messages
		if (messages.length && scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	});
</script>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4 space-y-4">
	{#each messages as msg (msg.id)}
		<div class="flex gap-3">
			<div class="flex-shrink-0 w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
				{(msg.nickname ?? '?')[0]}
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-baseline gap-2">
					<span class="text-sm font-semibold text-gray-900">{msg.nickname}</span>
					<span class="text-xs text-gray-400">{format(new Date(msg.createdAt), 'HH:mm')}</span>
				</div>
				<p class="text-sm text-gray-700 whitespace-pre-wrap break-words">{msg.content}</p>
			</div>
		</div>
	{/each}

	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-gray-400 text-sm">まだメッセージがありません</p>
		</div>
	{/if}
</div>
