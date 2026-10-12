<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';

	let inviteCode = $state('');
	let error = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		const code = inviteCode.trim().toUpperCase();
		if (!code) {
			error = '招待コードを入力してください';
			return;
		}
		error = '';
		goto(`/join/${code}`);
	}
</script>

<svelte:head>
	<title>RoomChat</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[calc(100dvh-60px)] px-4">
	<div class="ui-card w-full max-w-sm p-7 sm:p-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">RoomChat</h1>
			<p class="text-gray-500">招待コードを入力してチャットに参加</p>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<input
					type="text"
					bind:value={inviteCode}
					placeholder="招待コードを入力"
					maxlength="12"
					autocapitalize="characters"
					spellcheck={false}
					aria-label="招待コード"
					aria-describedby={error ? 'invite-code-error' : undefined}
					class="ui-input w-full px-4 py-3 text-center text-xl font-mono tracking-widest border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
				/>
				<p class="text-xs text-gray-500 mt-2 text-center">新しい招待コードは4文字です。大文字・小文字は区別しません。</p>
				{#if error}
					<p id="invite-code-error" class="text-sm text-red-600 mt-1 text-center" role="alert">{error}</p>
				{/if}
			</div>
			<Button variant="primary"
				type="submit"
				class="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 text-lg"
			>
				参加する
			</Button>
		</form>
	</div>
</div>
