<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import QrOverlay from '$lib/components/QrOverlay.svelte';
	import SlackView from '$lib/components/chat/SlackView.svelte';
	import LineView from '$lib/components/chat/LineView.svelte';
	import NiconicoView from '$lib/components/chat/NiconicoView.svelte';
	import ViewSwitcher from '$lib/components/chat/ViewSwitcher.svelte';
	import type { Message, ChatViewMode } from '$lib/types/index.js';

	let { data } = $props();
	const MAX_SSE_MESSAGES = 500;
	let sseMessages = $state<Message[]>([]);
	const knownMessageIds = new Set<string>(data.messages.map((m: Message) => m.id));
	let allMessages = $derived<Message[]>([...data.messages, ...sseMessages]);
	let viewMode = $state<ChatViewMode>('slack');
	let showQrOverlay = $state(false);
	let sendError = $state('');
	let sending = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'reconnecting'>('connecting');
	let eventSource: EventSource | null = null;
	let fetchMissedTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		// Restore view mode
		const saved = localStorage.getItem('roomchat_view_mode');
		if (saved === 'slack' || saved === 'line' || saved === 'niconico') {
			viewMode = saved;
		}

		// Connect SSE
		eventSource = new EventSource(`/api/sse/${data.room.id}`);
		eventSource.onopen = () => {
			connectionStatus = 'connected';
		};
		eventSource.addEventListener('chat', (event) => {
			let msg;
			try {
				msg = JSON.parse(event.data);
			} catch { return; }
			// Deduplicate (message might already exist from initial load)
			if (!knownMessageIds.has(msg.id)) {
				knownMessageIds.add(msg.id);
				sseMessages = [...sseMessages, msg].slice(-MAX_SSE_MESSAGES);
			}
		});
		eventSource.onerror = () => {
			connectionStatus = 'reconnecting';
			// Debounce: clear previous timer to avoid burst of fetches
			if (fetchMissedTimer) clearTimeout(fetchMissedTimer);
			fetchMissedTimer = setTimeout(async () => {
				fetchMissedTimer = null;
				try {
					// Fetch newest messages since last known
					const lastId = sseMessages.length > 0
						? sseMessages[sseMessages.length - 1].id
						: (data.messages.length > 0 ? data.messages[data.messages.length - 1].id : undefined);
					const afterParam = lastId ? `&after=${lastId}` : '';
					const res = await fetch(`/api/messages/${data.room.id}?limit=50${afterParam}`);
					if (!res.ok) return;
					const msgs: Message[] = await res.json();
					const newMsgs = msgs.filter((msg) => !knownMessageIds.has(msg.id));
					if (newMsgs.length > 0) {
						for (const msg of newMsgs) knownMessageIds.add(msg.id);
						sseMessages = [...sseMessages, ...newMsgs].slice(-MAX_SSE_MESSAGES);
					}
				} catch { /* ignore */ }
			}, 2000);
		};
	});

	onDestroy(() => {
		eventSource?.close();
		if (fetchMissedTimer) clearTimeout(fetchMissedTimer);
	});

	function handleViewChange(mode: ChatViewMode) {
		viewMode = mode;
		localStorage.setItem('roomchat_view_mode', mode);
	}

	async function sendMessage(content: string) {
		if (sending) return;
		sendError = '';
		sending = true;
		try {
			const res = await fetch(`/api/messages/${data.room.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => null);
				if (res.status === 429) {
					sendError = err?.message || 'メッセージの送信が速すぎます。少し待ってからお試しください';
				} else if (res.status === 401 || res.status === 403) {
					sendError = err?.message || 'ルームへの参加が必要です。ページを再読み込みしてください';
				} else if (res.status >= 500) {
					sendError = 'サーバーエラーが発生しました。しばらくしてからお試しください';
				} else {
					sendError = err?.message || '送信に失敗しました';
				}
				setTimeout(() => sendError = '', 5000);
				return;
			}

			// Add sent message locally (won't come back via SSE)
			const msg: Message = await res.json();
			if (!knownMessageIds.has(msg.id)) {
				knownMessageIds.add(msg.id);
				sseMessages = [...sseMessages, msg].slice(-MAX_SSE_MESSAGES);
			}
		} catch {
			sendError = 'ネットワークエラー。再度お試しください';
			setTimeout(() => sendError = '', 3000);
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>{data.room.name} - RoomChat</title>
</svelte:head>

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

	<!-- Connection Status -->
	{#if connectionStatus !== 'connected'}
		<div class="px-4 py-1.5 text-xs text-center" class:bg-yellow-50={connectionStatus === 'connecting'} class:text-yellow-700={connectionStatus === 'connecting'} class:bg-orange-50={connectionStatus === 'reconnecting'} class:text-orange-700={connectionStatus === 'reconnecting'}>
			{connectionStatus === 'connecting' ? '接続中...' : '再接続中...'}
		</div>
	{/if}

	<!-- Chat View -->
	{#key viewMode}
		<div class="flex-1 flex flex-col min-h-0" transition:fade={{ duration: 150 }}>
			{#if viewMode === 'slack'}
				<SlackView messages={allMessages} currentParticipantId={data.participant.id} />
			{:else if viewMode === 'line'}
				<LineView messages={allMessages} currentParticipantId={data.participant.id} />
			{:else}
				<NiconicoView messages={allMessages} currentParticipantId={data.participant.id} />
			{/if}
		</div>
	{/key}

	<!-- Error Toast -->
	{#if sendError}
		<div class="px-4 py-2 bg-red-50 border-t border-red-200">
			<p class="text-sm text-red-600 text-center">{sendError}</p>
		</div>
	{/if}

	<!-- Input -->
	<ChatInput onSend={sendMessage} disabled={sending} />
</div>

{#if showQrOverlay && data.joinUrl}
	<QrOverlay
		joinUrl={data.joinUrl}
		inviteCode={data.room.inviteCode}
		onClose={() => showQrOverlay = false}
	/>
{/if}
