import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { surveysApi } from '@/admin/api/surveys';
import { surveyQuery, surveyResponseQuery } from '@/admin/queries/surveys';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useParams, useRouter, useSearch } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import {
	ArrowLeft,
	CalendarDays,
	Check,
	CheckSquare,
	Globe,
	Laptop,
	Loader2,
	Mail,
	MailOpen,
	MessageSquare,
	Monitor,
	Pencil,
	Smartphone,
	Star,
	Tablet,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SurveyFormSchemaField } from '@/admin/api/surveys';

const DetailSkeleton = () => (
	<div className="flex flex-col">
		<div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-white px-6">
			<div className="flex items-center gap-2">
				<div className="size-8 animate-pulse rounded-lg bg-muted" />
				<div className="h-5 w-px bg-border" />
				<div className="h-4 w-40 animate-pulse rounded bg-muted" />
			</div>
			<div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
		</div>
		<div className="p-6">
			<div className="grid gap-5 lg:grid-cols-[1fr_380px]">
				<div className="rounded-2xl border border-border/60 bg-white">
					<div className="border-b border-border/50 px-6 py-4">
						<div className="h-4 w-20 animate-pulse rounded bg-muted" />
					</div>
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i} className="border-b border-border/40 px-6 py-5 last:border-0">
							<div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
							<div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
						</div>
					))}
				</div>
				<div className="rounded-2xl border border-border/60 bg-white">
					<div className="border-b border-border/50 px-5 py-4">
						<div className="h-4 w-16 animate-pulse rounded bg-muted" />
					</div>
					{Array.from({ length: 5 }, (_, i) => (
						<div key={i} className="flex items-center gap-3 border-b border-border/40 px-5 py-4 last:border-0">
							<div className="size-8 animate-pulse rounded-lg bg-muted" />
							<div className="space-y-1.5">
								<div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
								<div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	</div>
);

const ViewField = ({ field, value }: { field: SurveyFormSchemaField | null; value: unknown }) => {
	const type = field?.type ?? 'short_text';

	if (value === null || value === undefined || value === '') {
		return (
			<span className="text-[13px] italic text-muted-foreground/60">
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
						className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[13px] font-medium text-foreground"
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
			<span className="inline-flex items-center gap-2 text-[15px] text-foreground">
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
				<span className={cn('rounded-xl border px-3.5 py-1.5 text-[24px] font-bold tabular-nums', bg, border, text)}>
					{score}
				</span>
				<div>
					<p className={cn('text-[14px] font-semibold', text)}>{label}</p>
					<p className="text-[12px] text-muted-foreground">{__('out of 10', 'all-feedback')}</p>
				</div>
			</div>
		);
	}

	if (type === 'star_rating') {
		const stars = Number(value);
		const max   = (field?.settings?.starRange as number | undefined) ?? 5;
		return (
			<div className="flex items-center gap-2.5">
				<span className="flex items-center gap-0.5">
					{Array.from({ length: max }, (_, i) => (
						<Star
							key={i}
							className={cn('size-5', i < stars ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')}
						/>
					))}
				</span>
				<span className="text-[13px] font-medium text-muted-foreground">
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
		const pct       = ((Number(value) - scaleMin) / (scaleMax - scaleMin)) * 100;
		return (
			<div className="space-y-2.5">
				<div className="flex items-baseline gap-1.5">
					<span className="text-[24px] font-bold tabular-nums text-foreground">{String(value)}</span>
					<span className="text-[13px] text-muted-foreground">/ {scaleMax}</span>
				</div>
				<div className="h-1.5 w-52 overflow-hidden rounded-full bg-muted/60">
					<div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
				</div>
				{(lowLabel || highLabel) && (
					<div className="flex w-52 justify-between text-[11px] text-muted-foreground">
						<span>{lowLabel}</span>
						<span>{highLabel}</span>
					</div>
				)}
			</div>
		);
	}

	if (type === 'long_text') {
		return (
			<p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
				{String(value)}
			</p>
		);
	}

	return <span className="text-[15px] text-foreground">{String(value)}</span>;
};

const EditField = ({
	field, value, onChange,
}: {
	field:    SurveyFormSchemaField | null;
	value:    unknown;
	onChange: (v: unknown) => void;
}) => {
	const type = field?.type ?? 'short_text';

	const textareaCls = cn(
		'flex w-full rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-[14px] text-foreground',
		'placeholder:text-muted-foreground/50',
		'transition-all focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/8 focus:outline-none',
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

	const subtleInput = 'border-border/50 bg-muted/30 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-primary/8';

	if (type === 'radio') {
		const options = (field?.settings?.options as string[] | undefined) ?? [];
		const current = String(value ?? '');
		return (
			<div className="flex flex-col gap-2.5">
				{options.map((opt) => (
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
						<input type="radio" className="accent-primary" checked={current === opt} onChange={() => onChange(opt)} />
						{opt}
					</label>
				))}
				{!options.length && <Input className={subtleInput} value={current} onChange={(e) => onChange(e.target.value)} />}
			</div>
		);
	}

	if (type === 'checkboxes') {
		const options  = (field?.settings?.options as string[] | undefined) ?? [];
		const selected = Array.isArray(value) ? (value as string[]) : [];
		const toggle   = (opt: string) => {
			const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
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
						className={subtleInput}
						value={selected.join(', ')}
						onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
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
				className={cn('w-28', subtleInput)}
				type="number" min={1} max={max}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
			/>
		);
	}

	if (type === 'scale') {
		const scaleMin = (field?.settings?.scaleMin as number | undefined) ?? 1;
		const scaleMax = (field?.settings?.scaleMax as number | undefined) ?? 10;
		return (
			<Input
				className={cn('w-28', subtleInput)}
				type="number" min={scaleMin} max={scaleMax}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
			/>
		);
	}

	if (type === 'nps') {
		return (
			<Input
				className={cn('w-28', subtleInput)}
				type="number" min={0} max={10}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
			/>
		);
	}

	return <Input className={subtleInput} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
};

const MetaItem = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
	<div className="px-5 py-4">
		<div className="mb-1.5 flex items-center gap-1.5">
			<Icon className="size-3 shrink-0 text-muted-foreground/50" />
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/55">
				{label}
			</p>
		</div>
		<div className="pl-[18px] text-[13px] text-foreground">{children}</div>
	</div>
);

const getDeviceIcon = (device: string | null) => {
	if (device === 'mobile')  return Smartphone;
	if (device === 'tablet')  return Tablet;
	if (device === 'desktop') return Monitor;
	return Laptop;
};

const ResponseDetail = () => {
	const router      = useRouter();
	const queryClient = useQueryClient();
	const { responseId }     = useParams({ from: '/_app/responses/$responseId' });
	const { surveyId, edit } = useSearch({ from: '/_app/responses/$responseId' });

	const [isEditing, setIsEditing] = useState(edit);
	const [isDirty,   setIsDirty]   = useState(false);

	const { data: survey } = useQuery({ ...surveyQuery(surveyId), enabled: surveyId > 0 });

	const { data: response, isLoading, isError } = useQuery({
		...surveyResponseQuery(surveyId, Number(responseId)),
		enabled: surveyId > 0,
	});

	const schemaFields   = survey?.form_schema?.sections?.flatMap((s) => s.fields) ?? [];
	const schemaFieldMap = Object.fromEntries(schemaFields.map((f) => [f.id, f]));
	const responseData   = response?.response_data ?? {};
	const orphanedKeys   = Object.keys(responseData).filter((k) => !(k in schemaFieldMap));

	const markReadMutation = useMutation({
		mutationFn: (isRead: boolean) =>
			surveysApi.updateResponse(surveyId, Number(responseId), { is_read: isRead }),
		onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['responses'] }); },
	});

	useEffect(() => {
		if (response && !response.is_read) markReadMutation.mutate(true);
	}, [response?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const saveMutation = useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			surveysApi.updateResponse(surveyId, Number(responseId), { response_data: data }),
		onSuccess: (updated) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			form.reset({ response_data: (updated.response_data ?? {}) as Record<string, unknown> });
			setIsEditing(false);
			setIsDirty(false);
			toast.success(__('Response updated.', 'all-feedback'));
		},
		onError: () => { toast.error(__('Failed to update response. Please try again.', 'all-feedback')); },
	});

	const form = useForm({
		defaultValues: { response_data: (response?.response_data ?? {}) as Record<string, unknown> },
		onSubmit: ({ value }) => { saveMutation.mutate(value.response_data); },
	});

	useEffect(() => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
		setIsDirty(false);
	}, [response?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!isEditing) return;
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				void form.handleSubmit();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (!isEditing || !isDirty) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isEditing, isDirty]);

	useBlocker({
		shouldBlockFn: () => {
			if (!isEditing || !isDirty) return false;
			return !window.confirm(__('You have unsaved changes. Leave without saving?', 'all-feedback'));
		},
	});

	const handleBack = () => { router.history.back(); };

	const cancelEdit = () => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
		setIsEditing(false);
		setIsDirty(false);
	};

	if (isLoading) return <DetailSkeleton />;

	if (isError || !response) {
		return (
			<div className="flex flex-col">
				<div className="flex h-[68px] shrink-0 items-center border-b border-border bg-white px-6">
					<Button variant="ghost" size="icon-sm" onClick={handleBack} aria-label={__('Back', 'all-feedback')}>
						<ArrowLeft className="size-4" />
					</Button>
					<span className="mx-2 h-5 w-px bg-border" />
					<span className="text-[14px] font-semibold text-foreground">{__('Response not found', 'all-feedback')}</span>
				</div>
				<div className="flex min-h-[300px] items-center justify-center p-6">
					<div className="flex flex-col items-center gap-2 text-center">
						<MessageSquare className="size-8 text-muted-foreground/30" />
						<p className="text-[15px] font-semibold text-foreground">{__('Response not found', 'all-feedback')}</p>
						<p className="text-[13px] text-muted-foreground">{__('This response may have been deleted or does not exist.', 'all-feedback')}</p>
						<Button variant="outline" size="sm" className="mt-2" onClick={() => router.history.back()}>
							<ArrowLeft className="size-3.5" />
							{__('Go back', 'all-feedback')}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">

			<div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-white px-6">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Button variant="ghost" size="icon-sm" onClick={handleBack} aria-label={__('Back', 'all-feedback')}>
						<ArrowLeft className="size-4" />
					</Button>
					<span className="h-5 w-px bg-border" />
					<p className="truncate text-[14px] font-semibold text-foreground">
						{survey?.title ?? `${__('Survey', 'all-feedback')} #${surveyId}`}
					</p>
				</div>

				<div className="flex items-center gap-3">
					{isEditing && isDirty && (
						<div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
							<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
							<span className="text-[12px] font-medium text-amber-600">{__('Unsaved changes', 'all-feedback')}</span>
						</div>
					)}

					{!isEditing ? (
						<>
							<button
								type="button"
								onClick={() => markReadMutation.mutate(!response.is_read)}
								disabled={markReadMutation.isPending}
								title={response.is_read ? __('Mark as unread', 'all-feedback') : __('Mark as read', 'all-feedback')}
								className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
							>
								{response.is_read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
							</button>
							<Button
								variant="outline"
								className="border-primary text-primary hover:bg-primary/5 hover:text-primary"
								onClick={() => setIsEditing(true)}
							>
								<Pencil className="size-3.5" />
								{__('Edit response', 'all-feedback')}
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={cancelEdit} disabled={saveMutation.isPending}>
								<X className="size-3.5" />
								{__('Cancel', 'all-feedback')}
							</Button>
							<Button onClick={() => void form.handleSubmit()} disabled={saveMutation.isPending || !isDirty}>
								{saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
								{__('Save changes', 'all-feedback')}
							</Button>
						</>
					)}
				</div>
			</div>

			<form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }} className="p-6">
				<div className="grid gap-5 lg:grid-cols-[1fr_380px]">

					<div className="rounded-2xl border border-border/60 bg-white">
						<div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
							<h2 className="text-[13px] font-semibold text-foreground">
								{__('Responses', 'all-feedback')}
							</h2>
						</div>

						<div>
							{schemaFields.map((schField, idx) => {
								const rawValue = responseData[schField.id];
								return (
									<form.Field key={schField.id} name="response_data">
										{(field) => (
											<div className={cn(
												'px-6 py-5 transition-colors',
												isEditing && 'hover:bg-muted/[0.04]',
											)}>
												<div className="mb-2.5 flex items-center gap-2">
													<span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold tabular-nums text-muted-foreground">
														{idx + 1}
													</span>
													<p className="text-[12px] font-medium text-muted-foreground">
														{schField.label}
														{schField.required && <span className="ml-0.5 text-destructive">*</span>}
													</p>
												</div>
												<div className="pl-7">
													{isEditing ? (
														<EditField
															field={schField}
															value={field.state.value[schField.id] ?? rawValue}
															onChange={(v) => { field.handleChange({ ...field.state.value, [schField.id]: v }); setIsDirty(true); }}
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

							{orphanedKeys.map((key) => (
								<form.Field key={key} name="response_data">
									{(field) => (
										<div className={cn('px-6 py-5 transition-colors', isEditing && 'hover:bg-muted/[0.04]')}>
											<div className="mb-2.5 flex items-center gap-2">
												<span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">?</span>
												<p className="text-[12px] font-medium text-muted-foreground">
													{__('Unknown field', 'all-feedback')}
													<span className="ml-1.5 font-normal text-foreground/30">({key})</span>
												</p>
											</div>
											<div className="pl-7">
												{isEditing ? (
													<EditField
														field={null}
														value={field.state.value[key] ?? responseData[key]}
														onChange={(v) => { field.handleChange({ ...field.state.value, [key]: v }); setIsDirty(true); }}
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
								<div className="flex flex-col items-center gap-2 py-16 text-center">
									<MessageSquare className="size-7 text-muted-foreground/25" />
									<p className="text-[14px] text-muted-foreground">{__('No response data recorded.', 'all-feedback')}</p>
								</div>
							)}
						</div>
					</div>

					<div className="rounded-2xl border border-border/60 bg-white">
						<div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
							<h2 className="text-[13px] font-semibold text-foreground">
								{__('Details', 'all-feedback')}
							</h2>
							{response.is_read ? (
								<span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
									{__('Read', 'all-feedback')}
								</span>
							) : (
								<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
									{__('Unread', 'all-feedback')}
								</span>
							)}
						</div>

						<div className="divide-y divide-border/40">
							<MetaItem icon={CalendarDays} label={__('Submitted', 'all-feedback')}>
								<span>{format(new Date(response.created_at), 'MMM d, yyyy · h:mm a')}</span>
							</MetaItem>

							{response.score !== null && (
								<MetaItem icon={Star} label={__('Score', 'all-feedback')}>
									<span className="text-[15px] font-semibold tabular-nums">{response.score}</span>
								</MetaItem>
							)}

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

						</div>
					</div>

				</div>
			</form>
		</div>
	);
};

export default ResponseDetail;
