import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { surveysApi } from '@/admin/api/surveys';
import { surveyQuery, surveyResponseQuery } from '@/admin/queries/surveys';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearch } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import {
	ArrowLeft,
	CalendarDays,
	Check,
	CheckSquare,
	ChevronRight,
	Clock,
	Globe,
	Laptop,
	Loader2,
	MessageSquare,
	Monitor,
	Pencil,
	Shield,
	ShieldCheck,
	Smartphone,
	Star,
	Tablet,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SurveyFormSchemaField } from '@/admin/api/surveys';

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

const DetailSkeleton = () => (
	<div className="p-5 md:p-6">
		{/* back nav */}
		<div className="mb-5 flex items-center gap-2">
			<div className="size-8 animate-pulse rounded-lg bg-muted" />
			<div className="h-4 w-24 animate-pulse rounded bg-muted" />
			<div className="h-4 w-4 animate-pulse rounded bg-muted" />
			<div className="h-4 w-32 animate-pulse rounded bg-muted" />
		</div>
		{/* header */}
		<div className="mb-6 flex items-start justify-between">
			<div className="space-y-2">
				<div className="h-6 w-40 animate-pulse rounded bg-muted" />
				<div className="h-4 w-56 animate-pulse rounded bg-muted" />
			</div>
			<div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
		</div>
		{/* body */}
		<div className="grid gap-6 lg:grid-cols-[1fr_268px]">
			<div className="space-y-0 rounded-xl border border-border bg-card">
				<div className="border-b border-border px-5 py-4">
					<div className="h-4 w-16 animate-pulse rounded bg-muted" />
				</div>
				{Array.from({ length: 3 }, (_, i) => (
					<div key={i} className="border-b border-border px-5 py-5 last:border-0">
						<div className="mb-3 h-3 w-28 animate-pulse rounded bg-muted" />
						<div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
					</div>
				))}
			</div>
			<div className="rounded-xl border border-border bg-card">
				<div className="border-b border-border px-5 py-4">
					<div className="h-4 w-14 animate-pulse rounded bg-muted" />
				</div>
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0">
						<div className="size-4 animate-pulse rounded bg-muted" />
						<div className="h-4 w-32 animate-pulse rounded bg-muted" />
					</div>
				))}
			</div>
		</div>
	</div>
);

// ---------------------------------------------------------------------------
// Field — view mode
// ---------------------------------------------------------------------------

const ViewField = ({
	field,
	value,
}: {
	field: SurveyFormSchemaField | null;
	value: unknown;
}) => {
	const type = field?.type ?? 'short_text';

	if (value === null || value === undefined || value === '') {
		return (
			<span className="text-[14px] italic text-muted-foreground/70">
				{__('No answer provided', 'all-feedback')}
			</span>
		);
	}

	if (type === 'checkboxes') {
		const arr = Array.isArray(value) ? value : [value];
		return (
			<div className="flex flex-wrap gap-1.5">
				{(arr as string[]).map((opt) => (
					<span
						key={opt}
						className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[13px] font-medium text-foreground"
					>
						<CheckSquare className="size-3 text-primary" />
						{opt}
					</span>
				))}
			</div>
		);
	}

	if (type === 'radio') {
		return (
			<span className="inline-flex items-center gap-2 text-[14px] text-foreground">
				<span className="size-2 rounded-full bg-primary" />
				{String(value)}
			</span>
		);
	}

	if (type === 'nps') {
		const score = Number(value);
		const { bg, border, text, label } =
			score >= 9
				? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: __('Promoter', 'all-feedback') }
				: score >= 7
					? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: __('Passive', 'all-feedback') }
					: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: __('Detractor', 'all-feedback') };
		return (
			<div className="flex items-center gap-3">
				<span className={cn('rounded-lg border px-3 py-1 text-[22px] font-bold tabular-nums', bg, border, text)}>
					{score}
				</span>
				<div>
					<p className={cn('text-[13px] font-semibold', text)}>{label}</p>
					<p className="text-[12px] text-muted-foreground">{__('NPS score', 'all-feedback')}</p>
				</div>
			</div>
		);
	}

	if (type === 'star_rating') {
		const stars = Number(value);
		const max   = (field?.settings?.starRange as number | undefined) ?? 5;
		return (
			<div className="flex items-center gap-2">
				<span className="flex items-center gap-0.5">
					{Array.from({ length: max }, (_, i) => (
						<Star
							key={i}
							className={cn(
								'size-5',
								i < stars ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted',
							)}
						/>
					))}
				</span>
				<span className="text-[13px] text-muted-foreground">
					{stars} / {max}
				</span>
			</div>
		);
	}

	if (type === 'scale') {
		const scaleMin  = (field?.settings?.scaleMin  as number | undefined) ?? 1;
		const scaleMax  = (field?.settings?.scaleMax  as number | undefined) ?? 10;
		const lowLabel  = (field?.settings?.scaleLowLabel  as string | undefined) ?? '';
		const highLabel = (field?.settings?.scaleHighLabel as string | undefined) ?? '';
		const pct = ((Number(value) - scaleMin) / (scaleMax - scaleMin)) * 100;
		return (
			<div className="space-y-2">
				<div className="flex items-baseline gap-1.5">
					<span className="text-[22px] font-bold tabular-nums text-foreground">{String(value)}</span>
					<span className="text-[13px] text-muted-foreground">/ {scaleMax}</span>
				</div>
				<div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${pct}%` }}
					/>
				</div>
				{(lowLabel || highLabel) && (
					<div className="flex w-48 justify-between text-[11px] text-muted-foreground">
						<span>{lowLabel}</span>
						<span>{highLabel}</span>
					</div>
				)}
			</div>
		);
	}

	if (type === 'long_text') {
		return (
			<p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
				{String(value)}
			</p>
		);
	}

	return <span className="text-[14px] text-foreground">{String(value)}</span>;
};

// ---------------------------------------------------------------------------
// Field — edit mode
// ---------------------------------------------------------------------------

const EditField = ({
	field,
	value,
	onChange,
}: {
	field:    SurveyFormSchemaField | null;
	value:    unknown;
	onChange: (v: unknown) => void;
}) => {
	const type = field?.type ?? 'short_text';

	const textareaCls = cn(
		'flex w-full rounded-lg bg-white border border-border px-3 py-2 text-[14px] text-foreground',
		'placeholder:text-muted-foreground',
		'transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10 focus:outline-none',
	);

	if (type === 'long_text') {
		return (
			<textarea
				className={cn(textareaCls, 'min-h-[120px] resize-y')}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}

	if (type === 'radio') {
		const options = (field?.settings?.options as string[] | undefined) ?? [];
		const current = String(value ?? '');
		return (
			<div className="flex flex-col gap-2.5">
				{options.map((opt) => (
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
						<input
							type="radio"
							className="accent-primary"
							checked={current === opt}
							onChange={() => onChange(opt)}
						/>
						{opt}
					</label>
				))}
				{!options.length && (
					<Input value={current} onChange={(e) => onChange(e.target.value)} />
				)}
			</div>
		);
	}

	if (type === 'checkboxes') {
		const options  = (field?.settings?.options as string[] | undefined) ?? [];
		const selected = Array.isArray(value) ? (value as string[]) : [];
		const toggle   = (opt: string) => {
			const next = selected.includes(opt)
				? selected.filter((s) => s !== opt)
				: [...selected, opt];
			onChange(next);
		};
		return (
			<div className="flex flex-col gap-2.5">
				{options.map((opt) => (
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
						<Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
						{opt}
					</label>
				))}
				{!options.length && (
					<Input
						value={selected.join(', ')}
						onChange={(e) =>
							onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
						}
						placeholder={__('Comma-separated values', 'all-feedback')}
					/>
				)}
			</div>
		);
	}

	if (type === 'star_rating') {
		const max = (field?.settings?.starRange as number | undefined) ?? 5;
		return (
			<Input
				type="number"
				min={1}
				max={max}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-28"
			/>
		);
	}

	if (type === 'scale') {
		const scaleMin = (field?.settings?.scaleMin as number | undefined) ?? 1;
		const scaleMax = (field?.settings?.scaleMax as number | undefined) ?? 10;
		return (
			<Input
				type="number"
				min={scaleMin}
				max={scaleMax}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-28"
			/>
		);
	}

	if (type === 'nps') {
		return (
			<Input
				type="number"
				min={0}
				max={10}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-28"
			/>
		);
	}

	return (
		<Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
	);
};

// ---------------------------------------------------------------------------
// Metadata item row
// ---------------------------------------------------------------------------

const MetaItem = ({
	icon: Icon,
	label,
	children,
}: {
	icon:     LucideIcon;
	label:    string;
	children: React.ReactNode;
}) => (
	<div className="flex items-start gap-3 px-5 py-3.5">
		<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
			<Icon className="size-3.5 text-muted-foreground" />
		</div>
		<div className="min-w-0 flex-1">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<div className="mt-0.5 text-[13px] text-foreground">{children}</div>
		</div>
	</div>
);

// ---------------------------------------------------------------------------
// Device icon helper — returns the Lucide icon component for the device type
// ---------------------------------------------------------------------------

const getDeviceIcon = (device: string | null) => {
	if (device === 'mobile')  return Smartphone;
	if (device === 'tablet')  return Tablet;
	if (device === 'desktop') return Monitor;
	return Laptop;
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const ResponseDetail = () => {
	const router      = useRouter();
	const queryClient = useQueryClient();
	const { responseId }     = useParams({ from: '/_app/responses/$responseId' });
	const { surveyId, edit } = useSearch({ from: '/_app/responses/$responseId' });

	const [isEditing, setIsEditing] = useState(edit);

	const { data: survey } = useQuery({
		...surveyQuery(surveyId),
		enabled: surveyId > 0,
	});

	const { data: response, isLoading, isError } = useQuery({
		...surveyResponseQuery(surveyId, Number(responseId)),
		enabled: surveyId > 0,
	});

	const schemaFields   = survey?.form_schema?.sections?.flatMap((s) => s.fields) ?? [];
	const schemaFieldMap = Object.fromEntries(schemaFields.map((f) => [f.id, f]));
	const responseData   = response?.response_data ?? {};
	const orphanedKeys   = Object.keys(responseData).filter((k) => !(k in schemaFieldMap));

	// ----- TanStack Form -----
	const form = useForm({
		defaultValues: {
			response_data: (response?.response_data ?? {}) as Record<string, unknown>,
		},
		onSubmit: ({ value }) => {
			saveMutation.mutate(value.response_data);
		},
	});

	useEffect(() => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
	}, [response?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	// ----- Save mutation -----
	const saveMutation = useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			surveysApi.updateResponse(surveyId, Number(responseId), { response_data: data }),
		onSuccess: (updated) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			form.reset({ response_data: (updated.response_data ?? {}) as Record<string, unknown> });
			setIsEditing(false);
			toast.success(__('Response updated.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to update response. Please try again.', 'all-feedback'));
		},
	});

	const cancelEdit = () => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
		setIsEditing(false);
	};

	if (isLoading) return <DetailSkeleton />;

	if (isError || !response) {
		return (
			<div className="p-5 md:p-6">
				<div className="mb-5 flex items-center gap-1.5">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => router.history.back()}
						aria-label={__('Back', 'all-feedback')}
					>
						<ArrowLeft className="size-4" />
					</Button>
					<span className="text-[13px] text-muted-foreground">{__('Responses', 'all-feedback')}</span>
				</div>
				<div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card">
					<div className="flex flex-col items-center gap-2 p-8 text-center">
						<MessageSquare className="size-8 text-muted-foreground/30" />
						<p className="text-[15px] font-semibold text-foreground">
							{__('Response not found', 'all-feedback')}
						</p>
						<p className="text-[13px] text-muted-foreground">
							{__('This response may have been deleted or does not exist.', 'all-feedback')}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => router.history.back()}
						>
							<ArrowLeft className="size-3.5" />
							{__('Go back', 'all-feedback')}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-5 md:p-6">

			{/* ----- Breadcrumb / back nav ----- */}
			<div className="mb-5 flex items-center gap-1.5">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => router.history.back()}
					aria-label={__('Back', 'all-feedback')}
				>
					<ArrowLeft className="size-4" />
				</Button>
				<span className="text-[13px] text-muted-foreground">{__('Responses', 'all-feedback')}</span>
				<ChevronRight className="size-3.5 text-muted-foreground/50" />
				<span className="text-[13px] font-medium text-foreground">
					{__('Response', 'all-feedback')} #{response.id}
				</span>
			</div>

			{/* ----- Page header ----- */}
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div>
						<h1 className="text-[18px] font-semibold leading-snug text-foreground">
							{survey?.title ?? `${__('Survey', 'all-feedback')} #${surveyId}`}
						</h1>
						<p className="mt-0.5 text-[13px] text-muted-foreground">
							{__('Response', 'all-feedback')} #{response.id}
							{' · '}
							{format(new Date(response.created_at), 'MMM d, yyyy')}
						</p>
					</div>

					{isEditing && (
						<div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
							<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
							<span className="text-[12px] font-medium text-amber-600">
								{__('Editing', 'all-feedback')}
							</span>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					{!isEditing ? (
						<Button variant="secondary" onClick={() => setIsEditing(true)}>
							<Pencil className="size-3.5" />
							{__('Edit response', 'all-feedback')}
						</Button>
					) : (
						<>
							<Button
								variant="outline"
								onClick={cancelEdit}
								disabled={saveMutation.isPending}
							>
								<X className="size-3.5" />
								{__('Cancel', 'all-feedback')}
							</Button>
							<Button
								onClick={() => void form.handleSubmit()}
								disabled={saveMutation.isPending}
							>
								{saveMutation.isPending
									? <Loader2 className="size-3.5 animate-spin" />
									: <Check className="size-3.5" />
								}
								{__('Save changes', 'all-feedback')}
							</Button>
						</>
					)}
				</div>
			</div>

			{/* ----- Body ----- */}
			<form
				onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}
				className="grid gap-5 lg:grid-cols-[1fr_268px]"
			>
				{/* ---- Left: field answers ---- */}
				<div className={cn(
					'rounded-xl border bg-card transition-colors',
					isEditing ? 'border-amber-200' : 'border-border',
				)}>
					{/* section heading */}
					<div className={cn(
						'flex items-center justify-between border-b px-5 py-3.5 transition-colors',
						isEditing ? 'border-amber-100 bg-amber-50/50' : 'border-border bg-muted/20',
					)}>
						<h2 className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
							{__('Fields', 'all-feedback')}
						</h2>
						{isEditing && (
							<span className="text-[12px] text-amber-600">
								{__('Click any field below to edit', 'all-feedback')}
							</span>
						)}
					</div>

					<div className="divide-y divide-border">
						{schemaFields.map((schField, idx) => {
							const rawValue = responseData[schField.id];
							return (
								<form.Field key={schField.id} name="response_data">
									{(field) => (
										<div className={cn(
											'px-5 py-5 transition-colors',
											isEditing && 'hover:bg-muted/20',
										)}>
											<div className="mb-2 flex items-center gap-2">
												<span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
													{idx + 1}
												</span>
												<p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
													{schField.label}
													{schField.required && (
														<span className="ml-0.5 text-destructive">*</span>
													)}
												</p>
											</div>
											<div className="pl-7">
												{isEditing ? (
													<EditField
														field={schField}
														value={field.state.value[schField.id] ?? rawValue}
														onChange={(v) =>
															field.handleChange({ ...field.state.value, [schField.id]: v })
														}
													/>
												) : (
													<ViewField field={schField} value={rawValue} />
												)}
											</div>
										</div>
									)}
								</form.Field>
							);
						})}

						{/* Orphaned answers */}
						{orphanedKeys.map((key) => (
							<form.Field key={key} name="response_data">
								{(field) => (
									<div className={cn('px-5 py-5 transition-colors', isEditing && 'hover:bg-muted/20')}>
										<div className="mb-2 flex items-center gap-2">
											<span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">?</span>
											<p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
												{__('Unknown field', 'all-feedback')}
												<span className="ml-1.5 font-normal normal-case text-foreground/30">
													({key})
												</span>
											</p>
										</div>
										<div className="pl-7">
											{isEditing ? (
												<EditField
													field={null}
													value={field.state.value[key] ?? responseData[key]}
													onChange={(v) =>
														field.handleChange({ ...field.state.value, [key]: v })
													}
												/>
											) : (
												<ViewField field={null} value={responseData[key]} />
											)}
										</div>
									</div>
								)}
							</form.Field>
						))}

						{schemaFields.length === 0 && Object.keys(responseData).length === 0 && (
							<div className="flex flex-col items-center gap-2 py-14 text-center">
								<MessageSquare className="size-7 text-muted-foreground/30" />
								<p className="text-[14px] text-muted-foreground">
									{__('No response data recorded.', 'all-feedback')}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* ---- Right: metadata sidebar ---- */}
				<div className="rounded-xl border border-border bg-card">
					<div className="border-b border-border bg-muted/20 px-5 py-3.5">
						<h2 className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
							{__('Details', 'all-feedback')}
						</h2>
					</div>

					<div className="divide-y divide-border">
						{response.score !== null && (
							<MetaItem icon={Star} label={__('Score', 'all-feedback')}>
								<span className="font-semibold tabular-nums">{response.score}</span>
							</MetaItem>
						)}

						<MetaItem icon={CalendarDays} label={__('Submitted', 'all-feedback')}>
							<span>{format(new Date(response.created_at), 'MMM d, yyyy')}</span>
							<span className="flex items-center gap-1 text-muted-foreground">
								<Clock className="size-3" />
								{format(new Date(response.created_at), 'h:mm a')}
							</span>
						</MetaItem>

						<MetaItem icon={getDeviceIcon(response.device_type)} label={__('Device', 'all-feedback')}>
							{response.device_type ? (
								<span className="capitalize">{response.device_type}</span>
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</MetaItem>

						<MetaItem icon={Globe} label={__('Page URL', 'all-feedback')}>
							{response.page_url ? (
								<a
									href={response.page_url}
									target="_blank"
									rel="noopener noreferrer"
									className="break-all text-primary underline-offset-2 hover:underline"
								>
									{response.page_url}
								</a>
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</MetaItem>

						<MetaItem icon={Shield} label={__('Consent', 'all-feedback')}>
							{response.consent_given ? (
								<span className="inline-flex items-center gap-1 font-medium text-emerald-600">
									<ShieldCheck className="size-3.5" />
									{__('Given', 'all-feedback')}
								</span>
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</MetaItem>
					</div>
				</div>
			</form>
		</div>
	);
};

export default ResponseDetail;
