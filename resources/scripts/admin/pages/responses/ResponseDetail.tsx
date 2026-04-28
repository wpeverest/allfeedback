import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { surveysApi } from '@/admin/api/surveys';
import { surveyQuery, surveyResponseQuery, surveyResponsesQuery, surveysQuery } from '@/admin/queries/surveys';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import UnsavedChangesBadge from '@/components/ui/unsaved-changes-badge';
import { Tooltip } from '@/admin/components/Tooltip';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import {
	ArrowLeft,
	ArrowRight,
	CalendarDays,
	Check,
	CheckSquare,
	ChevronDown,
	ChevronRight,
	Eye,
	EyeOff,
	Globe,
	Inbox,
	Laptop,
	Loader2,
	Mail,
	MailOpen,
	MessageSquare,
	Monitor,
	MoreHorizontal,
	Pencil,
	Shield,
	Smartphone,
	Star,
	Tablet,
	Trash2,
	X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { SurveyFormSchemaField } from '@/admin/api/surveys';
import { FIELD_TYPES } from '@/admin/pages/forms/builder/fieldTypes';

const DetailSkeleton = () => (
	<div className="flex flex-1 flex-col bg-background">
		<div className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-card px-6">
			<div className="flex items-center gap-3">
				<div className="size-8 animate-pulse rounded-lg bg-muted" />
				<div className="h-5 w-px bg-border" />
				<div className="h-4 w-40 animate-pulse rounded bg-muted" />
			</div>
			<div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
		</div>
		<div className="flex min-h-0 flex-1">
			<div className="flex-1 overflow-y-auto p-6 space-y-5">
				<div className="space-y-2">
					<div className="h-7 w-48 animate-pulse rounded bg-muted" />
					<div className="h-4 w-72 animate-pulse rounded bg-muted" />
				</div>
				<div className="rounded-xl bg-card">
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i} className="border-b border-border px-6 py-5 last:border-0">
							<div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
							<div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
						</div>
					))}
				</div>
			</div>
			<div className="w-[30%] shrink-0 border-l border-border bg-card">
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className="border-b border-border px-5 py-4">
						<div className="h-2.5 w-16 animate-pulse rounded bg-muted mb-2" />
						<div className="h-4 w-24 animate-pulse rounded bg-muted" />
					</div>
				))}
			</div>
		</div>
	</div>
);

const ViewField = ({ field, value }: { field: SurveyFormSchemaField | null; value: unknown }) => {
	const type = field?.type ?? 'short_text';

	if (value === null || value === undefined || value === '') {
		return (
			<span className="text-base italic text-muted-foreground/70">
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
						className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-sm font-medium text-foreground"
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
			<span className="inline-flex items-center gap-2 text-base font-normal text-foreground">
				<span className="size-2 rounded-full bg-primary" />
				{String(value)}
			</span>
		);
	}

	if (type === 'nps') {
		const score = Number(value);
		const { bg, border, text, bar, label } =
			score >= 9
				? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', label: __('Promoter', 'all-feedback') }
				: score >= 7
					? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', label: __('Passive', 'all-feedback') }
					: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', label: __('Detractor', 'all-feedback') };
		const pct = (score / 10) * 100;
		return (
			<div className="space-y-3">
				<div className="flex items-center gap-4">
					<span className={cn('flex size-14 shrink-0 items-center justify-center rounded-xl border text-3xl font-bold tabular-nums', bg, border, text)}>
						{score}
					</span>
					<div>
						<p className={cn('text-md font-semibold leading-tight', text)}>{label}</p>
						<p className="mt-0.5 text-sm text-muted-foreground">{sprintf(__('%d out of 10', 'all-feedback'), score)}</p>
					</div>
				</div>
				<div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted/60">
					<div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
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
				<span className="text-sm font-medium text-muted-foreground">
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
					<span className="text-2xl font-bold tabular-nums text-foreground">{String(value)}</span>
					<span className="text-sm text-muted-foreground">/ {scaleMax}</span>
				</div>
				<div className="h-1.5 w-52 overflow-hidden rounded-full bg-muted/60">
					<div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
				</div>
				{(lowLabel || highLabel) && (
					<div className="flex w-52 justify-between text-2xs text-muted-foreground">
						<span>{lowLabel}</span>
						<span>{highLabel}</span>
					</div>
				)}
			</div>
		);
	}

	if (type === 'long_text') {
		return (
			<p className="whitespace-pre-wrap text-base font-normal leading-relaxed text-foreground">
				{String(value)}
			</p>
		);
	}

	return <span className="text-base font-normal text-foreground">{String(value)}</span>;
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
		'flex w-full rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-base text-foreground',
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
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-base">
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
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-base">
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

const SidebarRow = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
	<div className="px-5 py-3.5">
		<p className="mb-1 text-xs font-medium text-muted-foreground/70">
			{label}
		</p>
		<div className="flex min-w-0 items-center gap-2 text-base font-normal text-foreground">
			<Icon className="size-3.5 shrink-0 text-muted-foreground/70" />
			<span className="min-w-0">{children}</span>
		</div>
	</div>
);

const getDeviceIcon = (device: string | null) => {
	if (device === 'mobile')  return Smartphone;
	if (device === 'tablet')  return Tablet;
	if (device === 'desktop') return Monitor;
	return Laptop;
};

const isAnswered = (value: unknown) =>
	value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

const ResponseDetail = () => {
	const navigate    = useNavigate();
	const queryClient = useQueryClient();
	const { responseId }     = useParams({ from: '/_app/responses/$responseId' });
	const { surveyId, edit } = useSearch({ from: '/_app/responses/$responseId' });

	const [isEditing,           setIsEditing]           = useState(edit);
	const [isDirty,             setIsDirty]             = useState(false);
	const [showUnanswered,      setShowUnanswered]      = useState(false);
	const [confirmDeleteOpen,   setConfirmDeleteOpen]   = useState(false);
	const [isChangingSurvey,    setIsChangingSurvey]    = useState(false);
	const [showIp,              setShowIp]              = useState(false);

	const { data: survey } = useQuery({ ...surveyQuery(surveyId), enabled: surveyId > 0 });

	const { data: surveysData } = useQuery(surveysQuery({ per_page: 100 }));
	const allSurveys = surveysData?.surveys ?? [];

	const handleSurveyChange = async (id: string) => {
		const newSurveyId = Number(id);
		if (newSurveyId === surveyId) return;
		setIsChangingSurvey(true);
		try {
			const result = await surveysApi.listResponses(newSurveyId, { per_page: 1, page: 1 });
			const first  = result?.responses?.[0];
			if (first) {
				void navigate({
					to:     '/responses/$responseId',
					params: { responseId: String(first.id) },
					search: { surveyId: newSurveyId },
				});
			} else {
				toast.info(__('This form has no responses yet.', 'all-feedback'));
			}
		} catch {
			toast.error(__('Failed to load responses for this form.', 'all-feedback'));
		} finally {
			setIsChangingSurvey(false);
		}
	};

	const { data: responsesListData } = useQuery({
		...surveyResponsesQuery(surveyId, { per_page: 100, page: 1 }),
		enabled:   surveyId > 0,
		staleTime: 60_000,
	});

	const { data: response, isLoading, isError } = useQuery({
		...surveyResponseQuery(surveyId, Number(responseId)),
		enabled: surveyId > 0,
	});

	const schemaFields   = survey?.form_schema?.sections?.flatMap((s) => s.fields) ?? [];
	const schemaFieldMap = Object.fromEntries(schemaFields.map((f) => [f.id, f]));
	const responseData   = response?.response_data ?? {};
	const orphanedKeys   = Object.keys(responseData).filter((k) => !(k in schemaFieldMap));

	const answeredFields          = schemaFields.filter((f) => isAnswered(responseData[f.id]));
	const unansweredOptional      = schemaFields.filter((f) => !f.required && !isAnswered(responseData[f.id]));
	const completionPct           = schemaFields.length > 0
		? Math.round((answeredFields.length / schemaFields.length) * 100)
		: 100;

	const NAME_KEYWORDS = /name|nombre|nom|full name|first name|last name|your name/i;
	const nameField = schemaFields.find(
		(f) => (f.type === 'short_text' || f.type === 'long_text') && NAME_KEYWORDS.test(f.label),
	);
	const respondentName = nameField && isAnswered(responseData[nameField.id])
		? String(responseData[nameField.id])
		: null;

	// Sorted newest-first (matches list default) for prev/next navigation.
	const sortedForNav = [...(responsesListData?.responses ?? [])].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);
	const currentNavIndex = sortedForNav.findIndex((r) => r.id === Number(responseId));
	const prevNavResponse = currentNavIndex > 0 ? sortedForNav[currentNavIndex - 1] : null;
	const nextNavResponse = currentNavIndex < sortedForNav.length - 1 ? sortedForNav[currentNavIndex + 1] : null;

	const navigateToResponse = (r: { id: number; survey_id: number }) => {
		void navigate({
			to:     '/responses/$responseId',
			params: { responseId: String(r.id) },
			search: { surveyId: r.survey_id },
		});
	};

	const autoMarkRef  = useRef(false);
	const isMountedRef = useRef(true);
	useEffect(() => () => { isMountedRef.current = false; }, []);

	const markReadMutation = useMutation({
		mutationFn: (isRead: boolean) =>
			surveysApi.updateResponse(surveyId, Number(responseId), { is_read: isRead }),
		onSuccess: (updatedResponse, isRead) => {
			if (isMountedRef.current) {
				void queryClient.invalidateQueries({ queryKey: ['responses'] });
				if (!autoMarkRef.current) {
					toast.success(isRead ? __('Marked as read.', 'all-feedback') : __('Marked as unread.', 'all-feedback'));
				}
			} else if (!autoMarkRef.current) {
				void queryClient.invalidateQueries({ queryKey: ['responses'] });
			} else {
				queryClient.setQueryData(
					['responses', surveyId, Number(responseId)] as const,
					updatedResponse,
				);
			}
			autoMarkRef.current = false;
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => surveysApi.deleteResponse(surveyId, Number(responseId)),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setConfirmDeleteOpen(false);
			toast.success(__('Response deleted.', 'all-feedback'));
			void navigate({ to: '/responses', search: { surveyId } });
		},
		onError: () => { toast.error(__('Failed to delete response.', 'all-feedback')); },
	});

	useEffect(() => {
		if (response && !response.is_read) {
			autoMarkRef.current = true;
			markReadMutation.mutate(true);
		}
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

	const blocker = useBlocker({
		shouldBlockFn: () => isEditing && isDirty,
	});

	const handleBack = () => { void navigate({ to: '/responses', search: { surveyId } }); };

	const cancelEdit = () => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
		setIsEditing(false);
		setIsDirty(false);
	};

	const handleDelete = () => {
		setConfirmDeleteOpen(true);
	};

	if (isLoading) return <DetailSkeleton />;

	if (isError || !response) {
		return (
			<div className="flex flex-1 flex-col bg-background">
				<div className="flex h-[60px] shrink-0 items-center border-b border-border bg-card px-6">
					<Button variant="ghost" size="icon-sm" onClick={handleBack} aria-label={__('Back', 'all-feedback')}>
						<ArrowLeft className="size-4" />
					</Button>
					<span className="mx-3 h-5 w-px bg-border" />
					<span className="text-sm font-semibold text-foreground">{__('Response not found', 'all-feedback')}</span>
				</div>
				<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16 text-center">
					<div
						className="pointer-events-none absolute inset-0 select-none"
						style={ { background: 'radial-gradient(ellipse 80% 55% at 50% 45%, oklch(0.580 0.238 277 / 0.07), transparent)' } }
						aria-hidden
					/>
					<div className="relative z-10 flex flex-col items-center">
						<div className="flex items-center gap-3">
							<div className="h-px w-14 bg-gradient-to-r from-transparent to-border" />
							<div className="flex size-10 items-center justify-center rounded-xl bg-muted">
								<Inbox className="size-[18px] text-muted-foreground/70" strokeWidth={ 1.5 } />
							</div>
							<div className="h-px w-14 bg-gradient-to-l from-transparent to-border" />
						</div>
						<h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
							{__('Response not found', 'all-feedback')}
						</h2>
						<p className="mt-2.5 max-w-[268px] text-sm leading-relaxed text-muted-foreground">
							{__('This response may have been deleted or does not exist.', 'all-feedback')}
						</p>
						<Button
							variant="outline"
							className="mt-8"
							onClick={ () => void navigate({ to: '/responses', search: { surveyId } }) }
						>
							<ArrowLeft className="size-3.5" />
							{__('Back to Responses', 'all-feedback')}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const surveyTitle = survey?.title ?? `${__('Survey', 'all-feedback')} #${surveyId}`;

	return (
		<div className="flex flex-1 flex-col bg-background overflow-hidden">

			<ConfirmDialog
				open={confirmDeleteOpen}
				onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setConfirmDeleteOpen(false); }}
				onConfirm={() => { deleteMutation.mutate(); }}
				title={__('Delete this response?', 'all-feedback')}
				description={__('This cannot be undone. The response will be permanently removed.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={deleteMutation.isPending}
			/>

			<ConfirmDialog
				open={blocker.status === 'blocked'}
				onOpenChange={(open) => { if (!open) blocker.reset?.(); }}
				onConfirm={() => { blocker.proceed?.(); }}
				title={__('Leave without saving?', 'all-feedback')}
				description={__('You have unsaved changes. They will be lost if you leave.', 'all-feedback')}
				confirmLabel={__('Leave', 'all-feedback')}
				cancelLabel={__('Stay', 'all-feedback')}
			/>

			<div className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-6">
				<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
					<Tooltip content={__('Back to responses', 'all-feedback')}>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleBack}
							aria-label={__('Back', 'all-feedback')}
						>
							<ArrowLeft className="size-4" />
						</Button>
					</Tooltip>
					<span className="h-5 w-px bg-border" />
					<Select value={String(surveyId)} onValueChange={(id) => { void handleSurveyChange(id); }} disabled={isChangingSurvey}>
						<SelectTrigger className="h-8 w-[140px] sm:w-[220px] border-transparent bg-transparent px-2 text-sm font-semibold shadow-none hover:border-border hover:bg-muted/50 focus:ring-0 disabled:opacity-60">
							{isChangingSurvey
								? <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
								: <SelectValue />
							}
						</SelectTrigger>
						<SelectContent>
							{allSurveys.map((s) => (
								<SelectItem key={s.id} value={String(s.id)}>
									{s.title}
								</SelectItem>
							))}
							{allSurveys.length === 0 && (
								<SelectItem value={String(surveyId)}>{surveyTitle}</SelectItem>
							)}
						</SelectContent>
					</Select>
					<ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 hidden sm:block" />
					<span className="text-sm text-muted-foreground hidden sm:inline">#{response.id}</span>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2">
					{isEditing && isDirty && <UnsavedChangesBadge />}

					{!isEditing ? (
						<>
							<Button
								variant="ghost"
								size="sm"
								className="hidden sm:flex"
								onClick={() => markReadMutation.mutate(!response.is_read)}
								disabled={markReadMutation.isPending}
							>
								{markReadMutation.isPending
									? <Loader2 className="size-3.5 animate-spin" />
									: response.is_read ? <Mail className="size-3.5" /> : <MailOpen className="size-3.5" />
								}
								{response.is_read ? __('Mark as unread', 'all-feedback') : __('Mark as read', 'all-feedback')}
							</Button>
							<Button
								size="sm"
								onClick={() => setIsEditing(true)}
							>
								<Pencil className="size-3.5" />
								{__('Edit', 'all-feedback')}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon-sm">
										<MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => markReadMutation.mutate(!response.is_read)}
										disabled={markReadMutation.isPending}
									>
										{response.is_read ? <Mail className="size-3.5" /> : <MailOpen className="size-3.5" />}
										{response.is_read ? __('Mark as unread', 'all-feedback') : __('Mark as read', 'all-feedback')}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={handleDelete}
										disabled={deleteMutation.isPending}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="size-3.5" />
										{__('Delete response', 'all-feedback')}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					) : (
						<>
							<Button variant="outline" size="sm" onClick={cancelEdit} disabled={saveMutation.isPending}>
								<X className="size-3.5" />
								{__('Cancel', 'all-feedback')}
							</Button>
							<Tooltip content={!isDirty ? __('No changes to save', 'all-feedback') : undefined}>
								<span className="inline-flex">
									<Button
										size="sm"
										onClick={() => void form.handleSubmit()}
										disabled={saveMutation.isPending || !isDirty}
									>
										{saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
										{__('Save changes', 'all-feedback')}
									</Button>
								</span>
							</Tooltip>
						</>
					)}
				</div>
			</div>

			<form
				onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}
				className="flex flex-col overflow-y-auto md:flex-row md:min-h-0 md:flex-1 md:overflow-hidden"
			>
				<div className="p-4 space-y-5 sm:p-6 sm:space-y-6 md:flex-1 md:overflow-y-auto">



					<div className="rounded-xl border border-border bg-card overflow-hidden">
						{schemaFields.filter((f) => f.required || isAnswered(responseData[f.id])).map((schField) => {
							const rawValue = responseData[schField.id];
							const typeConfig = FIELD_TYPES.find((t) => t.type === schField.type);
							const FieldIcon = typeConfig?.Icon ?? MessageSquare;
							return (
								<form.Field key={schField.id} name="response_data">
									{(field) => (
										<div className={cn(
											'border-b border-border px-4 py-5 sm:px-6 sm:py-6 last:border-0 transition-colors',
											isEditing && 'hover:bg-muted/30',
										)}>
											<div className="mb-3 flex items-center gap-3">
												<Tooltip content={typeConfig?.label}>
													<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
														<FieldIcon className="size-4 text-muted-foreground" />
													</span>
												</Tooltip>
												<div className="flex items-baseline gap-1 text-base font-medium text-foreground/80">
													<span
														className="[&_p]:m-0 [&_p]:inline text-base"
														dangerouslySetInnerHTML={{ __html: schField.label }}
													/>
													{schField.required && <span className="text-destructive">*</span>}
												</div>
											</div>
											<div className="pl-11">
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
									<div className={cn('border-b border-border px-4 py-5 sm:px-6 sm:py-6 last:border-0 transition-colors', isEditing && 'hover:bg-muted/30')}>
										<div className="mb-3 flex items-center gap-2.5">
											<span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-bold text-muted-foreground">?</span>
											<p className="text-sm font-medium text-foreground/70">
												{__('Deleted question', 'all-feedback')}
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
							<div className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-14 text-center">
								<div
									className="pointer-events-none absolute inset-0 select-none"
									style={ { background: 'radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.580 0.238 277 / 0.05), transparent)' } }
									aria-hidden
								/>
								<div className="relative z-10 flex flex-col items-center gap-4">
									<div className="flex items-center gap-3">
										<div className="h-px w-10 bg-gradient-to-r from-transparent to-border" />
										<div className="flex size-9 items-center justify-center rounded-xl bg-muted">
											<MessageSquare className="size-4 text-muted-foreground/60" strokeWidth={ 1.5 } />
										</div>
										<div className="h-px w-10 bg-gradient-to-l from-transparent to-border" />
									</div>
									<p className="text-sm text-muted-foreground">{__('No response data recorded.', 'all-feedback')}</p>
								</div>
							</div>
						)}
					</div>

					{unansweredOptional.length > 0 && !isEditing && (
						<button
							type="button"
							onClick={() => setShowUnanswered((v) => !v)}
							className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ChevronDown className={cn('size-4 transition-transform', showUnanswered && 'rotate-180')} />
							{showUnanswered
								? __('Hide unanswered optional fields', 'all-feedback')
								: sprintf(__('Show %d unanswered optional fields', 'all-feedback'), unansweredOptional.length)
							}
						</button>
					)}

					{showUnanswered && !isEditing && unansweredOptional.length > 0 && (
						<div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
							{unansweredOptional.map((schField) => {
								const typeConfig = FIELD_TYPES.find((t) => t.type === schField.type);
								return (
									<div key={schField.id} className="border-b border-border px-6 py-5 last:border-0">
										<div className="mb-1.5 flex items-center gap-3">
											<Tooltip content={typeConfig?.label}>
												<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
													{typeConfig ? (
														<typeConfig.Icon className="size-4 text-muted-foreground" />
													) : (
														<MessageSquare className="size-4 text-muted-foreground" />
													)}
												</span>
											</Tooltip>
											<div
												className="text-base font-medium text-foreground/70 [&_p]:m-0 [&_p]:inline"
												dangerouslySetInnerHTML={{ __html: schField.label }}
											/>
										</div>
										<div className="mt-3 pl-11 opacity-50">
											<span className="text-base italic text-muted-foreground/40">
												{__('No answer provided', 'all-feedback')}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}

				</div>

				<aside className="border-t border-border p-4 space-y-4 sm:p-6 sm:space-y-5 md:border-t-0 md:border-l md:w-[30%] md:shrink-0 md:overflow-y-auto">

					<div className="rounded-xl border border-border bg-card overflow-hidden">
						<div className="px-5 pt-5">
							<p className="!mb-0 text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">
								{__('Details', 'all-feedback')}
							</p>
						</div>
						<div className="divide-y divide-border">
							<SidebarRow icon={response.is_read ? MailOpen : Mail} label={__('Status', 'all-feedback')}>
								{response.is_read ? (
									<span className="text-muted-foreground">{__('Read', 'all-feedback')}</span>
								) : (
									<div className="flex items-center gap-1.5">
										<span className="size-1.5 rounded-full bg-orange-400" />
										<span className="font-bold text-orange-600 uppercase tracking-tight text-[10px]">
											{__('Unread', 'all-feedback')}
										</span>
									</div>
								)}
							</SidebarRow>

							<SidebarRow icon={CalendarDays} label={__('Submitted', 'all-feedback')}>
								{format(new Date(response.created_at), 'MMM d, yyyy · h:mm a')}
							</SidebarRow>

							<SidebarRow icon={CheckSquare} label={__('Fields answered', 'all-feedback')}>
								{completionPct}%
							</SidebarRow>

							<SidebarRow icon={getDeviceIcon(response.device_type)} label={__('Device', 'all-feedback')}>
								{response.device_type ? (
									<span className="capitalize">{response.device_type}</span>
								) : (
									<span className="text-muted-foreground">—</span>
								)}
							</SidebarRow>

							<SidebarRow icon={Shield} label={__('IP Address', 'all-feedback')}>
								<div className="flex items-center gap-2">
									<span className="font-mono text-sm">
										{showIp ? (response.ip_address ?? '—') : '••••••••••••'}
									</span>
									<Tooltip content={showIp ? __('Hide IP', 'all-feedback') : __('Show IP', 'all-feedback')}>
										<button
											type="button"
											onClick={() => setShowIp(!showIp)}
											className="flex size-6 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
										>
											{showIp ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
										</button>
									</Tooltip>
								</div>
							</SidebarRow>

							<SidebarRow icon={Globe} label={__('Page URL', 'all-feedback')}>
								{response.page_url ? (
									<Tooltip content={response.page_url}>
										<a
											href={response.page_url}
											target="_blank"
											rel="noopener noreferrer"
											className="block truncate font-medium !text-primary underline underline-offset-2 hover:!opacity-80"
										>
											{response.page_url}
										</a>
									</Tooltip>
								) : (
									<span className="text-muted-foreground/60">—</span>
								)}
							</SidebarRow>


						</div>
					</div>

				</aside>
			</form>

			<div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-card/95 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => prevNavResponse && navigateToResponse(prevNavResponse)}
						disabled={!prevNavResponse}
					>
						<ArrowLeft className="size-3.5" />
						{__('Previous', 'all-feedback')}
					</Button>
					<div className="flex flex-col items-center gap-0.5">
						{currentNavIndex >= 0 && sortedForNav.length > 0 && (
							<span className="text-xs tabular-nums text-muted-foreground/70">
								{currentNavIndex + 1} / {sortedForNav.length}
							</span>
						)}
						{sortedForNav.length === 100 && (
							<span className="text-2xs text-muted-foreground/40">
								{__('Showing most recent 100 responses', 'all-feedback')}
							</span>
						)}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => nextNavResponse && navigateToResponse(nextNavResponse)}
						disabled={!nextNavResponse}
					>
						{__('Next', 'all-feedback')}
						<ArrowRight className="size-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ResponseDetail;
