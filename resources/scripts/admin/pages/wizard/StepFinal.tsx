import type { WizardCompletePayload } from '@/admin/api/wizard';
import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import confetti from 'canvas-confetti';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	Edit2,
	Globe,
	LayoutGrid,
	Loader2,
	Lock,
	MessageSquare,
	MoreHorizontal,
	Plus,
	RotateCw,
	Star,
	X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { PositionValue } from './StepStyle';

const TEMPLATE_STAT_LABELS: Record<string, string> = {
	nps: 'NPS Survey',
	'general-feedback': 'General Feedback',
	'bug-report': 'Bug Report',
	'feature-request': 'Feature Request',
	'product-feedback': 'Product Feedback',
	'customer-research': 'Customer Research',
};

const POSITION_STAT_LABELS: Record<string, string> = {
	'bottom-right': 'Bottom right',
	'bottom-left': 'Bottom left',
	'side-tab': 'Side tab',
};

function MiniNpsScale({ color }: { color: string }) {
	return (
		<div style={{ display: 'flex', gap: 2 }}>
			{Array.from({ length: 11 }, (_, i) => {
				const isDetractor = i <= 6;
				const isPassive = i >= 7 && i <= 8;
				return (
					<div
						key={i}
						style={{
							flex: 1,
							height: 16,
							borderRadius: 4,
							display: 'grid',
							placeItems: 'center',
							fontSize: 6,
							fontWeight: 600,
							border: `1px solid ${isDetractor ? '#fca5a5' : isPassive ? '#fcd34d' : '#86efac'}`,
							color: isDetractor
								? '#dc2626'
								: isPassive
									? '#d97706'
									: '#16a34a',
							background: isDetractor
								? '#fef2f2'
								: isPassive
									? '#fffbeb'
									: '#f0fdf4',
							...(i === 10
								? { background: color, borderColor: color, color: '#fff' }
								: {}),
						}}
					>
						{i}
					</div>
				);
			})}
		</div>
	);
}

function MiniWidgetPanel({
	color,
	position,
}: {
	color: string;
	position: PositionValue;
}) {
	const posStyle: React.CSSProperties =
		position === 'bottom-left'
			? { bottom: 68, left: 12 }
			: position === 'side-tab'
				? { top: '50%', right: 38, transform: 'translateY(-50%)' }
				: { bottom: 68, right: 12 };

	return (
		<div
			style={{
				position: 'absolute',
				width: 224,
				borderRadius: 12,
				overflow: 'hidden',
				boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.08)',
				background: '#fff',
				animation: 'allfb-wizard-widget-in 0.35s ease-out 0.3s both',
				...posStyle,
			}}
		>
			<div
				style={{
					padding: '8px 10px',
					background: color,
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					gap: 5,
					flexShrink: 0,
				}}
			>
				<span style={{ fontSize: 11, fontWeight: 600, flex: 1, margin: 0 }}>
					{__('Feedback', 'allfeedback')}
				</span>
				<span
					style={{
						width: 18,
						height: 18,
						borderRadius: 4,
						background: 'rgba(255,255,255,0.18)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
					>
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</span>
				<span
					style={{
						width: 18,
						height: 18,
						borderRadius: 4,
						background: 'rgba(255,255,255,0.18)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</span>
			</div>

			<div style={{ padding: '10px 12px 12px', background: '#fff' }}>
				<div
					style={{
						fontSize: 9,
						fontWeight: 500,
						color: '#1a1a2e',
						marginBottom: 8,
						lineHeight: 1.4,
					}}
				>
					{__(
						'How likely are you to recommend us to a friend or colleague?',
						'allfeedback',
					)}
				</div>

				<MiniNpsScale color={color} />

				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						fontSize: 7,
						color: '#6b7280',
						marginTop: 3,
						marginBottom: 8,
					}}
				>
					<span>{__('Not likely', 'allfeedback')}</span>
					<span>{__('Very likely', 'allfeedback')}</span>
				</div>

				<div
					style={{
						height: 26,
						borderRadius: 6,
						background: 'color-mix(in srgb, #e5e7eb 30%, #fff)',
						border: '1px solid transparent',
						display: 'flex',
						alignItems: 'center',
						padding: '0 8px',
						fontSize: 8,
						color: '#6b7280',
						marginBottom: 8,
					}}
				>
					{__('Tell us more (optional)…', 'allfeedback')}
				</div>

				<div
					style={{
						display: 'flex',
						gap: 4,
						paddingTop: 8,
						borderTop: '1px solid #e5e7eb',
					}}
				>
					<div
						style={{
							flex: 1,
							height: 22,
							borderRadius: 6,
							border: '1px solid #e5e7eb',
							background: 'transparent',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 9,
							fontWeight: 600,
							color: '#6b7280',
						}}
					>
						{__('Skip', 'allfeedback')}
					</div>
					<div
						style={{
							flex: 1,
							height: 22,
							borderRadius: 6,
							background: color,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 9,
							fontWeight: 600,
							color: '#fff',
						}}
					>
						{__('Submit', 'allfeedback')}
					</div>
				</div>
			</div>
		</div>
	);
}

function MiniLauncher({
	color,
	position,
}: {
	color: string;
	position: PositionValue;
}) {
	if (position === 'side-tab') {
		return (
			<div
				style={{
					position: 'absolute',
					right: 0,
					top: '50%',
					transform: 'translateY(-50%)',
					padding: '10px 8px',
					background: color,
					color: '#fff',
					borderRadius: '8px 0 0 8px',
					boxShadow: '-2px 4px 12px rgba(0,0,0,0.15)',
				}}
			>
				<span
					style={{
						writingMode: 'vertical-rl',
						transform: 'rotate(180deg)',
						fontSize: 9,
						fontWeight: 600,
						letterSpacing: '0.06em',
						whiteSpace: 'nowrap',
						userSelect: 'none',
					}}
				>
					{__('Feedback', 'allfeedback')}
				</span>
			</div>
		);
	}

	return (
		<div
			style={{
				position: 'absolute',
				width: 40,
				height: 40,
				borderRadius: '50%',
				background: color,
				color: '#fff',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				boxShadow: `0 4px 16px ${color}80`,
				bottom: 16,
				...(position === 'bottom-left' ? { left: 12 } : { right: 12 }),
			}}
		>
			<MessageSquare style={{ width: 18, height: 18 }} />
		</div>
	);
}

export function StepFinal({
	state,
	onFinish,
	submitting,
}: {
	state: WizardCompletePayload;
	onFinish: (target: 'editor' | 'forms') => void;
	submitting: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const brandColor = state.brand_color || '#6366F1';
	const position = state.position as PositionValue;

	useEffect(() => {
		if (!canvasRef.current) return;
		const myConfetti = confetti.create(canvasRef.current, {
			resize: true,
			useWorker: true,
		});
		const fire = (particleRatio: number, opts: confetti.Options) =>
			myConfetti({
				...opts,
				origin: { y: 0.55 },
				particleCount: Math.floor(200 * particleRatio),
				colors: [
					'#6366f1',
					'#818cf8',
					'#a5b4fc',
					'#e0e7ff',
					'#f59e0b',
					'#34d399',
				],
			});

		const t = setTimeout(() => {
			fire(0.25, { spread: 26, startVelocity: 55 });
			fire(0.2, { spread: 60 });
			fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
			fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
			fire(0.1, { spread: 120, startVelocity: 45 });
		}, 250);

		return () => {
			clearTimeout(t);
			myConfetti.reset();
		};
	}, []);

	return (
		<div className="relative flex flex-1 flex-col justify-center overflow-hidden">
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 size-full"
			/>

			<style>{`
				@keyframes allfb-wizard-dot-pulse {
					0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.18); }
					50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0.05); }
				}
				@keyframes allfb-wizard-widget-in {
					from { opacity: 0; }
					to   { opacity: 1; }
				}
			`}</style>

			<div
				className="relative z-10 grid w-full items-center gap-10"
				style={{ gridTemplateColumns: '1fr 1.3fr' }}
			>
				<div>
					<span
						className="border-brand-200 bg-brand-50 text-brand-700 mb-[18px] inline-flex items-center gap-2 rounded-full border py-[5px] pr-3 pl-2"
						style={{ fontSize: '0.8125rem', fontWeight: 500 }}
					>
						<span
							className="bg-success size-2 shrink-0 rounded-full"
							style={{
								animation: 'allfb-wizard-dot-pulse 2s ease-in-out infinite',
							}}
						/>
						{__('Setup complete · ready to launch', 'allfeedback')}
					</span>

					<h1
						className="text-foreground tracking-tight"
						style={{
							fontSize: '2.25rem',
							fontWeight: 800,
							lineHeight: 1.1,
							margin: '0 0 1rem',
						}}
					>
						{__('Your feedback form is', 'allfeedback')}{' '}
						<span style={{ color: 'var(--color-primary)' }}>
							{__('ready to launch.', 'allfeedback')}
						</span>
						<br />
						{__('Open the editor to go live.', 'allfeedback')}
					</h1>

					<p
						className="text-muted-foreground max-w-[460px] leading-relaxed"
						style={{
							margin: '0 0 1.75rem',
							fontSize: '1.125rem',
							fontWeight: 400,
						}}
					>
						{__(
							"We've configured everything. Fine-tune your questions in the editor, then publish — your widget appears on your site instantly.",
							'allfeedback',
						)}
					</p>

					<div
						className="border-border mb-8 border-y"
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							padding: '18px 0',
						}}
					>
						{[
							{
								label: __('Template', 'allfeedback'),
								value: TEMPLATE_STAT_LABELS[state.template] ?? state.template,
								icon: null,
							},
							{
								label: __('Position', 'allfeedback'),
								value: POSITION_STAT_LABELS[state.position] ?? state.position,
								icon: null,
							},
							{
								label: __('Notifications', 'allfeedback'),
								value: state.admin_email
									? __('Email set', 'allfeedback')
									: __('Not set', 'allfeedback'),
								icon: state.admin_email ? (
									<Check className="text-success size-3.5" strokeWidth={3} />
								) : null,
							},
						].map((stat, i) => (
							<div
								key={stat.label}
								className={i < 2 ? 'border-border border-r' : ''}
								style={{
									padding:
										i === 0 ? '0 18px 0 0' : i === 2 ? '0 0 0 18px' : '0 18px',
								}}
							>
								<div
									className="text-muted-foreground tracking-[0.06em] uppercase"
									style={{
										fontSize: '0.75rem',
										fontWeight: 500,
										marginBottom: '0.375rem',
									}}
								>
									{stat.label}
								</div>
								<div
									className="text-foreground flex items-center gap-1.5 tracking-[-0.01em]"
									style={{ fontSize: '1.25rem', fontWeight: 600 }}
								>
									{stat.icon}
									{stat.value}
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center gap-2.5">
						<Button
							size="lg"
							className="h-11 px-6 font-semibold !text-white"
							onClick={() => onFinish('editor')}
							disabled={submitting}
						>
							{submitting ? (
								<Loader2 className="size-5 animate-spin" />
							) : (
								<Edit2 className="size-5" />
							)}
							{__('Open Editor', 'allfeedback')}
							<ArrowRight className="size-4" />
						</Button>
						<Button
							variant="secondary"
							size="lg"
							onClick={() => onFinish('forms')}
							disabled={submitting}
							style={{
								border: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)',
							}}
						>
							<LayoutGrid className="size-4" />
							{__('All Forms', 'allfeedback')}
						</Button>
					</div>
				</div>

				<div
					className="border-border/50 bg-card overflow-hidden rounded-2xl border p-5 shadow-sm"
					style={{ height: 480 }}
				>
					<div className="border-border/60 flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
						<div className="shrink-0 bg-[#dee1e6] select-none">
							<div className="flex items-end px-3 pt-2">
								<div className="flex shrink-0 items-center gap-[5px] pr-3 pb-[6px]">
									<span className="size-[11px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
									<span className="size-[11px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
									<span className="size-[11px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
								</div>
								<div className="flex max-w-[172px] items-center gap-1.5 rounded-t-[7px] bg-white px-2.5 pt-[5px] pb-[6px]">
									<Globe className="text-muted-foreground/50 size-3 shrink-0" />
									<span className="text-foreground/70 min-w-0 flex-1 truncate text-[8.5px]">
										yoursite.com
									</span>
									<X className="text-muted-foreground/35 size-2.5 shrink-0" />
								</div>
								<button
									type="button"
									className="ml-3 flex size-[18px] items-center justify-center rounded focus-visible:outline-none"
								>
									<Plus className="text-muted-foreground/50 size-3" />
								</button>
							</div>
							<div className="flex items-center gap-0.5 px-2 pt-2 pb-2">
								<button
									type="button"
									className="flex size-[22px] items-center justify-center rounded-full focus-visible:outline-none"
								>
									<ArrowLeft className="text-muted-foreground/50 size-3.5" />
								</button>
								<button
									type="button"
									className="flex size-[22px] items-center justify-center rounded-full focus-visible:outline-none"
								>
									<ArrowRight className="text-muted-foreground/50 size-3.5" />
								</button>
								<button
									type="button"
									className="flex size-[22px] items-center justify-center rounded-full focus-visible:outline-none"
								>
									<RotateCw className="text-muted-foreground/50 size-3" />
								</button>
								<div className="mx-1.5 flex flex-1 items-center gap-1.5 rounded-full bg-white/95 px-3 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10)]">
									<Lock className="size-2.5 shrink-0 text-[#1e8e3e]" />
									<span className="text-foreground/70 flex-1 text-center text-[8.5px]">
										yoursite.com
									</span>
									<Star className="text-muted-foreground/30 size-2.5 shrink-0" />
								</div>
								<button
									type="button"
									className="flex size-[22px] items-center justify-center rounded-full focus-visible:outline-none"
								>
									<MoreHorizontal className="text-muted-foreground/50 size-3.5" />
								</button>
							</div>
						</div>

						<div className="relative flex-1 overflow-hidden bg-[#eef0f3]">
							<div className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden opacity-20">
								<div className="flex h-9 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
									<div className="bg-foreground/10 h-2.5 w-14 rounded-full" />
									<div className="flex flex-1 items-center justify-end gap-2.5">
										<div className="bg-foreground/[0.08] h-1.5 w-7 rounded-full" />
										<div className="bg-foreground/[0.08] h-1.5 w-7 rounded-full" />
										<div className="bg-foreground/[0.08] h-1.5 w-7 rounded-full" />
									</div>
								</div>
								<div className="flex flex-1 justify-center overflow-hidden">
									<div className="w-full max-w-[480px]">
										<p className="text-foreground/30 px-4 pt-4 text-center text-[7px] font-medium tracking-wide">
											{__('Approximate preview', 'allfeedback')}
										</p>
										<div className="mt-4 grid grid-cols-3 gap-2 px-4">
											{[0, 1, 2].map((i) => (
												<div
													key={i}
													className="rounded-lg bg-white/75 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
												>
													<div className="bg-foreground/[0.06] mb-1.5 h-7 rounded-md" />
													<div className="bg-foreground/[0.08] mb-1 h-1.5 rounded-full" />
													<div className="bg-foreground/[0.06] h-1.5 w-3/4 rounded-full" />
												</div>
											))}
										</div>
									</div>
								</div>
							</div>

							<MiniWidgetPanel color={brandColor} position={position} />
							<MiniLauncher color={brandColor} position={position} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
