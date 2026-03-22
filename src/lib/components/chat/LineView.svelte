<script lang="ts">
	import { tick } from 'svelte';
	import { format } from 'date-fns';
	import type { Message } from '$lib/types/index.js';

	type Props = {
		messages: Message[];
		currentParticipantId: string;
	};

	let { messages, currentParticipantId }: Props = $props();
	let scrollContainer: HTMLDivElement;

	$effect(() => {
		if (messages.length && scrollContainer) {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
			if (isNearBottom) {
				tick().then(() => {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				});
			}
		}
	});
</script>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#8CABD9]" aria-live="polite" aria-label="チャットメッセージ">
	{#each messages as msg (msg.id)}
		{@const isMine = msg.participantId === currentParticipantId}
		<div class="flex" class:flex-row-reverse={isMine}>
			{#if !isMine}
				<div class="flex-shrink-0 mr-2">
					<div class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-sm font-medium text-gray-600">
						{(msg.nickname ?? '?')[0]}
					</div>
				</div>
			{/if}
			<div class="max-w-[75%]" class:ml-10={isMine}>
				{#if !isMine}
					<p class="text-xs text-white/90 mb-0.5 ml-1">{msg.nickname}</p>
				{/if}
				<div class="flex items-end gap-1" class:flex-row-reverse={isMine}>
					<div
						class="px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words"
						class:bg-[#7AE582]={isMine}
						class:text-gray-900={isMine}
						class:rounded-tr-sm={isMine}
						class:bg-white={!isMine}
						class:rounded-tl-sm={!isMine}
					>
						{msg.content}
					</div>
					<span class="text-[10px] text-white/90 flex-shrink-0">
						{format(new Date(msg.createdAt), 'HH:mm')}
					</span>
				</div>
			</div>
		</div>
	{/each}

	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-white/70 text-sm">まだメッセージがありません</p>
		</div>
	{/if}
</div>
