<script lang="ts">
	type Props = {
		onSend: (content: string) => void;
	};

	let { onSend }: Props = $props();
	let content = $state('');
	let showEmojiPicker = $state(false);
	let inputEl: HTMLTextAreaElement;
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

	const EMOJI_CATEGORIES = [
		{ name: '顔', emojis: ['😀','😂','🥹','😍','🤔','😎','😢','😤','🥳','😱','🤣','😊','🥰','😏','🤗','😴','🤮','😈','👻','💀'] },
		{ name: '手', emojis: ['👍','👎','👏','🙏','✌️','🤝','💪','🫶','👋','✋','🤞','🫡','🖕','👌','🤙','🫰'] },
		{ name: 'ハート', emojis: ['❤️','💔','💖','💯','🔥','⭐','✨','💫','🎉','🎊','💥','💢','💤','💨','🫧'] },
		{ name: '食べ物', emojis: ['🍕','🍣','🍺','🍻','☕','🍰','🍜','🍙','🍱','🍩','🍗','🥤','🧋','🍷','🍫'] },
	];

	function handleSubmit() {
		const trimmed = content.trim();
		if (!trimmed) return;
		onSend(trimmed);
		content = '';
		showEmojiPicker = false;
		inputEl?.focus();
	}

	function insertEmoji(emoji: string) {
		content += emoji;
		inputEl?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function autoResize() {
		if (!inputEl) return;
		inputEl.style.height = 'auto';
		inputEl.style.height = `${inputEl.scrollHeight}px`;
	}

	$effect(() => {
		content;
		autoResize();
	});
</script>

<div class="border-t border-gray-200 bg-white">
	{#if showEmojiPicker}
		<div class="border-b border-gray-200 p-3 max-h-48 overflow-y-auto">
			{#each EMOJI_CATEGORIES as category}
				<div class="mb-2">
					<p class="text-xs text-gray-500 mb-1">{category.name}</p>
					<div class="flex flex-wrap gap-1">
						{#each category.emojis as emoji}
							<button
								type="button"
								onclick={() => insertEmoji(emoji)}
								class="text-2xl w-10 h-10 flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200"
							>
								{emoji}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex items-end gap-2 p-3">
		<div class="flex-1 relative">
			<textarea
				bind:this={inputEl}
				bind:value={content}
				onkeydown={handleKeydown}
				placeholder={`メッセージを入力... (${isMac ? 'Cmd' : 'Ctrl'}+Enterで送信)`}
				rows="1"
				class="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-2xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
			></textarea>
			<button
				type="button"
				onclick={() => showEmojiPicker = !showEmojiPicker}
				class="absolute right-2 bottom-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg"
				class:bg-blue-100={showEmojiPicker}
				class:text-blue-600={showEmojiPicker}
			>
				😊
			</button>
		</div>
		<button
			type="button"
			onclick={handleSubmit}
			disabled={!content.trim()}
			aria-label="送信"
			class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7" transform="rotate(45 12 12)"/>
			</svg>
		</button>
	</div>
</div>
