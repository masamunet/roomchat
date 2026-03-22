<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="flex flex-col items-center justify-center min-h-[calc(100dvh-60px)] px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-gray-900 mb-1">{data.room.name}</h1>
			<p class="text-gray-500 text-sm">ニックネームを入力して参加</p>
		</div>

		<form method="POST" use:enhance class="space-y-4">
			<div>
				<input
					type="text"
					name="nickname"
					placeholder="ニックネーム"
					required
					maxlength="50"
					autocomplete="off"
					class="w-full px-4 py-3 text-center text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				{#if form?.error}
					<p class="text-sm text-red-600 mt-1 text-center">{form.error}</p>
				{/if}
			</div>
			<button
				type="submit"
				class="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 text-lg"
			>
				入室する
			</button>
		</form>
	</div>
</div>
