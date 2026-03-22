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
	const MAX_SSE_MESSAGES = 500;
	const NICKNAME_CHANGE_WINDOW_MS = 5 * 60 * 1000;
	let sseMessages = $state<Message[]>([]);
	const knownMessageIds = new Set<string>(data.messages.map((m: Message) => m.id));
	let allMessages = $derived<Message[]>([...data.messages, ...sseMessages]);
	let viewMode = $state<ChatViewMode>('slack');
	let showQrOverlay = $state(false);
	let sendError = $state('');
	let eventSource: EventSource | null = null;
	let fetchMissedTimer: ReturnType<typeof setTimeout> | null = null;

	// Nickname editing state
	let currentNickname = $state(data.participant.nickname);
	let editingNickname = $state(false);
	let nicknameInput = $state('');
	let nicknameError = $state('');
	let nicknameSaving = $state(false);
	let canEditNickname = $state(true);
	let nicknameEditTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		// Restore view mode
		const saved = localStorage.getItem('roomchat_view_mode');
		if (saved === 'slack' || saved === 'line' || saved === 'niconico') {
			viewMode = saved;
		}

		// Check if nickname edit window has passed
		const remaining = NICKNAME_CHANGE_WINDOW_MS - (Date.now() - new Date(data.participant.joinedAt).getTime());
		if (remaining <= 0) {
			canEditNickname = false;
		} else {
			nicknameEditTimer = setTimeout(() => {
				canEditNickname = false;
				editingNickname = false;
			}, remaining);
		}

		// Connect SSE
		eventSource = new EventSource(`/api/sse/${data.room.id}`);
		eventSource.addEventListener('nickname_changed', (event) => {
			let payload;
			try {
				payload = JSON.parse(event.data);
			} catch { return; }
			const { participantId, newNickname } = payload;
			// Update nickname in existing messages
			for (const msg of data.messages) {
				if (msg.participantId === participantId) {
					msg.nickname = newNickname;
				}
			}
			sseMessages = sseMessages.map((msg) =>
				msg.participantId === participantId ? { ...msg, nickname: newNickname } : msg
			);
			// Update own nickname display if it's us
			if (participantId === data.participant.id) {
				currentNickname = newNickname;
			}
		});
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
		if (nicknameEditTimer) clearTimeout(nicknameEditTimer);
	});

	function handleViewChange(mode: ChatViewMode) {
		viewMode = mode;
		localStorage.setItem('roomchat_view_mode', mode);
	}

	function startEditNickname() {
		nicknameInput = currentNickname;
		nicknameError = '';
		editingNickname = true;
	}

	function cancelEditNickname() {
		editingNickname = false;
		nicknameError = '';
	}

	async function saveNickname() {
		const trimmed = nicknameInput.trim();
		if (!trimmed) {
			nicknameError = 'ニックネームを入力してください';
			return;
		}
		if (trimmed.length > 50) {
			nicknameError = 'ニックネームは50文字以内で入力してください';
			return;
		}
		if (trimmed === currentNickname) {
			editingNickname = false;
			return;
		}

		nicknameSaving = true;
		nicknameError = '';
		try {
			const res = await fetch(`/api/participants/${data.room.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nickname: trimmed })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: '変更に失敗しました' }));
				nicknameError = err.message || '変更に失敗しました';
				return;
			}
			currentNickname = trimmed;
			editingNickname = false;
		} catch {
			nicknameError = 'ネットワークエラー。再度お試しください';
		} finally {
			nicknameSaving = false;
		}
	}

	async function sendMessage(content: string) {
		sendError = '';
		try {
			const res = await fetch(`/api/messages/${data.room.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: '送信に失敗しました' }));
				sendError = err.message || '送信に失敗しました';
				setTimeout(() => sendError = '', 3000);
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
			{#if editingNickname}
				<div class="flex items-center gap-1 mt-0.5">
					<input
						type="text"
						bind:value={nicknameInput}
						maxlength={50}
						class="text-xs border border-gray-300 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
						onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') cancelEditNickname(); }}
						disabled={nicknameSaving}
					/>
					<button
						type="button"
						onclick={saveNickname}
						disabled={nicknameSaving}
						class="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
					>保存</button>
					<button
						type="button"
						onclick={cancelEditNickname}
						disabled={nicknameSaving}
						class="text-xs text-gray-500 hover:text-gray-700"
					>取消</button>
				</div>
				{#if nicknameError}
					<p class="text-xs text-red-500 mt-0.5">{nicknameError}</p>
				{/if}
			{:else}
				<p class="text-xs text-gray-500">
					{currentNickname}として参加中
					{#if canEditNickname}
						<button
							type="button"
							onclick={startEditNickname}
							class="ml-1 text-blue-500 hover:text-blue-700 hover:underline"
							title="ニックネームを変更（入室後5分以内）"
						>変更</button>
					{/if}
				</p>
			{/if}
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

	<!-- Error Toast -->
	{#if sendError}
		<div class="px-4 py-2 bg-red-50 border-t border-red-200">
			<p class="text-sm text-red-600 text-center">{sendError}</p>
		</div>
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
