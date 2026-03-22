<script lang="ts">
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
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onCancel(); }} />

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
		onkeydown={() => {}}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
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
