import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { surveysApi } from '@/admin/api/surveys';
import { surveysQuery } from '@/admin/queries/surveys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight, Edit2, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SurveyStatus } from '@/admin/api/surveys';

const STATUS_BADGE: Record<SurveyStatus, { variant: 'success' | 'secondary' | 'outline'; label: string }> = {
	published: { variant: 'success',   label: __('Published', 'all-feedback') },
	draft:     { variant: 'outline',   label: __('Draft',     'all-feedback') },
	paused:    { variant: 'secondary', label: __('Paused',    'all-feedback') },
	archived:  { variant: 'secondary', label: __('Archived',  'all-feedback') },
};

const PER_PAGE_OPTIONS = ['10', '25', '50'];

/* ── Skeleton row ──────────────────────────────────────────────────────── */
const SkeletonRow = () => (
	<tr className="border-b border-border">
		<td className="px-4 py-3.5">
			<div className="size-4 animate-pulse rounded bg-muted" />
		</td>
		<td className="px-4 py-3.5">
			<div className="h-4 w-44 animate-pulse rounded bg-muted" />
		</td>
		<td className="px-4 py-3.5">
			<div className="h-4 w-12 animate-pulse rounded bg-muted" />
		</td>
		<td className="px-4 py-3.5">
			<div className="h-4 w-24 animate-pulse rounded bg-muted" />
		</td>
		<td className="px-4 py-3.5">
			<div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
		</td>
		<td className="px-4 py-3.5">
			<div className="ml-auto flex justify-end gap-1">
				<div className="size-7 animate-pulse rounded bg-muted" />
				<div className="size-7 animate-pulse rounded bg-muted" />
			</div>
		</td>
	</tr>
);

const AllForms = () => {
	const navigate     = useNavigate();
	const queryClient  = useQueryClient();
	const [search,     setSearch]     = useState('');
	const [status,     setStatus]     = useState('all');
	const [perPage,    setPerPage]    = useState('10');
	const [page,       setPage]       = useState(1);
	const [checked,         setChecked]         = useState<number[]>([]);
	const [deletingId,      setDeletingId]      = useState<number | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

	const queryParams = {
		page,
		per_page: Number(perPage),
		...(search           && { search }),
		...(status !== 'all' && { status }),
	};

	const { data, isLoading, isError } = useQuery(surveysQuery(queryParams));

	const surveys    = data?.surveys ?? [];
	const total      = data?.total   ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / Number(perPage)));
	const start      = total === 0 ? 0 : (page - 1) * Number(perPage) + 1;
	const end        = Math.min(page * Number(perPage), total);

	/* ── Create mutation ───────────────────────────────────────────────── */
	const createMutation = useMutation({
		mutationFn: () =>
			surveysApi.create({ title: __('Untitled Form', 'all-feedback') }),
		onSuccess: (survey) => {
			void navigate({
				to:     '/builder/',
				search: { new: true, id: survey.id },
			});
		},
	});

	/* ── Delete mutation ───────────────────────────────────────────────── */
	const deleteMutation = useMutation({
		mutationFn: (id: number) => surveysApi.delete(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			setDeletingId(null);
			setConfirmDeleteId(null);
			toast.success(__('Form deleted.', 'all-feedback'));
		},
		onError: () => {
			setDeletingId(null);
			setConfirmDeleteId(null);
			toast.error(__('Failed to delete form. Please try again.', 'all-feedback'));
		},
	});

	const handleDeleteConfirm = () => {
		if (!confirmDeleteId) return;
		setDeletingId(confirmDeleteId);
		deleteMutation.mutate(confirmDeleteId);
	};

	/* ── Selection ─────────────────────────────────────────────────────── */
	const allChecked = surveys.length > 0 && surveys.every((s) => checked.includes(s.id));
	const toggleAll  = () => setChecked(allChecked ? [] : surveys.map((s) => s.id));
	const toggleOne  = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	return (
		<div className="p-5 md:p-6">
			<ConfirmDialog
				open={confirmDeleteId !== null}
				onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setConfirmDeleteId(null); }}
				onConfirm={handleDeleteConfirm}
				title={__('Delete form?', 'all-feedback')}
				description={__('This action cannot be undone. All responses collected for this form will also be permanently deleted.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={deleteMutation.isPending}
			/>

			{/* ── Toolbar ────────────────────────────────────────────────── */}
			<div className="mb-4 flex flex-wrap items-center gap-3 py-1">
				<div className="relative w-[260px]">
					<svg className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
						<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
					</svg>
					<Input
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						placeholder={__('Search...', 'all-feedback')}
						className="pl-9"
					/>
				</div>

				<Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder={__('All Status', 'all-feedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All Status', 'all-feedback')}</SelectItem>
						<SelectItem value="published">{__('Published', 'all-feedback')}</SelectItem>
						<SelectItem value="draft">{__('Draft',     'all-feedback')}</SelectItem>
					</SelectContent>
				</Select>

				<div className="ml-auto">
					<Button
						onClick={() => createMutation.mutate()}
						disabled={createMutation.isPending}
					>
						{createMutation.isPending
							? <Loader2 className="size-4 animate-spin" />
							: <Plus className="size-4" />
						}
						{__('Add New Form', 'all-feedback')}
					</Button>
				</div>
			</div>

			{/* ── Table card ─────────────────────────────────────────────── */}
			<div className="rounded-xl border border-border bg-card">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="w-10 px-4 py-3 text-left">
									<input
										type="checkbox"
										checked={allChecked}
										onChange={toggleAll}
										disabled={isLoading || surveys.length === 0}
										className="size-4 cursor-pointer rounded accent-primary disabled:cursor-not-allowed disabled:opacity-50"
									/>
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{__('Form Name', 'all-feedback')}
								</th>
								<th className="px-4 py-3 text-left">
									<button type="button" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
										{__('Responses', 'all-feedback')}
										<ArrowUpDown className="size-3" />
									</button>
								</th>
								<th className="px-4 py-3 text-left">
									<button type="button" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
										{__('Created Date', 'all-feedback')}
										<ArrowUpDown className="size-3" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{__('Status', 'all-feedback')}
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{__('Actions', 'all-feedback')}
								</th>
							</tr>
						</thead>

						<tbody>
							{/* Loading skeletons */}
							{isLoading && Array.from({ length: 6 }, (_, i) => (
								<SkeletonRow key={i} />
							))}

							{/* Error state */}
							{isError && !isLoading && (
								<tr>
									<td colSpan={6}>
										<EmptyState
											icon={AlertCircle}
											title={__('Failed to load forms', 'all-feedback')}
											description={__('There was a problem fetching your forms. Please try refreshing the page.', 'all-feedback')}
										/>
									</td>
								</tr>
							)}

							{/* Empty state */}
							{!isLoading && !isError && surveys.length === 0 && (
								<tr>
									<td colSpan={6}>
										<EmptyState
											icon={FileText}
											title={search || status !== 'all'
												? __('No forms match your filters.', 'all-feedback')
												: __('No forms yet', 'all-feedback')
											}
											description={search || status !== 'all'
												? __('Try adjusting your search or status filter.', 'all-feedback')
												: __('Create your first feedback form to start collecting responses.', 'all-feedback')
											}
										/>
									</td>
								</tr>
							)}

							{/* Data rows */}
							{!isLoading && !isError && surveys.map((survey) => {
								const badge      = STATUS_BADGE[survey.status] ?? STATUS_BADGE.draft;
								const isDeleting = deletingId === survey.id;
								return (
									<tr
										key={survey.id}
										className="border-b border-border last:border-0 hover:bg-muted/20"
									>
										<td className="px-4 py-3.5">
											<input
												type="checkbox"
												checked={checked.includes(survey.id)}
												onChange={() => toggleOne(survey.id)}
												className="size-4 cursor-pointer rounded accent-primary"
											/>
										</td>
										<td className="px-4 py-3.5 font-medium">
											<button
												type="button"
												className="text-left text-foreground hover:text-primary hover:underline"
												onClick={() => void navigate({
													to:     '/builder/',
													search: { new: false, id: survey.id },
												})}
											>
												{survey.title}
											</button>
										</td>
										<td className="px-4 py-3.5 text-muted-foreground">
											{survey.response_count.toLocaleString()}
										</td>
										<td className="px-4 py-3.5 text-muted-foreground">
											{new Date(survey.created_at).toLocaleDateString()}
										</td>
										<td className="px-4 py-3.5">
											<Badge variant={badge.variant}>{badge.label}</Badge>
										</td>
										<td className="px-4 py-3.5">
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													title={__('Edit form', 'all-feedback')}
													onClick={() => void navigate({
														to:     '/builder/',
														search: { new: false, id: survey.id },
													})}
												>
													<Edit2 className="size-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													disabled={isDeleting}
													className="text-destructive hover:text-destructive"
													title={__('Delete form', 'all-feedback')}
													onClick={() => setConfirmDeleteId(survey.id)}
												>
													{isDeleting
														? <Loader2 className="size-3.5 animate-spin" />
														: <Trash2 className="size-3.5" />
													}
												</Button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Footer ─────────────────────────────────────────────────── */}
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
				<span>
					{isLoading
						? <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
						: <>{__('Showing', 'all-feedback')} {start}–{end} {__('of', 'all-feedback')} {total}</>
					}
				</span>

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="text-sm">{__('Forms per page', 'all-feedback')}</span>
						<Select value={perPage} onValueChange={(v) => { setPerPage(v); setPage(1); }}>
							<SelectTrigger className="h-8 w-16 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PER_PAGE_OPTIONS.map((n) => (
									<SelectItem key={n} value={n}>{n}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={page <= 1 || isLoading}
							onClick={() => setPage((p) => p - 1)}
						>
							<ChevronLeft className="size-3.5" />
						</Button>
						<span className="flex size-7 items-center justify-center rounded-md border border-border text-xs font-medium text-foreground">
							{page}
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={page >= totalPages || isLoading}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight className="size-3.5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AllForms;
