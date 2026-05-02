import { Skeleton } from '@/components/ui/skeleton';
import { __ } from '@wordpress/i18n';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { CSSProperties } from 'react';
import { DEVICE_COLORS } from '../analytics.types';

export function DeviceDistributionCard({
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
						color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
						margin: 0,
					}}
				>
					{__('Device distribution', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: '12px',
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
							<Skeleton style={{ height: 10, width: '100%', borderRadius: 999 }} />
						</div>
					))
				) : !total ? (
					<div
						style={{
							padding: '28px 0',
							textAlign: 'center',
							color: 'var(--muted-foreground)',
							fontSize: '12px',
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
												fontSize: '12px',
												fontWeight: 500,
												color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
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
												color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
												fontVariantNumeric: 'tabular-nums',
												letterSpacing: '-0.01em',
											}}
										>
											{pct}%
										</span>
										<span
											style={{
												fontSize: '12px',
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
