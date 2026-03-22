import { addHours, differenceInMinutes } from 'date-fns';

export function getRemainingTime(createdAt: Date): string {
	const expiresAt = addHours(new Date(createdAt), 6);
	const minutesLeft = differenceInMinutes(expiresAt, new Date());
	if (minutesLeft <= 0) return '期限切れ';
	const hours = Math.floor(minutesLeft / 60);
	const mins = minutesLeft % 60;
	if (hours > 0) return `残り${hours}時間${mins}分`;
	return `残り${mins}分`;
}
