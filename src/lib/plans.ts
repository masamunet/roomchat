/** Hours a room stays open without any purchase. */
export const FREE_ROOM_HOURS = 6;

export interface RoomExtensionPlan {
	id: 'extend_12h' | 'extend_3d' | 'extend_1m';
	/** Stripe price lookup_key (roomchat_ prefix keeps it apart from other products on the account). */
	lookupKey: string;
	amount: number;
	hours: number;
	label: string;
}

export const ROOM_EXTENSION_PLANS: RoomExtensionPlan[] = [
	{ id: 'extend_12h', lookupKey: 'roomchat_room_extend_12h', amount: 300, hours: 12, label: '12時間延長' },
	{ id: 'extend_3d', lookupKey: 'roomchat_room_extend_3d', amount: 800, hours: 72, label: '3日間延長' },
	{ id: 'extend_1m', lookupKey: 'roomchat_room_extend_1m', amount: 1500, hours: 720, label: '1ヶ月延長' }
];

export const ARCHIVE_CSV_PLAN = {
	lookupKey: 'roomchat_archive_csv',
	amount: 3000,
	label: '過去ログCSVダウンロード'
} as const;

export function formatYen(amount: number): string {
	return `${amount.toLocaleString('ja-JP')}円`;
}

/** Minutes a Stripe Checkout page stays open (also shown to the buyer as the order window). */
export const CHECKOUT_EXPIRES_MINUTES = 30;

/**
 * Cancellation terms shown on the final confirmation (our dialog and Stripe Checkout),
 * as required for 特定申込み under 特定商取引法 第12条の6. Keep in sync with /legal/commerce.
 */
export const CANCELLATION_POLICY = {
	room_extension: 'お支払い完了後のキャンセル・返金はできません。ただし、お支払い完了時点で対象のルームがすでに終了していた場合は全額を自動返金します。',
	archive_csv: 'お支払い完了後のキャンセル・返金はできません。'
} as const;

export const DELIVERY_TIMING = 'お支払い完了後、直ちに反映されます。';
