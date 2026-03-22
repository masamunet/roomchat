<script lang="ts">
	type Props = {
		user: {
			id: string;
			name: string | null;
			email: string;
			avatarUrl: string | null;
		} | null;
	};

	let { user }: Props = $props();
	let menuOpen = $state(false);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && menuOpen) menuOpen = false; }} />

<header class="bg-white border-b border-gray-200 px-4 py-3">
	<div class="max-w-4xl mx-auto flex items-center justify-between">
		<a href="/" class="text-xl font-bold text-gray-900">
			RoomChat
		</a>

		<nav class="flex items-center gap-3">
			{#if user}
				<a href="/admin" class="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
					管理
				</a>

				<div class="relative">
					<button
						onclick={() => menuOpen = !menuOpen}
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						aria-label="ユーザーメニュー"
						class="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-gray-300"
					>
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt={user.name ?? 'ユーザー'} class="w-8 h-8 rounded-full" />
						{:else}
							<div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
								{(user.name ?? user.email)[0].toUpperCase()}
							</div>
						{/if}
					</button>

					{#if menuOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="fixed inset-0 z-10"
							onclick={() => menuOpen = false}
							onkeydown={() => {}}
						></div>
						<div class="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48" role="menu">
							<div class="px-4 py-2 border-b border-gray-100">
								<p class="text-sm font-medium text-gray-900">{user.name ?? 'ユーザー'}</p>
								<p class="text-xs text-gray-500">{user.email}</p>
							</div>
							<form method="POST" action="/auth/logout">
								<button type="submit" role="menuitem" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
									ログアウト
								</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href="/auth/google"
					class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					ログイン
				</a>
			{/if}
		</nav>
	</div>
</header>
