import { Skeleton } from '@/components/ui/skeleton';
import { __ } from '@wordpress/i18n';
import { useState } from 'react';
import type { DonutData } from '../analytics.types';
import { NPS_COLORS } from '../analytics.types';

export function NpsDistributionCard({
	nps,
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

	const onEnter =
		(seg: 'detractor' | 'passive' | 'promoter') => (e: React.MouseEvent) => {
			setHovered(seg);
			setMousePos({ x: e.clientX, y: e.clientY });
		};
	const onMove =
		(seg: 'detractor' | 'passive' | 'promoter') => (e: React.MouseEvent) => {
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
						color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
						margin: 0,
					}}
				>
					{__('NPS distribution', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: '12px',
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
						style={{ height: 10, width: 160, borderRadius: 4, alignSelf: 'center' }}
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
					<p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
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
							fontSize="5"
							fill="var(--muted-foreground)"
						>
							−100
						</text>
						<text
							x={rLabel0.x}
							y={rLabel0.y - 2}
							textAnchor="middle"
							fontSize="5"
							fill="var(--muted-foreground)"
						>
							0
						</text>
						<text
							x={rLabelR.x + 2}
							y={rLabelR.y + 3}
							textAnchor="start"
							fontSize="5"
							fill="var(--muted-foreground)"
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
					<p
						style={{
							textAlign: 'center',
							fontSize: '12px',
							color: 'var(--muted-foreground)',
							margin: '-2px 0 8px',
							letterSpacing: '0.01em',
						}}
					>
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
									fontSize: '13px',
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
