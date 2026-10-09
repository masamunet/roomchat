<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	let { open, title, message, confirmLabel = '削除', cancelLabel = 'キャンセル', onConfirm, onCancel }: { open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void } = $props();
	let cancelButton = $state<HTMLButtonElement | null>(null);
	let previousFocus: HTMLElement | null = null;
</script>
<AlertDialog.Root {open} onOpenChange={(value) => { if (!value) onCancel(); }}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="ui-overlay" />
		<AlertDialog.Content class="ui-dialog" onOpenAutoFocus={(event) => { event.preventDefault(); previousFocus = document.activeElement as HTMLElement; cancelButton?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); previousFocus?.focus(); }}>
			<div class="mb-5 flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600" aria-hidden="true">!</div>
			<AlertDialog.Title class="ui-dialog-title">{title}</AlertDialog.Title>
			<AlertDialog.Description class="ui-dialog-description">{message}</AlertDialog.Description>
			<div class="mt-6 flex justify-end gap-2">
				<AlertDialog.Cancel bind:ref={cancelButton} class="ui-button ui-button-secondary">{cancelLabel}</AlertDialog.Cancel>
				<AlertDialog.Action class="ui-button ui-button-danger" onclick={onConfirm}>{confirmLabel}</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
