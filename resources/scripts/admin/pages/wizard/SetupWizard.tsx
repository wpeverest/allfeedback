import {
	WIZARD_STATUS_QUERY_KEY,
	wizardApi,
	type WizardCompletePayload,
} from '@/admin/api/wizard';
import { ColorPicker } from '@/admin/components/ColorPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import confetti from 'canvas-confetti';
import {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Bell,
	Box,
	Bug,
	Check,
	Edit2,
	Gauge,
	Globe,
	Info,
	LayoutGrid,
	Lightbulb,
	Loader2,
	Lock,
	MessageSquare,
	Palette,
	Rocket,
	Users,
	Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const STEPS = [
	{ id: 'template' as const, label: __('Welcome', 'allfeedback'), Icon: Wand2 },
	{ id: 'style' as const, label: __('Style', 'allfeedback'), Icon: Palette },
	{ id: 'settings' as const, label: __('Settings', 'allfeedback'), Icon: Bell },
	{ id: 'final' as const, label: __('Launch', 'allfeedback'), Icon: Rocket },
];

type StepId = (typeof STEPS)[number]['id'];

const STEP_HEADERS: Record<StepId, { title: string; desc: string }> = {
	template: {
		title: __('👋 Welcome to AllFeedback', 'allfeedback'),
		desc: __(
			'Pick a template to get started — every field, label, and setting can be changed in the builder.',
			'allfeedback',
		),
	},
	style: {
		title: __('Make it yours', 'allfeedback'),
		desc: __(
			'Pick a brand color and choose where the widget appears on your site.',
			'allfeedback',
		),
	},
	settings: {
		title: __('Stay in the loop', 'allfeedback'),
		desc: __(
			'Set up where your weekly digest email gets delivered.',
			'allfeedback',
		),
	},
	final: { title: '', desc: '' },
};

function getInitialState(): WizardCompletePayload {
	return {
		template:     'nps',
		brand_color:  '#6366F1',
		position:     'bottom-right',
		shape:        'circle',
		admin_email:  typeof __ALLFB_ADMIN__ !== 'undefined' ? __ALLFB_ADMIN__.adminEmail : '',
		from_name:    '',
		from_email:   '',
		consent:      true,
		anonymize_ip: true,
		retention:    '12m',
	};
}

function canAdvance(state: WizardCompletePayload, step: number): boolean {
	if (step === 2) {
		const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (state.admin_email && !emailRe.test(state.admin_email)) return false;
		if (state.from_email  && !emailRe.test(state.from_email))  return false;
	}
	return true;
}

const TEMPLATES = [
	{
		id: 'nps' as const,
		title: __('NPS Survey', 'allfeedback'),
		desc: __(
			'Measure how likely customers are to recommend you to others.',
			'allfeedback',
		),
		Icon: Gauge,
	},
	{
		id: 'general-feedback' as const,
		title: __('General Feedback', 'allfeedback'),
		desc: __(
			'Collect open-ended thoughts, ratings, and suggestions from your audience.',
			'allfeedback',
		),
		Icon: MessageSquare,
	},
	{
		id: 'bug-report' as const,
		title: __('Bug Report', 'allfeedback'),
		desc: __(
			'Let users flag technical issues quickly with structured, actionable reports.',
			'allfeedback',
		),
		Icon: Bug,
	},
	{
		id: 'feature-request' as const,
		title: __('Feature Request', 'allfeedback'),
		desc: __(
			'Capture ideas for new features and improvements directly from your users.',
			'allfeedback',
		),
		Icon: Lightbulb,
	},
	{
		id: 'product-feedback' as const,
		title: __('Product Feedback', 'allfeedback'),
		desc: __(
			'Uncover what users love and what to build next with targeted product questions.',
			'allfeedback',
		),
		Icon: Box,
	},
	{
		id: 'customer-research' as const,
		title: __('Customer Research', 'allfeedback'),
		desc: __(
			'Learn more about your audience, their goals, and how they discovered you.',
			'allfeedback',
		),
		Icon: Users,
	},
];

function StepTemplate({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
			{TEMPLATES.map((t) => {
				const isSelected = state.template === t.id;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => set({ template: t.id })}
						className={cn(
							'group bg-card relative flex flex-col gap-5 rounded-2xl border-2 p-6 text-left transition-all duration-300',
							isSelected
								? '!border-primary shadow-card'
								: 'hover:border-border/60 hover:shadow-card border-transparent shadow-sm',
						)}
					>
						<div
							className={cn(
								'flex size-12 items-center justify-center rounded-xl transition-all duration-300',
								isSelected
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'bg-muted/50 text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary',
							)}
						>
							<t.Icon className="size-6" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-foreground text-[15px] font-semibold tracking-tight">
									{t.title}
								</span>
								<div
									className={cn(
										'bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-300',
										isSelected
											? 'scale-100 opacity-100'
											: 'pointer-events-none scale-75 opacity-0',
									)}
								>
									<Check className="size-3" strokeWidth={3} />
								</div>
							</div>
							<p
								className={cn(
									'line-clamp-2 text-[13px] leading-relaxed',
									isSelected
										? 'text-muted-foreground'
										: 'text-muted-foreground/60',
								)}
							>
								{t.desc}
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

type PositionValue = WizardCompletePayload['position'];

const ALL_POSITIONS: { value: PositionValue; label: string }[] = [
	{ value: 'bottom-left', label: __('Bottom left', 'allfeedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'allfeedback') },
	{ value: 'side-tab', label: __('Side tab', 'allfeedback') },
];

const BOTTOM_POSITIONS = ALL_POSITIONS.filter((p) => p.value !== 'side-tab');

const POSITION_SUB: Record<string, string> = {
	'bottom-left':  __('Floating bubble', 'allfeedback'),
	'bottom-right': __('Floating bubble', 'allfeedback'),
	'side-tab':     __('Vertical anchor', 'allfeedback'),
};

function PositionThumbnail({ value, selected }: { value: PositionValue; selected: boolean }) {
	return (
		<div className="relative h-9 w-[52px] shrink-0 overflow-hidden rounded-md border border-border/30 bg-muted/20">
			<div className="absolute inset-1 flex flex-col gap-[3px]">
				<div className="h-[3px] w-full rounded-full bg-foreground/10" />
				<div className="h-[3px] w-3/4 rounded-full bg-foreground/[0.07]" />
				<div className="h-[3px] w-1/2 rounded-full bg-foreground/[0.05]" />
			</div>
			{value === 'bottom-left' && (
				<div
					className="absolute bottom-1 left-1 size-2.5 rounded-full transition-colors"
					style={{ backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)', opacity: selected ? 1 : 0.15 }}
				/>
			)}
			{value === 'bottom-right' && (
				<div
					className="absolute bottom-1 right-1 size-2.5 rounded-full transition-colors"
					style={{ backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)', opacity: selected ? 1 : 0.15 }}
				/>
			)}
			{value === 'side-tab' && (
				<div
					className="absolute right-0 top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-l-sm transition-colors"
					style={{ backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)', opacity: selected ? 1 : 0.15 }}
				/>
			)}
		</div>
	);
}

function BrowserPreview({
	color,
	position,
	sideTabLabel = 'Feedback',
}: {
	color: string;
	position: PositionValue;
	sideTabLabel?: string;
}) {
	return (
		<div
			className="border-border/50 shadow-card flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border bg-white"
			style={{ aspectRatio: '16/9' }}
		>
			<div className="shrink-0 bg-[#dee1e6] select-none">
				<div className="flex items-end px-2.5 pt-1.5">
					<div className="flex shrink-0 items-center gap-[5px] pr-2.5 pb-[5px]">
						<span className="size-[9px] rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#28C840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
					</div>
					<div className="flex items-center gap-1 rounded-t-[5px] bg-white px-2 pt-[4px] pb-[5px]">
						<Globe className="text-muted-foreground/50 size-2.5 shrink-0" />
						<span className="text-foreground/60 text-[9px]">yoursite.com</span>
					</div>
				</div>
				<div className="flex items-center px-2 pt-1 pb-1.5">
					<div className="flex flex-1 items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]">
						<Lock className="size-2 shrink-0 text-[#1e8e3e]" />
						<span className="text-foreground/60 flex-1 text-center text-[8.5px]">
							yoursite.com
						</span>
					</div>
				</div>
			</div>
			<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
				<div className="flex h-[22px] shrink-0 items-center gap-2 border-b border-black/[0.06] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
					<div className="bg-foreground/10 h-2 w-10 rounded-full" />
					<div className="flex flex-1 items-center justify-end gap-2">
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
					</div>
				</div>
				<div className="pointer-events-none flex flex-col items-center gap-1.5 px-4 pt-3">
					<div className="bg-foreground/10 h-2 w-2/5 rounded-full" />
					<div className="bg-foreground/[0.07] h-1.5 w-1/4 rounded-full" />
					<div className="bg-foreground/[0.08] mt-1 h-4 w-14 rounded-md" />
				</div>
				{BOTTOM_POSITIONS.map((pos) => (
					<div
						key={pos.value}
						className={cn(
							'absolute bottom-3 flex size-8 items-center justify-center rounded-xl transition-all duration-300',
							pos.value === 'bottom-left' && 'left-3',
							pos.value === 'bottom-right' && 'right-3',
							position === pos.value
								? 'scale-110 text-white'
								: 'bg-foreground/[0.07] text-foreground/20',
						)}
						style={
							position === pos.value
								? {
										backgroundColor: color,
										boxShadow: `0 4px 12px -2px ${color}55`,
									}
								: undefined
						}
					>
						<MessageSquare className="size-3.5" />
					</div>
				))}
				<div
					className={cn(
						'absolute top-1/2 right-0 -translate-y-1/2 rounded-l-lg px-1.5 py-3 transition-all duration-300',
						position === 'side-tab'
							? 'text-white'
							: 'bg-foreground/[0.07] text-foreground/20',
					)}
					style={
						position === 'side-tab' ? { backgroundColor: color } : undefined
					}
				>
					<span
						className="text-[8px] font-semibold tracking-widest select-none"
						style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
					>
						{sideTabLabel}
					</span>
				</div>
			</div>
		</div>
	);
}

function StepStyle({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	return (
		<div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[2fr_3fr]">

			{/* ── Left panel ─────────────────────────────────────────────── */}
			<div className="flex flex-col">
				<div className="border-border/50 bg-card shadow-card flex h-full flex-col rounded-2xl border p-5 md:p-6">
					<div className="flex flex-col gap-5">

						{/* Brand color */}
						<div className="space-y-2.5">
							<label className="text-foreground block text-[13px] font-semibold">
								{__('Brand color', 'allfeedback')}
							</label>
							<ColorPicker
								value={state.brand_color}
								onChange={(v) => set({ brand_color: v })}
								className="w-full"
							/>
						</div>

						{/* Widget position */}
						<div className="space-y-2.5">
							<label className="text-foreground block text-[13px] font-semibold">
								{__('Widget position', 'allfeedback')}
							</label>
							<div className="flex flex-col gap-2">
								{ALL_POSITIONS.map((pos) => {
									const isSelected = state.position === pos.value;
									return (
										<button
											key={pos.value}
											type="button"
											onClick={() => set({ position: pos.value })}
											className={cn(
												'flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
												isSelected
													? 'bg-primary/[0.03]'
													: 'bg-muted/10 hover:bg-muted/30',
											)}
											style={{
												border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
												borderRadius: '0.5rem',
											}}
										>
											<PositionThumbnail value={pos.value as PositionValue} selected={isSelected} />
											<div className="flex-1 text-left">
												<div className={cn('text-[13px] font-semibold leading-tight', isSelected ? 'text-primary' : 'text-foreground')}>
													{pos.label}
												</div>
												<div className="text-muted-foreground mt-0.5 text-[11px]">
													{POSITION_SUB[pos.value]}
												</div>
											</div>
											<div className={cn(
												'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
												isSelected ? 'border-primary bg-primary' : 'border-border',
											)}>
												{isSelected && <Check className="size-2.5 text-white" strokeWidth={3.5} />}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── Right panel: preview ────────────────────────────────────── */}
			<div className="border-border/50 bg-card shadow-card overflow-hidden rounded-2xl border">
				<div className="border-border/50 bg-muted/10 flex shrink-0 items-center gap-2.5 border-b px-6 py-4">
					<div className="flex gap-1.5">
						<span className="size-2.5 rounded-full bg-[#FF5F57]" />
						<span className="size-2.5 rounded-full bg-[#FFBD2E]" />
						<span className="size-2.5 rounded-full bg-[#28C840]" />
					</div>
					<div className="ml-2 flex items-center gap-1.5">
						<span className="size-1.5 animate-pulse rounded-full bg-green-500" />
						<span className="text-muted-foreground/90 text-xs font-bold tracking-widest uppercase">
							{__('Live Preview', 'allfeedback')}
						</span>
					</div>
				</div>
				<div className="bg-muted/5 flex items-center justify-center p-6 md:p-12">
					<BrowserPreview
						color={state.brand_color}
						position={state.position as PositionValue}
					/>
				</div>
			</div>
		</div>
	);
}

function StepSettings({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	const emailRe       = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const adminEmailOk  = !state.admin_email || emailRe.test(state.admin_email);
	const fromEmailOk   = !state.from_email  || emailRe.test(state.from_email);

	const inputCls = (valid: boolean) => cn(
		'bg-muted/40 border-border/50 focus:border-primary/40 h-12 focus:bg-white',
		!valid && 'border-destructive/40 bg-destructive/5 focus:border-destructive/60',
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="border-border/50 bg-card shadow-card rounded-2xl border">
				<div className="space-y-5 p-5 md:p-6">

					{/* ── Notification address ─────────────────────────── */}
					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('Where to send notifications', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__(
									'Your weekly digest summary will be sent to this address.',
									'allfeedback',
								)}
							</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="you@company.com"
								value={state.admin_email}
								onChange={(e) => set({ admin_email: e.target.value })}
								className={inputCls(adminEmailOk)}
							/>
							{!adminEmailOk && (
								<div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
									<AlertCircle className="size-4" />
									<span>{__('Enter a valid email address.', 'allfeedback')}</span>
								</div>
							)}
						</div>
					</div>

					{/* ── From name ────────────────────────────────────── */}
					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('From name', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__(
									'The sender name shown in the recipient inbox.',
									'allfeedback',
								)}
							</p>
						</div>
						<Input
							type="text"
							placeholder="AllFeedback"
							value={state.from_name}
							onChange={(e) => set({ from_name: e.target.value })}
							className="bg-muted/40 border-border/50 focus:border-primary/40 h-10 focus:bg-white"
						/>
					</div>

					{/* ── From email ────────────────────────────────────── */}
					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('From email', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__(
									'The sender address used when dispatching emails.',
									'allfeedback',
								)}
							</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="noreply@yoursite.com"
								value={state.from_email}
								onChange={(e) => set({ from_email: e.target.value })}
								className={inputCls(fromEmailOk)}
							/>
							{!fromEmailOk && (
								<div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
									<AlertCircle className="size-4" />
									<span>{__('Enter a valid email address.', 'allfeedback')}</span>
								</div>
							)}
						</div>
					</div>

				</div>
			</div>

			<div className="border-info/20 bg-info-subtle/50 flex items-start gap-3 rounded-xl border px-5 py-4">
				<Info className="text-info size-4 shrink-0" />
				<p className="text-foreground/70 !m-0 text-sm leading-relaxed">
					{__(
						'All feedback is stored on your server only — no data is shared with third parties. Consent banners and IP anonymization can be configured in',
						'allfeedback',
					)}{' '}
					<strong className="text-foreground font-semibold">
						{__('Settings → Advanced', 'allfeedback')}
					</strong>
					{'.'}
				</p>
			</div>
		</div>
	);
}

const TEMPLATE_STAT_LABELS: Record<string, string> = {
	'nps':               'NPS Survey',
	'general-feedback':  'General Feedback',
	'bug-report':        'Bug Report',
	'feature-request':   'Feature Request',
	'product-feedback':  'Product Feedback',
	'customer-research': 'Customer Research',
};

const POSITION_STAT_LABELS: Record<string, string> = {
	'bottom-right': 'Bottom right',
	'bottom-left':  'Bottom left',
	'side-tab':     'Side tab',
};

function StepFinal({
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
				colors: ['#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff', '#f59e0b', '#34d399'],
			});

		const t = setTimeout(() => {
			fire(0.25, { spread: 26, startVelocity: 55 });
			fire(0.2,  { spread: 60 });
			fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
			fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
			fire(0.1,  { spread: 120, startVelocity: 45 });
		}, 250);

		return () => { clearTimeout(t); myConfetti.reset(); };
	}, []);

	return (
		<div className="relative flex flex-1 flex-col justify-center overflow-hidden">
			<canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />

			<style>{`
				@keyframes wizard-dot-pulse {
					0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.18); }
					50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0.05); }
				}
				@keyframes wizard-widget-in {
					0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
					100% { opacity: 1; transform: translateY(0)    scale(1); }
				}
				@keyframes wizard-shimmer {
					from { background-position: 200% 0; }
					to   { background-position: -200% 0; }
				}
			`}</style>

			<div
				className="relative z-10 grid w-full items-center gap-10"
				style={{ gridTemplateColumns: '1.05fr 1fr' }}
			>
				{/* ── Left: hero ─────────────────────────────────────── */}
				<div>
					<span
						className="border-brand-200 bg-brand-50 text-brand-700 mb-[18px] inline-flex items-center gap-2 rounded-full border py-[5px] pr-3 pl-2"
						style={{ fontSize: '0.8125rem', fontWeight: 600 }}
					>
						<span
							className="bg-success size-2 shrink-0 rounded-full"
							style={{ animation: 'wizard-dot-pulse 2s ease-in-out infinite' }}
						/>
						{__('Setup complete · ready to launch', 'allfeedback')}
					</span>

					<h1
						className="text-foreground tracking-tight"
						style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.1, margin: '0 0 1rem' }}
					>
						{__('Your survey is', 'allfeedback')}{' '}
						<span
							style={{
								background: 'linear-gradient(120deg, var(--brand-500), var(--brand-700) 70%)',
								WebkitBackgroundClip: 'text',
								backgroundClip: 'text',
								color: 'transparent',
							}}
						>
							{__('ready to launch.', 'allfeedback')}
						</span>
						<br />
						{__('Open the editor to go live.', 'allfeedback')}
					</h1>

					<p
						className="text-muted-foreground max-w-[460px] text-md leading-relaxed"
						style={{ margin: '0 0 1.75rem', fontSize: '1.125rem', fontWeight: 400 }}
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
								icon:  null,
							},
							{
								label: __('Position', 'allfeedback'),
								value: POSITION_STAT_LABELS[state.position] ?? state.position,
								icon:  null,
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
								className={cn(i < 2 && 'border-border border-r')}
								style={{
									padding: i === 0 ? '0 18px 0 0' : i === 2 ? '0 0 0 18px' : '0 18px',
								}}
							>
								<div
									className="text-muted-foreground uppercase tracking-[0.06em]"
									style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem' }}
								>
									{stat.label}
								</div>
								<div
									className="text-foreground flex items-center gap-1.5 tracking-[-0.01em]"
									style={{ fontSize: '1.25rem', fontWeight: 700 }}
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
						>
							<LayoutGrid className="size-4" />
							{__('All Forms', 'allfeedback')}
						</Button>
					</div>
				</div>

				{/* ── Right: browser preview ──────────────────────────── */}
				<div
					className="border-brand-100 relative overflow-hidden rounded-[20px] border"
					style={{
						height: 480,
						display: 'grid',
						placeItems: 'center',
						background: [
							'radial-gradient(circle at 30% 20%, rgba(154,145,247,0.25), transparent 50%)',
							'radial-gradient(circle at 80% 70%, rgba(192,183,251,0.30), transparent 50%)',
							'linear-gradient(180deg, var(--brand-50), #FFF)',
						].join(', '),
					}}
				>
					<div
						className="pointer-events-none absolute inset-0"
						style={{
							backgroundImage: [
								'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)',
								'linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
							].join(', '),
							backgroundSize: '24px 24px',
							maskImage: 'radial-gradient(ellipse at center, #000 35%, transparent 75%)',
							WebkitMaskImage: 'radial-gradient(ellipse at center, #000 35%, transparent 75%)',
						}}
					/>

					<div
						className="relative overflow-hidden bg-white"
						style={{
							width: '88%',
							maxWidth: 420,
							borderRadius: 12,
							boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 24px 50px -10px rgba(31,29,57,0.18), 0 8px 20px -8px rgba(99,102,241,0.20)',
						}}
					>
						{/* Chrome bar */}
						<div
							style={{
								display: 'flex', alignItems: 'center', gap: 6,
								padding: '10px 12px',
								borderBottom: '1px solid var(--border)',
								background: '#FAFBFC',
							}}
						>
							<span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5F57', flexShrink: 0 }} />
							<span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FFBD2E', flexShrink: 0 }} />
							<span style={{ width: 9, height: 9, borderRadius: '50%', background: '#28C840', flexShrink: 0 }} />
							<div
								style={{
									flex: 1, marginLeft: 10, height: 22,
									background: 'white',
									border: '1px solid var(--border)',
									borderRadius: 5,
									display: 'flex', alignItems: 'center',
									padding: '0 9px',
									fontSize: 11,
									color: 'var(--muted-foreground)',
									fontFamily: 'ui-monospace, monospace',
									gap: 5,
								}}
							>
								<span style={{ fontSize: 9, opacity: 0.5 }}>🔒</span>
								acme.com/checkout
							</div>
						</div>

						{/* Page body */}
						<div
							style={{
								position: 'relative',
								height: 220,
								padding: '18px 20px 20px',
								background: 'linear-gradient(180deg, #fff, #FAFBFC)',
							}}
						>
							{/* Skeleton rows */}
							<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
								{([
									{ w: '30%', h: 14 },
									{ w: '80%', h: 8  },
									{ w: '50%', h: 8  },
									{ w: '80%', h: 8  },
									{ w: '30%', h: 14 },
								] as { w: string; h: number }[]).map((row, i) => (
									<div
										key={i}
										style={{
											height: row.h,
											width: row.w,
											borderRadius: 4,
											background: 'linear-gradient(90deg, #EEF0F4, #F5F6F8, #EEF0F4)',
											backgroundSize: '200% 100%',
											animation: 'wizard-shimmer 2.4s linear infinite',
										}}
									/>
								))}
							</div>

							{/* Floating widget */}
							<div
								style={{
									position: 'absolute',
									bottom: 22, right: 22,
									width: 250,
									background: 'white',
									borderRadius: 14,
									border: '1px solid var(--border)',
									boxShadow: '0 0 0 1px rgba(99,102,241,0.10), 0 20px 40px -8px rgba(31,29,57,0.20), 0 4px 12px -2px rgba(99,102,241,0.18)',
									overflow: 'hidden',
									animation: 'wizard-widget-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
								}}
							>
								<div
									style={{
										padding: '14px 14px 10px',
										background: `linear-gradient(180deg, ${brandColor}, ${brandColor}cc)`,
										color: '#fff',
									}}
								>
									<div style={{ fontSize: 13, fontWeight: 600 }}>
										{__('Quick feedback', 'allfeedback')}
									</div>
									<div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
										{__('Takes about 30 seconds', 'allfeedback')}
									</div>
								</div>
								<div style={{ padding: 14 }}>
									<div
										style={{
											fontSize: 12, fontWeight: 500, marginBottom: 10,
											color: 'var(--foreground)',
										}}
									>
										{__('How likely are you to recommend Acme?', 'allfeedback')}
									</div>
									<div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
										{[1, 2, 3, 4, 5].map((n) => (
											<span
												key={n}
												style={{
													width: 22, height: 22,
													borderRadius: 5,
													display: 'grid', placeItems: 'center',
													fontSize: 11, fontWeight: 600,
													border: '1px solid var(--border)',
													cursor: 'default',
													...(n >= 4
														? { background: brandColor, color: '#fff', borderColor: brandColor }
														: { background: 'var(--brand-50)', color: 'var(--brand-300)' }),
												}}
											>
												{n}
											</span>
										))}
									</div>
									<div
										style={{
											height: 26, borderRadius: 6,
											background: 'var(--muted)',
											border: '1px solid var(--border)',
											display: 'flex', alignItems: 'center',
											padding: '0 10px',
											fontSize: 11,
											color: 'var(--muted-foreground)',
										}}
									>
										{__('Tell us more (optional)…', 'allfeedback')}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function SetupWizard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [state, setStateRaw] = useState<WizardCompletePayload>(getInitialState);
	const [step, setStepRaw] = useState<number>(0);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		document.body.classList.add('allfb-wizard-fullscreen');
		return () => document.body.classList.remove('allfb-wizard-fullscreen');
	}, []);

	const set = useCallback((updates: Partial<WizardCompletePayload>) => {
		setStateRaw((prev) => ({ ...prev, ...updates }));
	}, []);

	const goto = useCallback((n: number) => {
		setStepRaw(Math.min(Math.max(n, 0), STEPS.length));
	}, []);

	const finish = useCallback(
		async (target: 'editor' | 'forms' = 'forms') => {
			setSubmitting(true);
			try {
				const res = await wizardApi.complete(state);

				queryClient.setQueryData(WIZARD_STATUS_QUERY_KEY, {
					status: 'completed',
				});

				if (target === 'editor' && res.id) {
					navigate({ to: '/builder', search: { id: res.id, new: true } });
				} else {
					navigate({ to: '/forms' });
				}
			} catch {
				navigate({ to: '/forms' });
			} finally {
				setSubmitting(false);
			}
		},
		[state, queryClient, navigate],
	);

	useEffect(() => {
		if (step >= STEPS.length) {
			navigate({ to: '/forms' });
		}
	}, [step, navigate]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				if (step >= STEPS.length) return;
				if (step >= STEPS.length - 1) {
					finish();
				} else if (canAdvance(state, step)) {
					goto(step + 1);
				}
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [state, step, goto, finish]);

	const isDone = step >= STEPS.length;
	const currentStep = STEPS[step] || STEPS[0];

	return (
		<div className="bg-background flex h-screen flex-col">
			{!isDone && (
				<header className="border-border/50 bg-card flex h-[72px] shrink-0 items-center justify-between border-b px-4 md:px-10">
					<div className="flex shrink-0 items-center gap-2">
						<div className="bg-primary flex size-[30px] items-center justify-center rounded-md">
							<MessageSquare className="size-[15px] text-white" />
						</div>
						<span className="text-md text-foreground tracking-tight">
							<strong className="font-bold">All</strong>
							<span className="font-normal">Feedback</span>
						</span>
					</div>
					{step < STEPS.length - 1 && (
						<button
							type="button"
							onClick={() => finish('forms')}
							className="group text-muted-foreground hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-all hover:underline hover:underline-offset-4"
						>
							{__('Skip setup', 'allfeedback')}
							<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
						</button>
					)}
				</header>
			)}

			<main className="flex min-h-0 flex-1 flex-col overflow-auto">
				<div
					className={cn(
						'mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 md:px-8 pt-6 md:pt-8',
						step === 3 ? 'pb-4' : 'pb-6 md:pb-8',
					)}
					key={step}
				>
					{!isDone && (
						<div className={cn('flex justify-center', step === 3 ? 'mb-4' : 'mb-8 md:mb-14')}>
							<div className="bg-card border-border/50 relative flex items-center rounded-2xl border p-2 shadow-sm">
								{STEPS.map((s, i) => {
									const isActive   = i === step;
									const isDoneStep = i < step;
									const isClickable = i < step;
									return (
										<div key={s.id} className="flex items-center">
											<button
												type="button"
												className={cn(
													'group relative flex items-center gap-2.5 rounded-xl px-5 py-2.5 transition-all duration-300',
													isActive
														? 'bg-primary text-primary-foreground shadow-sm'
														: isDoneStep
															? 'text-foreground/80'
															: 'text-muted-foreground/60',
													isClickable && !isActive &&
														'hover:bg-muted/40 hover:text-foreground',
												)}
												style={{ cursor: isClickable ? 'pointer' : 'default' }}
												onClick={() => isClickable && goto(i)}
											>
												<div
													className={cn(
														'flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
														isActive
															? 'bg-white/25 text-white'
															: isDoneStep
																? 'bg-success/15 text-success'
																: 'bg-muted text-muted-foreground/50',
													)}
												>
													{isDoneStep ? (
														<Check className="size-3" strokeWidth={3} />
													) : (
														i + 1
													)}
												</div>
												<span
													style={{
														fontSize:   14,
														fontWeight: isActive ? 700 : isDoneStep ? 500 : 400,
														color:      isActive
															? 'inherit'
															: isDoneStep
																? 'var(--color-foreground)'
																: 'var(--color-muted-foreground)',
														letterSpacing: '-0.01em',
													}}
												>
													{s.label}
												</span>
											</button>
											{i < STEPS.length - 1 && (
												<div className="mx-2 flex items-center gap-1 opacity-25">
													<div className="bg-foreground size-1 rounded-full" />
													<div className="bg-foreground size-1 rounded-full" />
													<div className="bg-foreground size-1 rounded-full" />
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					<div className="flex flex-1 flex-col justify-center gap-5">
						{!isDone && currentStep!.id !== 'final' && (
							<div className="text-center">
								<h1
									className="text-foreground text-xl font-semibold tracking-tight"
									style={{ margin: 0 }}
								>
									{STEP_HEADERS[currentStep!.id].title}
								</h1>
								<p className="text-muted-foreground mt-1 text-sm">
									{STEP_HEADERS[currentStep!.id].desc}
								</p>
							</div>
						)}
						{!isDone && step === 0 && <StepTemplate state={state} set={set} />}
						{!isDone && step === 1 && <StepStyle state={state} set={set} />}
						{!isDone && step === 2 && <StepSettings state={state} set={set} />}
						{!isDone && step === 3 && (
							<StepFinal state={state} onFinish={(t) => finish(t)} submitting={submitting} />
						)}
					</div>
				</div>
			</main>

			{!isDone && step < STEPS.length - 1 && (
				<footer className="border-border/50 bg-card flex h-[76px] shrink-0 items-center justify-end border-t px-4 md:px-10">
					<div className="flex gap-3">
						{step > 0 && (
							<Button
								variant="secondary"
								className="h-11 px-6"
								onClick={() => goto(step - 1)}
							>
								<ArrowLeft className="mr-2 size-4" />
								{__('Back', 'allfeedback')}
							</Button>
						)}
						<Button
							size="lg"
							className="h-11 px-8 shadow-sm"
							disabled={!canAdvance(state, step)}
							onClick={() => goto(step + 1)}
						>
							{__('Continue', 'allfeedback')}
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</div>
				</footer>
			)}
		</div>
	);
}
