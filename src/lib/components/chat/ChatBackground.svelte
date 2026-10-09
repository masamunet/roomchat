<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { Collapsible, ToggleGroup } from 'bits-ui';
	import { onDestroy, onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
	let settingsOpen = $state(false);
	let source = $state('');
	let kind = $state<'none' | 'image' | 'video' | 'camera'>('none');
	let preset = $state('shadow');
	let error = $state('');
	let busy = $state(false);
	let stream = $state<MediaStream | null>(null);
	let cameraVideo = $state<HTMLVideoElement>();
	let requestId = 0;
	onMount(() => {
		try {
			const saved = localStorage.getItem('roomchat_background_preset');
			if (saved && ['shadow', 'light', 'dark'].includes(saved)) preset = saved;
		} catch { /* Storage may be unavailable. */ }
	});
	function clear() {
		requestId++;
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		if (source) URL.revokeObjectURL(source);
		source = '';
		kind = 'none';
		busy = false;
		error = '';
	}
	onDestroy(clear);
	$effect(() => {
		if (cameraVideo && stream) {
			cameraVideo.srcObject = stream;
			cameraVideo.play().catch(() => { error = 'カメラの再生に失敗しました'; });
		}
	});
	function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
			error = '画像または動画を選んでください'; return;
		}
		if (file.size > 100 * 1024 * 1024) {
			error = '100MB以下のファイルを選んでください'; return;
		}
		clear();
		source = URL.createObjectURL(file);
		kind = file.type.startsWith('image/') ? 'image' : 'video';
	}
	async function camera() {
		clear();
		if (!navigator.mediaDevices?.getUserMedia) {
			error = 'WebカメラはHTTPSまたはlocalhostの対応ブラウザで利用できます'; return;
		}
		const id = requestId;
		busy = true;
		try {
			const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			if (id !== requestId) { media.getTracks().forEach((track) => track.stop()); return; }
			stream = media;
			kind = 'camera';
		} catch {
			if (id === requestId) error = 'カメラを利用できません。ブラウザの許可と接続を確認してください';
		} finally { if (id === requestId) busy = false; }
	}
	function savePreset() {
		try { localStorage.setItem('roomchat_background_preset', preset); } catch { /* Optional preference. */ }
	}
</script>

<Collapsible.Root bind:open={settingsOpen} class="border-b border-slate-200/70 bg-white px-5 py-2 text-sm">
	<Collapsible.Trigger class="ui-button ui-button-ghost !min-h-8 !px-0 text-slate-500">背景・文字の設定 <span aria-hidden="true">{settingsOpen ? '−' : '+'}</span></Collapsible.Trigger>
	<Collapsible.Content>
	<div class="flex flex-wrap items-center gap-3 py-3">
		<label class="ui-button ui-button-secondary">画像・動画を選択
			<input class="ui-input sr-only" type="file" accept="image/*,video/*" onchange={upload} />
		</label>
		<Button variant="secondary" type="button" class="rounded border px-3 py-2 disabled:opacity-50" onclick={camera} disabled={busy}>{busy ? 'カメラ接続中…' : 'Webカメラ'}</Button>
		<Button variant="secondary" type="button" class="rounded border px-3 py-2" onclick={clear}>背景を解除</Button>

		<div class="w-full pt-2">
			<p class="mb-2 text-xs font-medium text-slate-500">文字プリセット</p>
			<ToggleGroup.Root type="single" value={preset} onValueChange={(value) => { if (['shadow', 'light', 'dark'].includes(value)) { preset = value; savePreset(); } }} class="flex flex-wrap gap-2" aria-label="文字プリセット">
				{#each [{ value: 'shadow', label: '白文字＋影' }, { value: 'light', label: '明るいパネル' }, { value: 'dark', label: '暗いパネル' }] as option}
					<ToggleGroup.Item value={option.value} class="ui-button ui-button-secondary data-[state=on]:border-blue-300 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700">{option.label}</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>
	</div>
	<p class="mb-2 text-xs text-gray-500">背景は自分の画面だけに表示されます（最大100MB）。画像・動画・カメラ映像は送信されません。再読み込み後は背景を選び直してください。</p>
	{#if error}<p class="mb-2 text-sm text-red-600" role="alert">{error}</p>{/if}
</Collapsible.Content>
</Collapsible.Root>
<div class="chat-stage flex min-h-0 flex-1 flex-col relative isolate" class:custom-background={kind !== 'none'} data-preset={preset}>
	{#if kind === 'image'}
		<img class="background" src={source} alt="" onerror={() => error = '画像を読み込めません。別の形式をお試しください'} />
	{:else if kind === 'video'}
		<video class="background" src={source} autoplay loop muted playsinline aria-hidden="true" onerror={() => error = '動画を再生できません。別の形式をお試しください'}></video>
	{:else if kind === 'camera'}
		<video class="background" bind:this={cameraVideo} autoplay muted playsinline aria-hidden="true"></video>
	{/if}
	{@render children()}
</div>
<style>
	.background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; pointer-events: none; }
	.custom-background :global([role='log']) { background: transparent; }
	.custom-background :global(article) { border-radius: .75rem; padding: .5rem; }
	.custom-background[data-preset='shadow'] :global(article),
	.chat-stage[data-preset='shadow'] :global(.niconico-comment) { color: white !important; text-shadow: 0 1px 3px black, 0 0 5px black; }
	.custom-background[data-preset='shadow'] :global(article strong),
	.custom-background[data-preset='shadow'] :global(article p),
	.custom-background[data-preset='shadow'] :global(article time) { color: white; }
	.custom-background[data-preset='shadow'] :global(article .rounded-2xl) { background: #0009; color: white; }
	.custom-background[data-preset='light'] :global(article),
	.chat-stage[data-preset='light'] :global(.niconico-comment) { background: #fffffff0; color: #111827 !important; text-shadow: none; }
	.custom-background[data-preset='light'] :global(article p),
	.custom-background[data-preset='light'] :global(article strong),
	.custom-background[data-preset='light'] :global(article time) { color: #111827; }
	.custom-background[data-preset='dark'] :global(article),
	.chat-stage[data-preset='dark'] :global(.niconico-comment) { background: #111827ed; color: white !important; text-shadow: none; }
	.custom-background[data-preset='dark'] :global(article p),
	.custom-background[data-preset='dark'] :global(article strong),
	.custom-background[data-preset='dark'] :global(article time) { color: white; }
	.custom-background[data-preset='dark'] :global(article .rounded-2xl) { background: #374151; color: white; }
	.custom-background[data-preset='light'] :global(article .rounded-2xl) { color: #111827; }
	.chat-stage :global(.niconico-comment) { border-radius: .5rem; padding: .25rem .5rem; }
</style>
