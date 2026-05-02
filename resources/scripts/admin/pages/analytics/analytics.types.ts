export type DonutData = {
	total: number;
	promoters: number;
	passives: number;
	detractors: number;
	score: number;
};

export type AreaChartData = { labels: string[]; values: number[] };

export const NPS_COLORS = {
	detractor: { bar: 'var(--destructive)', progress: 'var(--destructive)' },
	passive: { bar: 'var(--warning)', progress: 'var(--warning)' },
	promoter: { bar: 'var(--success)', progress: 'var(--success)' },
};

export const DEVICE_COLORS: Record<string, string> = {
	desktop: 'oklch(0.580 0.238 277)',
	mobile: 'oklch(0.577 0.245 27)',
	tablet: 'oklch(0.62 0.14 155)',
};
