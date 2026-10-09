<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { Collapsible } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import ChatBackground from '$lib/components/chat/ChatBackground.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import QrOverlay from '$lib/components/QrOverlay.svelte';
	import QrCodeDisplay from '$lib/components/QrCodeDisplay.svelte';
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
	let nicknameUpdates = $state<Record<string, string>>({});
	let allMessages = $derived<Message[]>(
		[...data.messages, ...sseMessages].map((msg) => {
			const updated = nicknameUpdates[msg.participantId];
			return updated && updated !== msg.nickname ? { ...msg, nickname: updated } : msg;
		})
	);
	let viewMode = $state<ChatViewMode>('slack');
	let showQrOverlay = $state(false);
	let chatScreen = $state<HTMLDivElement>();
	let fullscreenButton = $state<HTMLButtonElement | null>(null);
	let isFullscreen = $state(false);
	let expandedScreen = $state(false);
	let fullscreenBusy = $state(false);
	let fullscreenError = $state('');
	function syncFullscreen() {
		isFullscreen = document.fullscreenElement === chatScreen;
		if (!isFullscreen) fullscreenButton?.focus();
	}
	$effect(() => {
		if (!expandedScreen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	});
	async function toggleFullscreen() {
		if (!chatScreen || fullscreenBusy) return;
		fullscreenError = '';
		fullscreenBusy = true;
		try {
			if (expandedScreen) {
				expandedScreen = false;
			} else if (document.fullscreenElement === chatScreen) {
				await document.exitFullscreen();
			} else if (document.fullscreenEnabled && chatScreen.requestFullscreen) {
				await chatScreen.requestFullscreen();
			} else {
				expandedScreen = true;
			}
		} catch {
			fullscreenError = '全画面表示に切り替えられませんでした。もう一度お試しください。';
		} finally {
			fullscreenBusy = false;
		}
	}
	function handleScreenKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (expandedScreen) { expandedScreen = false; fullscreenButton?.focus(); }
		if (showTimeline) closeTimeline();
	}
	let showTimeline = $state(false);
	let timelineToggle = $state<HTMLButtonElement | null>(null);
	let chronologicalMessages = $derived([...allMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
	function closeTimeline() { showTimeline = false; timelineToggle?.focus(); }
	let sendError = $state('');
	let sending = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'reconnecting'>('connecting');
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
		eventSource.onopen = () => {
			connectionStatus = 'connected';
		};
		eventSource.addEventListener('nickname_changed', (event) => {
			let payload;
			try {
				payload = JSON.parse(event.data);
			} catch { return; }
			const { participantId, newNickname } = payload;
			// Track nickname update reactively (applied via derived allMessages)
			nicknameUpdates = { ...nicknameUpdates, [participantId]: newNickname };
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

	function autofocus(node: HTMLInputElement) {
		node.focus();
		node.select();
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

<svelte:window onkeydown={handleScreenKeydown} />
<svelte:document onfullscreenchange={syncFullscreen} />

<div bind:this={chatScreen} class="chat-screen relative flex h-[calc(100dvh-60px)] bg-gray-50" class:expanded-screen={expandedScreen}>
	<Collapsible.Root bind:open={showTimeline} class="timeline-drawer" aria-label="チャット履歴">
		<Collapsible.Trigger bind:ref={timelineToggle} class="timeline-tab" aria-label={showTimeline ? '時系列を閉じる' : '時系列を開く'} title={showTimeline ? '時系列を閉じる' : '時系列を開く'}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
				<path d="M8 4H4v16h4M12 7h8M12 12h8M12 17h8" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span class="timeline-tab-label">時系列</span>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class:rotate-180={showTimeline}><path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
		</Collapsible.Trigger>
		<Collapsible.Content class="timeline-content">
			<aside id="chat-timeline" aria-label="チャットの時系列" class="flex h-full min-h-0 flex-col">
				<div class="flex items-center justify-between border-b border-slate-100 px-5 py-5">
					<div>
						<p class="mb-1 text-[10px] font-semibold tracking-[0.18em] text-slate-400">CHAT HISTORY</p>
						<h2 class="text-sm font-semibold text-slate-900">時系列</h2>
					</div>
					<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-500">{chronologicalMessages.length}件</span>
				</div>
				<p class="px-5 pt-3 text-xs leading-relaxed text-slate-400">読み込み済みのメッセージを古い順に表示</p>
				<SlackView messages={chronologicalMessages} currentParticipantId={data.participant.id} />
			</aside>
		</Collapsible.Content>
	</Collapsible.Root>

	<!-- Main Chat Area -->
	<div class="flex flex-col flex-1 min-w-0">
		<!-- Room Header -->
		<div class="bg-white/95 border-b border-slate-200/70 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
			<div class="min-w-0">
				<h1 class="text-base font-semibold text-gray-900 truncate">{data.room.name}</h1>
				{#if editingNickname}
					<div class="flex items-center gap-1 mt-0.5">
						<input
							type="text"
							bind:value={nicknameInput}
							use:autofocus
							maxlength={50}
							class="ui-input text-xs border border-gray-300 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
							onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') cancelEditNickname(); }}
							disabled={nicknameSaving}
						/>
						<Button variant="ghost"
							type="button"
							onclick={saveNickname}
							disabled={nicknameSaving}
							class="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
						>保存</Button>
						<Button variant="ghost"
							type="button"
							onclick={cancelEditNickname}
							disabled={nicknameSaving}
							class="text-xs text-gray-500 hover:text-gray-700"
						>取消</Button>
					</div>
					{#if nicknameError}
						<p class="text-xs text-red-500 mt-0.5">{nicknameError}</p>
					{/if}
				{:else}
					<p class="text-xs text-gray-500">
						{currentNickname}として参加中
						{#if canEditNickname}
							<Button variant="secondary"
								type="button"
								onclick={startEditNickname}
								class="ml-1 text-blue-500 hover:text-blue-700 hover:underline"
								title="ニックネームを変更（入室後5分以内）"
							>変更</Button>
						{/if}
					</p>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="secondary" bind:ref={fullscreenButton} type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 shrink-0 disabled:opacity-50" aria-pressed={isFullscreen || expandedScreen} disabled={fullscreenBusy} onclick={toggleFullscreen}>{isFullscreen || expandedScreen ? '全画面解除' : '全画面'}</Button>
				<!-- QR button: mobile only (sidebar shown on desktop) -->
				<Button variant="secondary"
					type="button"
					onclick={() => showQrOverlay = true}
					class="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 lg:hidden"
					aria-label="招待QRコードを表示"
					title="招待QRコード"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 14h3v3h-3v-3zm0 4h3v3h-3v-3zm-4 0h3v3h-3v-3z"/>
					</svg>
				</Button>
				<ViewSwitcher current={viewMode} onChange={handleViewChange} />
			</div>
		</div>

		{#if fullscreenError}
			<p class="bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">{fullscreenError}</p>
		{/if}

		<!-- Connection Status -->
		{#if connectionStatus !== 'connected'}
			<div class="px-4 py-1.5 text-xs text-center" class:bg-yellow-50={connectionStatus === 'connecting'} class:text-yellow-700={connectionStatus === 'connecting'} class:bg-orange-50={connectionStatus === 'reconnecting'} class:text-orange-700={connectionStatus === 'reconnecting'}>
				{connectionStatus === 'connecting' ? '接続中...' : '再接続中...'}
			</div>
		{/if}

		<!-- Chat View -->
		<ChatBackground>
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
		</ChatBackground>

		<!-- Error Toast -->
		{#if sendError}
			<div class="px-4 py-2 bg-red-50 border-t border-red-200" role="alert">
				<p class="text-sm text-red-600 text-center">{sendError}</p>
			</div>
		{/if}

		<!-- Input -->
		<ChatInput onSend={sendMessage} disabled={sending} />
	</div>

	<!-- QR Sidebar: desktop only -->
	{#if data.joinUrl}
		<div class="hidden lg:flex flex-col items-center justify-center w-64 border-l border-gray-200 bg-gray-50 shrink-0 p-4">
			<p class="text-xs text-gray-500 mb-3">参加用QRコード</p>
			<QrCodeDisplay value={data.joinUrl} size={180} />
			<p class="font-mono text-sm font-bold tracking-widest text-gray-900 mt-3">{data.room.inviteCode}</p>
			<p class="text-xs text-gray-400 break-all mt-1 text-center">{data.joinUrl}</p>
		</div>
	{/if}

{#if showQrOverlay && data.joinUrl}
	<QrOverlay
		joinUrl={data.joinUrl}
		inviteCode={data.room.inviteCode}
		onClose={() => showQrOverlay = false}
	/>
{/if}

</div>

<style>
	:global(.timeline-drawer) { position: relative; flex-shrink: 0; width: 0; z-index: 30; background: white; transition: width 220ms ease; }
	:global(.timeline-drawer[data-state='open']) { width: 20rem; border-right: 1px solid #e2e8f0; }
	:global(.timeline-content) { height: 100%; min-height: 0; overflow: hidden; }
	:global(.timeline-tab) { position: absolute; left: 100%; top: 45%; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 36px; padding: 16px 6px; border: 1px solid #e2e8f0; border-left: 0; border-radius: 0 14px 14px 0; background: white; color: #64748b; box-shadow: 4px 2px 12px #0f172a0a; transition: color 150ms, background 150ms; }
	:global(.timeline-tab:hover), :global(.timeline-tab[data-state='open']) { background: #eff6ff; color: #2563eb; }
	:global(.timeline-tab:focus-visible) { outline: 2px solid #3b82f6; outline-offset: 3px; }
	.timeline-tab-label { writing-mode: vertical-rl; font-size: 11px; font-weight: 600; letter-spacing: .15em; }
	@media (max-width: 639px) {
		:global(.timeline-drawer) { position: absolute; inset: 0 auto 0 0; }
		:global(.timeline-drawer[data-state='open']) { width: min(20rem, calc(100% - 44px)); box-shadow: 8px 0 30px #0f172a1a; }
	}
	@media (prefers-reduced-motion: reduce) { :global(.timeline-drawer) { transition: none; } }
	.chat-screen:fullscreen { width: 100%; height: 100dvh; }
	.chat-screen.expanded-screen { position: fixed; inset: 0; z-index: 50; width: 100%; height: 100dvh; }
</style>
