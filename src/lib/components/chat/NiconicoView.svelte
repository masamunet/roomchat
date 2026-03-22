<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message } from '$lib/types/index.js';

	type Props = {
		messages: Message[];
		currentParticipantId: string;
	};

	let { messages, currentParticipantId }: Props = $props();
	let container: HTMLDivElement;
	let processedCount = $state(0);

	// Track which messages have already been animated
	$effect(() => {
		if (messages.length > processedCount) {
			const newMessages = messages.slice(processedCount);
			for (const msg of newMessages) {
				spawnComment(msg);
			}
			processedCount = messages.length;
		}
	});

	function spawnComment(msg: Message) {
		if (!container) return;

		const el = document.createElement('div');
		el.className = 'niconico-comment';
		el.textContent = `${msg.nickname}: ${msg.content}`;

		// Random vertical position (5% - 85%)
		const top = 5 + Math.random() * 80;
		el.style.top = `${top}%`;

		// Random duration (5-8 seconds)
		const duration = 5 + Math.random() * 3;
		el.style.animationDuration = `${duration}s`;

		// Color based on user
		const isMine = msg.participantId === currentParticipantId;
		if (isMine) {
			el.style.color = '#22c55e';
		}

		container.appendChild(el);

		// Remove after animation
		el.addEventListener('animationend', () => {
			el.remove();
		});
	}
</script>

<div bind:this={container} class="flex-1 relative overflow-hidden bg-gray-900">
	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-gray-500 text-sm">メッセージを送信するとコメントが流れます</p>
		</div>
	{/if}
</div>

<style>
	:global(.niconico-comment) {
		position: absolute;
		white-space: nowrap;
		font-size: 1.25rem;
		font-weight: bold;
		color: white;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8);
		pointer-events: none;
		animation-name: niconico-scroll;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
		right: -100%;
	}

	@keyframes niconico-scroll {
		from {
			transform: translateX(0);
			right: -100%;
		}
		to {
			transform: translateX(-100%);
			right: 100%;
		}
	}
</style>
