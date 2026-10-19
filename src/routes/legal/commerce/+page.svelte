<script lang="ts">
	import LegalPage from '../LegalPage.svelte';
	import { OPERATOR } from '$lib/legal.js';
	import { ROOM_EXTENSION_PLANS, ARCHIVE_CSV_PLAN, formatYen } from '$lib/plans.js';
</script>

<LegalPage title="特定商取引法に基づく表記" updated="2026年10月17日">
	<dl>
		<dt>販売業者</dt>
		<dd>{OPERATOR.name}</dd>
		<dt>代表責任者</dt>
		<dd>{OPERATOR.representative}</dd>
		<dt>所在地</dt>
		<dd>{OPERATOR.address}</dd>
		<dt>電話番号</dt>
		<dd>{OPERATOR.phone}</dd>
		<dt>メールアドレス</dt>
		<dd>{OPERATOR.email}</dd>
		<dt>販売価格</dt>
		<dd>
			<ul>
				{#each ROOM_EXTENSION_PLANS as plan}
					<li>ルーム{plan.label}: {formatYen(plan.amount)}（税込）</li>
				{/each}
				<li>{ARCHIVE_CSV_PLAN.label}（1ルーム）: {formatYen(ARCHIVE_CSV_PLAN.amount)}（税込）</li>
			</ul>
		</dd>
		<dt>商品代金以外の必要料金</dt>
		<dd>インターネット接続に必要な通信料はお客様のご負担となります。</dd>
		<dt>支払方法</dt>
		<dd>クレジットカード、その他Stripeの決済ページで表示される支払方法</dd>
		<dt>支払時期</dt>
		<dd>ご購入手続きの完了時にお支払いが確定します。</dd>
		<dt>提供時期</dt>
		<dd>決済完了後、直ちにご利用いただけます。</dd>
		<dt>返品・キャンセル</dt>
		<dd>
			デジタルサービスの性質上、決済完了後の返品・キャンセルはお受けできません。ただし、決済完了時点で対象のルームがすでに終了していた場合は、延長料金を自動的に全額返金します。
		</dd>
		<dt>動作環境</dt>
		<dd>最新版のGoogle Chrome、Safari、Firefox、Microsoft Edge</dd>
	</dl>
</LegalPage>
