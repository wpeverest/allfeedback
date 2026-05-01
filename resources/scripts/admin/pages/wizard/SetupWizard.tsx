import {
	WIZARD_STATUS_QUERY_KEY,
	wizardApi,
	type WizardCompletePayload,
} from '@/admin/api/wizard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, ArrowRight, Bell, Check, MessageSquare, Palette, Rocket, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { StepFinal } from './StepFinal';
import { StepSettings } from './StepSettings';
import { StepStyle } from './StepStyle';
import { StepTemplate } from './StepTemplate';

const STEPS = [
	{ id: 'template' as const, label: __('Welcome',  'allfeedback'), Icon: Wand2   },
	{ id: 'style'    as const, label: __('Style',    'allfeedback'), Icon: Palette },
	{ id: 'settings' as const, label: __('Settings', 'allfeedback'), Icon: Bell    },
	{ id: 'final'    as const, label: __('Launch',   'allfeedback'), Icon: Rocket  },
];

type StepId = (typeof STEPS)[number]['id'];

const STEP_HEADERS: Record<StepId, { title: string; desc: string }> = {
	template: {
		title: __('👋 Welcome to AllFeedback', 'allfeedback'),
		desc:  __('Pick a template to get started — every field, label, and setting can be changed in the builder.', 'allfeedback'),
	},
	style: {
		title: __('Make it yours', 'allfeedback'),
		desc:  __('Pick a brand color and choose where the widget appears on your site.', 'allfeedback'),
	},
	settings: {
		title: __('Stay in the loop', 'allfeedback'),
		desc:  __('Set up where your weekly digest email gets delivered.', 'allfeedback'),
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

export default function SetupWizard() {
	const navigate     = useNavigate();
	const queryClient  = useQueryClient();
	const [state, setStateRaw] = useState<WizardCompletePayload>(getInitialState);
	const [step, setStepRaw]   = useState<number>(0);
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
				queryClient.setQueryData(WIZARD_STATUS_QUERY_KEY, { status: 'completed' });
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
		if (step >= STEPS.length) navigate({ to: '/forms' });
	}, [step, navigate]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				if (step >= STEPS.length) return;
				if (step >= STEPS.length - 1) { finish(); }
				else if (canAdvance(state, step)) { goto(step + 1); }
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [state, step, goto, finish]);

	const isDone       = step >= STEPS.length;
	const currentStep  = STEPS[step] || STEPS[0];
	const isFinalStep  = step === STEPS.length - 1;

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
						isFinalStep ? 'pb-4' : 'pb-6 md:pb-8',
					)}
					key={step}
				>
					{!isDone && (
						<div className={cn('flex justify-center', isFinalStep ? 'mb-4' : 'mb-8 md:mb-14')}>
							<div className="bg-card border-border/50 relative flex items-center rounded-2xl border p-2 shadow-sm">
								{STEPS.map((s, i) => {
									const isActive    = i === step;
									const isDoneStep  = i < step;
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
													isClickable && !isActive && 'hover:bg-muted/40 hover:text-foreground',
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
													{isDoneStep ? <Check className="size-3" strokeWidth={3} /> : i + 1}
												</div>
												<span
													style={{
														fontSize:      14,
														fontWeight:    isActive ? 700 : isDoneStep ? 500 : 400,
														color:         isActive ? 'inherit' : isDoneStep ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
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
						{!isDone && step === 1 && <StepStyle    state={state} set={set} />}
						{!isDone && step === 2 && <StepSettings state={state} set={set} />}
						{!isDone && step === 3 && (
							<StepFinal state={state} onFinish={(t) => finish(t)} submitting={submitting} />
						)}
					</div>
				</div>
			</main>

			{!isDone && !isFinalStep && (
				<footer className="border-border/50 bg-card flex h-[76px] shrink-0 items-center justify-end border-t px-4 md:px-10">
					<div className="flex gap-3">
						{step > 0 && (
							<Button variant="secondary" className="h-11 px-6" onClick={() => goto(step - 1)}>
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
