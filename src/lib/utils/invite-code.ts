import { customAlphabet } from 'nanoid';

const generate = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

export function generateInviteCode(): string {
	return generate();
}
