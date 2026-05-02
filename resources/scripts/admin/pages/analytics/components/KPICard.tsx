import { Skeleton } from '@/components/ui/skeleton';

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
		<svg width={w} height={h} style={{ overflow: 'visible' }}>
			<defs>
				<linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity="0.22" />
					<stop offset="100%" stopColor={color} stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill={`url(#${uid})`} />
			<path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
		</svg>
	);
}

export function DeltaPill({ value, label }: { value: number | null; label: string }) {
	if (value === null) {
		return (
			<span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
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
					fontSize: '12px',
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
			<span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
				{label}
			</span>
		</div>
	);
}

export function KPICard({
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
					alignItems: 'center',
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
								color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{value}
						</span>
						{unit && (
							<span
								style={{
									fontSize: '12px',
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
						<Sparkline data={sparkData} color={sparkColor ?? 'var(--primary)'} />
					</div>
				) : null}
			</div>

			<div style={{ marginTop: 10 }}>
				{loading ? (
					<Skeleton style={{ height: 18, width: 96, borderRadius: 6 }} />
				) : deltaValue !== undefined && deltaLabel ? (
					<DeltaPill value={deltaValue} label={deltaLabel} />
				) : deltaLabel ? (
					<span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
						{deltaLabel}
					</span>
				) : null}
			</div>
		</div>
	);
}
