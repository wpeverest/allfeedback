import type {
	FormAnalyticsDetail,
	FormAnalyticsListItem,
} from '@/admin/api/analytics';
import type { SurveyResponse } from '@/admin/api/surveys';
import {
	analyticsFormDetailQuery,
	analyticsFormsQuery,
	analyticsOverviewQuery,
} from '@/admin/queries/analytics';
import { allResponsesQuery, surveyResponsesQuery } from '@/admin/queries/surveys';
import { EmptyState } from '@/components/ui/empty-state';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import {
	ArcElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from 'chart.js';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
	AlertCircle,
	BarChart2,
	Monitor,
	Smartphone,
	Tablet,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	Filler,
	Tooltip,
);

type DonutData = {
	total: number;
	promoters: number;
	passives: number;
	detractors: number;
	score: number;
};
type AreaChartData = { labels: string[]; values: number[] };

function groupByWeek(
	entries: { date: string; count: number }[],
): AreaChartData {
	const map = new Map<string, number>();
	for (const { date, count } of entries) {
		const d = parseISO(date);
		const dow = d.getDay(); // 0=Sun … 6=Sat
		const monday = new Date(d);
		monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
		const key = monday.toISOString().slice(0, 10);
		map.set(key, (map.get(key) ?? 0) + count);
	}
	const sorted = Array.from(map.entries()).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	const MONTHS = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	];
	return {
		labels: sorted.map(([key]) => {
			const [, m, d] = key.split('-');
			return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
		}),
		values: sorted.map(([, v]) => v),
	};
}

function Sparkline({
	data,
	color = 'var(--primary)',
}: {
	data: number[];
	color?: string;
}) {
	if (data.length < 2) return null;
	const w = 108,
		h = 34,
		pad = 2;
	const min = Math.min(...data);
	const max = Math.max(...data);
	const rng = max - min || 1;
	const xs = (i: number) => pad + (i * (w - 2 * pad)) / (data.length - 1);
	const ys = (v: number) =>
		pad + (h - 2 * pad) - ((v - min) / rng) * (h - 2 * pad);
	const pts = data.map((v, i) => [xs(i), ys(v)] as [number, number]);
	const path = pts.reduce((acc, p, i, a) => {
		if (i === 0) return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
		const pr = a[i - 1];
		const mx = (pr[0] + p[0]) / 2;
		return (
			acc +
			` Q ${pr[0].toFixed(1)} ${pr[1].toFixed(1)}, ${mx.toFixed(1)} ${((pr[1] + p[1]) / 2).toFixed(1)} T ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
		);
	}, '');
	const area = `${path} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;
	const uid = `sp-${color.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`;
	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${w} ${h}`}
			style={{ display: 'block' }}
		>
			<defs>
				<linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity="0.22" />
					<stop offset="100%" stopColor={color} stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill={`url(#${uid})`} />
			<path
				d={path}
				fill="none"
				stroke={color}
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx={pts[pts.length - 1][0]}
				cy={pts[pts.length - 1][1]}
				r="2.2"
				fill={color}
			/>
		</svg>
	);
}

function DeltaPill({ value, label }: { value: number | null; label: string }) {
	if (value === null) {
		return (
			<span
				style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}
			>
				{label}
			</span>
		);
	}
	const up = value >= 0;
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
			<span
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 3,
					fontSize: 'var(--text-xs)',
					fontWeight: 600,
					color: up ? 'var(--success)' : 'var(--destructive)',
					background: up ? 'var(--success-subtle)' : 'var(--warning-subtle)',
					padding: '2px 7px',
					borderRadius: 999,
					boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${up ? 'var(--success)' : 'var(--destructive)'} 25%, transparent)`,
				}}
			>
				{up ? '↑' : '↓'} {Math.abs(value)}%
			</span>
			<span
				style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}
			>
				{label}
			</span>
		</div>
	);
}

function KPICard({
	label,
	value,
	unit,
	deltaValue,
	deltaLabel,
	sparkData,
	sparkColor,
	loading,
}: {
	label: string;
	value: string;
	unit?: string;
	deltaValue?: number | null;
	deltaLabel?: string;
	sparkData?: number[];
	sparkColor?: string;
	loading: boolean;
}) {
	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				padding: '18px 20px 16px',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
				<span
					style={{
						fontSize: 'var(--text-xs)',
						textTransform: 'uppercase',
						letterSpacing: '0.06em',
						fontWeight: 600,
						color: 'var(--muted-foreground)',
					}}
				>
					{label}
				</span>
			</div>

			<div
				style={{
					marginTop: 14,
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'space-between',
					gap: 12,
				}}
			>
				{loading ? (
					<Skeleton style={{ height: 28, width: 80, borderRadius: 6 }} />
				) : (
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
						<span
							style={{
								fontSize: 'var(--text-xl)',
								fontWeight: 600,
								letterSpacing: '-0.02em',
								color: 'var(--foreground)',
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{value}
						</span>
						{unit && (
							<span
								style={{
									fontSize: 'var(--text-sm)',
									color: 'var(--muted-foreground)',
									fontWeight: 400,
								}}
							>
								{unit}
							</span>
						)}
					</div>
				)}
				{loading && sparkColor ? (
					<Skeleton
						style={{ width: 108, height: 34, borderRadius: 6, flexShrink: 0 }}
					/>
				) : !loading && sparkData && sparkData.length >= 2 ? (
					<div style={{ marginBottom: 2, flexShrink: 0 }}>
						<Sparkline
							data={sparkData}
							color={sparkColor ?? 'var(--primary)'}
						/>
					</div>
				) : null}
			</div>

			<div style={{ marginTop: 10 }}>
				{loading ? (
					<Skeleton style={{ height: 18, width: 96, borderRadius: 6 }} />
				) : deltaValue !== undefined && deltaLabel ? (
					<DeltaPill value={deltaValue} label={deltaLabel} />
				) : deltaLabel ? (
					<span
						style={{
							fontSize: 'var(--text-xs)',
							color: 'var(--muted-foreground)',
						}}
					>
						{deltaLabel}
					</span>
				) : null}
			</div>
		</div>
	);
}

function FormSelector({
	forms,
	selectedId,
	onChange,
}: {
	forms: FormAnalyticsListItem[];
	selectedId: number | null;
	onChange: (id: number | null) => void;
}) {
	const value = selectedId !== null ? String(selectedId) : 'all';
	return (
		<Select
			value={value}
			onValueChange={(v) => onChange(v === 'all' ? null : Number(v))}
		>
			<SelectTrigger className="w-[220px]">
				<SelectValue placeholder={__('All forms', 'allfeedback')} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">{__('All forms', 'allfeedback')}</SelectItem>
				{forms.map((f) => (
					<SelectItem key={f.id} value={String(f.id)}>
						{f.title}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function LegendDot({ color, label }: { color: string; label: string }) {
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
					fontSize: 'var(--text-xs)',
				}}
			>
				{label}
			</span>
		</span>
	);
}

function AreaChartCard({
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
							color: 'var(--foreground)',
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
								fontSize: 'var(--text-xs)',
								color: 'var(--muted-foreground)',
							}}
						>
							<span
								style={{
									fontVariantNumeric: 'tabular-nums',
									color: 'var(--foreground)',
									fontWeight: 600,
								}}
							>
								{totalInPeriod.toLocaleString()}
							</span>{' '}
							{__('responses · weekly', 'allfeedback')}
						</p>
					)}
				</div>
				<LegendDot
					color="var(--primary)"
					label={__('Responses', 'allfeedback')}
				/>
			</div>

			<div style={{ height: 260, marginTop: 16 }}>
				{loading ? (
					<Skeleton
						style={{ height: '100%', width: '100%', borderRadius: 8 }}
					/>
				) : isEmpty ? (
					<div
						style={{
							display: 'flex',
							height: '100%',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<p
							style={{
								fontSize: 'var(--text-sm)',
								color: 'var(--muted-foreground)',
							}}
						>
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

const NPS_COLORS = {
	detractor: { bar: 'var(--destructive)', progress: 'var(--destructive)' },
	passive: { bar: 'var(--warning)', progress: 'var(--warning)' },
	promoter: { bar: 'var(--success)', progress: 'var(--success)' },
};

function NpsDistributionCard({
	nps,
	scoreDist,
	loading,
}: {
	nps: DonutData;
	scoreDist: Record<number, number>;
	loading: boolean;
}) {
	const [hovered, setHovered] = useState<'detractor' | 'passive' | 'promoter' | null>(null);
	const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

	const total = nps.total;
	const detPct = total > 0 ? Math.round((nps.detractors / total) * 100) : 0;
	const pasPct = total > 0 ? Math.round((nps.passives / total) * 100) : 0;
	const proPct = total > 0 ? Math.round((nps.promoters / total) * 100) : 0;

	const segmentInfo = {
		detractor: {
			label: __('Detractors', 'allfeedback'),
			count: nps.detractors,
			pct: total > 0 ? ((nps.detractors / total) * 100).toFixed(1) : '0.0',
			color: NPS_COLORS.detractor.bar,
		},
		passive: {
			label: __('Passives', 'allfeedback'),
			count: nps.passives,
			pct: total > 0 ? ((nps.passives / total) * 100).toFixed(1) : '0.0',
			color: NPS_COLORS.passive.bar,
		},
		promoter: {
			label: __('Promoters', 'allfeedback'),
			count: nps.promoters,
			pct: total > 0 ? ((nps.promoters / total) * 100).toFixed(1) : '0.0',
			color: NPS_COLORS.promoter.bar,
		},
	};

	const onEnter = (seg: 'detractor' | 'passive' | 'promoter') =>
		(e: React.MouseEvent) => {
			setHovered(seg);
			setMousePos({ x: e.clientX, y: e.clientY });
		};
	const onMove = (seg: 'detractor' | 'passive' | 'promoter') =>
		(e: React.MouseEvent) => {
			setHovered(seg);
			setMousePos({ x: e.clientX, y: e.clientY });
		};
	const onLeave = () => {
		setHovered(null);
		setMousePos(null);
	};

	const arcOpacity = (seg: 'detractor' | 'passive' | 'promoter') =>
		hovered === null || hovered === seg ? 0.82 : 0.28;

	const GX = 110,
		GY = 90,
		R_OUT = 78,
		R_IN = 72,
		GAP = 1.8;
	const gPolar = (deg: number, r: number) => {
		const rad = (deg * Math.PI) / 180;
		return { x: GX + r * Math.cos(rad), y: GY - r * Math.sin(rad) };
	};
	const gArc = (from: number, to: number): string => {
		const large = from - to > 180 ? 1 : 0;
		const o1 = gPolar(from, R_OUT),
			o2 = gPolar(to, R_OUT);
		const i2 = gPolar(to, R_IN),
			i1 = gPolar(from, R_IN);
		return `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)} A ${R_IN} ${R_IN} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} Z`;
	};
	const clampedScore = total > 0 ? Math.max(-100, Math.min(100, nps.score)) : 0;
	const needleAngle = 180 - ((clampedScore + 100) / 200) * 180;
	const needleTip = gPolar(needleAngle, R_IN - 2);
	const perpRad = ((needleAngle + 90) * Math.PI) / 180;
	const nSide1 = {
		x: GX + 1.4 * Math.cos(perpRad),
		y: GY - 1.4 * Math.sin(perpRad),
	};
	const nSide2 = {
		x: GX - 1.4 * Math.cos(perpRad),
		y: GY + 1.4 * Math.sin(perpRad),
	};
	const scoreColor =
		nps.score >= 50
			? 'var(--success)'
			: nps.score >= 0
				? 'var(--warning)'
				: 'var(--destructive)';
	const rLabel0 = gPolar(90, R_OUT + 6);
	const rLabelL = gPolar(180, R_OUT + 6);
	const rLabelR = gPolar(0, R_OUT + 6);

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				padding: '20px 22px',
				display: 'flex',
				flexDirection: 'column',
				minWidth: 0,
				overflow: 'hidden',
			}}
		>
			{/* Floating tooltip */}
			{hovered && mousePos && (
				<div
					style={{
						position: 'fixed',
						left: mousePos.x + 14,
						top: mousePos.y - 12,
						zIndex: 9999,
						pointerEvents: 'none',
						background: 'rgba(0,0,0,0.80)',
						color: '#fff',
						padding: '6px 10px',
						borderRadius: 6,
						fontSize: '12px',
						fontWeight: 500,
						lineHeight: 1.5,
						whiteSpace: 'nowrap',
						display: 'flex',
						alignItems: 'center',
						gap: 7,
					}}
				>
					<span
						style={{
							width: 10,
							height: 10,
							borderRadius: 2,
							background: segmentInfo[hovered].color,
							flexShrink: 0,
						}}
					/>
					<span>
						{segmentInfo[hovered].label}:{' '}
						{segmentInfo[hovered].count.toLocaleString()} (
						{segmentInfo[hovered].pct}%)
					</span>
				</div>
			)}

			<div style={{ marginBottom: 12 }}>
				<h3
					style={{
						fontSize: 'var(--text-md)',
						fontWeight: 600,
						letterSpacing: '-0.01em',
						color: 'var(--foreground)',
						margin: 0,
					}}
				>
					{__('NPS distribution', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: 'var(--text-xs)',
						color: 'var(--muted-foreground)',
					}}
				>
					{__('0–6 detractors · 7–8 passives · 9–10 promoters', 'allfeedback')}
				</p>
			</div>

			{loading ? (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<Skeleton style={{ height: 108, width: '100%', borderRadius: 8 }} />
					<Skeleton
						style={{
							height: 10,
							width: 160,
							borderRadius: 4,
							alignSelf: 'center',
						}}
					/>
					<Skeleton style={{ height: 7, width: '100%', borderRadius: 999 }} />
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<Skeleton style={{ height: 12, width: 72, borderRadius: 4 }} />
						<Skeleton style={{ height: 12, width: 60, borderRadius: 4 }} />
						<Skeleton style={{ height: 12, width: 72, borderRadius: 4 }} />
					</div>
				</div>
			) : !total ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flex: 1,
						minHeight: 160,
					}}
				>
					<p
						style={{
							fontSize: 'var(--text-sm)',
							color: 'var(--muted-foreground)',
						}}
					>
						{__('No NPS responses yet.', 'allfeedback')}
					</p>
				</div>
			) : (
				<>
					<svg
						viewBox="0 0 220 122"
						width="100%"
						style={{ display: 'block', overflow: 'visible' }}
					>
						<path
							d={gArc(180, 90 + GAP)}
							fill="var(--destructive)"
							opacity={arcOpacity('detractor')}
							style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
							onMouseEnter={onEnter('detractor')}
							onMouseMove={onMove('detractor')}
							onMouseLeave={onLeave}
						/>
						<path
							d={gArc(90 - GAP, 45 + GAP)}
							fill="var(--warning)"
							opacity={arcOpacity('passive')}
							style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
							onMouseEnter={onEnter('passive')}
							onMouseMove={onMove('passive')}
							onMouseLeave={onLeave}
						/>
						<path
							d={gArc(45 - GAP, 0)}
							fill="var(--success)"
							opacity={arcOpacity('promoter')}
							style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
							onMouseEnter={onEnter('promoter')}
							onMouseMove={onMove('promoter')}
							onMouseLeave={onLeave}
						/>
						<text
							x={rLabelL.x - 2}
							y={rLabelL.y + 3}
							textAnchor="end"
							fontSize="7"
							fill="var(--muted-foreground)"
							opacity="0.5"
						>
							−100
						</text>
						<text
							x={rLabel0.x}
							y={rLabel0.y - 2}
							textAnchor="middle"
							fontSize="7"
							fill="var(--muted-foreground)"
							opacity="0.5"
						>
							0
						</text>
						<text
							x={rLabelR.x + 2}
							y={rLabelR.y + 3}
							textAnchor="start"
							fontSize="7"
							fill="var(--muted-foreground)"
							opacity="0.5"
						>
							+100
						</text>
						<path
							d={`M ${needleTip.x.toFixed(2)} ${needleTip.y.toFixed(2)} L ${nSide1.x.toFixed(2)} ${nSide1.y.toFixed(2)} L ${nSide2.x.toFixed(2)} ${nSide2.y.toFixed(2)} Z`}
							fill={scoreColor}
						/>
						<circle
							cx={GX}
							cy={GY}
							r="2.8"
							fill="var(--card)"
							stroke={scoreColor}
							strokeWidth="1.5"
						/>
						<text
							x={GX}
							y={GY + 18}
							textAnchor="middle"
							fontSize="11"
							fontWeight="600"
							fill={scoreColor}
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							{nps.score >= 0
								? `+${nps.score.toFixed(0)}`
								: nps.score.toFixed(0)}
						</text>
					</svg>
					<p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', margin: '-2px 0 8px', letterSpacing: '0.01em' }}>
						{__('Promoters % – Detractors %', 'allfeedback')}
					</p>

					<div
						style={{
							height: 7,
							borderRadius: 999,
							overflow: 'hidden',
							display: 'flex',
						}}
					>
						<div
							style={{
								flex: detPct,
								background: NPS_COLORS.detractor.progress,
								opacity: hovered === null || hovered === 'detractor' ? 1 : 0.3,
								transition: 'opacity 120ms',
								cursor: 'pointer',
							}}
							onMouseEnter={onEnter('detractor')}
							onMouseMove={onMove('detractor')}
							onMouseLeave={onLeave}
						/>
						<div
							style={{
								flex: pasPct,
								background: NPS_COLORS.passive.progress,
								opacity: hovered === null || hovered === 'passive' ? 1 : 0.3,
								transition: 'opacity 120ms',
								cursor: 'pointer',
							}}
							onMouseEnter={onEnter('passive')}
							onMouseMove={onMove('passive')}
							onMouseLeave={onLeave}
						/>
						<div
							style={{
								flex: proPct,
								background: NPS_COLORS.promoter.progress,
								opacity: hovered === null || hovered === 'promoter' ? 1 : 0.3,
								transition: 'opacity 120ms',
								cursor: 'pointer',
							}}
							onMouseEnter={onEnter('promoter')}
							onMouseMove={onMove('promoter')}
							onMouseLeave={onLeave}
						/>
					</div>

					<div
						style={{
							marginTop: 8,
							display: 'flex',
							justifyContent: 'space-between',
							flexWrap: 'wrap',
							gap: '4px 8px',
						}}
					>
						{[
							{
								key: 'detractor' as const,
								label: __('Detractors', 'allfeedback'),
								pct: detPct,
								color: NPS_COLORS.detractor.bar,
							},
							{
								key: 'passive' as const,
								label: __('Passives', 'allfeedback'),
								pct: pasPct,
								color: NPS_COLORS.passive.bar,
							},
							{
								key: 'promoter' as const,
								label: __('Promoters', 'allfeedback'),
								pct: proPct,
								color: NPS_COLORS.promoter.bar,
							},
						].map((g) => (
							<span
								key={g.label}
								style={{
									fontSize: 'var(--text-xs)',
									color: 'var(--muted-foreground)',
									fontWeight: 500,
									opacity: hovered === null || hovered === g.key ? 1 : 0.4,
									transition: 'opacity 120ms',
									cursor: 'pointer',
								}}
								onMouseEnter={onEnter(g.key)}
								onMouseMove={onMove(g.key)}
								onMouseLeave={onLeave}
							>
								{g.label}{' '}
								<span
									style={{
										color: g.color,
										fontWeight: 700,
										fontVariantNumeric: 'tabular-nums',
									}}
								>
									{g.pct}%
								</span>
							</span>
						))}
					</div>
				</>
			)}
		</div>
	);
}

function formatSeconds(secs: number | null): string {
	if (secs === null) return '—';
	if (secs < 60) return `${Math.round(secs)}s`;
	const m = Math.floor(secs / 60);
	const s = Math.round(secs % 60);
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function SessionMetricsCard({
	sm,
	loading,
}: {
	sm: FormAnalyticsDetail['session_metrics'] | null;
	loading: boolean;
}) {
	const completed = sm?.total_submissions ?? 0;
	const abandoned = sm
		? Math.max(0, sm.total_starts - sm.total_submissions)
		: 0;
	const notStarted = sm ? Math.max(0, sm.total_views - sm.total_starts) : 0;
	const hasData = completed + abandoned + notStarted > 0;

	const segments = [
		{
			label: __('Completed', 'allfeedback'),
			sub: __('Submitted', 'allfeedback'),
			value: completed,
			color: 'oklch(0.580 0.238 277)',
			chartColor: 'oklch(0.580 0.238 277)',
		},
		{
			label: __('Abandoned', 'allfeedback'),
			sub: __('Started, dropped', 'allfeedback'),
			value: abandoned,
			color: 'oklch(0.577 0.245 27)',
			chartColor: 'oklch(0.577 0.245 27)',
		},
		{
			label: __('Not started', 'allfeedback'),
			sub: __('Viewed only', 'allfeedback'),
			value: notStarted,
			color: 'oklch(0.72 0.008 247)',
			chartColor: 'oklch(0.870 0.006 247)',
		},
	];

	const chartData = {
		labels: segments.map((s) => s.label),
		datasets: [
			{
				data: segments.map((s) => s.value),
				backgroundColor: segments.map((s) => s.chartColor),
				borderWidth: 0,
				hoverOffset: 0,
			},
		],
	};

	const total = completed + abandoned + notStarted;

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					padding: '16px 20px',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<h3
					style={{
						fontSize: 'var(--text-md)',
						fontWeight: 600,
						letterSpacing: '-0.01em',
						color: 'var(--foreground)',
						margin: 0,
					}}
				>
					{__('Session breakdown', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: 'var(--text-xs)',
						color: 'var(--muted-foreground)',
					}}
				>
					{__('Completion · abandoned · drop-off', 'allfeedback')}
				</p>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '16px 20px',
					gap: 12,
				}}
			>
				{loading ? (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: 184,
							height: 184,
						}}
					>
						<Skeleton
							style={{ width: 168, height: 168, borderRadius: '50%' }}
						/>
					</div>
				) : !hasData ? (
					<div
						style={{
							width: 184,
							height: 184,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<p
							style={{
								fontSize: 'var(--text-sm)',
								color: 'var(--muted-foreground)',
								textAlign: 'center',
							}}
						>
							{__('No session data yet.', 'allfeedback')}
						</p>
					</div>
				) : (
					<div
						style={{
							position: 'relative',
							width: 184,
							height: 184,
							flexShrink: 0,
						}}
					>
						<Doughnut
							data={chartData}
							options={{
								responsive: true,
								maintainAspectRatio: false,
								cutout: '72%',
								plugins: {
									legend: { display: false },
									tooltip: {
										callbacks: {
											label: (ctx) => {
												const pct =
													total > 0
														? ((ctx.parsed / total) * 100).toFixed(1)
														: '0';
												return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
											},
										},
									},
								},
							}}
						/>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								display: 'grid',
								placeItems: 'center',
								pointerEvents: 'none',
								textAlign: 'center',
							}}
						>
							<div>
								<div
									style={{
										fontSize: 'var(--text-2xs)',
										textTransform: 'uppercase',
										letterSpacing: '0.06em',
										color: 'var(--muted-foreground)',
										fontWeight: 500,
									}}
								>
									{__('Total', 'allfeedback')}
								</div>
								<div
									style={{
										fontSize: 'var(--text-xl)',
										fontWeight: 600,
										letterSpacing: '-0.02em',
										color: 'var(--foreground)',
										fontVariantNumeric: 'tabular-nums',
										lineHeight: 1.2,
									}}
								>
									{total.toLocaleString()}
								</div>
								<div
									style={{
										fontSize: 'var(--text-xs)',
										color: 'var(--muted-foreground)',
										fontWeight: 400,
									}}
								>
									{__('sessions', 'allfeedback')}
								</div>
							</div>
						</div>
					</div>
				)}

				<div
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						gap: 2,
					}}
				>
					{segments.map((s) => {
						const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
						return (
							<div
								key={s.label}
								style={{
									display: 'grid',
									gridTemplateColumns: '10px 1fr auto',
									gap: 8,
									alignItems: 'center',
									padding: '5px 8px',
									borderRadius: 'var(--radius-md)',
									transition: 'background 140ms',
								}}
								onMouseEnter={(e) =>
									(e.currentTarget.style.background = 'var(--muted)')
								}
								onMouseLeave={(e) =>
									(e.currentTarget.style.background = 'transparent')
								}
							>
								<span
									style={{
										width: 10,
										height: 10,
										borderRadius: 3,
										background: s.color,
										boxShadow: `0 0 0 3px ${s.color}22`,
										flexShrink: 0,
									}}
								/>
								<div>
									<div
										style={{
											fontSize: 'var(--text-sm)',
											fontWeight: 500,
											color: 'var(--foreground)',
										}}
									>
										{s.label}
									</div>
									<div
										style={{
											fontSize: 'var(--text-xs)',
											color: 'var(--muted-foreground)',
										}}
									>
										{s.sub}
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									{loading ? (
										<Skeleton
											style={{ height: 12, width: 40, borderRadius: 4 }}
										/>
									) : (
										<>
											<div
												style={{
													fontSize: 'var(--text-sm)',
													fontWeight: 600,
													color: 'var(--foreground)',
													fontVariantNumeric: 'tabular-nums',
												}}
											>
												{pct}%
											</div>
											<div
												style={{
													fontSize: 'var(--text-xs)',
													color: 'var(--muted-foreground)',
													fontVariantNumeric: 'tabular-nums',
												}}
											>
												{s.value.toLocaleString()}
											</div>
										</>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

const DEVICE_COLORS: Record<string, string> = {
	desktop: 'oklch(0.580 0.238 277)',
	mobile: 'oklch(0.577 0.245 27)',
	tablet: 'oklch(0.62 0.14 155)',
};

function DeviceDistributionCard({
	breakdown,
	loading,
}: {
	breakdown: Record<string, number>;
	loading: boolean;
}) {
	const deviceConfig: {
		key: string;
		label: string;
		icon: React.ComponentType<{ style?: CSSProperties }>;
	}[] = [
		{ key: 'desktop', label: __('Desktop', 'allfeedback'), icon: Monitor },
		{ key: 'mobile', label: __('Mobile', 'allfeedback'), icon: Smartphone },
		{ key: 'tablet', label: __('Tablet', 'allfeedback'), icon: Tablet },
	];
	const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
	const rows = deviceConfig.map((d) => ({
		...d,
		count: breakdown[d.key] ?? 0,
	}));

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					padding: '16px 20px',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<h3
					style={{
						fontSize: 'var(--text-md)',
						fontWeight: 600,
						letterSpacing: '-0.01em',
						color: 'var(--foreground)',
						margin: 0,
					}}
				>
					{__('Device distribution', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: 'var(--text-xs)',
						color: 'var(--muted-foreground)',
					}}
				>
					{__('Responses by device type', 'allfeedback')}
				</p>
			</div>

			<div
				style={{
					padding: '20px',
					display: 'flex',
					flexDirection: 'column',
					gap: 18,
				}}
			>
				{loading ? (
					Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<Skeleton style={{ height: 13, width: 64, borderRadius: 4 }} />
								<Skeleton style={{ height: 13, width: 40, borderRadius: 4 }} />
							</div>
							<Skeleton
								style={{ height: 10, width: '100%', borderRadius: 999 }}
							/>
						</div>
					))
				) : !total ? (
					<div
						style={{
							padding: '28px 0',
							textAlign: 'center',
							color: 'var(--muted-foreground)',
							fontSize: 'var(--text-sm)',
						}}
					>
						{__('No data yet.', 'allfeedback')}
					</div>
				) : (
					rows.map((d) => {
						const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
						const color = DEVICE_COLORS[d.key] ?? 'oklch(0.580 0.238 277)';
						return (
							<div key={d.key}>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										marginBottom: 8,
									}}
								>
									<div
										style={{ display: 'flex', alignItems: 'center', gap: 7 }}
									>
										<div
											style={{
												width: 26,
												height: 26,
												borderRadius: 7,
												background: `${color}18`,
												boxShadow: `inset 0 0 0 1px ${color}30`,
												display: 'grid',
												placeItems: 'center',
												flexShrink: 0,
											}}
										>
											<d.icon style={{ width: 13, height: 13, color }} />
										</div>
										<span
											style={{
												fontSize: 'var(--text-sm)',
												fontWeight: 500,
												color: 'var(--foreground)',
											}}
										>
											{d.label}
										</span>
									</div>
									<div
										style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
									>
										<span
											style={{
												fontSize: 'var(--text-md)',
												fontWeight: 700,
												color: 'var(--foreground)',
												fontVariantNumeric: 'tabular-nums',
												letterSpacing: '-0.01em',
											}}
										>
											{pct}%
										</span>
										<span
											style={{
												fontSize: 'var(--text-xs)',
												color: 'var(--muted-foreground)',
												fontVariantNumeric: 'tabular-nums',
											}}
										>
											{d.count.toLocaleString()}
										</span>
									</div>
								</div>
								<div
									style={{
										height: 8,
										borderRadius: 999,
										background: 'var(--muted)',
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											height: '100%',
											borderRadius: 999,
											width: `${pct}%`,
											background: color,
											transition: 'width 400ms ease',
										}}
									/>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

const AVATAR_PAIRS: [string, string][] = [
	['oklch(0.72 0.16 277)', 'oklch(0.55 0.22 277)'],
	['oklch(0.75 0.14 200)', 'oklch(0.55 0.18 210)'],
	['oklch(0.78 0.14 60)', 'oklch(0.60 0.18 40)'],
	['oklch(0.76 0.14 340)', 'oklch(0.55 0.20 340)'],
	['oklch(0.75 0.14 155)', 'oklch(0.52 0.14 155)'],
];

function ResponseRow({
	r,
	formTitle,
	idx,
}: {
	r: SurveyResponse;
	formTitle: string;
	idx: number;
}) {
	const [gradA, gradB] = AVATAR_PAIRS[idx % AVATAR_PAIRS.length];
	const gradId = `av-${r.id}`;
	const letter = String.fromCharCode(65 + ((r.id * 7) % 26));
	const timeAgo = formatDistanceToNow(new Date(r.created_at), {
		addSuffix: true,
	});

	const sentiment =
		r.score !== null
			? r.score >= 9
				? { label: __('Positive', 'allfeedback'), color: 'var(--success)' }
				: r.score >= 7
					? { label: __('Neutral', 'allfeedback'), color: 'var(--warning)' }
					: {
							label: __('Negative', 'allfeedback'),
							color: 'var(--destructive)',
						}
			: null;

	const responseText = (() => {
		if (!r.response_data) return '—';
		const vals = Object.values(r.response_data).filter(
			(v) => v !== null && v !== undefined && v !== '',
		);
		if (!vals.length) return '—';
		const first = vals[0];
		return Array.isArray(first) ? first.join(', ') : String(first);
	})();

	return (
		<Link
			to="/responses/$responseId"
			params={{ responseId: String(r.id) }}
			search={{ surveyId: r.survey_id, edit: false }}
			style={{
				display: 'grid',
				gridTemplateColumns: 'auto 1fr auto',
				gap: 14,
				padding: '14px 20px',
				borderBottom: '1px solid var(--border)',
				transition: 'background 140ms',
				cursor: 'pointer',
				textDecoration: 'none',
				color: 'inherit',
			}}
			onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
			onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
		>
			<svg
				width="32"
				height="32"
				viewBox="0 0 32 32"
				style={{ flexShrink: 0, marginTop: 2 }}
			>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor={gradA} />
						<stop offset="1" stopColor={gradB} />
					</linearGradient>
				</defs>
				<rect width="32" height="32" rx="10" fill={`url(#${gradId})`} />
				<text
					x="16"
					y="21"
					textAnchor="middle"
					fontFamily="var(--font-sans)"
					fontSize="13"
					fontWeight="600"
					fill="white"
					opacity="0.95"
				>
					{letter}
				</text>
			</svg>

			<div style={{ minWidth: 0 }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						marginBottom: 4,
						flexWrap: 'wrap',
					}}
				>
					{formTitle && (
						<span
							style={{
								fontSize: 'var(--text-xs)',
								color: 'var(--muted-foreground)',
								fontWeight: 500,
							}}
						>
							{formTitle}
						</span>
					)}
					{sentiment && (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 4,
								fontSize: 'var(--text-xs)',
								fontWeight: 500,
								color: sentiment.color,
								background: `${sentiment.color}18`,
								boxShadow: `inset 0 0 0 1px ${sentiment.color}30`,
								padding: '1px 7px',
								borderRadius: 999,
							}}
						>
							<span
								style={{
									width: 5,
									height: 5,
									borderRadius: 99,
									background: 'currentColor',
								}}
							/>
							{sentiment.label}
						</span>
					)}
					{r.score !== null && (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 3,
								fontSize: 'var(--text-xs)',
								fontWeight: 600,
								color: 'var(--brand-700)',
								background: 'var(--brand-50)',
								boxShadow: 'inset 0 0 0 1px var(--brand-100)',
								padding: '1px 7px',
								borderRadius: 999,
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							NPS {r.score}
						</span>
					)}
				</div>
				<div
					style={
						{
							fontSize: 'var(--text-sm)',
							color: 'var(--foreground)',
							lineHeight: 1.55,
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
						} as CSSProperties
					}
				>
					"{responseText}"
				</div>
			</div>

			<div
				style={{
					fontSize: 'var(--text-xs)',
					color: 'var(--muted-foreground)',
					fontVariantNumeric: 'tabular-nums',
					fontWeight: 500,
					whiteSpace: 'nowrap',
					alignSelf: 'start',
					marginTop: 2,
				}}
			>
				{timeAgo}
			</div>
		</Link>
	);
}

function RecentResponsesCard({
	responses,
	forms,
	loading,
	surveyId,
}: {
	responses: SurveyResponse[];
	forms: FormAnalyticsListItem[];
	loading: boolean;
	surveyId?: number;
}) {
	const formMap = useMemo(() => {
		const m = new Map<number, string>();
		forms.forEach((f) => m.set(f.id, f.title));
		return m;
	}, [forms]);

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '16px 20px',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<div>
					<h3
						style={{
							fontSize: 'var(--text-md)',
							fontWeight: 600,
							letterSpacing: '-0.01em',
							color: 'var(--foreground)',
							margin: 0,
						}}
					>
						{__('Recent responses', 'allfeedback')}
					</h3>
					{loading ? (
						<Skeleton
							style={{ height: 12, width: 120, borderRadius: 4, marginTop: 5 }}
						/>
					) : (
						<p
							style={{
								marginTop: 2,
								fontSize: 'var(--text-xs)',
								color: 'var(--muted-foreground)',
							}}
						>
							{responses.length} {__('shown · sorted by newest', 'allfeedback')}
						</p>
					)}
				</div>
				<Link
					to="/responses"
					search={{ surveyId: surveyId ?? undefined }}
					className="border-border/70 text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition-colors"
				>
					{__('View all', 'allfeedback')}
				</Link>
			</div>

			{loading ? (
				<div>
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							style={{
								display: 'grid',
								gridTemplateColumns: 'auto 1fr auto',
								gap: 14,
								padding: '14px 20px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							<Skeleton
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									flexShrink: 0,
								}}
							/>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
								<Skeleton style={{ height: 12, width: 128, borderRadius: 4 }} />
								<Skeleton style={{ height: 12, width: 240, borderRadius: 4 }} />
							</div>
							<Skeleton style={{ height: 12, width: 48, borderRadius: 4 }} />
						</div>
					))}
				</div>
			) : !responses.length ? (
				<div
					style={{
						padding: '48px 24px',
						textAlign: 'center',
						color: 'var(--muted-foreground)',
						fontSize: 'var(--text-sm)',
					}}
				>
					{__('No responses yet.', 'allfeedback')}
				</div>
			) : (
				responses.map((r, i) => (
					<ResponseRow
						key={r.id}
						r={r}
						formTitle={formMap.get(r.survey_id) ?? ''}
						idx={i}
					/>
				))
			)}
		</div>
	);
}

const Analytics = () => {
	const { formId } = useSearch({ from: '/_app/analytics/' });
	const navigate = useNavigate();
	const selectedFormId = formId ?? null;
	const setSelectedFormId = (id: number | null) => {
		void navigate({ to: '/analytics/', search: { formId: id !== null ? id : undefined } });
	};

	const {
		data: listData,
		isLoading: listLoading,
		isFetching: listFetching,
		isError,
	} = useQuery({
		...analyticsFormsQuery({ per_page: 100 }),
		placeholderData: keepPreviousData,
	});
	const {
		data: detailData,
		isLoading: detailLoading,
		isFetching: detailFetching,
	} = useQuery({
		...analyticsFormDetailQuery(selectedFormId ?? 0),
		enabled: selectedFormId !== null,
		placeholderData: keepPreviousData,
	});
	const { data: responsesData, isLoading: responsesLoading } = useQuery({
		...allResponsesQuery({ per_page: 5 }),
		placeholderData: keepPreviousData,
	});
	const { data: formResponsesData, isLoading: formResponsesLoading } = useQuery({
		...surveyResponsesQuery(selectedFormId ?? 0, { per_page: 5 }),
		enabled: selectedFormId !== null,
		placeholderData: keepPreviousData,
	});
	const {
		data: overviewData,
		isLoading: overviewLoading,
		isFetching: overviewFetching,
	} = useQuery({
		...analyticsOverviewQuery(),
		placeholderData: keepPreviousData,
	});

	const forms   = listData?.forms ?? [];
	const totals  = listData?.totals;
	const isNavigating = useRouterState({ select: (s) => s.isLoading });
	const isFormView = selectedFormId !== null;
	const loading = listLoading;
	const isRefetching = isNavigating || (isFormView
		? detailFetching
		: (listFetching && !listLoading) || (overviewFetching && !overviewLoading));

	const kpi = useMemo(() => {
		if (isFormView && detailData) {
			const sm = detailData.session_metrics;
			const rm = detailData.response_metrics;

			let totalChange: number | null = null;
			const rot = rm.responses_over_time;
			if (rot) {
				const today = new Date();
				const toISO = (d: Date) => d.toISOString().slice(0, 10);
				const twStart = new Date(today);
				twStart.setDate(today.getDate() - 6);
				const lwStart = new Date(today);
				lwStart.setDate(today.getDate() - 13);
				const lwEnd = new Date(today);
				lwEnd.setDate(today.getDate() - 7);
				const twStr = toISO(twStart);
				const lwStartStr = toISO(lwStart);
				const lwEndStr = toISO(lwEnd);
				let thisWeek = 0,
					lastWeek = 0;
				for (const [date, count] of Object.entries(rot)) {
					if (date >= twStr) thisWeek += count;
					else if (date >= lwStartStr && date <= lwEndStr) lastWeek += count;
				}
				if (lastWeek > 0)
					totalChange =
						Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10;
			}

			return {
				totalResponses: rm.total_responses,
				totalChange,
				completionRate: sm.completion_rate,
				completionChange: sm.completion_rate_change,
				thirdKind: 'time' as 'nps' | 'time' | 'abandonment',
				thirdValue: sm.avg_completion_time,
				thirdChange: null as number | null,
				fourthValue: sm.abandonment_rate,
				fourthIsFormView: true,
				fourthNewThisWeek: null as number | null,
				fourthChange: sm.abandonment_rate_change,
			};
		}
		const s = overviewData?.stats;
		return {
			totalResponses: s?.total_feedback.value ?? totals?.total_responses ?? 0,
			totalChange: s?.total_feedback.change ?? null,
			completionRate: s?.completion_rate.value ?? null,
			completionChange: s?.completion_rate.change ?? null,
			thirdKind: 'abandonment' as 'nps' | 'time' | 'abandonment',
			thirdValue: s?.abandonment_rate?.value ?? null,
			thirdChange: s?.abandonment_rate?.change ?? null,
			fourthValue:
				s?.active_surveys.value ??
				forms.filter((f) => f.status === 'published').length,
			fourthIsFormView: false,
			fourthNewThisWeek: s?.active_surveys.new_this_week ?? null,
			fourthChange: null as number | null,
		};
	}, [isFormView, detailData, overviewData, totals, forms]);

	const sparkBase = useMemo(() => {
		if (isFormView && detailData?.response_metrics.responses_over_time) {
			return Object.values(detailData.response_metrics.responses_over_time)
				.slice()
				.slice(-14);
		}
		return (overviewData?.chart ?? [])
			.slice()
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-14)
			.map((d) => d.count);
	}, [isFormView, detailData, overviewData]);

	const chartData: AreaChartData = useMemo(() => {
		if (isFormView && detailData?.response_metrics.responses_over_time) {
			const rot = detailData.response_metrics.responses_over_time;
			const entries = Object.entries(rot)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([date, count]) => ({ date, count }));
			return groupByWeek(entries);
		}
		const entries = (overviewData?.chart ?? [])
			.slice()
			.sort((a, b) => a.date.localeCompare(b.date));
		return groupByWeek(entries);
	}, [isFormView, detailData, overviewData]);

	const totalInPeriod = chartData.values.reduce((s, v) => s + v, 0);

	const npsData: DonutData = useMemo(() => {
		if (isFormView && detailData) {
			const nps = detailData.response_metrics.nps_score;
			return { total: nps.promoters + nps.passives + nps.detractors, ...nps };
		}
		return { total: 0, promoters: 0, passives: 0, detractors: 0, score: 0 };
	}, [isFormView, detailData]);

	const deviceBreakdown: Record<string, number> = useMemo(() => {
		if (isFormView && detailData)
			return detailData.response_metrics.response_rate_by_device;
		return overviewData?.device_breakdown ?? {};
	}, [isFormView, detailData, overviewData]);

	const isNpsForm =
		isFormView && detailData?.response_metrics.survey_type === 'NPS';

	if (isError) {
		return (
			<div className="px-4 py-5 sm:px-6 lg:px-8">
				<div style={{ background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
					<EmptyState icon={AlertCircle} title={__('Failed to load analytics', 'allfeedback')} description={__('Something went wrong. Please try refreshing the page.', 'allfeedback')} />
				</div>
			</div>
		);
	}

	if (!listLoading && forms.length === 0) {
		return (
			<div className="px-4 py-5 sm:px-6 lg:px-8">
				<div style={{ background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
					<EmptyState icon={BarChart2} title={__('No data yet', 'allfeedback')} description={__('Analytics will appear here once your forms start receiving responses.', 'allfeedback')} />
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 pb-8 sm:px-6 lg:px-8">
			<div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
				<FormSelector forms={forms} selectedId={selectedFormId} onChange={setSelectedFormId} />
			</div>

			<div style={{ transition: 'opacity 200ms ease', ...(isRefetching && { opacity: 0.5, pointerEvents: 'none' }) }}>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KPICard
					label={__('Total feedback', 'allfeedback')}
					value={loading ? '—' : kpi.totalResponses.toLocaleString()}
					deltaValue={kpi.totalChange}
					deltaLabel={kpi.totalChange !== null ? __('vs. last week', 'allfeedback') : __('total responses', 'allfeedback')}
					sparkData={sparkBase}
					sparkColor="var(--primary)"
					loading={loading}
				/>
				<KPICard
					label={__('Completion rate', 'allfeedback')}
					value={loading ? '—' : kpi.completionRate !== null ? kpi.completionRate.toFixed(1) : '—'}
					unit="%"
					deltaValue={kpi.completionChange}
					deltaLabel={kpi.completionChange !== null ? __('vs. last week', 'allfeedback') : __('of sessions submitted', 'allfeedback')}
					loading={loading}
				/>
				{kpi.thirdKind === 'time' ? (
						<KPICard
							label={__('Avg. time', 'allfeedback')}
							value={loading ? '—' : formatSeconds(kpi.thirdValue)}
							deltaValue={null}
							deltaLabel={__('avg. completion time', 'allfeedback')}
							loading={loading}
						/>
					) : (
						<KPICard
							label={__('Abandonment rate', 'allfeedback')}
							value={
								loading
									? '—'
									: kpi.thirdValue !== null
										? kpi.thirdValue.toFixed(1)
										: '—'
							}
							unit="%"
							deltaValue={kpi.thirdChange}
							deltaLabel={
								kpi.thirdChange !== null
									? __('vs. last week', 'allfeedback')
									: __('of started sessions', 'allfeedback')
							}
							loading={loading}
						/>
					)}
					{kpi.fourthIsFormView ? (
						<KPICard
							label={__('Abandonment rate', 'allfeedback')}
							value={
								loading
									? '—'
									: kpi.fourthValue !== null
										? kpi.fourthValue.toFixed(1)
										: '—'
							}
							unit="%"
							deltaValue={kpi.fourthChange}
							deltaLabel={
								kpi.fourthChange !== null
									? __('vs. last week', 'allfeedback')
									: __('of started sessions', 'allfeedback')
							}
							loading={loading}
						/>
					) : (
						<KPICard
							label={__('Active surveys', 'allfeedback')}
							value={listLoading ? '—' : String(kpi.fourthValue ?? 0)}
							deltaValue={null}
							deltaLabel={
								kpi.fourthNewThisWeek !== null && kpi.fourthNewThisWeek > 0
									? `+${kpi.fourthNewThisWeek} ${__('new this week', 'allfeedback')}`
									: __('published', 'allfeedback')
							}
							loading={listLoading}
						/>
					)}
				</div>

			{/* Chart row — NPS gets 70/30 split, everything else is full width */}
			{isNpsForm ? (
				<div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[7fr_3fr]">
					<AreaChartCard chartData={chartData} loading={loading} totalInPeriod={totalInPeriod} />
					<NpsDistributionCard
						nps={npsData}
						scoreDist={detailData!.response_metrics.score_distribution}
						loading={detailLoading}
					/>
				</div>
			) : (
				<div style={{ marginTop: 16 }}>
					<AreaChartCard chartData={chartData} loading={loading} totalInPeriod={totalInPeriod} />
				</div>
			)}

			{/* Bottom row */}
			{isFormView ? (
				<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
					<RecentResponsesCard responses={formResponsesData?.responses ?? []} forms={forms} loading={formResponsesLoading} surveyId={selectedFormId ?? undefined} />
					<SessionMetricsCard sm={detailData?.session_metrics ?? null} loading={detailLoading} />
					<DeviceDistributionCard breakdown={deviceBreakdown} loading={detailLoading} />
				</div>
			) : (
				<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<RecentResponsesCard responses={responsesData?.responses ?? []} forms={forms} loading={responsesLoading} />
					<DeviceDistributionCard breakdown={deviceBreakdown} loading={listLoading} />
				</div>
			)}
			</div>
		</div>
	);
};

export default Analytics;
