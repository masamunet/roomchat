import { error } from '@sveltejs/kit';
import { getRoomById } from '$lib/server/repositories/room.js';
import { getAllMessagesByRoom } from '$lib/server/repositories/message.js';
import { isValidUUID } from '$lib/server/validation.js';
import type { RequestHandler } from './$types';

function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const mo = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = String(date.getHours()).padStart(2, '0');
	const mi = String(date.getMinutes()).padStart(2, '0');
	const s = String(date.getSeconds()).padStart(2, '0');
	return `${y}/${mo}/${d} ${h}:${mi}:${s}`;
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
		const date = formatDate(msg.createdAt);
		const nickname = escapeCsvField(msg.nickname ?? '');
		const content = escapeCsvField(msg.content);
		return `${date},${nickname},${content}`;
	});

	const csv = BOM + header + '\n' + rows.join('\n');
	const filename = `${room.name}_log.csv`;
	const encodedFilename = encodeURIComponent(filename);

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
		}
	});
};
