import type { Message } from '$lib/types/index.js';

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

/** Build a CSV download response (UTF-8 with BOM so Excel opens it correctly). */
export function messagesCsvResponse(roomName: string, messages: Message[]): Response {
	const BOM = '﻿';
	const header = '日時,ニックネーム,メッセージ';
	const rows = messages.map((msg) => {
		const date = escapeCsvField(formatDate(msg.createdAt));
		const nickname = escapeCsvField(msg.nickname ?? '');
		const content = escapeCsvField(msg.content);
		return `${date},${nickname},${content}`;
	});

	const csv = BOM + header + '\n' + rows.join('\n');
	const safeFilename = roomName.replace(/[^\w\s　-鿿豈-﫿-]/g, '_') + '_log.csv';
	const encodedFilename = encodeURIComponent(safeFilename);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="log.csv"; filename*=UTF-8''${encodedFilename}`,
			'Cache-Control': 'no-store'
		}
	});
}
