import { differenceInMinutes } from 'date-fns';

export function getRemainingTime(expiresAt: Date): string {
	const minutesLeft = differenceInMinutes(new Date(expiresAt), new Date());
	if (minutesLeft <= 0) return '期限切れ';
	const days = Math.floor(minutesLeft / (60 * 24));
	const hours = Math.floor((minutesLeft % (60 * 24)) / 60);
	const mins = minutesLeft % 60;
	if (days > 0) return `残り${days}日${hours}時間`;
	if (hours > 0) return `残り${hours}時間${mins}分`;
	return `残り${mins}分`;
}
