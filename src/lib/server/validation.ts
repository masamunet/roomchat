const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
	return UUID_RE.test(value);
}

const INVITE_CODE_RE = /^[A-Z2-9]{8}$/;

export function isValidInviteCode(value: string): boolean {
	return INVITE_CODE_RE.test(value);
}
