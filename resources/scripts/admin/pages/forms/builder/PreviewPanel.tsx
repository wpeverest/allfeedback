import { surveysApi } from '@/admin/api/surveys';
import type { SubmitFormData, SurveyStatus } from '@/admin/api/surveys';
import { FieldPreview } from '@/shared/FieldPreview';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Eye, Globe, Lock, Mail, MessageCircle, MessageSquare, Minus, Monitor, MoreHorizontal, Plus, RotateCw, Smartphone, Star, Tablet, X } from 'lucide-react';

const TypingBubbleIcon = ( props: React.SVGProps<SVGSVGElement> ) => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" { ...props }>
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		<circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
		<circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
		<circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
	</svg>
);

const CommentBubbleIcon = ( props: React.SVGProps<SVGSVGElement> ) => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" { ...props }>
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		<line x1="9" y1="9" x2="15" y2="9" />
		<line x1="9" y1="13" x2="13" y2="13" />
	</svg>
);
import { useEffect, useState } from 'react';
import { Tooltip } from '@/admin/components/Tooltip';

import { toast } from 'sonner';
import { settingsQuery } from '@/admin/queries/settings';
import type { FormField, FormSection, FormSettings, PreviewDevice, WidgetPosition } from './types';

type WidgetPosition = 'bottom-right' | 'bottom-left' | 'side-tab';

interface PreviewPanelProps {
	sections:            FormSection[];
	settings:            FormSettings;
	device:              PreviewDevice;
	onDeviceChange:      (device: PreviewDevice) => void;
	surveyId?:           number;
	surveyStatus?:       SurveyStatus;
	activeSectionIndex?: number;
}

const DEVICES: { value: PreviewDevice; Icon: typeof Monitor; label: string }[] = [
	{ value: 'desktop', Icon: Monitor,    label: 'Desktop' },
	{ value: 'tablet',  Icon: Tablet,     label: 'Tablet'  },
	{ value: 'mobile',  Icon: Smartphone, label: 'Mobile'  },
];

const DEVICE_MAX_W: Record<PreviewDevice, string> = {
	desktop: '400px',
	tablet:  '400px',
	mobile:  '100%',
};

const DEVICE_PAGE_W: Record<PreviewDevice, string | null> = {
	desktop: null,
	tablet:  '768px',
	mobile:  '390px',
};

type PreviewView = 'page' | 'widget';

const TRIGGER_ICON_MAP: Record<string, React.ElementType> = {
	message: MessageSquare,
	chat:    MessageCircle,
	typing:  TypingBubbleIcon,
	comment: CommentBubbleIcon,
	mail:    Mail,
};

const ALLFB_VARS_BASE = {
	'--allfb-white':   '#ffffff',
	'--allfb-text':    '#1a1a2e',
	'--allfb-muted':   '#6b7280',
	'--allfb-border':  '#e5e7eb',
	'--allfb-bg':      '#ffffff',
	'--allfb-panel-h': '480px',
	'--allfb-font':    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as React.CSSProperties;

const buildAllfbVars = (color: string): React.CSSProperties => ({
	...ALLFB_VARS_BASE,
	'--allfb-color':      color,
	'--allfb-color-dark': `color-mix(in srgb, ${color} 85%, #000)`,
} as React.CSSProperties);

interface WidgetBodyProps {
	steps:         FormSection[];
	stepIndex:     number;
	totalSteps:    number;
	hasSteps:      boolean;
	isLastStep:    boolean;
	currentFields: FormField[];
	isSubmitted:   boolean;
	fieldValues:   Record<string, string | string[]>;
	fieldErrors:   Record<string, string>;
	submitError:   string;
	isMinimized:   boolean;
	isClosed:      boolean;
	showControls:   boolean;
	showMinimize:   boolean;
	className?:     string;
	settings:       FormSettings;
	widgetPosition: WidgetPosition;
	widgetColor:    string;
	onMinimize:    () => void;
	onClose:       () => void;
	onChange:      (fieldId: string, value: string | string[]) => void;
	isSubmitting:  boolean;
	onNext:        () => void;
	onBack:        () => void;
	onSubmit:      () => void;
	onResubmit:    () => void;
}

const WidgetBody = ({
	steps, stepIndex, totalSteps, hasSteps, isLastStep, currentFields,
	isSubmitted, fieldValues, fieldErrors, submitError, isMinimized, isClosed, showControls, showMinimize, settings,
	isSubmitting, onMinimize, onClose, onChange, onNext, onBack, onSubmit, widgetPosition, widgetColor, className,
}: WidgetBodyProps) => {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key !== 'Enter') return;
		if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
		if (isSubmitted || isMinimized || isClosed || !hasSteps || isSubmitting) return;
		e.preventDefault();
		if (isLastStep) {
			onSubmit();
		} else {
			onNext();
		}
	};

	return (
		<div
			className={ cn(
				'allfb-preview-panel flex flex-col overflow-hidden rounded-2xl shadow-lg transition-all duration-200',
				className,
				isClosed || isMinimized ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100',
			) }
			style={ {
				...buildAllfbVars(widgetColor),
				transformOrigin: widgetPosition === 'bottom-left' ? 'bottom left' : widgetPosition === 'side-tab' ? 'right center' : 'bottom right',
			} }
			onKeyDown={ handleKeyDown }
		>
			<div className="allfb-panel__header">
				{ settings.widgetLabel && (
					<span className="allfb-panel__title">{ settings.widgetLabel }</span>
				) }
				{ showControls && (
					<>
						{ showMinimize && (
							<button
								type="button"
								onClick={ onMinimize }
								className="allfb-panel__close"
								aria-label={ __( 'Minimise', 'all-feedback' ) }
							>
								<Minus />
							</button>
						) }
						<button
							type="button"
							onClick={ onClose }
							className="allfb-panel__close"
							aria-label={ __( 'Close', 'all-feedback' ) }
						>
							<X />
						</button>
					</>
				) }
			</div>

			<div className="allfb-panel__body">
				{ isSubmitted ? (
					<div className="allfb-thankyou">
						<div className="allfb-thankyou__check">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</div>
						<p className="allfb-thankyou__title">
							{ settings.thankYouEnabled && settings.thankYouTitle
								? settings.thankYouTitle
								: __( 'Thank you!', 'all-feedback' ) }
						</p>
						<p className="allfb-thankyou__desc">
							{ settings.thankYouEnabled && settings.thankYouDescription
								? settings.thankYouDescription
								: __( 'Your response has been recorded.', 'all-feedback' ) }
						</p>
					</div>
				) : ! hasSteps ? (
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<Eye className="mb-1.5 size-4 text-muted-foreground/25" />
						<p className="text-[8.5px] text-muted-foreground/80">
							{ __( 'Add fields to preview', 'all-feedback' ) }
						</p>
					</div>
				) : (
					<div className="allfb-form-wrapper">
						{ totalSteps > 1 && settings.progressIndicator !== 'none' && (
							<div className={ `allfb-steps${ settings.progressIndicator === 'bar' ? ' allfb-steps--bar' : '' }` }>
								{ settings.progressIndicator === 'dots' && (
									<div className="allfb-steps__dots">
										{ steps.map( ( _, i ) => (
											<span
												key={ i }
												className={ `allfb-steps__dot${ i === stepIndex ? ' is-active' : i < stepIndex ? ' is-done' : '' }` }
											/>
										) ) }
									</div>
								) }
								{ settings.progressIndicator === 'numbers' && (
									<span className="allfb-steps__count allfb-steps__count">{ stepIndex + 1 } / { totalSteps }</span>
								) }
								{ settings.progressIndicator === 'bar' && (
									<div className="allfb-steps__bar-track">
										<div
											className="allfb-steps__bar-fill"
											style={ { width: `${ ( ( stepIndex + 1 ) / totalSteps ) * 100 }%` } }
										/>
									</div>
								) }
							</div>
						) }

						<div className="allfb-form__fields">
							{ ( () => {
								const firstErrorId = currentFields.find( ( f ) => fieldErrors[ f.id ] )?.id;
								return currentFields.map( ( field ) => (
									<FieldPreview
										key={ field.id }
										field={ field }
										value={ fieldValues[ field.id ] ?? '' }
										error={ fieldErrors[ field.id ] ?? '' }
										focusFirst={ field.id === firstErrorId }
										onChange={ ( val ) => onChange( field.id, val ) }
									/>
								) );
							} )() }
						</div>

						<div className="allfb-form__footer">
							{ submitError && <p className="allfb-form__submit-error">{ submitError }</p> }
							{ stepIndex > 0 && (
								<button
									type="button"
									className="allfb-btn allfb-btn--secondary"
									onClick={ onBack }
								>
									{ settings.backLabel || __( 'Back', 'all-feedback' ) }
								</button>
							) }
							{ isLastStep ? (
								<button
									type="button"
									className="allfb-btn allfb-btn--primary"
									disabled={ isSubmitting }
									onClick={ onSubmit }
								>
									{ isSubmitting
										? __( 'Submitting\u2026', 'all-feedback' )
										: ( settings.submitLabel || __( 'Submit', 'all-feedback' ) ) }
								</button>
							) : (
								<button
									type="button"
									className="allfb-btn allfb-btn--primary"
									onClick={ onNext }
								>
									{ settings.nextLabel || __( 'Next', 'all-feedback' ) }
								</button>
							) }
						</div>
					</div>
				) }
			</div>
		</div>
	);
};

const allFields = (sections: FormSection[]): FormField[] =>
	sections.flatMap((s) => s.fields);

const activeSections = (sections: FormSection[]) =>
	sections.filter((s) => s.fields.length > 0);

const getSiteHostname = (): string => {
	try {
		return new URL(__ALLFB_ADMIN__.adminUrl).hostname;
	} catch {
		return window.location.hostname;
	}
};

const PreviewPanel = ({ sections, settings, device, onDeviceChange, surveyId, surveyStatus, activeSectionIndex }: PreviewPanelProps) => {
	const steps        = activeSections(sections);
	const totalSteps   = steps.length;
	const hasSteps     = totalSteps > 0;
	const maxW         = DEVICE_MAX_W[device];
	const pageMaxW     = DEVICE_PAGE_W[device];
	const isMobile     = device === 'mobile';
	const siteHostname = getSiteHostname();
	const queryClient  = useQueryClient();

	const cachedWidget    = (queryClient.getQueryData(settingsQuery().queryKey) as any)?.general?.widget;
	const globalColor     = cachedWidget?.color    ?? __ALLFB_ADMIN__.widgetColor    ?? '#6366f1';
	const globalPosition  = (cachedWidget?.position ?? (__ALLFB_ADMIN__.widgetPosition as WidgetPosition) ?? 'bottom-right') as Exclude<WidgetPosition, ''>;
	const widgetColor     = settings.widgetColor    || globalColor;
	const widgetPosition  = (settings.widgetPosition as Exclude<WidgetPosition, ''>) || globalPosition;

	const [viewMode, setViewMode] = useState<PreviewView>('page');
	const [isMinimized,    setIsMinimized]    = useState(false);
	const [isClosed,     setIsClosed]     = useState(false);
	const [fieldValues,  setFieldValues]  = useState<Record<string, string | string[]>>({});
	const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});
	const [submitError,  setSubmitError]  = useState('');
	const [currentStep,  setCurrentStep]  = useState(0);
	const [isSubmitted,  setIsSubmitted]  = useState(false);

	const stepIndex    = Math.min(currentStep, Math.max(0, totalSteps - 1));
	const isLastStep   = stepIndex === totalSteps - 1;
	const currentFields = steps[stepIndex]?.fields ?? [];

	const submitMutation = useMutation({
		mutationFn: (data: SubmitFormData) => surveysApi.submit(surveyId!, data),
		onSuccess: () => {
			setIsSubmitted(true);
			setSubmitError('');
			void queryClient.invalidateQueries({ queryKey: ['responses', 'unread-count'] });
			toast.success(
				surveyStatus === 'draft'
					? __('Form preview submitted successfully.', 'all-feedback')
					: __('Response submitted successfully.', 'all-feedback')
			);
		},
		onError: () => {
			setSubmitError(__('Submission failed. Please try again.', 'all-feedback'));
		},
	});

	useEffect(() => {
		setFieldValues({});
		setFieldErrors({});
		setSubmitError('');
		setCurrentStep(0);
		setIsSubmitted(false);
	}, [allFields(sections).map((f) => f.id).join(',')]);

	// Sync preview page when the user interacts with a section in the canvas
	useEffect(() => {
		if (activeSectionIndex == null || activeSectionIndex < 0) return;
		const targetId   = sections[activeSectionIndex]?.id;
		if (!targetId) return;
		const targetStep = activeSections(sections).findIndex((s) => s.id === targetId);
		if (targetStep >= 0 && targetStep !== currentStep) {
			setFieldErrors({});
			setCurrentStep(targetStep);
		}
	}, [activeSectionIndex, sections]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleChange = (fieldId: string, value: string | string[]) => {
		setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
		if (fieldErrors[fieldId]) {
			setFieldErrors((prev) => ({ ...prev, [fieldId]: '' }));
		}
	};

	const validateStep = (fields: typeof currentFields) => {
		const errors: Record<string, string> = {};
		fields.forEach((field) => {
			if (!field.required) return;
			const val = fieldValues[field.id];
			const empty = !val || (Array.isArray(val) ? val.length === 0 : !val.trim());
			if (empty) errors[field.id] = __('This field is required.', 'all-feedback');
		});
		return errors;
	};

	const handleNext = () => {
		const errors = validateStep(currentFields);
		if (Object.keys(errors).length) { setFieldErrors(errors); return; }
		setFieldErrors({});
		setCurrentStep((s) => s + 1);
	};

	const handleSubmit = () => {
		const errors = validateStep(currentFields);
		if (Object.keys(errors).length) { setFieldErrors(errors); return; }
		setFieldErrors({});

		if (surveyId) {
			const allFormFields = allFields(sections);
			const scoreField    = allFormFields.find((f) => ['nps', 'star_rating', 'scale'].includes(f.type));
			const scoreRaw      = scoreField ? fieldValues[scoreField.id] : '';
			const score         = typeof scoreRaw === 'string' && scoreRaw !== '' ? Number(scoreRaw) : undefined;
			const responseData: Record<string, unknown> = Object.fromEntries(
				allFormFields.map((f) => [f.id, fieldValues[f.id] ?? (f.type === 'checkboxes' ? [] : '')])
			);
			submitMutation.mutate({
				nonce:         __ALLFB_ADMIN__.submitNonce,
				response_data: responseData,
				...(score !== undefined && !isNaN(score) && { score }),
				page_url:    window.location.href,
				device_type: device,
			});
		} else {
			setIsSubmitted(true);
			toast.success(__('Form preview submitted successfully.', 'all-feedback'));
		}
	};

	const handleReset = () => {
		submitMutation.reset();
		setIsClosed(false);
		setIsMinimized(false);
		setIsSubmitted(false);
		setFieldValues({});
		setFieldErrors({});
		setSubmitError('');
		setCurrentStep(0);
	};

	const sharedWidgetProps = {
		steps, stepIndex, totalSteps, hasSteps, isLastStep, currentFields,
		isSubmitted, fieldValues, fieldErrors, submitError, isMinimized, isClosed, settings,
		widgetPosition,
		widgetColor,
		showMinimize: true,
		isSubmitting: submitMutation.isPending,
		onMinimize: () => setIsMinimized(true),
		onClose:    () => setIsClosed(true),
		onChange:   handleChange,
		onNext:     handleNext,
		onBack:     () => { setFieldErrors({}); setCurrentStep((s) => s - 1); },
		onSubmit:   handleSubmit,
		onResubmit: () => { setIsSubmitted(false); setFieldValues({}); setFieldErrors({}); setSubmitError(''); setCurrentStep(0); },
	};

	const needsReset = isSubmitted || (viewMode === 'page' && isClosed);

	const adminTotalPages = totalSteps + 1;
	const adminCurrentPage = isSubmitted ? totalSteps : stepIndex;

	const adminPrev = () => {
		if (isSubmitted) {
			setIsSubmitted(false);
			setCurrentStep(totalSteps - 1);
		} else if (currentStep > 0) {
			setFieldErrors({});
			setCurrentStep((s) => s - 1);
		}
	};

	const adminNext = () => {
		if (!isSubmitted && stepIndex < totalSteps - 1) {
			setFieldErrors({});
			setCurrentStep((s) => s + 1);
		} else if (!isSubmitted && stepIndex === totalSteps - 1) {
			setIsSubmitted(true);
		}
	};

	const adminCanPrev = hasSteps && (adminCurrentPage > 0);
	const adminCanNext = hasSteps && !isSubmitted;

	return (
		<div className="flex h-full flex-col bg-white">
			<div className="flex h-[72px] shrink-0 items-center px-6">
				{/* Left — label */}
				<span className="flex-1 text-base font-normal text-foreground">
					{__('Preview changes', 'all-feedback')}
				</span>

{/* Right — reset + view toggle */}
				<div className="flex flex-1 items-center justify-end gap-2">
					{needsReset && (
						<button
							type="button"
							onClick={handleReset}
							className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
						>
							<RotateCw className="size-3" />
							{__('Reset', 'all-feedback')}
						</button>
					)}

					<div className="flex items-center rounded-lg border border-border/60 p-0.5">
						<button
							type="button"
							onClick={() => setViewMode('page')}
							style={{ fontSize: '12px' }}
							className={cn(
								'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
								viewMode === 'page'
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
							)}
						>
							<Globe className="size-3.5" />
							{__('Page', 'all-feedback')}
						</button>
						<button
							type="button"
							onClick={() => setViewMode('widget')}
							style={{ fontSize: '12px' }}
							className={cn(
								'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors',
								viewMode === 'widget'
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
							)}
						>
							<MessageSquare className="size-3.5" />
							{__('Widget', 'all-feedback')}
						</button>
					</div>
				</div>
			</div>


			{viewMode === 'page' ? (

				<div className="flex flex-1 flex-col overflow-hidden bg-background">
					<div className="flex flex-1 items-start justify-center overflow-hidden p-4">
						<div
							className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-md"
							style={{ width: pageMaxW ? `min(${pageMaxW}, 100%)` : '100%' }}
						>
							<div className="shrink-0 select-none bg-[#dee1e6]">
								<div className="flex items-end px-3 pt-2">
									<div className="flex shrink-0 items-center gap-[5px] pb-[6px] pr-3">
										<span className="size-[11px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
										<span className="size-[11px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
										<span className="size-[11px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
									</div>

									<div className="flex min-w-0 max-w-[172px] items-center gap-1.5 rounded-t-[7px] bg-white px-2.5 pb-[6px] pt-[5px]">
										<Globe className="size-3 shrink-0 text-muted-foreground/50" />
										<span className="min-w-0 flex-1 truncate text-[8.5px] text-foreground/70">{siteHostname}</span>
										<X className="size-2.5 shrink-0 text-muted-foreground/35 hover:text-foreground/60" />
									</div>

									<button type="button" className="ml-3 flex size-[18px] self-center items-center justify-center rounded text-foreground/40 hover:bg-black/8 hover:text-foreground/60">
										<Plus className="size-3" />
									</button>
								</div>

								<div className="flex items-center gap-0.5 px-2 pb-2 pt-2">
									<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/20">
										<ArrowLeft className="size-3.5" />
									</button>
									<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/20">
										<ArrowRight className="size-3.5" />
									</button>
									<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/50 hover:bg-black/8">
										<RotateCw className="size-3" />
									</button>

									<div className="mx-1.5 flex flex-1 items-center gap-1.5 rounded-full bg-white/95 px-3 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]">
										<Lock className="size-2.5 shrink-0 text-[#1e8e3e]" />
										<span className="min-w-0 flex-1 truncate text-center text-[8.5px] text-foreground/70">{siteHostname}</span>
										<Star className="size-2.5 shrink-0 text-muted-foreground/30" />
									</div>

									<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/50 hover:bg-black/8">
										<MoreHorizontal className="size-3.5" />
									</button>
								</div>
							</div>

							<div className="allfb-preview-bg relative flex-1 overflow-hidden">
								<div className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden">
									<div className="flex h-9 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
										<div className="h-2.5 w-14 rounded-full bg-foreground/10" />
										<div className="flex flex-1 items-center justify-end gap-2.5">
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
										</div>
									</div>
									<div className="flex flex-1 justify-center overflow-hidden">
										<div className="w-full max-w-[480px]">
											<p className="px-4 pt-4 text-center text-[7px] font-medium leading-snug tracking-wide text-foreground/30">
												{__('Approximate preview — styling may vary on your live site', 'all-feedback')}
											</p>
											<div className="mt-4 grid grid-cols-3 gap-2 px-4">
												{[0, 1, 2].map((i) => (
													<div key={i} className="rounded-lg bg-white/75 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
														<div className="mb-1.5 h-7 rounded-md bg-foreground/[0.06]" />
														<div className="mb-1 h-1.5 rounded-full bg-foreground/[0.08]" />
														<div className="h-1.5 w-3/4 rounded-full bg-foreground/[0.06]" />
													</div>
												))}
											</div>
										</div>
									</div>
								</div>

								{!isMobile && (widgetPosition === 'side-tab' ? (
									/* Side-tab launcher — always visible, matches the frontend's vertical pill */
									<div
										className={cn(
											'transition-all duration-200',
											!isClosed ? 'opacity-100' : 'pointer-events-none opacity-0',
										)}
										style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)' }}
									>
										<button
											type="button"
											onClick={() => setIsMinimized((v) => !v)}
											className={cn(
												'flex items-center justify-center transition-all duration-200',
												!isClosed ? 'scale-100' : 'scale-90',
											)}
											style={{
												backgroundColor: widgetColor,
												padding:         '10px 8px',
												borderRadius:    '8px 0 0 8px',
												boxShadow:       '-2px 4px 12px rgba(0,0,0,0.15)',
												transformOrigin: 'right center',
											}}
											aria-label={__('Open feedback widget', 'all-feedback')}
										>
											<span style={{
												writingMode:    'vertical-rl',
												transform:      'rotate(180deg)',
												fontSize:       '13px',
												fontWeight:     600,
												letterSpacing:  '0.06em',
												whiteSpace:     'nowrap',
												userSelect:     'none',
												color:          '#fff',
											}}>
												{ settings.widgetLabel || __( 'Feedback', 'all-feedback' ) }
											</span>
										</button>
									</div>
								) : (
									/* Round launcher — bottom-left / bottom-right, always visible */
									<button
										type="button"
										onClick={() => setIsMinimized((v) => !v)}
										className={cn(
											'flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95',
											!isClosed ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
										)}
										style={{
											position: 'absolute',
											backgroundColor: widgetColor,
											...(widgetPosition === 'bottom-right'
												? { bottom: '20px', right: '16px', transformOrigin: 'bottom right' }
												: { bottom: '20px', left:  '16px', transformOrigin: 'bottom left'  }),
										}}
										aria-label={__('Open feedback widget', 'all-feedback')}
									>
										{ (() => { const TriggerIcon = TRIGGER_ICON_MAP[settings.triggerIcon] ?? MessageSquare; return <TriggerIcon className="size-5 text-white" />; })() }
									</button>
								))}

								<div
									className={cn((isClosed || isMinimized) && 'pointer-events-none')}
									style={isMobile ? {
										/* Mobile: bottom-sheet — full width with side breathing room */
										position: 'absolute',
										bottom: 0,
										left: '10px',
										right: '10px',
										width: 'auto',
									} : {
										position: 'absolute',
										width: `min(${maxW}, calc(100% - 2rem))`,
										// bottom positions: 20px launcher bottom + 48px launcher height + 12px gap = 80px
										// side-tab: ~34px launcher width + 10px gap = 44px from right edge
										...(widgetPosition === 'bottom-right'
											? { bottom: '80px', right: '16px' }
											: widgetPosition === 'bottom-left'
												? { bottom: '80px', left: '16px' }
												: { top: '50%', right: '44px', transform: 'translateY(-50%)' }),
									}}
								>
									<WidgetBody
										{...sharedWidgetProps}
										showControls={true}
										showMinimize={!isMobile}
										className={isMobile ? 'rounded-t-2xl rounded-b-none' : undefined}
									/>
								</div>
							</div>
						</div>
					</div>

					</div>
			) : (

				<div className="flex flex-1 items-center justify-center overflow-hidden bg-background/50 p-6">
					<div style={{ width: `min(${maxW}, 100%)` }}>
						<WidgetBody
							{...sharedWidgetProps}
							showControls={true}
							showMinimize={false}
							isMinimized={false}
							isClosed={false}
							onMinimize={() => {}}
							onClose={() => {}}
						/>
					</div>
				</div>
			)}

			<div className={cn(
				'flex shrink-0 items-center border-t border-border px-4 py-3 transition-opacity',
				viewMode === 'widget' && 'pointer-events-none opacity-35',
			)}>
				<div className="flex flex-1" />
				<div className="flex items-center gap-1">
					{DEVICES.map(({ value, Icon, label }) => (
						<Tooltip key={value} content={label}>
							<button
								type="button"
								onClick={() => onDeviceChange(value)}
								disabled={viewMode === 'widget'}
								className={cn(
									'flex size-8 items-center justify-center rounded-lg transition-colors',
									device === value
										? 'bg-primary/10 text-primary'
										: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
								)}
							>
								<Icon className="size-4" />
							</button>
						</Tooltip>
					))}
				</div>
				<div className="flex flex-1 items-center justify-end">
					{hasSteps && (
						<div className="flex items-center gap-0.5">
							<Tooltip content={__('Previous page', 'all-feedback')}>
								<button
									type="button"
									onClick={adminPrev}
									disabled={!adminCanPrev}
									className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
								>
									<ChevronLeft className="size-5" />
								</button>
							</Tooltip>
							<span className="min-w-[52px] text-center text-sm font-medium text-muted-foreground">
								{isSubmitted ? __('Thanks', 'all-feedback') : `${stepIndex + 1} / ${adminTotalPages}`}
							</span>
							<Tooltip content={__('Next page', 'all-feedback')}>
								<button
									type="button"
									onClick={adminNext}
									disabled={!adminCanNext}
									className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
								>
									<ChevronRight className="size-5" />
								</button>
							</Tooltip>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PreviewPanel;
