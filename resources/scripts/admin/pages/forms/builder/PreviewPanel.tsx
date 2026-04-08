import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Globe, Lock, MessageSquare, Minus, Monitor, MoreHorizontal, Plus, RotateCw, Smartphone, Star, Tablet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormField, FormSection, PreviewDevice } from './types';
import { __ } from '@wordpress/i18n';

interface PreviewPanelProps {
	sections:       FormSection[];
	device:         PreviewDevice;
	onDeviceChange: (device: PreviewDevice) => void;
}

const DEVICES: { value: PreviewDevice; Icon: typeof Monitor; label: string }[] = [
	{ value: 'desktop', Icon: Monitor,    label: 'Desktop' },
	{ value: 'tablet',  Icon: Tablet,     label: 'Tablet'  },
	{ value: 'mobile',  Icon: Smartphone, label: 'Mobile'  },
];

/** Max widget width per device */
const DEVICE_MAX_W: Record<PreviewDevice, string> = {
	desktop: '420px',
	tablet:  '360px',
	mobile:  '300px',
};

/** Simulated page width per device — constrains the whole canvas */
const DEVICE_PAGE_W: Record<PreviewDevice, string | null> = {
	desktop: null,        // full width
	tablet:  '768px',
	mobile:  '390px',
};

/** Strip HTML tags → plain text */
const htmlToText = (html: string): string => {
	const div    = document.createElement('div');
	div.innerHTML = html;
	return div.textContent ?? div.innerText ?? '';
};

/* ─── Interactive field preview ─────────────────────────────────────────── */
interface FieldPreviewProps {
	field:    FormField;
	value:    string | string[];
	error:    string;
	onChange: (value: string | string[]) => void;
}

const FieldPreview = ({ field, value, error, onChange }: FieldPreviewProps) => {
	const inputBase = cn(
		'w-full rounded-lg border bg-muted/30 px-2.5 py-1.5 text-[11px] text-foreground/80',
		'placeholder:text-muted-foreground/50 focus:outline-none transition-colors',
		error ? 'border-destructive/60' : 'border-border/70',
	);

	const baseHtml = field.label?.trim() ? field.label : '<span style="opacity:0.4">Untitled</span>';
	// Inject * before the last closing tag so it stays inline with the text even when bold/wrapped
	const labelHtml = field.required
		? baseHtml.replace(
			/(<\/\w+>\s*)$/,
			'<span style="font-size:9px;font-weight:700;color:var(--destructive);vertical-align:super;line-height:1;margin-left:1px">*</span>$1',
		)
		: baseHtml;
	const strVal    = typeof value === 'string' ? value : '';
	const arrVal    = Array.isArray(value) ? value : [];

	const toggleCheckbox = (opt: string) => {
		const next = arrVal.includes(opt)
			? arrVal.filter((v) => v !== opt)
			: [...arrVal, opt];
		onChange(next);
	};

	return (
		<div className="space-y-1">
			{/* Render rich-text HTML inline — required * is injected into the HTML so it stays inline */}
			<p
				className="text-[10.5px] text-foreground [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through [&_code]:rounded [&_code]:bg-muted [&_code]:px-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_mark]:rounded [&_mark]:bg-amber-100 [&_mark]:text-amber-800"
				dangerouslySetInnerHTML={{ __html: labelHtml }}
			/>

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
				<div className="space-y-1.5">
					{(field.options ?? []).map((opt, i) => (
						<label key={i} className="flex cursor-pointer items-center gap-2">
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
							<span className="text-[10.5px] text-foreground/75">{opt || `Option ${i + 1}`}</span>
						</label>
					))}
				</div>
			)}

			{field.type === 'checkboxes' && (
				<div className="space-y-1.5">
					{(field.options ?? []).map((opt, i) => (
						<label key={i} className="flex cursor-pointer items-center gap-2">
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
							<span className="text-[10.5px] text-foreground/75">{opt || `Option ${i + 1}`}</span>
						</label>
					))}
				</div>
			)}

			{!['short_text', 'long_text', 'radio', 'checkboxes'].includes(field.type) && (
				<div className="h-5 rounded-md border border-border/60 bg-muted/40" />
			)}

			{error && <p className="text-[10px] text-destructive">{error}</p>}
		</div>
	);
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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

/* ─── Main component ─────────────────────────────────────────────────────── */
const PreviewPanel = ({ sections, device, onDeviceChange }: PreviewPanelProps) => {
	const steps        = activeSections(sections);
	const totalSteps   = steps.length;
	const hasSteps     = totalSteps > 0;
	const maxW         = DEVICE_MAX_W[device];
	const pageMaxW     = DEVICE_PAGE_W[device];
	const siteHostname = getSiteHostname();

	const [isMinimized,  setIsMinimized]  = useState(false);
	const [isClosed,     setIsClosed]     = useState(false);
	const [fieldValues,  setFieldValues]  = useState<Record<string, string | string[]>>({});
	const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});
	const [currentStep,  setCurrentStep]  = useState(0);
	const [isSubmitted,  setIsSubmitted]  = useState(false);

	const stepIndex    = Math.min(currentStep, Math.max(0, totalSteps - 1));
	const isLastStep   = stepIndex === totalSteps - 1;
	const currentFields = steps[stepIndex]?.fields ?? [];
	const sectionTitle  = steps[stepIndex]?.title ?? '';

	/* Reset when sections structure changes */
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
		setIsSubmitted(true);
	};

	const handleReopen = () => {
		setIsMinimized(false);
	};

	return (
		<div className="flex h-full flex-col bg-white">
			{/* ── Panel header ──────────────────────────────────────────── */}
			<div className="flex h-[72px] shrink-0 items-center px-6">
				<span className="text-[13.5px] font-medium text-foreground">
					{__('Preview changes', 'all-feedback')}
				</span>
			</div>

			{/* ── Browser chrome + simulated page ───────────────────────── */}
			{/* Outer area: neutral bg, centres the device frame */}
			<div className="flex flex-1 items-start justify-center overflow-hidden bg-background p-4">
				{/* Device-constrained browser window */}
				<div
					className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-md transition-all duration-300"
					style={{ width: pageMaxW ? `min(${pageMaxW}, 100%)` : '100%' }}
				>
					{/* ── Browser chrome ── */}
					<div className="shrink-0 select-none bg-[#dee1e6]">
						{/* Tab strip row — controls + active tab + new tab, all flush */}
						<div className="flex items-end px-3 pt-2">
							{/* macOS window controls */}
							<div className="flex shrink-0 items-center gap-[5px] pb-[6px] pr-3">
								<span className="size-[11px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
								<span className="size-[11px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
								<span className="size-[11px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
							</div>

							{/* Active tab — white, rounded top, no bottom so it merges with toolbar */}
							<div className="flex min-w-0 max-w-[172px] items-center gap-1.5 rounded-t-[7px] bg-white px-2.5 pb-[6px] pt-[5px]">
								<Globe className="size-3 shrink-0 text-muted-foreground/50" />
								<span className="min-w-0 flex-1 truncate text-[10.5px] text-foreground/70">{siteHostname}</span>
								<X className="size-2.5 shrink-0 text-muted-foreground/35 hover:text-foreground/60" />
							</div>

							{/* New tab button */}
							<button type="button" className="mb-1 ml-1 flex size-[18px] items-center justify-center rounded text-foreground/40 hover:bg-black/8 hover:text-foreground/60">
								<Plus className="size-3" />
							</button>
						</div>

						{/* Toolbar row — seamlessly below tab strip, same bg */}
						<div className="flex items-center gap-0.5 px-2 pb-2 pt-1">
							<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/20">
								<ArrowLeft className="size-3.5" />
							</button>
							<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/20">
								<ArrowRight className="size-3.5" />
							</button>
							<button type="button" className="flex size-[22px] items-center justify-center rounded-full text-foreground/50 hover:bg-black/8">
								<RotateCw className="size-3" />
							</button>

							{/* Address bar pill */}
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

					{/* Page canvas */}
					<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
						{/* Fake website wireframe */}
						<div className="pointer-events-none absolute inset-0 flex flex-col">
							{/* Site nav */}
							<div className="flex h-9 shrink-0 items-center gap-3 border-b border-black/5 bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
								<div className="h-2.5 w-14 rounded-full bg-foreground/10" />
								<div className="flex flex-1 items-center justify-end gap-2.5">
									<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
									<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
									<div className="h-1.5 w-7 rounded-full bg-foreground/8" />
								</div>
							</div>
							{/* Hero */}
							<div className="flex flex-col items-center gap-2 px-6 pt-7">
								<div className="h-3 w-3/5 rounded-full bg-foreground/10" />
								<div className="h-2 w-2/5 rounded-full bg-foreground/[0.07]" />
								<div className="mt-1.5 h-6 w-20 rounded-md bg-foreground/[0.08]" />
							</div>
							{/* Cards */}
							<div className="mt-5 grid grid-cols-3 gap-2 px-4">
								{[0, 1, 2].map((i) => (
									<div key={i} className="rounded-lg bg-white/75 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
										<div className="mb-1.5 h-7 rounded-md bg-foreground/[0.06]" />
										<div className="mb-1 h-1.5 rounded-full bg-foreground/[0.08]" />
										<div className="h-1.5 w-3/4 rounded-full bg-foreground/[0.06]" />
									</div>
								))}
							</div>
						</div>

						{/* ── Closed pill — fades in when isClosed ── */}
						<button
							type="button"
							onClick={() => { setIsClosed(false); setIsMinimized(false); }}
							className={cn(
								'absolute bottom-5 right-4 flex items-center gap-1.5 rounded-full border border-border/50 bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md active:scale-95',
								isClosed ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
							)}
							aria-label={__('Reopen feedback widget', 'all-feedback')}
						>
							<MessageSquare className="size-3 text-primary/70" />
							<span className="text-[10px] font-medium text-foreground/60">{__('Feedback', 'all-feedback')}</span>
						</button>

						{/* ── Minimized FAB — scales in when minimized ── */}
						<button
							type="button"
							onClick={handleReopen}
							className={cn(
								'absolute bottom-5 right-4 flex size-12 items-center justify-center rounded-full bg-primary shadow-lg transition-all duration-200 origin-bottom-right hover:scale-105 active:scale-95',
								!isClosed && isMinimized ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
							)}
							aria-label={__('Open feedback widget', 'all-feedback')}
						>
							<MessageSquare className="size-5 text-white" />
						</button>

						{/* ── Full widget — scales in from bottom-right ── */}
						<div
							className={cn(
								'absolute bottom-5 right-4 overflow-hidden rounded-2xl border border-border/60 shadow-lg transition-all duration-200 origin-bottom-right',
								!isClosed && !isMinimized ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
							)}
							style={{ width: `min(${maxW}, calc(100% - 2rem))` }}
						>
							{/* Widget header */}
							<div className="flex items-center justify-end gap-0.5 bg-primary px-3 py-2.5">
								<button
									type="button"
									onClick={() => setIsMinimized(true)}
									className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white"
									aria-label={__('Minimise', 'all-feedback')}
								>
									<Minus className="size-3.5" />
								</button>
								<button
									type="button"
									onClick={() => setIsClosed(true)}
									className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/15 hover:text-white"
									aria-label={__('Close', 'all-feedback')}
								>
									<X className="size-3.5" />
								</button>
							</div>

							{/* Widget body */}
							<div className="bg-white">
								{isSubmitted ? (
									/* ── Success state ── */
									<div className="flex flex-col items-center justify-center px-4 py-8 text-center">
										<CheckCircle2 className="mb-2.5 size-8 text-primary" />
										<p className="text-[12px] font-semibold text-foreground">
											{__('Thank you!', 'all-feedback')}
										</p>
										<p className="mt-0.5 text-[11px] text-muted-foreground">
											{__('Your response has been recorded.', 'all-feedback')}
										</p>
										<button
											type="button"
											onClick={() => { setIsSubmitted(false); setFieldValues({}); setFieldErrors({}); setCurrentStep(0); }}
											className="mt-3 text-[11px] text-primary underline-offset-2 hover:underline"
										>
											{__('Submit another', 'all-feedback')}
										</button>
									</div>
								) : (
									<>
										{/* Step indicator — only when multiple sections */}
										{totalSteps > 1 && (
											<div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
												{/* Dots */}
												<div className="flex items-center gap-1.5">
													{steps.map((_, i) => (
														<span
															key={i}
															className={cn(
																'size-1.5 rounded-full transition-all duration-200',
																i === stepIndex ? 'w-4 bg-primary' : i < stepIndex ? 'bg-primary/40' : 'bg-border',
															)}
														/>
													))}
												</div>
												<span className="text-[10px] text-muted-foreground">
													{stepIndex + 1} / {totalSteps}
												</span>
											</div>
										)}

										{/* Fields */}
										<div className="max-h-[240px] overflow-y-auto px-4 py-4">
											{!hasSteps ? (
												<div className="flex flex-col items-center justify-center py-4">
													<Eye className="mb-2 size-5 text-muted-foreground/25" />
													<p className="text-[11px] text-muted-foreground/55">
														{__('Add fields to preview', 'all-feedback')}
													</p>
												</div>
											) : (
												<div className="space-y-4">
													{currentFields.map((field) => (
														<FieldPreview
															key={field.id}
															field={field}
															value={fieldValues[field.id] ?? ''}
															error={fieldErrors[field.id] ?? ''}
															onChange={(val) => handleChange(field.id, val)}
														/>
													))}
												</div>
											)}
										</div>

										{/* Navigation footer */}
										{hasSteps && (
											<div className="flex items-center gap-2 border-t border-border/40 px-4 py-3">
												{stepIndex > 0 && (
													<button
														type="button"
														onClick={() => { setFieldErrors({}); setCurrentStep((s) => s - 1); }}
														className="flex-1 rounded-lg border border-border py-2.5 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-muted/50"
													>
														{__('Back', 'all-feedback')}
													</button>
												)}
												{isLastStep ? (
													<button
														type="button"
														onClick={handleSubmit}
														className="flex-1 rounded-lg bg-primary py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
													>
														{__('Submit', 'all-feedback')}
													</button>
												) : (
													<button
														type="button"
														onClick={handleNext}
														className="flex-1 rounded-lg bg-primary py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-600 active:bg-brand-700"
													>
														{__('Next', 'all-feedback')}
													</button>
												)}
											</div>
										)}
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── Device switcher — icons only ──────────────────────────── */}
			<div className="flex shrink-0 items-center justify-center gap-1 border-t border-border px-4 py-3">
				{DEVICES.map(({ value, Icon, label }) => (
					<button
						key={value}
						type="button"
						onClick={() => onDeviceChange(value)}
						title={label}
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
		</div>
	);
};

export default PreviewPanel;
