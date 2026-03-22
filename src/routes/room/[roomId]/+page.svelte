<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import QrOverlay from '$lib/components/QrOverlay.svelte';
	import SlackView from '$lib/components/chat/SlackView.svelte';
	import LineView from '$lib/components/chat/LineView.svelte';
	import NiconicoView from '$lib/components/chat/NiconicoView.svelte';
	import ViewSwitcher from '$lib/components/chat/ViewSwitcher.svelte';
	import type { Message, ChatViewMode } from '$lib/types/index.js';

	let { data } = $props();
	let sseMessages = $state<Message[]>([]);
	let allMessages = $derived<Message[]>([...data.messages, ...sseMessages]);
	let viewMode = $state<ChatViewMode>('slack');
	let showQrOverlay = $state(false);
	let eventSource: EventSource | null = null;

	onMount(() => {
		// Restore view mode
		const saved = localStorage.getItem('roomchat_view_mode');
		if (saved === 'slack' || saved === 'line' || saved === 'niconico') {
			viewMode = saved;
		}

		// Connect SSE
		eventSource = new EventSource(`/api/sse/${data.room.id}`);
		eventSource.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			if (msg.type === 'connected') return;
			// Deduplicate (message might already exist from initial load)
			if (!data.messages.some((m: Message) => m.id === msg.id) &&
				!sseMessages.some((m) => m.id === msg.id)) {
				sseMessages = [...sseMessages, msg];
			}
		};
		eventSource.onerror = () => {
			// EventSource auto-reconnects
		};
	});

	onDestroy(() => {
		eventSource?.close();
	});

	function handleViewChange(mode: ChatViewMode) {
		viewMode = mode;
		localStorage.setItem('roomchat_view_mode', mode);
	}

	async function sendMessage(content: string) {
		try {
			const res = await fetch(`/api/messages/${data.room.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const err = await res.json();
				console.error('Send failed:', err);
			}
		} catch (e) {
			console.error('Send error:', e);
		}
	}
</script>

<div class="flex flex-col h-[calc(100dvh-60px)]">
	<!-- Room Header -->
	<div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
		<div class="min-w-0">
			<h1 class="text-base font-semibold text-gray-900 truncate">{data.room.name}</h1>
			<p class="text-xs text-gray-500">{data.participant.nickname}として参加中</p>
		</div>
		<div class="flex items-center gap-2">
			{#if data.isCreator}
				<button
					type="button"
					onclick={() => showQrOverlay = true}
					class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
					aria-label="招待QRコードを表示"
					title="招待QRコード"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 14h3v3h-3v-3zm0 4h3v3h-3v-3zm-4 0h3v3h-3v-3z"/>
					</svg>
				</button>
			{/if}
			<ViewSwitcher current={viewMode} onChange={handleViewChange} />
		</div>
	</div>

	<!-- Chat View -->
	{#if viewMode === 'slack'}
		<SlackView messages={allMessages} currentParticipantId={data.participant.id} />
	{:else if viewMode === 'line'}
		<LineView messages={allMessages} currentParticipantId={data.participant.id} />
	{:else}
		<NiconicoView messages={allMessages} currentParticipantId={data.participant.id} />
	{/if}

	<!-- Input -->
	<ChatInput onSend={sendMessage} />
</div>

{#if showQrOverlay && data.joinUrl}
	<QrOverlay
		joinUrl={data.joinUrl}
		inviteCode={data.room.inviteCode}
		onClose={() => showQrOverlay = false}
	/>
{/if}
