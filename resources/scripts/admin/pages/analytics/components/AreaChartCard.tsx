import { Skeleton } from '@/components/ui/skeleton';
import { __ } from '@wordpress/i18n';
import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { AreaChartData } from '../analytics.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
			<span
				style={{
					width: 8,
					height: 8,
					borderRadius: 2,
					background: color,
					boxShadow: `0 0 0 3px ${color}22`,
					flexShrink: 0,
				}}
			/>
			<span
				style={{
					color: 'var(--muted-foreground)',
					fontWeight: 500,
					fontSize: '12px',
				}}
			>
				{label}
			</span>
		</span>
	);
}

export function AreaChartCard({
	chartData,
	loading,
	totalInPeriod,
}: {
	chartData: AreaChartData;
	loading: boolean;
	totalInPeriod: number;
}) {
	const isEmpty = chartData.labels.length === 0;
	const dataset = {
		labels: chartData.labels,
		datasets: [
			{
				label: __('Responses', 'allfeedback'),
				data: chartData.values,
				borderColor: 'oklch(0.580 0.238 277)',
				backgroundColor: 'oklch(0.580 0.238 277 / 0.10)',
				fill: true,
				tension: 0.35,
				pointRadius: 0,
				pointHoverRadius: 5,
				borderWidth: 2,
			},
		],
	};

	const scales = {
		x: {
			grid: { display: false },
			border: { display: false },
			ticks: {
				color: 'var(--muted-foreground)' as string,
				font: { size: 11 },
				maxTicksLimit: 10,
			},
		},
		y: {
			beginAtZero: true,
			grid: { display: false },
			border: { display: false },
			ticks: {
				color: 'var(--muted-foreground)' as string,
				font: { size: 11 },
				precision: 0,
			},
		},
	};

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				padding: '20px 22px',
				minWidth: 0,
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					marginBottom: 4,
				}}
			>
				<div>
					<h3
						style={{
							fontSize: 'var(--text-md)',
							fontWeight: 600,
							letterSpacing: '-0.01em',
							color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
							margin: 0,
						}}
					>
						{__('Responses over time', 'allfeedback')}
					</h3>
					{loading ? (
						<Skeleton
							style={{ height: 13, width: 140, borderRadius: 4, marginTop: 5 }}
						/>
					) : (
						<p
							style={{
								marginTop: 2,
								fontSize: '12px',
								color: 'var(--muted-foreground)',
							}}
						>
							<span
								style={{
									fontVariantNumeric: 'tabular-nums',
									color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
									fontWeight: 600,
								}}
							>
								{totalInPeriod.toLocaleString()}
							</span>{' '}
							{__('responses · weekly', 'allfeedback')}
						</p>
					)}
				</div>
				<LegendDot color="var(--primary)" label={__('Responses', 'allfeedback')} />
			</div>

			<div style={{ height: 260, marginTop: 16 }}>
				{loading ? (
					<Skeleton style={{ height: '100%', width: '100%', borderRadius: 8 }} />
				) : isEmpty ? (
					<div
						style={{
							display: 'flex',
							height: '100%',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
							{__('No data available.', 'allfeedback')}
						</p>
					</div>
				) : (
					<Line
						data={dataset}
						options={{
							responsive: true,
							maintainAspectRatio: false,
							interaction: { mode: 'index', intersect: false },
							plugins: {
								legend: { display: false },
								tooltip: {
									callbacks: {
										label: (ctx) =>
											` ${ctx.parsed.y} ${__('responses', 'allfeedback')}`,
									},
								},
							},
							scales,
						}}
					/>
				)}
			</div>
		</div>
	);
}
