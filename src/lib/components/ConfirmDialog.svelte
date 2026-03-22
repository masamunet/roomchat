<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	type Props = {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	};

	let {
		open,
		title,
		message,
		confirmLabel = '削除',
		cancelLabel = 'キャンセル',
		onConfirm,
		onCancel
	}: Props = $props();

	let cancelButtonRef = $state<HTMLButtonElement>();
	let previousFocus: HTMLElement | null = null;

	$effect(() => {
		if (open) {
			previousFocus = document.activeElement as HTMLElement | null;
			cancelButtonRef?.focus();
		} else if (previousFocus) {
			previousFocus.focus();
			previousFocus = null;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			onCancel();
			return;
		}
		if (e.key === 'Tab') {
			const focusable = Array.from(
				document.querySelectorAll<HTMLElement>('[role="alertdialog"] button')
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		aria-describedby="confirm-dialog-message"
		tabindex="-1"
		onclick={onCancel}
		onkeydown={(e) => { if (e.key === 'Enter') onCancel(); }}
		transition:fade={{ duration: 150 }}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<div class="flex flex-col items-center text-center">
				<div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
					</svg>
				</div>
				<h3 id="confirm-dialog-title" class="text-lg font-semibold text-gray-900 mb-1">
					{title}
				</h3>
				<p id="confirm-dialog-message" class="text-sm text-gray-500 mb-6">
					{message}
				</p>
			</div>
			<div class="flex gap-3">
				<button
					bind:this={cancelButtonRef}
					onclick={onCancel}
					class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
				>
					{cancelLabel}
				</button>
				<button
					onclick={onConfirm}
					class="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
