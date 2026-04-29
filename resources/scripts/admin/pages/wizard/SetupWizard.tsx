import {
	WIZARD_STATUS_QUERY_KEY,
	wizardApi,
	type WizardCompletePayload,
} from '@/admin/api/wizard';
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
	Calendar,
	Check,
	Clock,
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
	Pipette,
	Rocket,
	Users,
	Wand2,
	Zap,
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
			"Configure where you'd like to receive new response notifications.",
			'allfeedback',
		),
	},
	final: { title: '', desc: '' },
};

function getInitialState(): WizardCompletePayload {
	return {
		template: 'nps',
		brand_color: '#6366F1',
		position: 'bottom-right',
		admin_email:
			typeof __ALLFB_ADMIN__ !== 'undefined' ? __ALLFB_ADMIN__.adminEmail : '',
		notif_frequency: 'instant',
		consent: true,
		anonymize_ip: true,
		retention: '12m',
	};
}

function canAdvance(state: WizardCompletePayload, step: number): boolean {
	if (step === 2 && state.admin_email) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.admin_email);
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

const COLOR_PRESETS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

type PositionValue = WizardCompletePayload['position'];

const ALL_POSITIONS: { value: PositionValue; label: string }[] = [
	{ value: 'bottom-left', label: __('Bottom left', 'allfeedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'allfeedback') },
	{ value: 'side-tab', label: __('Side tab', 'allfeedback') },
];

const BOTTOM_POSITIONS = ALL_POSITIONS.filter((p) => p.value !== 'side-tab');

function ColorPicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	const isPreset = COLOR_PRESETS.includes(value);
	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center gap-1.5">
				{COLOR_PRESETS.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => onChange(color)}
						className={cn(
							'size-7 rounded-lg border-2 transition-all duration-150',
							value === color
								? 'border-foreground/30 scale-110 shadow-sm'
								: 'hover:border-foreground/10 border-transparent hover:scale-105',
						)}
						style={{ backgroundColor: color }}
					/>
				))}
				<label
					className={cn(
						'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-150',
						!isPreset
							? 'bg-muted text-muted-foreground border-foreground/30 scale-110 shadow-sm'
							: 'border-border/60 bg-muted text-muted-foreground/50 hover:border-border hover:text-muted-foreground border-dashed',
					)}
				>
					<Pipette className="size-3.5" />
					{!isPreset && (
						<span
							className="absolute right-0.5 bottom-0.5 size-2 rounded-full border border-white/60"
							style={{ backgroundColor: value }}
						/>
					)}
					<input
						type="color"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="absolute inset-0 cursor-pointer opacity-0"
					/>
				</label>
			</div>
			<div className="flex items-center gap-2">
				<div
					className="border-border/60 size-4 rounded border"
					style={{ backgroundColor: value }}
				/>
				<code className="text-muted-foreground/70 text-xs">
					{value.toUpperCase()}
				</code>
			</div>
		</div>
	);
}

function BrowserPreview({
	color,
	position,
}: {
	color: string;
	position: PositionValue;
}) {
	return (
		<div
			className="border-border/50 shadow-card flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border bg-white"
			style={{ aspectRatio: '16/9' }}
		>
			<div className="shrink-0 bg-[#dee1e6] select-none">
				<div className="flex items-end px-2.5 pt-1.5">
					<div className="flex shrink-0 items-center gap-[5px] pr-2.5 pb-[5px]">
						<span className="size-[9px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
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
						{__('Feedback', 'allfeedback')}
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
		<div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1fr_1.3fr]">
			<div className="flex flex-col">
				<div className="border-border/50 bg-card shadow-card flex h-full flex-col rounded-2xl border p-6 md:p-8">
					<div className="space-y-6">
						<div className="space-y-3">
							<label className="text-foreground block text-base font-medium">
								{__('Brand color', 'allfeedback')}
							</label>
							<ColorPicker
								value={state.brand_color}
								onChange={(v) => set({ brand_color: v })}
							/>
						</div>
						<div className="bg-border/50 h-px" />
						<div className="space-y-4">
							<label className="text-foreground block text-base font-medium">
								{__('Widget position', 'allfeedback')}
							</label>
							<div className="flex flex-col gap-2">
								{ALL_POSITIONS.map((pos) => (
									<button
										key={pos.value}
										type="button"
										onClick={() => set({ position: pos.value })}
										className={cn(
											'flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-300',
											state.position === pos.value
												? 'border-primary bg-primary/[0.03] text-primary shadow-sm'
												: 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
										)}
									>
										<span className="text-[14px] font-semibold">
											{pos.label}
										</span>
										{state.position === pos.value && (
											<Check className="size-4" strokeWidth={3} />
										)}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="border-border/50 bg-card shadow-card overflow-hidden rounded-2xl border">
				<div className="border-border/50 bg-muted/10 flex shrink-0 items-center justify-between border-b px-6 py-4">
					<div className="flex items-center gap-2.5">
						<div className="flex gap-1.5">
							<span className="bg-destructive/20 size-2.5 rounded-full" />
							<span className="size-2.5 rounded-full bg-amber-400/20" />
							<span className="size-2.5 rounded-full bg-green-500/20" />
						</div>
						<span className="text-muted-foreground/90 ml-2 text-xs font-bold tracking-widest uppercase">
							{__('Live Preview', 'allfeedback')}
						</span>
					</div>
					<div className="bg-muted/40 h-2 w-24 rounded-full" />
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

const NOTIF_OPTIONS = [
	{ id: 'instant' as const, label: __('Instant', 'allfeedback'), Icon: Zap },
	{ id: 'daily' as const, label: __('Daily', 'allfeedback'), Icon: Clock },
	{ id: 'weekly' as const, label: __('Weekly', 'allfeedback'), Icon: Calendar },
];

function StepSettings({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	const emailOk =
		!state.admin_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.admin_email);

	return (
		<div className="flex flex-col gap-4">
			<div className="border-border/50 bg-card shadow-card rounded-2xl border">
				<div className="space-y-8 p-6 md:space-y-10 md:p-10">
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-foreground text-base font-medium">
								{__('Where to send new response notifications', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__(
									'This email will receive an alert whenever a new feedback is submitted.',
									'allfeedback',
								)}
							</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder={__('you@company.com', 'allfeedback')}
								value={state.admin_email}
								onChange={(e) => set({ admin_email: e.target.value })}
								className={cn(
									'bg-muted/40 border-border/50 focus:border-primary/40 h-12 focus:bg-white',
									!emailOk &&
										'border-destructive/40 bg-destructive/5 focus:border-destructive/60',
								)}
							/>
							{!emailOk && (
								<div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
									<AlertCircle className="size-4" />
									<span>
										{__('Enter a valid email address.', 'allfeedback')}
									</span>
								</div>
							)}
						</div>
					</div>

					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-foreground text-base font-medium">
								{__('Delivery frequency', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__(
									'Choose how often you want to receive notification digests.',
									'allfeedback',
								)}
							</p>
						</div>
						<div className="border-border/50 bg-muted/30 inline-flex flex-col rounded-xl border p-1 sm:flex-row sm:items-center">
							{NOTIF_OPTIONS.map((opt) => (
								<button
									key={opt.id}
									type="button"
									onClick={() => set({ notif_frequency: opt.id })}
									className={cn(
										'flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all duration-300',
										state.notif_frequency === opt.id
											? 'text-primary border-border/20 border bg-white shadow-sm'
											: 'text-muted-foreground hover:text-foreground hover:bg-white/50',
									)}
								>
									<opt.Icon
										className={cn(
											'size-4',
											state.notif_frequency === opt.id
												? 'text-primary'
												: 'text-muted-foreground/60',
										)}
									/>
									{opt.label}
								</button>
							))}
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

const LAUNCH_HIGHLIGHTS = [
	{
		Icon: Check,
		title: __('Survey ready', 'allfeedback'),
		desc: __(
			'A starter form is waiting in the builder — customize questions, copy, and logic.',
			'allfeedback',
		),
		color: 'bg-success-subtle text-success',
	},
	{
		Icon: Zap,
		title: __('Go live instantly', 'allfeedback'),
		desc: __(
			"Publish with one click whenever you're satisfied. Your widget appears on your site immediately.",
			'allfeedback',
		),
		color: 'bg-accent text-accent-foreground',
	},
	{
		Icon: Bell,
		title: __('Stay notified', 'allfeedback'),
		desc: __(
			'Get alerted each time a new response arrives, so you never miss a piece of feedback.',
			'allfeedback',
		),
		color: 'bg-warning-subtle text-warning-foreground',
	},
];

function StepFinal({
	onFinish,
	submitting,
}: {
	onFinish: (target: 'editor' | 'forms') => void;
	submitting: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

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
		<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 size-full"
			/>

			<div className="relative z-10 flex w-full flex-col items-center gap-10">
				<div className="flex flex-col items-center gap-5 text-center">
					<div
						className="bg-primary flex size-[68px] items-center justify-center rounded-2xl text-white"
						style={{ boxShadow: '0 6px 24px oklch(0.580 0.238 277 / 0.35)' }}
					>
						<Rocket className="size-7" />
					</div>
					<div className="space-y-2">
						<h2
							className="text-foreground text-2xl font-bold tracking-tight"
							style={{ margin: 0 }}
						>
							{__("You're all set!", 'allfeedback')}
						</h2>
						<p
							className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed"
							style={{ margin: 0 }}
						>
							{__(
								'Your widget is configured and your first survey is ready. Open the editor to fine-tune your questions, then publish when ready.',
								'allfeedback',
							)}
						</p>
					</div>
				</div>

				<div className="flex w-full items-center gap-4">
					<div className="to-border h-px flex-1 bg-gradient-to-r from-transparent" />
					<span className="text-muted-foreground/90 text-xs font-semibold tracking-widest uppercase">
						{__("What's next", 'allfeedback')}
					</span>
					<div className="to-border h-px flex-1 bg-gradient-to-l from-transparent" />
				</div>

				<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
					{LAUNCH_HIGHLIGHTS.map((item, i) => (
						<div
							key={item.title}
							className="border-border/50 bg-card shadow-card relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-6"
						>
							<span className="text-foreground/[0.03] pointer-events-none absolute top-2 right-4 text-[52px] leading-none font-black tabular-nums select-none">
								{i + 1}
							</span>
							<div
								className={cn(
									'flex size-10 items-center justify-center rounded-xl',
									item.color,
								)}
							>
								<item.Icon className="size-[18px]" />
							</div>
							<div className="space-y-1.5">
								<p className="text-foreground text-[14px] font-semibold">
									{item.title}
								</p>
								<p className="text-muted-foreground text-[13px] leading-relaxed">
									{item.desc}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="flex w-full items-center justify-end gap-3">
					<Button
						variant="secondary"
						className="h-11 bg-transparent px-6"
						onClick={() => onFinish('forms')}
						disabled={submitting}
					>
						<LayoutGrid className="size-4" />
						{__('Go to All Forms', 'allfeedback')}
					</Button>
					<Button
						size="lg"
						className="h-11 font-semibold !text-white"
						onClick={() => onFinish('editor')}
						disabled={submitting}
					>
						{submitting ? (
							<Loader2 className="size-5 animate-spin" />
						) : (
							<Edit2 className="size-5" />
						)}
						{__('Open Editor', 'allfeedback')}
						<ArrowRight className="size-5" />
					</Button>
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
					className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-4 py-6 md:px-8 md:py-8"
					key={step}
				>
					{!isDone && (
						<div className="mb-8 flex justify-center md:mb-14">
							<div className="bg-card border-border/50 relative flex items-center rounded-2xl border p-2 shadow-sm">
								{STEPS.map((s, i) => {
									const isActive = i === step;
									const isDoneStep = i < step;
									const isClickable = i < step;
									return (
										<div key={s.id} className="flex items-center">
											<button
												type="button"
												className={cn(
													'group relative flex items-center gap-3 rounded-xl px-5 py-3 transition-all duration-300',
													isActive
														? 'bg-primary text-primary-foreground shadow-sm'
														: isDoneStep
															? 'text-foreground/90'
															: 'text-muted-foreground/70',
													isClickable &&
														!isActive &&
														'hover:bg-muted/40 hover:text-foreground',
												)}
												style={{ cursor: isClickable ? 'pointer' : 'default' }}
												onClick={() => isClickable && goto(i)}
											>
												<div
													className={cn(
														'flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
														isActive
															? 'bg-white/20 text-white'
															: isDoneStep
																? 'bg-primary/10 text-primary'
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
													className={cn(
														'text-[14px] tracking-tight',
														isActive || isDoneStep
															? 'font-semibold'
															: 'font-medium',
													)}
												>
													{s.label}
												</span>
											</button>
											{i < STEPS.length - 1 && (
												<div className="mx-2 flex items-center gap-1 opacity-20">
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
							<StepFinal onFinish={(t) => finish(t)} submitting={submitting} />
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
