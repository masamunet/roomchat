<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	type Props = { user: { id: string; name: string | null; email: string; avatarUrl: string | null } | null };
	let { user }: Props = $props();
	let logoutForm = $state<HTMLFormElement>();

</script>

<header class="h-[60px] bg-white/95 border-b border-slate-200/70 px-5 flex items-center">
	<div class="w-full max-w-5xl mx-auto flex items-center justify-between">
		<a href="/" class="text-xl font-bold text-gray-900">
			RoomChat
		</a>

		<nav class="flex items-center gap-3">
			{#if user}
				<a href="/admin" class="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100">
					管理
				</a>

				<form bind:this={logoutForm} method="POST" action="/auth/logout"></form>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="rounded-full p-1 transition-shadow hover:ring-4 hover:ring-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="ユーザーメニュー">
						{#if user.avatarUrl}<img src={user.avatarUrl} alt="" class="size-8 rounded-full" />
						{:else}<span class="flex size-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">{(user.name ?? user.email)[0].toUpperCase()}</span>{/if}
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content align="end" sideOffset={8} class="ui-popover min-w-60 p-1.5">
							<DropdownMenu.Group>
								<DropdownMenu.GroupHeading class="px-3 py-2"><span class="block text-sm font-semibold text-slate-900">{user.name ?? 'ユーザー'}</span><span class="block mt-1 text-xs font-normal text-slate-500">{user.email}</span></DropdownMenu.GroupHeading>
								<DropdownMenu.Separator class="my-1 h-px bg-slate-100" />
								<DropdownMenu.Item class="ui-menu-item text-red-600" onSelect={() => logoutForm?.requestSubmit()}>ログアウト</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
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
