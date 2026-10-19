import { error } from '@sveltejs/kit';
import { getArchivedRoomById } from '$lib/server/repositories/room.js';
import { getArchivedMessagesByRoom } from '$lib/server/repositories/message.js';
import { hasPaidArchiveCsv } from '$lib/server/repositories/payment.js';
import { isValidUUID } from '$lib/server/validation.js';
import { messagesCsvResponse } from '$lib/server/csv.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, '認証が必要です');
	}

	if (!isValidUUID(params.roomId)) {
		error(400, '無効なルームIDです');
	}

	const room = await getArchivedRoomById(params.roomId);
	if (!room) {
		error(404, 'ルームが見つかりません');
	}

	if (room.creatorId !== locals.user.id) {
		error(403, 'このルームの管理権限がありません');
	}

	if (!(await hasPaidArchiveCsv(locals.user.id, room.id))) {
		error(402, '過去ログのダウンロードには購入が必要です');
	}

	const messages = await getArchivedMessagesByRoom(room.id);
	return messagesCsvResponse(room.name, messages);
};
