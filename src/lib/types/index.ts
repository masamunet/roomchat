export interface User {
	id: string;
	googleId: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	createdAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

export interface Room {
	id: string;
	name: string;
	inviteCode: string;
	creatorId: string;
	createdAt: Date;
	isActive: boolean;
}

export interface Participant {
	id: string;
	roomId: string;
	nickname: string;
	joinedAt: Date;
	lastSeenAt: Date;
}

export interface Message {
	id: string;
	roomId: string;
	participantId: string;
	content: string;
	createdAt: Date;
	nickname?: string;
}

export type ChatViewMode = 'slack' | 'line' | 'niconico';
