import { error } from '@sveltejs/kit';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getAllMessagesByRoom } from '$lib/server/repositories/message.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { RequestHandler } from './$types';

function escapeCsvField(value: string): string {
	const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
	let sanitized = value;
	if (dangerousChars.some((c) => sanitized.startsWith(c))) {
		sanitized = "'" + sanitized;
	}
	if (
		sanitized.includes('"') ||
		sanitized.includes(',') ||
		sanitized.includes('\n') ||
		sanitized.includes('\r')
	) {
		return `"${sanitized.replace(/"/g, '""')}"`;
	}
	return sanitized;
}

function formatDate(date: Date): string {
	return date.toLocaleString('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, '認証が必要です');
	}

	if (!isValidUUID(params.roomId)) {
		error(400, '無効なルームIDです');
	}

	const room = await getRoomById(params.roomId);
	if (!room) {
		error(404, 'ルームが見つかりません');
	}

	if (room.creatorId !== locals.user.id) {
		error(403, 'このルームの管理権限がありません');
	}

	const messages = await getAllMessagesByRoom(room.id);

	const BOM = '\uFEFF';
	const header = '日時,ニックネーム,メッセージ';
	const rows = messages.map((msg) => {
		const date = escapeCsvField(formatDate(msg.createdAt));
		const nickname = escapeCsvField(msg.nickname ?? '');
		const content = escapeCsvField(msg.content);
		return `${date},${nickname},${content}`;
	});

	const csv = BOM + header + '\n' + rows.join('\n');
	const safeFilename = room.name.replace(/[^\w\s\u3000-\u9FFF\uF900-\uFAFF-]/g, '_') + '_log.csv';
	const encodedFilename = encodeURIComponent(safeFilename);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="log.csv"; filename*=UTF-8''${encodedFilename}`,
			'Cache-Control': 'no-store'
		}
	});
};
