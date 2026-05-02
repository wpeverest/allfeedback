import { parseISO } from 'date-fns';
import type { AreaChartData } from './analytics.types';

export function groupByWeek(entries: { date: string; count: number }[]): AreaChartData {
	const map = new Map<string, number>();
	for (const { date, count } of entries) {
		const d = parseISO(date);
		const dow = d.getDay();
		const monday = new Date(d);
		monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
		const key = monday.toISOString().slice(0, 10);
		map.set(key, (map.get(key) ?? 0) + count);
	}
	const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return {
		labels: sorted.map(([key]) => {
			const [, m, d] = key.split('-');
			return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
		}),
		values: sorted.map(([, v]) => v),
	};
}

export function formatSeconds(secs: number | null): string {
	if (secs === null) return '—';
	if (secs < 60) return `${Math.round(secs)}s`;
	const m = Math.floor(secs / 60);
	const s = Math.round(secs % 60);
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
