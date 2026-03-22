import { customAlphabet } from 'nanoid';

const generate = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 12);

export function generateInviteCode(): string {
	return generate();
}
