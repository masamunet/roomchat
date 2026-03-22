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

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-4" role="log" aria-label="チャットメッセージ">
	<ul class="space-y-4 list-none m-0 p-0">
		{#each messages as msg (msg.id)}
			<li>
				<article class="flex gap-3">
					<div class="flex-shrink-0 w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600" aria-hidden="true">
						{(msg.nickname ?? '?')[0]}
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-baseline gap-2">
							<strong class="text-sm font-semibold text-gray-900">{msg.nickname}</strong>
							<time class="text-xs text-gray-400" datetime={new Date(msg.createdAt).toISOString()}>{format(new Date(msg.createdAt), 'HH:mm')}</time>
						</div>
						<p class="text-sm text-gray-700 whitespace-pre-wrap break-words">{msg.content}</p>
					</div>
				</article>
			</li>
		{/each}
	</ul>

	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-gray-400 text-sm">まだメッセージがありません</p>
		</div>
	{/if}
</div>
