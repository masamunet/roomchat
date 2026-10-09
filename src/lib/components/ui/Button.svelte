<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	let { children, variant = 'secondary', class: className = '', ref = $bindable(null), type = 'button', ...rest }: HTMLButtonAttributes & { children?: Snippet; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; ref?: HTMLButtonElement | null } = $props();
</script>
<button bind:this={ref} {type} {...rest} class="ui-button ui-button-{variant} {className}">{#if children}{@render children()}{/if}</button>
