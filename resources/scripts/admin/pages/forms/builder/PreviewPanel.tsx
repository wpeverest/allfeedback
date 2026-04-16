import { surveysApi } from '@/admin/api/surveys';
import type { SubmitFormData, SurveyStatus } from '@/admin/api/surveys';
import { cn, htmlToText } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Eye, Globe, Loader2, Lock, MessageSquare, Minus, Monitor, MoreHorizontal, Plus, RotateCw, Smartphone, Star, Tablet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { FormField, FormSection, FormSettings, PreviewDevice } from './types';

interface PreviewPanelProps {
	sections:       FormSection[];
	settings:       FormSettings;
	device:         PreviewDevice;
	onDeviceChange: (device: PreviewDevice) => void;
	surveyId?:      number;
	surveyStatus?:  SurveyStatus;
}

const DEVICES: { value: PreviewDevice; Icon: typeof Monitor; label: string }[] = [
	{ value: 'desktop', Icon: Monitor,    label: 'Desktop' },
	{ value: 'tablet',  Icon: Tablet,     label: 'Tablet'  },
	{ value: 'mobile',  Icon: Smartphone, label: 'Mobile'  },
];

const DEVICE_MAX_W: Record<PreviewDevice, string> = {
	desktop: '420px',
	tablet:  '360px',
	mobile:  '100%',
};

const DEVICE_PAGE_W: Record<PreviewDevice, string | null> = {
	desktop: null,
	tablet:  '768px',
	mobile:  '390px',
};

type PreviewView = 'page' | 'widget';


const normalizeLabel = (html: string): string => {
	const t = html.trim();
	if (t.startsWith('<p>') && t.endsWith('</p>') && t.indexOf('<p>', 1) === -1) {
		return t.slice(3, -4);
	}
	return t;
};

const StarRatingPreview = ({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) => {
	const [hovered, setHovered] = useState(0);
	const scale    = field.starScale ?? 'star';
	const range    = field.starRange ?? 5;
	const selected = Number(value) || 0;
	const active   = hovered || selected;
	const iconSize = range >= 10 ? 'size-5' : 'size-7';

	return (
		<div className="flex gap-0.5" onMouseLeave={() => setHovered(0)}>
			{Array.from({ length: range }, (_, i) => i + 1).map((n) => (
				<button
					key={n}
					type="button"
					onMouseEnter={() => setHovered(n)}
					onClick={() => onChange(String(selected === n ? 0 : n))}
					className="transition-transform hover:scale-110 active:scale-95"
				>
					{scale === 'number' ? (
						<span className={cn(
							'flex items-center justify-center rounded text-xs font-semibold transition-colors',
							iconSize,
							n <= active ? 'bg-primary text-white' : 'bg-muted/60 text-muted-foreground/60',
						)}>
							{n}
						</span>
					) : (
						<Star className={cn(
							iconSize, 'transition-colors',
							n <= active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25',
						)} />
					)}
				</button>
			))}
		</div>
	);
};

const ScalePreview = ({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) => {
	const [hovered, setHovered] = useState<number | null>(null);
	const min      = field.scaleMin ?? 0;
	const max      = field.scaleMax ?? 10;
	const selected = value !== '' ? Number(value) : null;
	const active   = hovered ?? selected;
	const points   = Array.from({ length: max - min + 1 }, (_, i) => min + i);
	const btnSize  = points.length > 8 ? 'size-7 text-2xs' : 'size-9 text-sm';

	return (
		<div className="space-y-1.5" onMouseLeave={() => setHovered(null)}>
			<div className="flex gap-1.5 flex-wrap">
				{points.map((n) => (
					<button
						key={n}
						type="button"
						onMouseEnter={() => setHovered(n)}
						onClick={() => onChange(selected === n ? '' : String(n))}
						className={cn(
							'flex items-center justify-center rounded-lg border font-semibold transition-all duration-100 hover:scale-105 active:scale-95',
							btnSize,
							active !== null && n <= active
								? 'border-primary bg-primary text-white'
								: 'border-border/70 bg-muted/30 text-foreground/60 hover:border-primary/50 hover:bg-primary/8 hover:text-primary',
						)}
					>
						{n}
					</button>
				))}
			</div>
			{(field.scaleLowLabel || field.scaleHighLabel) && (
				<div className="flex justify-between">
					{field.scaleLowLabel && (
						<span className="text-2xs text-muted-foreground/60">{field.scaleLowLabel}</span>
					)}
					{field.scaleHighLabel && (
						<span className="ml-auto text-2xs text-muted-foreground/60">{field.scaleHighLabel}</span>
					)}
				</div>
			)}
		</div>
	);
};

const NpsPreview = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
	const [hovered, setHovered] = useState<number | null>(null);
	const selected = value !== '' ? Number(value) : null;

	const colorFor = (n: number) => {
		if (n <= 6) return { active: 'border-destructive/50 bg-destructive/10 text-destructive', hover: 'hover:border-destructive/40 hover:bg-destructive/[0.06] hover:text-destructive' };
		if (n <= 8) return { active: 'border-amber-400/70 bg-amber-50 text-amber-600',           hover: 'hover:border-amber-400/50 hover:bg-amber-50/60 hover:text-amber-600' };
		return          { active: 'border-green-500/60 bg-green-50 text-green-600',              hover: 'hover:border-green-500/40 hover:bg-green-50/60 hover:text-green-600' };
	};

	return (
		<div className="space-y-1.5" onMouseLeave={() => setHovered(null)}>
			<div className="flex gap-1">
				{Array.from({ length: 11 }, (_, i) => i).map((n) => {
					const isActive = (hovered ?? selected) === n;
					const { active, hover } = colorFor(n);
					return (
						<button
							key={n}
							type="button"
							onMouseEnter={() => setHovered(n)}
							onClick={() => onChange(selected === n ? '' : String(n))}
							className={cn(
								'flex h-7 flex-1 items-center justify-center rounded-lg border text-2xs font-semibold transition-all duration-100 active:scale-95',
								isActive
									? active
									: cn('border-border/60 bg-muted/30 text-foreground/60', hover),
							)}
						>
							{n}
						</button>
					);
				})}
			</div>
			<div className="flex justify-between">
				<span className="text-2xs text-muted-foreground/60">{__('Not at all likely', 'all-feedback')}</span>
				<span className="text-2xs text-muted-foreground/60">{__('Extremely likely', 'all-feedback')}</span>
			</div>
		</div>
	);
};

interface FieldPreviewProps {
	field:    FormField;
	value:    string | string[];
	error:    string;
	onChange: (value: string | string[]) => void;
}

const FieldPreview = ({ field, value, error, onChange }: FieldPreviewProps) => {
	const inputBase = cn(
		'w-full rounded-lg border bg-muted/30 px-2.5 py-1.5 text-2xs text-foreground/80',
		'placeholder:text-muted-foreground/50 focus:outline-none transition-colors',
		error ? 'border-destructive/60' : 'border-border/70',
	);

	const baseHtml = field.label?.trim() ? normalizeLabel(field.label) : '<span style="opacity:0.4">Untitled</span>';
	const strVal    = typeof value === 'string' ? value : '';
	const arrVal    = Array.isArray(value) ? value : [];

	const toggleCheckbox = (opt: string) => {
		const next = arrVal.includes(opt)
			? arrVal.filter((v) => v !== opt)
			: [...arrVal, opt];
		onChange(next);
	};

	return (
		<div className="space-y-2.5">
			<div className="flex items-baseline gap-0.5">
				<div
					className="field-preview-label text-sm text-foreground [&_p]:m-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through [&_code]:rounded [&_code]:bg-muted [&_code]:px-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_mark]:rounded [&_mark]:bg-amber-100 [&_mark]:text-amber-800"
					dangerouslySetInnerHTML={{ __html: baseHtml }}
				/>
				{field.required && (
					<span className="shrink-0 text-2xs font-bold leading-none text-destructive">*</span>
				)}
			</div>

			{field.type === 'short_text' && (
				<input
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.placeholder || __('Short answer…', 'all-feedback')}
					className={inputBase}
				/>
			)}

			{field.type === 'long_text' && (
				<textarea
					value={strVal}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.placeholder || __('Long answer…', 'all-feedback')}
					rows={2}
					className={cn(inputBase, 'resize-none')}
				/>
			)}

			{field.type === 'radio' && (
				<div className="space-y-1">
					{(field.options ?? []).map((opt, i) => (
						<label key={i} className="flex cursor-pointer items-center gap-1.5">
							<span className={cn(
								'flex size-3 shrink-0 items-center justify-center rounded-full border transition-colors',
								strVal === opt
									? 'border-primary bg-primary'
									: 'border-border/70 bg-white',
							)}>
								{strVal === opt && <span className="size-1.5 rounded-full bg-white" />}
							</span>
							<input
								type="radio"
								name={field.id}
								value={opt}
								checked={strVal === opt}
								onChange={() => onChange(opt)}
								className="sr-only"
							/>
							<span className="text-sm text-foreground/75">{opt || `Option ${i + 1}`}</span>
						</label>
					))}
				</div>
			)}

			{field.type === 'checkboxes' && (
				<div className="space-y-1">
					{(field.options ?? []).map((opt, i) => (
						<label key={i} className="flex cursor-pointer items-center gap-1.5">
							<span className={cn(
								'flex size-3 shrink-0 items-center justify-center rounded-[2px] border transition-colors',
								arrVal.includes(opt)
									? 'border-primary bg-primary'
									: 'border-border/70 bg-white',
							)}>
								{arrVal.includes(opt) && (
									<svg viewBox="0 0 8 8" className="size-2 text-white" fill="none">
										<path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								)}
							</span>
							<input
								type="checkbox"
								value={opt}
								checked={arrVal.includes(opt)}
								onChange={() => toggleCheckbox(opt)}
								className="sr-only"
							/>
							<span className="text-sm text-foreground/75">{opt || `Option ${i + 1}`}</span>
						</label>
					))}
				</div>
			)}

			{field.type === 'star_rating' && (
				<StarRatingPreview field={field} value={strVal} onChange={onChange} />
			)}

			{field.type === 'scale' && (
				<ScalePreview field={field} value={strVal} onChange={onChange} />
			)}

			{field.type === 'nps' && (
				<NpsPreview value={strVal} onChange={onChange} />
			)}

			{!['short_text', 'long_text', 'radio', 'checkboxes', 'star_rating', 'scale', 'nps'].includes(field.type) && (
				<div className="h-5 rounded-md border border-border/60 bg-muted/40" />
			)}

			{error && <p className="text-[10px] text-destructive">{error}</p>}
		</div>
	);
};

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
	isMinimized:   boolean;
	isClosed:      boolean;
	showControls:  boolean;
	settings:      FormSettings;
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
	isSubmitted, fieldValues, fieldErrors, isMinimized, isClosed, showControls, settings,
	isSubmitting, onMinimize, onClose, onChange, onNext, onBack, onSubmit, onResubmit,
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
		className={cn(
			'overflow-hidden rounded-2xl border border-border/60 shadow-lg transition-all duration-200 origin-bottom-right',
			isClosed || isMinimized ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100',
		)}
		onKeyDown={handleKeyDown}
	>
		<div className="flex items-center justify-end gap-0.5 bg-primary px-2.5 py-1.5">
			{showControls && (
				<>
					<button
						type="button"
						onClick={onMinimize}
						className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white"
						aria-label={__('Minimise', 'all-feedback')}
					>
						<Minus className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white"
						aria-label={__('Close', 'all-feedback')}
					>
						<X className="size-3.5" />
					</button>
				</>
			)}
		</div>

		<div className="bg-white">
			{isSubmitted ? (

				<div className="flex flex-col items-center justify-center px-4 py-5 text-center">
					<CheckCircle2 className="mb-1.5 size-6 text-primary" />
					<p className="text-xs font-semibold text-foreground">
						{settings.thankYouEnabled && settings.thankYouTitle
							? settings.thankYouTitle
							: __('Thank you!', 'all-feedback')}
					</p>
					<p className="mt-0.5 text-2xs text-muted-foreground">
						{settings.thankYouEnabled && settings.thankYouDescription
							? settings.thankYouDescription
							: __('Your response has been recorded.', 'all-feedback')}
					</p>
				</div>
			) : (
				<>
 					{totalSteps > 1 && (
						<div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5">
							<div className="flex items-center gap-1.5">
								{steps.map((_, i) => (
									<span
										key={i}
										className={cn(
											'size-1.5 rounded-full transition-all duration-200',
											i === stepIndex ? 'w-3 bg-primary' : i < stepIndex ? 'bg-primary/40' : 'bg-border',
										)}
									/>
								))}
							</div>
							<span className="text-[10px] text-muted-foreground">
								{stepIndex + 1} / {totalSteps}
							</span>
						</div>
					)}

					<div className="max-h-[240px] overflow-y-auto px-4 py-4">
						{!hasSteps ? (
							<div className="flex flex-col items-center justify-center py-3">
								<Eye className="mb-1.5 size-4 text-muted-foreground/25" />
								<p className="text-[10.5px] text-muted-foreground/80">
									{__('Add fields to preview', 'all-feedback')}
								</p>
							</div>
						) : (
							<div className="space-y-5">
								{currentFields.map((field) => (
									<FieldPreview
										key={field.id}
										field={field}
										value={fieldValues[field.id] ?? ''}
										error={fieldErrors[field.id] ?? ''}
										onChange={(val) => onChange(field.id, val)}
									/>
								))}
							</div>
						)}
					</div>

					{hasSteps && (
						<div className="flex items-center gap-2 border-t border-border/40 px-4 py-4 mt-1">
							{stepIndex > 0 && (
								<button
									type="button"
									onClick={onBack}
									className="flex-1 rounded-lg border border-border py-3 text-2xs font-medium text-foreground/70 transition-colors hover:bg-muted/50"
								>
									{settings.backLabel || __('Back', 'all-feedback')}
								</button>
							)}
							{isLastStep ? (
								<button
									type="button"
									onClick={onSubmit}
									disabled={isSubmitting}
									className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-3 text-2xs font-semibold text-white transition-colors hover:bg-brand-600 active:bg-brand-700 disabled:opacity-70"
								>
									{isSubmitting && <Loader2 className="size-3 animate-spin" />}
									{settings.submitLabel || __('Submit', 'all-feedback')}
								</button>
							) : (
								<button
									type="button"
									onClick={onNext}
									className="flex-1 rounded-lg bg-primary py-3 text-2xs font-semibold text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
								>
									{settings.nextLabel || __('Next', 'all-feedback')}
								</button>
							)}
						</div>
					)}
				</>
			)}
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

const PreviewPanel = ({ sections, settings, device, onDeviceChange, surveyId, surveyStatus }: PreviewPanelProps) => {
	const steps        = activeSections(sections);
	const totalSteps   = steps.length;
	const hasSteps     = totalSteps > 0;
	const maxW         = DEVICE_MAX_W[device];
	const pageMaxW     = DEVICE_PAGE_W[device];
	const siteHostname = getSiteHostname();

	const [viewMode,     setViewMode]     = useState<PreviewView>('page');
	const [isMinimized,  setIsMinimized]  = useState(false);
	const [isClosed,     setIsClosed]     = useState(false);
	const [fieldValues,  setFieldValues]  = useState<Record<string, string | string[]>>({});
	const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});
	const [currentStep,  setCurrentStep]  = useState(0);
	const [isSubmitted,  setIsSubmitted]  = useState(false);

	const stepIndex    = Math.min(currentStep, Math.max(0, totalSteps - 1));
	const isLastStep   = stepIndex === totalSteps - 1;
	const currentFields = steps[stepIndex]?.fields ?? [];

	const submitMutation = useMutation({
		mutationFn: (data: SubmitFormData) => surveysApi.submit(surveyId!, data),
		onSuccess: () => {
			setIsSubmitted(true);
			toast.success(
				surveyStatus === 'draft'
					? __('Form preview submitted successfully.', 'all-feedback')
					: __('Response submitted successfully.', 'all-feedback')
			);
		},
		onError: () => {
			toast.error(__('Failed to submit. Please try again.', 'all-feedback'));
		},
	});

	useEffect(() => {
		setFieldValues({});
		setFieldErrors({});
		setCurrentStep(0);
		setIsSubmitted(false);
	}, [allFields(sections).map((f) => f.id).join(',')]);

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
			const scoreField = allFields(sections).find((f) => ['nps', 'star_rating', 'scale'].includes(f.type));
			const scoreRaw   = scoreField ? fieldValues[scoreField.id] : '';
			const score      = typeof scoreRaw === 'string' && scoreRaw !== '' ? Number(scoreRaw) : undefined;
			submitMutation.mutate({
				nonce:         __ALLFB_ADMIN__.submitNonce,
				response_data: fieldValues as Record<string, unknown>,
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
		setCurrentStep(0);
	};

	const sharedWidgetProps = {
		steps, stepIndex, totalSteps, hasSteps, isLastStep, currentFields,
		isSubmitted, fieldValues, fieldErrors, isMinimized, isClosed, settings,
		isSubmitting: submitMutation.isPending,
		onMinimize: () => setIsMinimized(true),
		onClose:    () => setIsClosed(true),
		onChange:   handleChange,
		onNext:     handleNext,
		onBack:     () => { setFieldErrors({}); setCurrentStep((s) => s - 1); },
		onSubmit:   handleSubmit,
		onResubmit: () => { setIsSubmitted(false); setFieldValues({}); setFieldErrors({}); setCurrentStep(0); },
	};

	const needsReset = isSubmitted || (viewMode === 'page' && (isClosed || isMinimized));

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
			<div className="flex h-[72px] shrink-0 items-center justify-between px-6">
				<span className="text-sm font-medium text-foreground">
					{__('Preview changes', 'all-feedback')}
				</span>

				<div className="flex items-center gap-2">
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
							className={cn(
								'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors',
								viewMode === 'page'
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
							)}
						>
							<Globe className="size-3" />
							<span className="text-2xs">{__('Page', 'all-feedback')}</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode('widget')}
							className={cn(
								'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors',
								viewMode === 'widget'
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
							)}
						>
							<MessageSquare className="size-3" />
							<span className="text-2xs">{__('Widget', 'all-feedback')}</span>
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
										<span className="min-w-0 flex-1 truncate text-[10.5px] text-foreground/70">{siteHostname}</span>
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
										<span className="min-w-0 flex-1 truncate text-center text-[10.5px] text-foreground/70">{siteHostname}</span>
										<Star className="size-2.5 shrink-0 text-muted-foreground/30" />
									</div>

									<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/50 hover:bg-black/8">
										<MoreHorizontal className="size-3.5" />
									</button>
								</div>
							</div>

							<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
								<div className="pointer-events-none absolute inset-0 flex flex-col">
									<div className="flex h-9 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
										<div className="h-2.5 w-14 rounded-full bg-foreground/10" />
										<div className="flex flex-1 items-center justify-end gap-2.5">
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
											<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
										</div>
									</div>
									<div className="flex flex-col items-center gap-2 px-6 pt-7">
										<div className="h-3 w-3/5 rounded-full bg-foreground/10" />
										<div className="h-2 w-2/5 rounded-full bg-foreground/[0.07]" />
										<div className="mt-1.5 h-6 w-20 rounded-md bg-foreground/[0.08]" />
									</div>
									<div className="mt-5 grid grid-cols-3 gap-2 px-4">
										{[0, 1, 2].map((i) => (
											<div key={i} className="rounded-lg bg-white/75 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
												<div className="mb-1.5 h-7 rounded-md bg-foreground/[0.06]" />
												<div className="mb-1 h-1.5 rounded-full bg-foreground/[0.08]" />
												<div className="h-1.5 w-3/4 rounded-full bg-foreground/[0.06]" />
											</div>
										))}
									</div>
									<p className="mt-4 px-4 text-center text-[7.5px] font-medium leading-[1.5] tracking-wide text-foreground/35">
										{__('Approximate preview — position, size, and styling may vary on your live site based on your theme and screen size', 'all-feedback')}
									</p>
								</div>

								<button
									type="button"
									onClick={() => setIsMinimized(false)}
									className={cn(
										'absolute bottom-5 right-4 flex size-12 items-center justify-center rounded-full bg-primary shadow-lg transition-all duration-200 origin-bottom-right hover:scale-105 active:scale-95',
										!isClosed && isMinimized ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
									)}
									aria-label={__('Open feedback widget', 'all-feedback')}
								>
									<MessageSquare className="size-5 text-white" />
								</button>

								<div
									className={cn(
										'absolute bottom-5 right-4',
										(isClosed || isMinimized) && 'pointer-events-none',
									)}
									style={{ width: `min(${maxW}, calc(100% - 2rem))` }}
								>
									<WidgetBody {...sharedWidgetProps} showControls={true} />
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
						<button
							key={value}
							type="button"
							onClick={() => onDeviceChange(value)}
							title={label}
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
					))}
				</div>
				<div className="flex flex-1 items-center justify-end">
					{hasSteps && (
						<div className="flex items-center gap-0.5">
							<button
								type="button"
								onClick={adminPrev}
								disabled={!adminCanPrev}
								title={__('Previous page', 'all-feedback')}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
							>
								<ChevronLeft className="size-3.5" />
							</button>
							<span className="min-w-[44px] text-center text-[10px] text-muted-foreground/60">
								{isSubmitted ? __('Thanks', 'all-feedback') : `${stepIndex + 1} / ${adminTotalPages}`}
							</span>
							<button
								type="button"
								onClick={adminNext}
								disabled={!adminCanNext}
								title={__('Next page', 'all-feedback')}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
							>
								<ChevronRight className="size-3.5" />
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PreviewPanel;
