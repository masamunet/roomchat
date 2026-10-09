<script lang="ts">
	import { Dialog } from 'bits-ui';
	import QrCodeDisplay from './QrCodeDisplay.svelte';
	let { joinUrl, inviteCode, onClose }: { joinUrl: string; inviteCode: string; onClose: () => void } = $props();
</script>
<Dialog.Root open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
	<!-- Keep the dialog inside the fullscreen element. -->
	<Dialog.Overlay class="ui-overlay" />
	<Dialog.Content class="ui-dialog text-center">
		<Dialog.Title class="ui-dialog-title">ルームに招待</Dialog.Title>
		<Dialog.Description class="ui-dialog-description">このQRコードで参加できます</Dialog.Description>
		<div class="my-6 flex justify-center"><QrCodeDisplay value={joinUrl} size={200} /></div>
		<p class="rounded-xl bg-slate-50 px-4 py-3 font-mono text-lg font-semibold tracking-widest text-slate-900">{inviteCode}</p>
		<p class="my-3 break-all text-xs leading-relaxed text-slate-500">{joinUrl}</p>
		<Dialog.Close class="ui-button ui-button-secondary w-full">閉じる</Dialog.Close>
	</Dialog.Content>
</Dialog.Root>
