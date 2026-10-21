<script lang="ts" module>
	import type { CANCELLATION_POLICY as Policy } from '$lib/plans.js';

	/**
	 * Final confirmation before handing off to Stripe Checkout. Lists every item
	 * 特定商取引法 第12条の6 requires on the last screen of an online order.
	 */
	export interface PurchaseItem {
		kind: keyof typeof Policy;
		name: string;
		detail: string;
		amount: number;
		action: string;
		fields: Record<string, string>;
	}
</script>

<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import { CANCELLATION_POLICY, CHECKOUT_EXPIRES_MINUTES, DELIVERY_TIMING, formatYen } from '$lib/plans.js';

	let { item, onCancel }: { item: PurchaseItem | null; onCancel: () => void } = $props();
</script>

<AlertDialog.Root open={item !== null} onOpenChange={(value) => { if (!value) onCancel(); }}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="ui-overlay" />
		<AlertDialog.Content class="ui-dialog">
			{#if item}
				<AlertDialog.Title class="ui-dialog-title">ご購入内容の確認</AlertDialog.Title>
				<AlertDialog.Description class="ui-dialog-description">以下の内容をご確認のうえ、決済ページへお進みください。</AlertDialog.Description>
				<dl class="mt-4 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm text-gray-700">
					<dt class="text-gray-500">商品</dt>
					<dd class="font-medium text-gray-900">{item.name}</dd>
					<dt class="text-gray-500">内容</dt>
					<dd>{item.detail}</dd>
					<dt class="text-gray-500">価格</dt>
					<dd class="font-medium text-gray-900">{formatYen(item.amount)}（税込）・1回のみのお支払い</dd>
					<dt class="text-gray-500">支払方法</dt>
					<dd>クレジットカード等（次のStripe決済ページで選択）</dd>
					<dt class="text-gray-500">支払時期</dt>
					<dd>決済ページでのお支払い完了時（ページは{CHECKOUT_EXPIRES_MINUTES}分間有効）</dd>
					<dt class="text-gray-500">提供時期</dt>
					<dd>{DELIVERY_TIMING}</dd>
					<dt class="text-gray-500">キャンセル</dt>
					<dd>{CANCELLATION_POLICY[item.kind]}</dd>
				</dl>
				<p class="mt-4 text-xs text-gray-500">
					お支払いにより<a href="/legal/terms" target="_blank" class="underline">利用規約</a>に同意したものとみなします。詳細は<a href="/legal/commerce" target="_blank" class="underline">特定商取引法に基づく表記</a>をご覧ください。
				</p>
				<form method="POST" action={item.action} class="mt-6 flex justify-end gap-2">
					{#each Object.entries(item.fields) as [name, value]}
						<input type="hidden" {name} {value} />
					{/each}
					<AlertDialog.Cancel class="ui-button ui-button-secondary">キャンセル</AlertDialog.Cancel>
					<button type="submit" class="ui-button ui-button-primary">決済ページへ進む</button>
				</form>
			{/if}
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
