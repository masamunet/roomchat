<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	type Props = {
		value: string;
		size?: number;
	};

	let { value, size = 256 }: Props = $props();
	let canvas: HTMLCanvasElement;

	onMount(() => {
		QRCode.toCanvas(canvas, value, {
			width: size,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#ffffff'
			}
		});
	});
</script>

<canvas bind:this={canvas} class="rounded-lg"></canvas>
