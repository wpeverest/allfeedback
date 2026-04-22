import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { wizardApi, WIZARD_STATUS_QUERY_KEY, type WizardCompletePayload } from '@/admin/api/wizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
	MessageSquare, Check, ArrowLeft, ArrowRight, AlertCircle,
	Gauge, Box, Headphones, LifeBuoy, Monitor, Plus, Mail,
	Clock, Calendar, Zap, Globe, Lock, Pipette,
	Rocket, Palette, MapPin, Bell, Wand2, Info,
} from 'lucide-react';

const STEPS = [
	{ id: 'template', label: 'Welcome',  Icon: Wand2   },
	{ id: 'style',    label: 'Style',    Icon: Palette  },
	{ id: 'settings', label: 'Settings', Icon: Bell     },
	{ id: 'final',    label: 'Launch',   Icon: Rocket   },
] as const;

type StepId = typeof STEPS[number]['id'];

const STEP_HEADERS: Record<StepId, { title: string; desc: string }> = {
	template: {
		title: "Welcome to AllFeedback",
		desc:  'Choose a starting template — you can customize everything in the builder.',
	},
	style: {
		title: 'Make it yours',
		desc:  'Pick a brand color and choose where the widget appears on your site.',
	},
	settings: {
		title: 'Stay in the loop',
		desc:  "Configure where you'd like to receive new response notifications.",
	},
	final: { title: '', desc: '' },
};

const STORAGE_KEY = 'allfb-wizard-v1';

function getInitialState(): WizardCompletePayload {
	return {
		template:        'nps',
		brand_color:     '#6366F1',
		position:        'bottom-right',
		admin_email:     ( typeof __ALLFB_ADMIN__ !== 'undefined' ? __ALLFB_ADMIN__.adminEmail : '' ),
		notif_frequency: 'instant',
		consent:         true,
		anonymize_ip:    true,
		retention:       '12m',
	};
}

function loadState(): WizardCompletePayload {
	const base = getInitialState();
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		if ( ! raw ) return base;
		const parsed = JSON.parse( raw );
		// If storage has empty email but we have a default, use the default
		if ( ! parsed.admin_email && base.admin_email ) {
			parsed.admin_email = base.admin_email;
		}
		return { ...base, ...parsed };
	} catch {
		return base;
	}
}

function loadStep(): number {
	const n = parseInt( localStorage.getItem( STORAGE_KEY + '-step' ) ?? '0', 10 );
	const val = isNaN( n ) ? 0 : n;
	return ( val >= STEPS.length ) ? 0 : Math.max( val, 0 );
}

function canAdvance( state: WizardCompletePayload, step: number ): boolean {
	if ( step === 2 && state.admin_email ) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( state.admin_email );
	}
	return true;
}

const TEMPLATES = [
	{
		id:      'nps',
		title:   'Net Promoter Score',
		desc:    'Ask how likely customers are to recommend you. The gold standard for measuring loyalty.',
		Icon:    Gauge,
		cat:     'Loyalty',
	},
	{
		id:    'product',
		title: 'Product Feedback',
		desc:  'Uncover what users love and what to build next with targeted product questions.',
		Icon:  Box,
		cat:   'Research',
	},
	{
		id:    'service',
		title: 'Service Rating',
		desc:  'Measure satisfaction after every interaction with a simple, proven CSAT question.',
		Icon:  Headphones,
		cat:   'CSAT',
	},
	{
		id:    'support',
		title: 'Support Follow-up',
		desc:  'Close the loop after a ticket resolves to confirm customers truly feel helped.',
		Icon:  LifeBuoy,
		cat:   'Support',
	},
	{
		id:    'website',
		title: 'Website Feedback',
		desc:  'Capture real-time opinions on your pages — design, copy, or overall experience.',
		Icon:  Monitor,
		cat:   'Research',
	},
	{
		id:    'undecided',
		title: 'Start from Scratch',
		desc:  'Skip the template and build exactly what you need in the form builder.',
		Icon:  Plus,
		cat:   'Custom',
	},
] as const;

function StepTemplate( { state, set }: { state: WizardCompletePayload; set: ( u: Partial<WizardCompletePayload> ) => void } ) {
	return (
		<div className="grid grid-cols-3 gap-5">
			{ TEMPLATES.map( ( t ) => {
				const isSelected = state.template === t.id;
				return (
					<button
						key={ t.id }
						type="button"
						onClick={ () => set( { template: t.id } ) }
						className={ cn(
							'group relative flex flex-col gap-5 rounded-2xl border p-6 text-left transition-all duration-300',
							isSelected
								? 'border-primary bg-primary/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_var(--color-primary)]'
								: 'border-border/50 bg-card hover:border-border/80 hover:shadow-xl hover:shadow-black/[0.02]',
						) }
					>
						<div className={ cn(
							'flex size-12 items-center justify-center rounded-xl transition-all duration-300',
							isSelected
								? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
								: 'bg-muted/50 text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary',
						) }>
							<t.Icon className="size-6" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-[15px] font-bold tracking-tight text-foreground">
									{ t.title }
								</span>
								{ isSelected && (
									<div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50 duration-300">
										<Check className="size-3" strokeWidth={ 3 } />
									</div>
								) }
							</div>
							<p className={ cn(
								'text-[13px] leading-relaxed line-clamp-2',
								isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70',
							) }>
								{ t.desc }
							</p>
						</div>
						{ 'popular' in t && t.popular && (
							<div className="absolute -right-2 -top-2 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 shadow-sm border border-amber-200">
								Popular
							</div>
						) }
					</button>
				);
			} ) }
		</div>
	);
}

const COLOR_PRESETS = [
	'#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
];

type PositionValue = WizardCompletePayload['position'];

const ALL_POSITIONS: { value: PositionValue; label: string }[] = [
	{ value: 'bottom-left',  label: 'Bottom left'  },
	{ value: 'bottom-right', label: 'Bottom right' },
	{ value: 'side-tab',     label: 'Side tab'     },
];

const BOTTOM_POSITIONS = ALL_POSITIONS.filter( ( p ) => p.value !== 'side-tab' );

function ColorPicker( { value, onChange }: { value: string; onChange: ( v: string ) => void } ) {
	const isPreset = COLOR_PRESETS.includes( value );
	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center gap-1.5">
				{ COLOR_PRESETS.map( ( color ) => (
					<button
						key={ color }
						type="button"
						onClick={ () => onChange( color ) }
						className={ cn(
							'size-7 rounded-lg border-2 transition-all duration-150',
							value === color
								? 'border-foreground/30 scale-110 shadow-sm'
								: 'border-transparent hover:scale-105 hover:border-foreground/10',
						) }
						style={ { backgroundColor: color } }
					/>
				) ) }
				<label className={ cn(
					'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-150',
					! isPreset
						? 'bg-muted text-muted-foreground border-foreground/30 scale-110 shadow-sm'
						: 'border-dashed border-border/60 bg-muted text-muted-foreground/50 hover:border-border hover:text-muted-foreground',
				) }>
					<Pipette className="size-3.5" />
					{ ! isPreset && (
						<span
							className="absolute bottom-0.5 right-0.5 size-2 rounded-full border border-white/60"
							style={ { backgroundColor: value } }
						/>
					) }
					<input
						type="color"
						value={ value }
						onChange={ ( e ) => onChange( e.target.value ) }
						className="absolute inset-0 cursor-pointer opacity-0"
					/>
				</label>
			</div>
			<div className="flex items-center gap-2">
				<div className="size-4 rounded border border-border/60" style={ { backgroundColor: value } } />
				<code className="text-xs text-muted-foreground/70">{ value.toUpperCase() }</code>
			</div>
		</div>
	);
}

function BrowserPreview( { color, position }: { color: string; position: PositionValue } ) {
	return (
		<div
			className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-md"
			style={ { aspectRatio: '16/9' } }
		>
			<div className="shrink-0 select-none bg-[#dee1e6]">
				<div className="flex items-end px-2.5 pt-1.5">
					<div className="flex shrink-0 items-center gap-[5px] pb-[5px] pr-2.5">
						<span className="size-[9px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
					</div>
					<div className="flex items-center gap-1 rounded-t-[5px] bg-white px-2 pb-[5px] pt-[4px]">
						<Globe className="size-2.5 shrink-0 text-muted-foreground/50" />
						<span className="text-[9px] text-foreground/60">yoursite.com</span>
					</div>
				</div>
				<div className="flex items-center px-2 pb-1.5 pt-1">
					<div className="flex flex-1 items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]">
						<Lock className="size-2 shrink-0 text-[#1e8e3e]" />
						<span className="flex-1 text-center text-[8.5px] text-foreground/60">yoursite.com</span>
					</div>
				</div>
			</div>
			<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
				<div className="flex h-[22px] shrink-0 items-center gap-2 border-b border-black/[0.06] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
					<div className="h-2 w-10 rounded-full bg-foreground/10" />
					<div className="flex flex-1 items-center justify-end gap-2">
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
					</div>
				</div>
				<div className="pointer-events-none flex flex-col items-center gap-1.5 px-4 pt-3">
					<div className="h-2 w-2/5 rounded-full bg-foreground/10" />
					<div className="h-1.5 w-1/4 rounded-full bg-foreground/[0.07]" />
					<div className="mt-1 h-4 w-14 rounded-md bg-foreground/[0.08]" />
				</div>
				{ BOTTOM_POSITIONS.map( ( pos ) => (
					<div
						key={ pos.value }
						className={ cn(
							'absolute bottom-3 flex size-8 items-center justify-center rounded-xl transition-all duration-300',
							pos.value === 'bottom-left'  && 'left-3',
							pos.value === 'bottom-right' && 'right-3',
							position === pos.value ? 'scale-110 text-white' : 'bg-foreground/[0.07] text-foreground/20',
						) }
						style={ position === pos.value ? { backgroundColor: color, boxShadow: `0 4px 12px -2px ${ color }55` } : undefined }
					>
						<MessageSquare className="size-3.5" />
					</div>
				) ) }
				<div
					className={ cn(
						'absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg px-1.5 py-3 transition-all duration-300',
						position === 'side-tab' ? 'text-white' : 'bg-foreground/[0.07] text-foreground/20'
					) }
					style={ position === 'side-tab' ? { backgroundColor: color } : undefined }
				>
					<span
						className="select-none text-[8px] font-semibold tracking-widest"
						style={ { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }
					>
						Feedback
					</span>
				</div>
			</div>
		</div>
	);
}

function StepStyle( { state, set }: { state: WizardCompletePayload; set: ( u: Partial<WizardCompletePayload> ) => void } ) {
	return (
		<div className="grid grid-cols-[1fr_1.3fr] gap-8">
			<div className="flex flex-col gap-6">
				<div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
					<div className="space-y-6">
						<div className="space-y-3">
							<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Brand color</p>
							<ColorPicker value={ state.brand_color } onChange={ ( v ) => set( { brand_color: v } ) } />
						</div>
						<div className="h-px bg-border/40" />
						<div className="space-y-4">
							<p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Widget position</p>
							<div className="flex flex-col gap-2">
								{ ALL_POSITIONS.map( ( pos ) => (
									<button
										key={ pos.value }
										type="button"
										onClick={ () => set( { position: pos.value } ) }
										className={ cn(
											'flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-300',
											state.position === pos.value
												? 'border-primary bg-primary/[0.03] text-primary shadow-sm'
												: 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
										) }
									>
										<span className="text-[14px] font-semibold">{ pos.label }</span>
										{ state.position === pos.value && <Check className="size-4" strokeWidth={ 3 } /> }
									</button>
								) ) }
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl shadow-black/[0.03]">
				<div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4 bg-muted/10">
					<div className="flex items-center gap-2.5">
						<div className="flex gap-1.5">
							<span className="size-2.5 rounded-full bg-destructive/20" />
							<span className="size-2.5 rounded-full bg-amber-400/20" />
							<span className="size-2.5 rounded-full bg-green-500/20" />
						</div>
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 ml-2">Live Preview</span>
					</div>
					<div className="h-2 w-24 rounded-full bg-muted/40" />
				</div>
				<div className="flex items-center justify-center bg-muted/5 p-12">
					<BrowserPreview color={ state.brand_color } position={ state.position as PositionValue } />
				</div>
			</div>
		</div>
	);
}

const NOTIF_OPTIONS = [
	{ id: 'instant' as const, label: 'Instant', Icon: Zap      },
	{ id: 'daily'   as const, label: 'Daily',   Icon: Clock    },
	{ id: 'weekly'  as const, label: 'Weekly',  Icon: Calendar },
];

function StepSettings( { state, set }: { state: WizardCompletePayload; set: ( u: Partial<WizardCompletePayload> ) => void } ) {
	const emailOk = ! state.admin_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( state.admin_email );

	return (
		<div className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
			<div className="p-10 space-y-10">
				<div className="space-y-4">
					<div className="space-y-1.5">
						<label className="text-sm font-semibold tracking-tight text-foreground">Where to send new response notifications</label>
						<p className="text-[13px] leading-relaxed text-muted-foreground/80">This email will receive an alert whenever a new feedback is submitted.</p>
					</div>
					<div className="space-y-2">
						<Input
							type="email"
							placeholder="you@company.com"
							value={ state.admin_email }
							onChange={ ( e ) => set( { admin_email: e.target.value } ) }
							className={ cn( 
								'h-12 text-[14px] bg-muted/40 border-border/40 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/5', 
								! emailOk && 'border-destructive/40 bg-destructive/5 focus:border-destructive/60 focus:ring-destructive/10' 
							) }
						/>
						{ ! emailOk && (
							<div className="flex items-center gap-2 text-[12px] font-medium text-destructive">
								<AlertCircle className="size-4" />
								<span>Enter a valid email address.</span>
							</div>
						) }
					</div>
				</div>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<label className="text-sm font-semibold tracking-tight text-foreground">Delivery frequency</label>
						<p className="text-[13px] leading-relaxed text-muted-foreground/80">Choose how often you want to receive notification digests.</p>
					</div>
					<div className="inline-flex items-center rounded-xl border border-border/50 bg-muted/30 p-1">
						{ NOTIF_OPTIONS.map( ( opt ) => (
							<button
								key={ opt.id }
								type="button"
								onClick={ () => set( { notif_frequency: opt.id } ) }
								className={ cn(
									'flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all duration-300',
									state.notif_frequency === opt.id
										? 'bg-white text-primary shadow-sm border border-border/20'
										: 'text-muted-foreground hover:text-foreground hover:bg-white/50',
								) }
							>
								<opt.Icon className={ cn( 'size-4', state.notif_frequency === opt.id ? 'text-primary' : 'text-muted-foreground/60' ) } />
								{ opt.label }
							</button>
						) ) }
					</div>
				</div>
			</div>

			<div className="bg-blue-50/40 border-t border-blue-100/50 px-10 py-6">
				<div className="flex items-center gap-4">
					<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
						<Info className="size-4" />
					</div>
					<p className="text-[13px] leading-relaxed text-blue-900/70">
						All feedback is stored on your server only — no data is shared with third parties.
						Consent banners and IP anonymization can be configured in{' '}
						<strong className="font-semibold text-blue-900/90">Settings → Advanced</strong>.
					</p>
				</div>
			</div>
		</div>
	);
}

function StepFinal( { state, onFinish, submitting }: { state: WizardCompletePayload; onFinish: () => void; submitting: boolean } ) {
	const tpl        = TEMPLATES.find( ( t ) => t.id === state.template ) ?? TEMPLATES[ 0 ];
	const notifLabel = NOTIF_OPTIONS.find( ( o ) => o.id === state.notif_frequency )?.label ?? state.notif_frequency;
	const posLabel   = ALL_POSITIONS.find( ( p ) => p.value === state.position )?.label ?? state.position;
	const canvasRef  = useRef<HTMLCanvasElement>( null );

	useEffect( () => {
		if ( ! canvasRef.current ) return;
		const myConfetti = confetti.create( canvasRef.current, { resize: true, useWorker: true } );
		const fire = ( particleRatio: number, opts: confetti.Options ) =>
			myConfetti( {
				...opts,
				origin:        { y: 0.55 },
				particleCount: Math.floor( 200 * particleRatio ),
				colors:        [ '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff', '#f59e0b', '#34d399' ],
			} );

		const t = setTimeout( () => {
			fire( 0.25, { spread: 26, startVelocity: 55 } );
			fire( 0.2,  { spread: 60 } );
			fire( 0.35, { spread: 100, decay: 0.91, scalar: 0.8 } );
			fire( 0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 } );
			fire( 0.1,  { spread: 120, startVelocity: 45 } );
		}, 250 );

		return () => {
			clearTimeout( t );
			myConfetti.reset();
		};
	}, [] );

	const summaryItems = [
		{
			Icon:  tpl.Icon,
			label: 'Survey type',
			value: tpl.title,
			color: 'bg-indigo-50 text-indigo-600',
		},
		{
			Icon:  Palette,
			label: 'Brand color',
			value: (
				<span className="flex items-center gap-2">
					<span className="inline-block size-3.5 rounded-[4px] border border-black/10 shadow-sm" style={ { backgroundColor: state.brand_color } } />
					{ state.brand_color.toUpperCase() }
				</span>
			),
			color: 'bg-pink-50 text-pink-600',
		},
		{
			Icon:  MapPin,
			label: 'Position',
			value: posLabel,
			color: 'bg-cyan-50 text-cyan-600',
		},
		{
			Icon:  Bell,
			label: 'Notifications',
			value: notifLabel + ( state.admin_email ? ` · ${ state.admin_email }` : '' ),
			color: 'bg-amber-50 text-amber-600',
		},
	];

	return (
		<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
			<canvas
				ref={ canvasRef }
				className="pointer-events-none absolute inset-0 size-full"
			/>

			<div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-7">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_24px_-4px_var(--color-primary)/40]">
						<Rocket className="size-7" />
					</div>
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-foreground" style={ { margin: 0 } }>
							You're ready to launch
						</h2>
						<p className="mt-1.5 text-sm text-muted-foreground" style={ { margin: 0 } }>
							Here's a summary of your setup. Hit <strong className="text-foreground">Finish</strong> to activate your survey.
						</p>
					</div>
				</div>

				<div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
					{ summaryItems.map( ( item, i ) => (
						<div
							key={ i }
							className="flex items-center gap-4 border-b border-border/40 px-6 py-4 last:border-0"
						>
							<div className={ cn( 'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm', item.color ) }>
								<item.Icon className="size-4" />
							</div>
							<span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
								{ item.label }
							</span>
							<span className="flex-1 text-[14px] font-semibold text-foreground">
								{ item.value }
							</span>
						</div>
					) ) }
				</div>

				<Button size="lg" className="h-12 w-full text-base" disabled={ submitting } onClick={ onFinish }>
					{ submitting ? 'Setting up…' : 'Finish & go to dashboard' }
					{ ! submitting && <Rocket className="ml-2 size-5" /> }
				</Button>
			</div>
		</div>
	);
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test( navigator.platform );

export default function SetupWizard() {
	const navigate    = useNavigate();
	const queryClient = useQueryClient();
	const [ state, setStateRaw ] = useState<WizardCompletePayload>( loadState );
	const [ step, setStepRaw ]   = useState<number>( loadStep );
	const [ submitting, setSubmitting ] = useState( false );

	useEffect( () => {
		document.body.classList.add( 'allfb-wizard-fullscreen' );
		return () => document.body.classList.remove( 'allfb-wizard-fullscreen' );
	}, [] );

	const set = useCallback( ( updates: Partial<WizardCompletePayload> ) => {
		setStateRaw( ( prev ) => {
			const next = { ...prev, ...updates };
			localStorage.setItem( STORAGE_KEY, JSON.stringify( next ) );
			return next;
		} );
	}, [] );

	const goto = useCallback( ( n: number ) => {
		const clamped = Math.min( Math.max( n, 0 ), STEPS.length );
		setStepRaw( clamped );
		localStorage.setItem( STORAGE_KEY + '-step', String( clamped ) );
	}, [] );

	const finish = useCallback( async () => {
		setSubmitting( true );
		try {
			await wizardApi.complete( state );
		} catch {
			// Fail silently to allow navigation even if API is slow/fails
		} finally {
			queryClient.setQueryData( WIZARD_STATUS_QUERY_KEY, { status: 'completed' } );
			localStorage.removeItem( STORAGE_KEY );
			localStorage.removeItem( STORAGE_KEY + '-step' );
			navigate( { to: '/dashboard' } );
			setSubmitting( false );
		}
	}, [ state, queryClient, navigate ] );

	useEffect( () => {
		if ( step >= STEPS.length ) {
			navigate( { to: '/dashboard' } );
		}
	}, [ step, navigate ] );

	useEffect( () => {
		const onKey = ( e: KeyboardEvent ) => {
			if ( ( e.metaKey || e.ctrlKey ) && e.key === 'Enter' ) {
				if ( step >= STEPS.length ) return;
				if ( step >= STEPS.length - 1 ) {
					finish();
				} else if ( canAdvance( state, step ) ) {
					goto( step + 1 );
				}
			}
		};
		window.addEventListener( 'keydown', onKey );
		return () => window.removeEventListener( 'keydown', onKey );
	}, [ state, step, goto, finish ] );

	const isDone      = step >= STEPS.length;
	const currentStep = STEPS[ step ] || STEPS[ 0 ];

	return (
		<div className="flex h-screen flex-col bg-background">
			{ ! isDone && (
				<header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border/50 bg-card px-10 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_var(--color-primary)/30]">
							<MessageSquare className="size-5" />
						</div>
						<span className="text-[16px] font-bold tracking-tight text-foreground">
							All<span className="font-normal text-muted-foreground/60">Feedback</span>
						</span>
					</div>
					<button
						type="button"
						onClick={ finish }
						className="group flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
					>
						Skip setup
						<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
					</button>
				</header>
			) }

			<main className="flex min-h-0 flex-1 flex-col overflow-auto">
				<div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-8 py-8" key={ step }>
					{ ! isDone && (
						<div className="mb-14 flex justify-center">
							<div className="relative flex items-center bg-card p-2 rounded-2xl border border-border/40 shadow-sm">
								{ STEPS.map( ( s, i ) => {
									const isActive    = i === step;
									const isDoneStep  = i < step;
									const isClickable = i < step;
									return (
										<div key={ s.id } className="flex items-center">
											<button
												type="button"
												className={ cn(
													'group relative flex items-center gap-3 rounded-xl px-5 py-3 transition-all duration-300',
													isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground',
													isClickable && 'hover:bg-muted/40 hover:text-foreground',
												) }
												style={ { cursor: isClickable ? 'pointer' : 'default' } }
												onClick={ () => isClickable && goto( i ) }
											>
												<div className={ cn(
													'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
													isActive || isDoneStep ? 'bg-white/20' : 'bg-muted text-muted-foreground/60',
												) }>
													{ isDoneStep ? <Check className="size-3" strokeWidth={ 4 } /> : i + 1 }
												</div>
												<span className="text-[14px] font-bold tracking-tight">{ s.label }</span>
											</button>
											{ i < STEPS.length - 1 && (
												<div className="mx-2 flex items-center gap-1 opacity-20">
													<div className="size-1 rounded-full bg-foreground" />
													<div className="size-1 rounded-full bg-foreground" />
													<div className="size-1 rounded-full bg-foreground" />
												</div>
											) }
										</div>
									);
								} ) }
							</div>
						</div>
					) }

					<div className="flex flex-1 flex-col justify-center gap-5">
						{ ! isDone && currentStep!.id !== 'final' && (
							<div className="text-center">
								<h1 className="text-xl font-semibold tracking-tight text-foreground" style={ { margin: 0 } }>
									{ STEP_HEADERS[ currentStep!.id ].title }
								</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									{ STEP_HEADERS[ currentStep!.id ].desc }
								</p>
							</div>
						) }
						{ ! isDone && step === 0 && <StepTemplate state={ state } set={ set } /> }
						{ ! isDone && step === 1 && <StepStyle    state={ state } set={ set } /> }
						{ ! isDone && step === 2 && <StepSettings state={ state } set={ set } /> }
						{ ! isDone && step === 3 && <StepFinal    state={ state } onFinish={ finish } submitting={ submitting } /> }
					</div>
				</div>
			</main>

			{ ! isDone && step < STEPS.length - 1 && (
				<footer className="flex h-[76px] shrink-0 items-center justify-between border-t border-border/50 bg-card px-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
					<span className="flex items-center gap-1.5">
						{ ( isMac ? [ '⌘', '↵' ] : [ 'Ctrl', '↵' ] ).map( ( k ) => (
							<kbd
								key={ k }
								className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold leading-none text-muted-foreground/50 shadow-sm"
							>
								{ k }
							</kbd>
						) ) }
						<span className="ml-1 text-[13px] font-medium text-muted-foreground/60">to continue</span>
					</span>
					<div className="flex gap-3">
						{ step > 0 && (
							<Button variant="secondary" className="h-11 px-6" onClick={ () => goto( step - 1 ) }>
								<ArrowLeft className="mr-2 size-4" />
								Back
							</Button>
						) }
						<Button
							size="lg"
							className="h-11 px-8 shadow-sm"
							disabled={ ! canAdvance( state, step ) }
							onClick={ () => goto( step + 1 ) }
						>
							Continue
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</div>
				</footer>
			) }
		</div>
	);
}
