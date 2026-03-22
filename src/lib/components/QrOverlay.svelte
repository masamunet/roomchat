<script lang="ts">
	import QrCodeDisplay from './QrCodeDisplay.svelte';

	type Props = {
		joinUrl: string;
		inviteCode: string;
		onClose: () => void;
	};

	let { joinUrl, inviteCode, onClose }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
	onclick={onClose}
	onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-xs w-full text-center"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<p class="text-sm text-gray-500 mb-3">このQRコードで参加できます</p>
		<div class="flex justify-center mb-3">
			<QrCodeDisplay value={joinUrl} size={200} />
		</div>
		<p class="font-mono text-lg font-bold tracking-widest text-gray-900 mb-1">{inviteCode}</p>
		<p class="text-xs text-gray-400 break-all mb-4">{joinUrl}</p>
		<button
			onclick={onClose}
			class="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
		>
			閉じる
		</button>
	</div>
</div>
