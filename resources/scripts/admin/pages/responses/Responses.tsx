import { format } from 'date-fns';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { surveysApi } from '@/admin/api/surveys';
import { allResponsesQuery, surveyResponsesQuery, surveysQuery } from '@/admin/queries/surveys';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Edit2, Eye, Mail, MailOpen, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SurveyResponse } from '@/admin/api/surveys';

const cellCls = 'text-[14px] font-normal leading-[20px] text-[oklch(0.446_0.03_256.802)]';

const getResponseSummary = (data: Record<string, unknown> | null): string => {
	if (!data) return '—';
	const vals = Object.values(data).filter((v) => v !== null && v !== undefined && v !== '');
	if (!vals.length) return '—';
	const first = vals[0];
	if (Array.isArray(first)) return first.join(', ');
	return String(first);
};

const SkeletonRow = ({ showForm }: { showForm: boolean }) => (
	<tr className="border-b border-border">
		<td className="w-12 px-4 py-5"><div className="size-[16px] animate-pulse rounded-[4px] bg-muted" /></td>
		<td className="w-16 px-4 py-5"><div className="h-4 w-8 animate-pulse rounded bg-muted" /></td>
		<td className="w-[220px] px-4 py-5"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></td>
		{showForm && <td className="w-[180px] px-4 py-5"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>}
		<td className="w-36 px-4 py-5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
		<td className="w-36 px-4 py-5"><div className="h-6 w-24 animate-pulse rounded-lg bg-muted" /></td>
	</tr>
);

const Responses = () => {
	const navigate    = useNavigate();
	const queryClient = useQueryClient();
	const { surveyId: initialSurveyId } = useSearch({ from: '/_app/responses/' });

	const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(initialSurveyId ?? null);
	const [search,           setSearch]           = useState('');
	const [page,             setPage]             = useState(1);
	const [perPage,          setPerPage]          = useState(10);
	const [sortBy,           setSortBy]           = useState<'id' | 'created_at'>('created_at');
	const [order,            setOrder]            = useState<'ASC' | 'DESC'>('DESC');
	const [readFilter,       setReadFilter]       = useState<'all' | 'read' | 'unread'>('all');
	const [checked,          setChecked]          = useState<number[]>([]);
	const [confirmDelete,    setConfirmDelete]    = useState<{ id: number; surveyId: number } | null>(null);
	const [bulkConfirmOpen,  setBulkConfirmOpen]  = useState(false);

	const debouncedSearch = useDebouncedValue(search, 300);

	useEffect(() => { setPage(1); }, [debouncedSearch]);

	const { data: surveysData } = useQuery({
		...surveysQuery({ per_page: 100 }),
		placeholderData: keepPreviousData,
	});
	const allSurveys = surveysData?.surveys ?? [];

	const surveyTitleMap = Object.fromEntries(allSurveys.map((s) => [s.id, s.title]));

	const queryParams = { page, per_page: perPage };

	const allResponsesResult = useQuery({
		...allResponsesQuery(queryParams),
		enabled:  selectedSurveyId === null,
		placeholderData: keepPreviousData,
	});

	const surveyResponsesResult = useQuery({
		...surveyResponsesQuery(selectedSurveyId ?? 0, queryParams),
		enabled:  selectedSurveyId !== null,
		placeholderData: keepPreviousData,
	});

	const activeQuery  = selectedSurveyId === null ? allResponsesResult : surveyResponsesResult;
	const { data, isLoading, isError, isFetching } = activeQuery;

	const responses  = data?.responses ?? [];
	const total      = data?.total     ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const showForm   = selectedSurveyId === null;
	const numCols    = showForm ? 6 : 5;

	const sorted = [...responses].sort((a, b) => {
		const valA = sortBy === 'id' ? a.id : new Date(a.created_at).getTime();
		const valB = sortBy === 'id' ? b.id : new Date(b.created_at).getTime();
		return order === 'DESC' ? valB - valA : valA - valB;
	});

	const byReadFilter = readFilter === 'read'
		? sorted.filter((r) => r.is_read)
		: readFilter === 'unread'
			? sorted.filter((r) => !r.is_read)
			: sorted;

	const filtered = debouncedSearch.trim()
		? byReadFilter.filter((r) =>
			getResponseSummary(r.response_data).toLowerCase().includes(debouncedSearch.toLowerCase()),
		)
		: byReadFilter;

	const allChecked  = responses.length > 0 && responses.every((r) => checked.includes(r.id));
	const someChecked = checked.length > 0 && !allChecked;
	const toggleAll   = () => setChecked(allChecked ? [] : responses.map((r) => r.id));
	const toggleOne   = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	const openDetail = (response: SurveyResponse, edit = false) => {
		void navigate({
			to:     '/responses/$responseId',
			params: { responseId: String(response.id) },
			search: { surveyId: response.survey_id, edit },
		});
	};

	const deleteMutation = useMutation({
		mutationFn: ({ id, surveyId }: { id: number; surveyId: number }) =>
			surveysApi.deleteResponse(surveyId, id),
		onSuccess: (_, { id }) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setChecked((prev) => prev.filter((i) => i !== id));
			setConfirmDelete(null);
			toast.success(__('Response deleted.', 'all-feedback'));
		},
		onError: () => {
			setConfirmDelete(null);
			toast.error(__('Failed to delete response. Please try again.', 'all-feedback'));
		},
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: number[]) =>
			Promise.all(
				ids.map((id) => {
					const surveyId = responses.find((r) => r.id === id)?.survey_id ?? selectedSurveyId!;
					return surveysApi.deleteResponse(surveyId, id);
				}),
			),
		onSuccess: (_, ids) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setChecked([]);
			setBulkConfirmOpen(false);
			toast.success(
				ids.length === 1
					? __('1 response deleted.', 'all-feedback')
					: `${ids.length} ${__('responses deleted.', 'all-feedback')}`,
			);
		},
		onError: () => {
			setBulkConfirmOpen(false);
			toast.error(__('Failed to delete responses. Please try again.', 'all-feedback'));
		},
	});

	const markReadMutation = useMutation({
		mutationFn: ({ id, surveyId, isRead }: { id: number; surveyId: number; isRead: boolean }) =>
			surveysApi.updateResponse(surveyId, id, { is_read: isRead }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
		},
	});

	const bulkMarkReadMutation = useMutation({
		mutationFn: (isRead: boolean) =>
			Promise.all(
				checked.map((id) => {
					const surveyId = responses.find((r) => r.id === id)?.survey_id ?? selectedSurveyId!;
					return surveysApi.updateResponse(surveyId, id, { is_read: isRead });
				}),
			),
		onSuccess: (_, isRead) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setChecked([]);
			toast.success(
				isRead
					? __('Marked as read.', 'all-feedback')
					: __('Marked as unread.', 'all-feedback'),
			);
		},
		onError: () => {
			toast.error(__('Failed to update responses. Please try again.', 'all-feedback'));
		},
	});

	const colHeadCls = 'flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide leading-[16px] select-none text-[oklch(0.446_0.03_256.802)]';

	const ColHead = ({ label, col }: { label: string; col?: 'id' | 'created_at' }) => {
		const isActive = col !== undefined && sortBy === col;
		const Icon     = isActive ? (order === 'DESC' ? ArrowDown : ArrowUp) : ArrowUpDown;
		const sortable = col !== undefined;
		const handleClick = () => {
			if (!sortable) return;
			if (sortBy === col) {
				setOrder((o) => o === 'DESC' ? 'ASC' : 'DESC');
			} else {
				setSortBy(col);
				setOrder('DESC');
			}
		};
		return (
			<span
				role={sortable ? 'button' : undefined}
				tabIndex={sortable ? 0 : undefined}
				onClick={sortable ? handleClick : undefined}
				onKeyDown={sortable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
				className={cn(colHeadCls, sortable ? 'cursor-pointer transition-colors hover:text-foreground' : '', isActive ? 'text-foreground' : '')}
			>
				{label}
				{sortable && <Icon className="size-3 shrink-0" />}
			</span>
		);
	};

	return (
		<div className="p-5 md:p-6">

			<ConfirmDialog
				open={confirmDelete !== null}
				onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setConfirmDelete(null); }}
				onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete); }}
				title={__('Delete response?', 'all-feedback')}
				description={__('This action cannot be undone. The response will be permanently removed.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={deleteMutation.isPending}
			/>

			<ConfirmDialog
				open={bulkConfirmOpen}
				onOpenChange={(open) => { if (!open && !bulkDeleteMutation.isPending) setBulkConfirmOpen(false); }}
				onConfirm={() => bulkDeleteMutation.mutate(checked)}
				title={__('Delete selected responses?', 'all-feedback')}
				description={__('This action cannot be undone. The selected responses will be permanently removed.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={bulkDeleteMutation.isPending}
			/>

			<div className="mb-4 flex flex-wrap items-center gap-3 py-1">

				<Select
					value={selectedSurveyId !== null ? String(selectedSurveyId) : 'all'}
					onValueChange={(v) => {
						setSelectedSurveyId(v === 'all' ? null : Number(v));
						setPage(1);
						setChecked([]);
					}}
				>
					<SelectTrigger className="w-full sm:w-[220px]">
						<SelectValue placeholder={__('All Forms', 'all-feedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All Forms', 'all-feedback')}</SelectItem>
						{allSurveys.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="relative w-full sm:w-[260px]">
					<svg
						className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
						fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
					>
						<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
					</svg>
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={__('Search responses…', 'all-feedback')}
						className="pl-9"
					/>
				</div>

				<Select
					value={readFilter}
					onValueChange={(v) => { setReadFilter(v as 'all' | 'read' | 'unread'); setPage(1); }}
				>
					<SelectTrigger className="w-full sm:w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All statuses', 'all-feedback')}</SelectItem>
						<SelectItem value="unread">{__('Unread', 'all-feedback')}</SelectItem>
						<SelectItem value="read">{__('Read', 'all-feedback')}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className={cn('rounded-xl border border-border bg-card transition-opacity', isFetching && !isLoading && 'pointer-events-none opacity-50')}>
				<div className="overflow-x-auto">
					<table className="w-full table-fixed">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="w-12 px-4 py-4 text-left">
									<Checkbox
										checked={someChecked ? 'indeterminate' : allChecked}
										onCheckedChange={toggleAll}
										disabled={isLoading || responses.length === 0}
									/>
								</th>
								<th className="w-16 px-4 py-4 text-left">
									<ColHead label={__('ID', 'all-feedback')} col="id" />
								</th>
								<th className="w-[220px] px-4 py-4 text-left">
									<ColHead label={__('Response', 'all-feedback')} />
								</th>
								{showForm && (
									<th className="w-[180px] px-4 py-4 text-left">
										<ColHead label={__('Form', 'all-feedback')} />
									</th>
								)}
								<th className="w-36 px-4 py-4 text-left">
									<ColHead label={__('Submitted', 'all-feedback')} col="created_at" />
								</th>
								<th className="w-36 px-4 py-4 text-left">
									<ColHead label={__('Actions', 'all-feedback')} />
								</th>
							</tr>
						</thead>

						<tbody>
							{isLoading && Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} showForm={showForm} />)}

							{isError && !isLoading && (
								<tr><td colSpan={numCols}>
									<EmptyState
										icon={AlertCircle}
										title={__('Failed to load responses', 'all-feedback')}
										description={__('There was a problem fetching responses. Please try again.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{!isLoading && !isError && responses.length === 0 && (
								<tr><td colSpan={numCols}>
									<EmptyState
										icon={MessageSquare}
										title={__('No responses yet', 'all-feedback')}
										description={__('Responses will appear here once visitors submit forms.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{!isLoading && !isError && responses.length > 0 && filtered.length === 0 && (
								<tr><td colSpan={numCols}>
									<EmptyState
										icon={MessageSquare}
										title={__('No responses match your search', 'all-feedback')}
										description={__('Try a different keyword.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{!isLoading && !isError && filtered.map((response: SurveyResponse) => {
								const isSelected = checked.includes(response.id);
								const summary    = getResponseSummary(response.response_data);
								return (
									<tr
										key={response.id}
										className={cn(
											'border-b border-border last:border-0 transition-colors',
											isSelected ? 'bg-primary/[0.03]' : 'hover:bg-muted/20',
										)}
									>
										{/* Checkbox */}
										<td className="w-12 px-4 py-5">
											<Checkbox checked={isSelected} onCheckedChange={() => toggleOne(response.id)} />
										</td>

										{/* ID */}
										<td className="w-16 px-4 py-5">
											<div className="flex items-center gap-1.5">
												{!response.is_read && (
													<span className="size-1.5 shrink-0 rounded-full bg-primary" title={__('Unread', 'all-feedback')} />
												)}
												<span className={cn(cellCls, 'tabular-nums text-foreground/40')}>
													#{response.id}
												</span>
											</div>
										</td>

										{/* Response summary — clickable, opens detail page */}
										<td className="w-[220px] px-4 py-5">
											<button
												type="button"
												className="group/resp flex min-w-0 items-center gap-1.5 text-left"
												onClick={() => openDetail(response)}
											>
												<span className={cn(
													cellCls,
													'line-clamp-1 underline-offset-2 transition-colors',
													'group-hover/resp:text-primary group-hover/resp:underline',
												)}>
													{summary}
												</span>
												<Edit2 className="size-3 shrink-0 opacity-0 transition-all group-hover/resp:text-primary group-hover/resp:opacity-60" />
											</button>
										</td>

										{/* Form — plain text, no link */}
										{showForm && (
											<td className="w-[180px] px-4 py-5">
												<span className={cn(cellCls, 'truncate block')}>
													{surveyTitleMap[response.survey_id] ?? `#${response.survey_id}`}
												</span>
											</td>
										)}

										{/* Submitted date */}
										<td className="w-36 px-4 py-5">
											<span className={cellCls}>
												{format(new Date(response.created_at), 'MMM d, yyyy')}
											</span>
										</td>

										{/* Actions */}
										<td className="w-36 px-4 py-5">
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() => openDetail(response)}
													style={{ border: '1.5px solid #E2E2E8' }}
													className="flex max-sm:hidden items-center gap-1 rounded-lg bg-primary/[0.04] px-2 py-1 text-[11px] font-medium text-primary/80 transition-colors hover:bg-primary/[0.08] hover:text-primary"
												>
													<Eye className="size-3" />
													{__('View', 'all-feedback')}
												</button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<button
															type="button"
															style={{ border: '1.5px solid #E2E2E8' }}
															className="flex size-7 shrink-0 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-muted/50 hover:text-foreground"
														>
															<MoreVertical className="size-3.5" />
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent>
														<DropdownMenuItem
															className="max-sm:flex sm:hidden"
															onSelect={() => openDetail(response)}
														>
															<Eye className="size-3.5" />
															{__('View', 'all-feedback')}
														</DropdownMenuItem>
														<DropdownMenuItem onSelect={() => openDetail(response, true)}>
															<Pencil className="size-3.5" />
															{__('Edit', 'all-feedback')}
														</DropdownMenuItem>
														<DropdownMenuItem
															onSelect={() => markReadMutation.mutate({
																id: response.id,
																surveyId: response.survey_id,
																isRead: !response.is_read,
															})}
														>
															{response.is_read
																? <Mail className="size-3.5" />
																: <MailOpen className="size-3.5" />
															}
															{response.is_read
																? __('Mark as unread', 'all-feedback')
																: __('Mark as read', 'all-feedback')
															}
														</DropdownMenuItem>
														<DropdownMenuItem
															destructive
															onSelect={() => setConfirmDelete({ id: response.id, surveyId: response.survey_id })}
														>
															<Trash2 className="size-3.5" />
															{__('Delete', 'all-feedback')}
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<Pagination
				className="mt-6"
				page={page}
				totalPages={totalPages}
				total={total}
				perPage={perPage}
				perPageOptions={[10, 25, 50]}
				isLoading={isFetching}
				onPageChange={setPage}
				onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
			/>

			<BulkActionBar
				count={checked.length}
				showMarkRead={checked.length > 0}
				showMarkUnread={checked.length > 0}
				showDelete={checked.length > 0}
				onMarkRead={() => bulkMarkReadMutation.mutate(true)}
				onMarkUnread={() => bulkMarkReadMutation.mutate(false)}
				onDelete={() => setBulkConfirmOpen(true)}
				onTrash={() => {}}
				onRestore={() => {}}
				onClone={() => {}}
				onClear={() => setChecked([])}
				isMarkingRead={bulkMarkReadMutation.isPending && bulkMarkReadMutation.variables === true}
				isMarkingUnread={bulkMarkReadMutation.isPending && bulkMarkReadMutation.variables === false}
				isDeleting={bulkDeleteMutation.isPending}
			/>
		</div>
	);
};

export default Responses;
