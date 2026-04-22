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
	Gauge, Box, Bug, Lightbulb, Users,
	Clock, Calendar, Zap, Globe, Lock, Pipette, Loader2,
	Rocket, Palette, Bell, Wand2, Info,
	LayoutDashboard, Edit2,
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
		title: '👋 Welcome to AllFeedback',
		desc:  'Pick a template to get started — every field, label, and setting can be changed in the builder.',
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

function canAdvance( state: WizardCompletePayload, step: number ): boolean {
	if ( step === 2 && state.admin_email ) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( state.admin_email );
	}
	return true;
}

const TEMPLATES = [
	{
		id:    'nps',
		title: 'NPS Survey',
		desc:  'Measure how likely customers are to recommend you to others.',
		Icon:  Gauge,
	},
	{
		id:    'general-feedback',
		title: 'General Feedback',
		desc:  'Collect open-ended thoughts, ratings, and suggestions from your audience.',
		Icon:  MessageSquare,
	},
	{
		id:    'bug-report',
		title: 'Bug Report',
		desc:  'Let users flag technical issues quickly with structured, actionable reports.',
		Icon:  Bug,
	},
	{
		id:    'feature-request',
		title: 'Feature Request',
		desc:  'Capture ideas for new features and improvements directly from your users.',
		Icon:  Lightbulb,
	},
	{
		id:    'product-feedback',
		title: 'Product Feedback',
		desc:  'Uncover what users love and what to build next with targeted product questions.',
		Icon:  Box,
	},
	{
		id:    'customer-research',
		title: 'Customer Research',
		desc:  'Learn more about your audience, their goals, and how they discovered you.',
		Icon:  Users,
	},
] as const;

function StepTemplate( { state, set }: { state: WizardCompletePayload; set: ( u: Partial<WizardCompletePayload> ) => void } ) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{ TEMPLATES.map( ( t ) => {
				const isSelected = state.template === t.id;
				return (
					<button
						key={ t.id }
						type="button"
						onClick={ () => set( { template: t.id } ) }
						className={ cn(
							'group relative flex flex-col gap-5 rounded-2xl border p-6 text-left transition-all duration-300 bg-card',
							isSelected
								? 'border-primary shadow-card'
								: 'border-border/50 hover:border-border/80',
						) }
					>
						<div className={ cn(
							'flex size-12 items-center justify-center rounded-xl transition-all duration-300',
							isSelected
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-muted/50 text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary',
						) }>
							<t.Icon className="size-6" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-[15px] font-semibold tracking-tight text-foreground">
									{ t.title }
								</span>
								<div className={ cn(
									'flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-300',
									isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none',
								) }>
									<Check className="size-3" strokeWidth={ 3 } />
								</div>
							</div>
							<p className={ cn(
								'text-[13px] leading-relaxed line-clamp-2',
								isSelected ? 'text-muted-foreground' : 'text-muted-foreground/60',
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
			className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border border-border/50 bg-white shadow-card"
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
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] items-stretch gap-8">
			<div className="flex flex-col">
				<div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-6 md:p-8 shadow-card">
					<div className="space-y-6">
						<div className="space-y-3">
							<label className="block text-sm font-semibold text-foreground">Brand color</label>
							<ColorPicker value={ state.brand_color } onChange={ ( v ) => set( { brand_color: v } ) } />
						</div>
						<div className="h-px bg-border/50" />
						<div className="space-y-4">
							<label className="block text-sm font-semibold text-foreground">Widget position</label>
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
												: 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
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

			<div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-card">
				<div className="flex shrink-0 items-center justify-between border-b border-border/50 px-6 py-4 bg-muted/10">
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
				<div className="flex items-center justify-center bg-muted/5 p-6 md:p-12">
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
		<div className="flex flex-col gap-4">
			<div className="rounded-2xl border border-border/50 bg-card shadow-card">
				<div className="p-6 md:p-10 space-y-8 md:space-y-10">
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-semibold text-foreground">Where to send new response notifications</label>
							<p className="text-sm leading-relaxed text-muted-foreground">This email will receive an alert whenever a new feedback is submitted.</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="you@company.com"
								value={ state.admin_email }
								onChange={ ( e ) => set( { admin_email: e.target.value } ) }
								className={ cn(
									'h-12 bg-muted/40 border-border/50 focus:bg-white focus:border-primary/40',
									! emailOk && 'border-destructive/40 bg-destructive/5 focus:border-destructive/60'
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
							<label className="text-sm font-semibold text-foreground">Delivery frequency</label>
							<p className="text-sm leading-relaxed text-muted-foreground">Choose how often you want to receive notification digests.</p>
						</div>
						<div className="inline-flex flex-col sm:flex-row sm:items-center rounded-xl border border-border/50 bg-muted/30 p-1">
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
			</div>

			<div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-subtle/50 px-5 py-4">
				<Info className="mt-0.5 size-4 shrink-0 text-info" />
				<p className="text-sm leading-relaxed text-foreground/70">
					All feedback is stored on your server only — no data is shared with third parties.
					Consent banners and IP anonymization can be configured in{' '}
					<strong className="font-semibold text-foreground">Settings → Advanced</strong>.
				</p>
			</div>
		</div>
	);
}

const LAUNCH_HIGHLIGHTS = [
	{
		Icon:  Check,
		title: 'Survey ready',
		desc:  'A starter form is waiting in the builder — customize questions, copy, and logic.',
		color: 'bg-success-subtle text-success',
	},
	{
		Icon:  Zap,
		title: 'Go live instantly',
		desc:  'Publish with one click whenever you\'re satisfied. Your widget appears on your site immediately.',
		color: 'bg-accent text-accent-foreground',
	},
	{
		Icon:  Bell,
		title: 'Stay notified',
		desc:  'Get alerted each time a new response arrives, so you never miss a piece of feedback.',
		color: 'bg-warning-subtle text-warning-foreground',
	},
] as const;

function StepFinal( { onFinish, submitting }: { onFinish: ( target: 'editor' | 'dashboard' ) => void; submitting: boolean } ) {
	const canvasRef = useRef<HTMLCanvasElement>( null );

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

	return (
		<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
			<canvas
				ref={ canvasRef }
				className="pointer-events-none absolute inset-0 size-full"
			/>

			<div className="relative z-10 flex w-full flex-col items-center gap-8">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
						<Rocket className="size-7" />
					</div>
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-foreground" style={ { margin: 0 } }>
							You're ready to launch
						</h2>
						<p className="mt-1.5 text-sm text-muted-foreground" style={ { margin: 0 } }>
							Your widget is configured. Open the builder to fine-tune your survey, then publish when ready.
						</p>
					</div>
				</div>

				<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
					{ LAUNCH_HIGHLIGHTS.map( ( item ) => (
						<div key={ item.title } className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-5 shadow-card">
							<div className={ cn( 'flex size-9 items-center justify-center rounded-xl', item.color ) }>
								<item.Icon className="size-4" />
							</div>
							<div>
								<p className="text-sm font-semibold text-foreground">{ item.title }</p>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ item.desc }</p>
							</div>
						</div>
					) ) }
				</div>

				<div className="flex w-full items-center justify-end gap-3">
					<Button
						variant="outline"
						size="lg"
						className="h-11 font-semibold"
						onClick={ () => onFinish( 'dashboard' ) }
						disabled={ submitting }
					>
						<LayoutDashboard className="size-5" />
						Go to Dashboard
					</Button>
					<Button
						size="lg"
						className="h-11 font-semibold"
						onClick={ () => onFinish( 'editor' ) }
						disabled={ submitting }
					>
						{ submitting ? <Loader2 className="size-5 animate-spin" /> : <Edit2 className="size-5" /> }
						Go to Editor
						<ArrowRight className="size-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}


export default function SetupWizard() {
	const navigate    = useNavigate();
	const queryClient = useQueryClient();
	const [ state, setStateRaw ] = useState<WizardCompletePayload>( getInitialState );
	const [ step, setStepRaw ]   = useState<number>( 0 );
	const [ submitting, setSubmitting ] = useState( false );

	useEffect( () => {
		document.body.classList.add( 'allfb-wizard-fullscreen' );
		return () => document.body.classList.remove( 'allfb-wizard-fullscreen' );
	}, [] );

	const set = useCallback( ( updates: Partial<WizardCompletePayload> ) => {
		setStateRaw( ( prev ) => ( { ...prev, ...updates } ) );
	}, [] );

	const goto = useCallback( ( n: number ) => {
		setStepRaw( Math.min( Math.max( n, 0 ), STEPS.length ) );
	}, [] );

	const finish = useCallback( async ( target: 'editor' | 'dashboard' = 'dashboard' ) => {
		setSubmitting( true );
		try {
			const res = await wizardApi.complete( state );
			
			queryClient.setQueryData( WIZARD_STATUS_QUERY_KEY, { status: 'completed' } );

			if ( target === 'editor' && res.id ) {
				navigate( { to: '/builder', search: { id: res.id, new: true } } );
			} else {
				navigate( { to: '/dashboard' } );
			}
		} catch {
			navigate( { to: '/dashboard' } );
		} finally {
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
				<header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border/50 bg-card px-4 md:px-10">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
							<MessageSquare className="size-5" />
						</div>
						<span className="text-[16px] font-bold tracking-tight text-foreground">
							All<span className="font-normal text-muted-foreground/60">Feedback</span>
						</span>
					</div>
					{ step < STEPS.length - 1 && (
						<button
							type="button"
							onClick={ () => finish( 'dashboard' ) }
							className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:underline hover:underline-offset-4"
						>
							Skip setup
							<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
						</button>
					) }
				</header>
			) }

			<main className="flex min-h-0 flex-1 flex-col overflow-auto">
				<div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-4 md:px-8 py-6 md:py-8" key={ step }>
					{ ! isDone && (
						<div className="mb-8 md:mb-14 flex justify-center">
							<div className="relative flex items-center bg-card p-2 rounded-2xl border border-border/50 shadow-sm">
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
													isActive ? 'bg-primary text-primary-foreground shadow-sm' : (isDoneStep ? 'text-foreground/90' : 'text-muted-foreground/70'),
													isClickable && !isActive && 'hover:bg-muted/40 hover:text-foreground',
												) }
												style={ { cursor: isClickable ? 'pointer' : 'default' } }
												onClick={ () => isClickable && goto( i ) }
											>
												<div className={ cn(
													'flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
													isActive ? 'bg-white/20 text-white' : (isDoneStep ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/50'),
												) }>
													{ isDoneStep ? <Check className="size-3" strokeWidth={ 3 } /> : i + 1 }
												</div>
												<span className={ cn(
													'text-[14px] tracking-tight',
													isActive || isDoneStep ? 'font-semibold' : 'font-medium'
												) }>
													{ s.label }
												</span>
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
						{ ! isDone && step === 3 && <StepFinal onFinish={ ( t ) => finish( t ) } submitting={ submitting } /> }
					</div>
				</div>
			</main>

			{ ! isDone && step < STEPS.length - 1 && (
				<footer className="flex h-[76px] shrink-0 items-center justify-end border-t border-border/50 bg-card px-4 md:px-10">

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
