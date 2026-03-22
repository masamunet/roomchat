<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import type { Message } from '$lib/types/index.js';

	type Props = {
		messages: Message[];
		currentParticipantId: string;
	};

	let { messages, currentParticipantId }: Props = $props();
	let container: HTMLDivElement;
	let liveRegion: HTMLDivElement;
	let processedCount = $state(0);
	let mounted = $state(false);
	let activeElements: HTMLDivElement[] = [];
	let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

	onMount(() => {
		// Skip initial messages — only animate new ones arriving via SSE
		processedCount = messages.length;
		mounted = true;
	});

	onDestroy(() => {
		for (const id of activeTimeouts) {
			clearTimeout(id);
		}
		activeTimeouts = [];
		for (const el of activeElements) {
			el.remove();
		}
		activeElements = [];
	});

	// Track which messages have already been animated
	$effect(() => {
		if (!mounted) return;
		if (messages.length > processedCount) {
			const newMessages = messages.slice(untrack(() => processedCount));
			for (const msg of newMessages) {
				spawnComment(msg);
			}
			processedCount = messages.length;
		}
	});

	function spawnComment(msg: Message) {
		if (!container) return;

		// Announce to screen readers
		if (liveRegion) {
			const announcement = document.createElement('p');
			announcement.textContent = `${msg.nickname}: ${msg.content}`;
			liveRegion.appendChild(announcement);
			setTimeout(() => announcement.remove(), 10_000);
		}

		const el = document.createElement('div');
		el.className = 'niconico-comment';
		el.setAttribute('aria-hidden', 'true');
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

		activeElements.push(el);
		container.appendChild(el);

		const cleanup = () => {
			if (!el.parentNode) return; // already cleaned up
			el.remove();
			clearTimeout(timeoutId);
			activeElements = activeElements.filter((e) => e !== el);
			activeTimeouts = activeTimeouts.filter((t) => t !== timeoutId);
		};

		// Remove after animation (with timeout fallback for background tabs)
		el.addEventListener('animationend', cleanup, { once: true });
		const timeoutId = setTimeout(cleanup, (duration + 1) * 1000);
		activeTimeouts.push(timeoutId);
	}
</script>

<div bind:this={container} class="flex-1 relative overflow-hidden bg-gray-900" role="log" aria-label="チャットメッセージ">
	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<p class="text-gray-500 text-sm">メッセージを送信するとコメントが流れます</p>
		</div>
	{/if}
</div>
<div bind:this={liveRegion} aria-live="polite" class="sr-only"></div>

<style>
	:global(.niconico-comment) {
		position: absolute;
		left: 100%;
		white-space: nowrap;
		font-size: 1.25rem;
		font-weight: bold;
		color: white;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8);
		pointer-events: none;
		will-change: transform;
		animation-name: niconico-scroll;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}

	@keyframes niconico-scroll {
		to {
			transform: translateX(calc(-100vw - 100%));
		}
	}
</style>
