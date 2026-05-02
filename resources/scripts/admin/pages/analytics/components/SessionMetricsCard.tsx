import type { FormAnalyticsDetail } from '@/admin/api/analytics';
import { Skeleton } from '@/components/ui/skeleton';
import { __ } from '@wordpress/i18n';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

export function SessionMetricsCard({
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
						color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
						margin: 0,
					}}
				>
					{__('Session breakdown', 'allfeedback')}
				</h3>
				<p
					style={{
						marginTop: 2,
						fontSize: '12px',
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
						<Skeleton style={{ width: 168, height: 168, borderRadius: '50%' }} />
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
								fontSize: '12px',
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
										color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
										fontVariantNumeric: 'tabular-nums',
										lineHeight: 1.2,
									}}
								>
									{total.toLocaleString()}
								</div>
								<div
									style={{
										fontSize: '12px',
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
											fontSize: '12px',
											fontWeight: 500,
											color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
										}}
									>
										{s.label}
									</div>
									<div
										style={{
											fontSize: '12px',
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
													fontSize: '12px',
													fontWeight: 600,
													color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
													fontVariantNumeric: 'tabular-nums',
												}}
											>
												{pct}%
											</div>
											<div
												style={{
													fontSize: '12px',
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
