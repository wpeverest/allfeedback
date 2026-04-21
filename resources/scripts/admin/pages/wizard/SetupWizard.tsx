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
		title: "Let's get you set up",
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

const INITIAL_STATE: WizardCompletePayload = {
	template:        'nps',
	brand_color:     '#6366F1',
	position:        'bottom-right',
	admin_email:     __ALLFB_ADMIN__.adminEmail ?? '',
	notif_frequency: 'instant',
	consent:         true,
	anonymize_ip:    true,
	retention:       '12m',
};

const STORAGE_KEY = 'allfb-wizard-v1';

function loadState(): WizardCompletePayload {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		return raw ? { ...INITIAL_STATE, ...JSON.parse( raw ) } : { ...INITIAL_STATE };
	} catch {
		return { ...INITIAL_STATE };
	}
}

function loadStep(): number {
	const n = parseInt( localStorage.getItem( STORAGE_KEY + '-step' ) ?? '0', 10 );
	return isNaN( n ) ? 0 : Math.min( Math.max( n, 0 ), STEPS.length );
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
		popular: true,
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
		<div className="grid grid-cols-3 gap-3">
			{ TEMPLATES.map( ( t ) => {
				const isSelected = state.template === t.id;
				return (
					<button
						key={ t.id }
						type="button"
						onClick={ () => set( { template: t.id } ) }
						className={ cn(
							'group relative flex flex-col gap-3.5 rounded-2xl border p-5 text-left transition-all duration-150',
							isSelected
								? 'border-primary bg-white shadow-[0_0_0_3px_var(--color-primary)/10]'
								: 'border-border/60 bg-white hover:border-border hover:shadow-sm',
						) }
					>
						{ isSelected && (
							<div className="absolute right-3.5 top-3.5 flex size-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
								<Check className="size-3" strokeWidth={ 2.5 } />
							</div>
						) }
						<div className={ cn(
							'flex size-10 items-center justify-center rounded-xl transition-colors duration-150',
							isSelected
								? 'bg-primary text-white shadow-sm'
								: 'bg-muted/70 text-foreground/40 group-hover:bg-muted group-hover:text-foreground/60',
						) }>
							<t.Icon className="size-[18px]" />
						</div>
						<div className="space-y-1.5">
							<div className="flex flex-wrap items-center gap-2">
								<span className={ cn(
									'text-[13.5px] font-semibold leading-snug tracking-tight',
									isSelected ? 'text-foreground' : 'text-foreground/80',
								) }>
									{ t.title }
								</span>
								{ 'popular' in t && t.popular && (
									<span className="rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary">
										Popular
									</span>
								) }
							</div>
							<p className={ cn(
								'text-xs leading-relaxed',
								isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70',
							) }>
								{ t.desc }
							</p>
						</div>
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
				{ position === 'side-tab' && (
					<div
						className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg px-1.5 py-3 text-white"
						style={ { backgroundColor: color } }
					>
						<span
							className="select-none text-[8px] font-semibold tracking-widest"
							style={ { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }
						>
							Feedback
						</span>
					</div>
				) }
			</div>
		</div>
	);
}

function StepStyle( { state, set }: { state: WizardCompletePayload; set: ( u: Partial<WizardCompletePayload> ) => void } ) {
	return (
		<div className="grid grid-cols-[1fr_1.3fr] gap-6">
			<div className="overflow-y-auto rounded-2xl border border-border/60 bg-white">
				<div className="space-y-5 p-6">
					<div className="space-y-3">
						<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">Brand color</p>
						<ColorPicker value={ state.brand_color } onChange={ ( v ) => set( { brand_color: v } ) } />
					</div>
					<div className="border-t border-border/50" />
					<div className="space-y-3">
						<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">Widget position</p>
						<div className="inline-flex items-center rounded-lg border border-border/60 p-0.5">
							{ ALL_POSITIONS.map( ( pos ) => (
								<button
									key={ pos.value }
									type="button"
									onClick={ () => set( { position: pos.value } ) }
									className={ cn(
										'rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
										state.position === pos.value
											? 'bg-primary/10 text-primary'
											: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
									) }
								>
									{ pos.label }
								</button>
							) ) }
						</div>
					</div>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
				<div className="flex shrink-0 items-center gap-3 border-b border-border/50 px-5 py-3.5">
					<span className="size-2 rounded-full bg-green-400 shadow-[0_0_0_3px_oklch(0.96_0.04_145)]" />
					<span className="text-sm font-medium text-foreground/70">Live preview</span>
				</div>
				<div className="flex items-start justify-center bg-gradient-to-b from-indigo-50/30 to-muted/60 p-6">
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
		<div className="rounded-2xl border border-border/60 bg-white">
			<div className="flex items-start gap-6 px-6 py-5">
				<div className="w-48 shrink-0 pt-0.5">
					<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">Admin email</p>
					<p className="mt-1 text-sm text-muted-foreground">Where to send new response notifications.</p>
				</div>
				<div className="flex-1 space-y-2">
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
						<Input
							type="email"
							placeholder="you@company.com"
							value={ state.admin_email }
							onChange={ ( e ) => set( { admin_email: e.target.value } ) }
							className={ cn( 'pl-9', ! emailOk && 'border-destructive/50 focus:border-destructive' ) }
						/>
					</div>
					{ ! emailOk && (
						<p className="flex items-center gap-1.5 text-xs text-destructive">
							<AlertCircle className="size-3.5" />
							Enter a valid email address.
						</p>
					) }
				</div>
			</div>

			<div className="border-t border-border/50" />

			<div className="flex items-start gap-6 px-6 py-5">
				<div className="w-48 shrink-0 pt-0.5">
					<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">Delivery frequency</p>
				</div>
				<div className="flex-1 space-y-4">
					<div className="inline-flex items-center rounded-lg border border-border/60 p-0.5">
						{ NOTIF_OPTIONS.map( ( opt ) => (
							<button
								key={ opt.id }
								type="button"
								onClick={ () => set( { notif_frequency: opt.id } ) }
								className={ cn(
									'flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
									state.notif_frequency === opt.id
										? 'bg-primary/10 text-primary'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
								) }
							>
								<opt.Icon className="size-3.5" />
								{ opt.label }
							</button>
						) ) }
					</div>
					<div className="flex items-start gap-3 rounded-xl border border-blue-100/80 bg-blue-50/60 px-4 py-3.5">
						<Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
						<p className="text-xs leading-relaxed text-blue-700/80">
							All feedback is stored on your server only — no data is shared with third parties.
							Consent banners and IP anonymization can be configured in{' '}
							<strong className="font-medium text-blue-800/70">Settings → Advanced</strong>.
						</p>
					</div>
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
			color: 'bg-violet-50 text-violet-600',
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
			color: 'bg-rose-50 text-rose-500',
		},
		{
			Icon:  MapPin,
			label: 'Position',
			value: posLabel,
			color: 'bg-sky-50 text-sky-600',
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

				<div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
					{ summaryItems.map( ( item, i ) => (
						<div
							key={ i }
							className="flex items-center gap-4 border-b border-border/40 px-5 py-3.5 last:border-0"
						>
							<div className={ cn( 'flex size-8 shrink-0 items-center justify-center rounded-xl', item.color ) }>
								<item.Icon className="size-3.5" />
							</div>
							<span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
								{ item.label }
							</span>
							<span className="flex-1 text-sm font-medium text-foreground">
								{ item.value }
							</span>
						</div>
					) ) }
				</div>

				<Button size="lg" className="w-full" disabled={ submitting } onClick={ onFinish }>
					{ submitting ? 'Setting up…' : 'Finish & go to dashboard' }
					{ ! submitting && <Rocket className="size-4" /> }
				</Button>
			</div>
		</div>
	);
}

function StepDone( { state, onNavigate }: { state: WizardCompletePayload; onNavigate: () => void } ) {
	const tpl = TEMPLATES.find( ( t ) => t.id === state.template ) ?? TEMPLATES[ 0 ];
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
			<div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Check className="size-10" strokeWidth={ 2.5 } />
			</div>
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight text-foreground" style={ { margin: 0 } }>
					You're all set
				</h1>
				<p className="text-base text-muted-foreground" style={ { margin: 0 } }>
					Your <strong className="text-foreground">{ tpl.title }</strong> survey is ready to go.
					Head to the dashboard to publish it and start collecting responses.
				</p>
			</div>
			<Button size="lg" onClick={ onNavigate }>
				Go to dashboard
				<ArrowRight />
			</Button>
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
			queryClient.setQueryData( WIZARD_STATUS_QUERY_KEY, { completed: true } );
			localStorage.removeItem( STORAGE_KEY );
			localStorage.removeItem( STORAGE_KEY + '-step' );
			goto( STEPS.length );
		} finally {
			setSubmitting( false );
		}
	}, [ state, queryClient, goto ] );

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
	const currentStep = STEPS[ step ];

	return (
		<div className="flex h-screen flex-col bg-background">
			{ ! isDone && (
				<header className="flex h-[64px] shrink-0 items-center justify-between border-b border-border/50 bg-white px-8">
					<div className="flex items-center gap-2.5">
						<div className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]">
							<MessageSquare className="size-[15px]" />
						</div>
						<span className="text-[14.5px] tracking-[-0.01em] text-foreground" style={ { lineHeight: 1 } }>
							<strong>All</strong><span className="font-normal opacity-60">Feedback</span>
						</span>
					</div>
					<button
						type="button"
						onClick={ finish }
						className="text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						Skip setup
					</button>
				</header>
			) }

			<main className="flex min-h-0 flex-1 flex-col overflow-auto">
				<div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-8 py-8" key={ step }>
					{ ! isDone && (
						<div className="mb-8 flex justify-center">
							{ STEPS.map( ( s, i ) => {
								const isActive    = i === step;
								const isDoneStep  = i < step;
								const isClickable = i < step;
								return (
									<div key={ s.id } className="flex items-center">
										<button
											type="button"
											className={ cn(
												'group flex items-center gap-2.5 text-base font-medium transition-colors',
												isActive ? 'text-primary' : 'text-muted-foreground',
												isClickable && 'hover:text-foreground',
											) }
											style={ { cursor: isClickable ? 'pointer' : 'default' } }
											onClick={ () => isClickable && goto( i ) }
										>
											<span className={ cn(
												'flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
												isActive || isDoneStep
													? 'border-primary bg-primary'
													: 'border-border bg-white group-hover:border-border/80 group-hover:bg-muted/40',
											) }>
												{ isDoneStep
													? <Check className="size-[14px] text-white" strokeWidth={ 2.5 } />
													: <s.Icon className={ cn(
														'size-4 transition-colors',
														isActive ? 'text-white' : 'text-muted-foreground/60',
													) } />
												}
											</span>
											{ s.label }
										</button>
										{ i < STEPS.length - 1 && (
											<div className="mx-4 h-px w-12 shrink-0 bg-border/70" />
										) }
									</div>
								);
							} ) }
						</div>
					) }

					<div className="flex flex-1 flex-col justify-center gap-5">
						{ isDone && (
							<StepDone state={ state } onNavigate={ () => navigate( { to: '/dashboard' } ) } />
						) }
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
				<footer className="flex h-[68px] shrink-0 items-center justify-between border-t border-border/50 bg-white px-8">
					<span className="flex items-center gap-1">
						{ ( isMac ? [ '⌘', '↵' ] : [ 'Ctrl', '↵' ] ).map( ( k ) => (
							<kbd
								key={ k }
								className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-2xs font-medium leading-none text-muted-foreground/60"
							>
								{ k }
							</kbd>
						) ) }
						<span className="ml-1 text-sm text-muted-foreground">to continue</span>
					</span>
					<div className="flex gap-2">
						{ step > 0 && step < STEPS.length - 1 && (
							<Button variant="outline" onClick={ () => goto( step - 1 ) }>
								<ArrowLeft />
								Back
							</Button>
						) }
						{ step < STEPS.length - 1 && (
							<Button
								disabled={ ! canAdvance( state, step ) }
								onClick={ () => goto( step + 1 ) }
							>
								Continue
								<ArrowRight />
							</Button>
						) }
					</div>
				</footer>
			) }
		</div>
	);
}
