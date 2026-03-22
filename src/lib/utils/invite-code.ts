import { nanoid } from 'nanoid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
	const id = nanoid(8);
	return id
		.split('')
		.map((c) => ALPHABET[c.charCodeAt(0) % ALPHABET.length])
		.join('');
}
