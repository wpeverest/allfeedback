import type { SurveyResponse } from '@/admin/api/surveys';
import { surveysApi } from '@/admin/api/surveys';
import {
	allResponsesQuery,
	surveyResponsesQuery,
	surveysQuery,
} from '@/admin/queries/surveys';
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
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { __, _n, sprintf } from '@wordpress/i18n';
import { format } from 'date-fns';
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Edit2,
	Eye,
	Mail,
	MailOpen,
	MessageSquare,
	MoreVertical,
	Pencil,
	Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const cellCls = 'text-base font-normal leading-5 text-body-text';

const getResponseSummary = (data: Record<string, unknown> | null): string => {
	if (!data) return '—';
	const vals = Object.values(data).filter(
		(v) => v !== null && v !== undefined && v !== '',
	);
	if (!vals.length) return '—';
	const first = vals[0];
	if (Array.isArray(first)) return first.join(', ');
	return String(first);
};

const SkeletonRow = ({ showForm }: { showForm: boolean }) => (
	<tr className="border-border border-b">
		<td className="w-12 px-4 py-5">
			<div className="bg-muted size-[16px] animate-pulse rounded-[4px]" />
		</td>
		<td className="w-16 px-4 py-5">
			<div className="bg-muted h-4 w-8 animate-pulse rounded" />
		</td>
		<td className="w-[220px] px-4 py-5">
			<div className="bg-muted h-4 w-36 animate-pulse rounded" />
		</td>
		{showForm && (
			<td className="w-[180px] px-4 py-5">
				<div className="bg-muted h-4 w-28 animate-pulse rounded" />
			</td>
		)}
		<td className="w-36 px-4 py-5">
			<div className="bg-muted h-4 w-24 animate-pulse rounded" />
		</td>
		<td className="w-36 px-4 py-5">
			<div className="bg-muted h-6 w-24 animate-pulse rounded" />
		</td>
	</tr>
);

const Responses = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { surveyId } = useSearch({ from: '/_app/responses/' });

	const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(
		surveyId ?? null,
	);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(10);
	const [sortBy, setSortBy] = useState<'id' | 'created_at'>('created_at');
	const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
	const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>(
		'all',
	);
	const [checked, setChecked] = useState<number[]>([]);
	const [confirmDelete, setConfirmDelete] = useState<{
		id: number;
		surveyId: number;
	} | null>(null);
	const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
	const debouncedSearch = useDebouncedValue(search, 300);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch]);

	const { data: surveysData } = useQuery({
		...surveysQuery({ per_page: 100 }),
		placeholderData: keepPreviousData,
	});
	const allSurveys = surveysData?.surveys ?? [];

	const surveyTitleMap = Object.fromEntries(
		allSurveys.map((s) => [s.id, s.title]),
	);

	const queryParams = { page, per_page: perPage };

	const allResponsesResult = useQuery({
		...allResponsesQuery(queryParams),
		enabled: selectedSurveyId === null,
		placeholderData: keepPreviousData,
	});

	const surveyResponsesResult = useQuery({
		...surveyResponsesQuery(selectedSurveyId ?? 0, queryParams),
		enabled: selectedSurveyId !== null,
		placeholderData: keepPreviousData,
	});

	const activeQuery =
		selectedSurveyId === null ? allResponsesResult : surveyResponsesResult;
	const { data, isLoading, isError, isFetching } = activeQuery;
	const responses = data?.responses ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const showForm = selectedSurveyId === null;
	const numCols = showForm ? 6 : 5;

	const sorted = [...responses].sort((a, b) => {
		const valA = sortBy === 'id' ? a.id : new Date(a.created_at).getTime();
		const valB = sortBy === 'id' ? b.id : new Date(b.created_at).getTime();
		return order === 'DESC' ? valB - valA : valA - valB;
	});

	const byReadFilter =
		readFilter === 'read'
			? sorted.filter((r) => r.is_read)
			: readFilter === 'unread'
				? sorted.filter((r) => !r.is_read)
				: sorted;

	const filtered = debouncedSearch.trim()
		? byReadFilter.filter((r) =>
				getResponseSummary(r.response_data)
					.toLowerCase()
					.includes(debouncedSearch.toLowerCase()),
			)
		: byReadFilter;

	const allChecked =
		filtered.length > 0 && filtered.every((r) => checked.includes(r.id));
	const someChecked = checked.length > 0 && !allChecked;
	const toggleAll = () =>
		setChecked(allChecked ? [] : filtered.map((r) => r.id));
	const toggleOne = (id: number) =>
		setChecked((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);

	const openDetail = (response: SurveyResponse, edit = false) => {
		void navigate({
			to: '/responses/$responseId',
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
			toast.success(__('Response deleted.', 'allfeedback'));
		},
		onError: () => {
			setConfirmDelete(null);
			toast.error(
				__('Failed to delete response. Please try again.', 'allfeedback'),
			);
		},
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: number[]) => surveysApi.bulkDeleteResponses(ids),
		onSuccess: (result, ids) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setChecked([]);
			setBulkConfirmOpen(false);
			const count = result.deleted;
			toast.success(
				sprintf(
					_n(
						'%d response deleted.',
						'%d responses deleted.',
						count,
						'allfeedback',
					),
					count,
				),
			);
			if (result.failed.length > 0) {
				toast.error(
					sprintf(
						_n(
							'%d response could not be deleted.',
							'%d responses could not be deleted.',
							result.failed.length,
							'allfeedback',
						),
						result.failed.length,
					),
				);
			}
		},
		onError: () => {
			setBulkConfirmOpen(false);
			toast.error(
				__('Failed to delete responses. Please try again.', 'allfeedback'),
			);
		},
	});

	const markReadMutation = useMutation({
		mutationFn: ({
			id,
			surveyId,
			isRead,
		}: {
			id: number;
			surveyId: number;
			isRead: boolean;
		}) => surveysApi.updateResponse(surveyId, id, { is_read: isRead }),
		onSuccess: (_, { isRead }) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			toast.success(
				isRead
					? __('Marked as read.', 'allfeedback')
					: __('Marked as unread.', 'allfeedback'),
			);
		},
		onError: () => {
			toast.error(
				__('Failed to update response. Please try again.', 'allfeedback'),
			);
		},
	});

	const bulkMarkReadMutation = useMutation({
		mutationFn: ({ ids, isRead }: { ids: number[]; isRead: boolean }) =>
			isRead
				? surveysApi.bulkMarkResponsesRead(ids)
				: surveysApi.bulkMarkResponsesUnread(ids),
		onSuccess: (result, { isRead }) => {
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setChecked([]);
			toast.success(
				isRead
					? __('Marked as read.', 'allfeedback')
					: __('Marked as unread.', 'allfeedback'),
			);
			if (result.failed.length > 0) {
				toast.error(
					`${result.failed.length} ${__('response(s) could not be updated.', 'allfeedback')}`,
				);
			}
		},
		onError: () => {
			toast.error(
				__('Failed to update responses. Please try again.', 'allfeedback'),
			);
		},
	});

	const colHeadCls =
		'flex items-center gap-1 text-sm font-semibold uppercase tracking-wide leading-4 select-none text-body-text';

	const ColHead = ({
		label,
		col,
	}: {
		label: string;
		col?: 'id' | 'created_at';
	}) => {
		const isActive = col !== undefined && sortBy === col;
		const Icon = isActive
			? order === 'DESC'
				? ArrowDown
				: ArrowUp
			: ArrowUpDown;
		const sortable = col !== undefined;
		const handleClick = () => {
			if (!sortable) return;
			if (sortBy === col) {
				setOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'));
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
				onKeyDown={
					sortable
						? (e) => {
								if (e.key === 'Enter' || e.key === ' ') handleClick();
							}
						: undefined
				}
				className={cn(
					colHeadCls,
					sortable
						? 'hover:text-foreground cursor-pointer transition-colors'
						: '',
					isActive ? 'text-foreground' : '',
				)}
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
				onOpenChange={(open) => {
					if (!open && !deleteMutation.isPending) setConfirmDelete(null);
				}}
				onConfirm={() => {
					if (confirmDelete) deleteMutation.mutate(confirmDelete);
				}}
				title={__('Delete response?', 'allfeedback')}
				description={__(
					'This action cannot be undone. The response will be permanently removed.',
					'allfeedback',
				)}
				confirmLabel={__('Delete', 'allfeedback')}
				cancelLabel={__('Cancel', 'allfeedback')}
				isPending={deleteMutation.isPending}
			/>

			<ConfirmDialog
				open={bulkConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !bulkDeleteMutation.isPending) setBulkConfirmOpen(false);
				}}
				onConfirm={() => bulkDeleteMutation.mutate(checked)}
				title={__('Delete selected responses?', 'allfeedback')}
				description={__(
					'This action cannot be undone. The selected responses will be permanently removed.',
					'allfeedback',
				)}
				confirmLabel={__('Delete', 'allfeedback')}
				cancelLabel={__('Cancel', 'allfeedback')}
				isPending={bulkDeleteMutation.isPending}
			/>

			<div className="mb-4 flex flex-wrap items-center gap-3 py-1">
				<div className="relative w-full sm:w-[260px]">
					<svg
						className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						viewBox="0 0 24 24"
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={__('Search responses…', 'allfeedback')}
						className="pl-9"
					/>
				</div>

				<Select
					value={selectedSurveyId !== null ? String(selectedSurveyId) : 'all'}
					onValueChange={(v) => {
						void navigate({ search: { surveyId: v === 'all' ? undefined : Number(v) } });
						setPage(1);
						setChecked([]);
					}}
				>
					<SelectTrigger className="w-full sm:w-[220px]">
						<SelectValue placeholder={__('All Forms', 'allfeedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{__('All Forms', 'allfeedback')}
						</SelectItem>
						{allSurveys.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={readFilter}
					onValueChange={(v) => {
						setReadFilter(v as 'all' | 'read' | 'unread');
						setPage(1);
					}}
				>
					<SelectTrigger className="w-full sm:w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{__('All status', 'allfeedback')}
						</SelectItem>
						<SelectItem value="unread">
							{__('Unread', 'allfeedback')}
						</SelectItem>
						<SelectItem value="read">{__('Read', 'allfeedback')}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div
				className={cn(
					'border-border bg-card rounded-xl border transition-opacity',
					isFetching && !isLoading && 'pointer-events-none opacity-60',
				)}
			>
			<div className="overflow-x-auto">
				<table className="w-full table-fixed">
						<thead>
							<tr className="border-border bg-muted/30 border-b">
								<th className="w-12 px-4 py-4 text-left">
									<Checkbox
										checked={someChecked ? 'indeterminate' : allChecked}
										onCheckedChange={toggleAll}
										disabled={filtered.length === 0}
									/>
								</th>
								<th className="w-16 px-4 py-4 text-left">
									<ColHead label={__('ID', 'allfeedback')} col="id" />
								</th>
								<th className="w-[220px] px-4 py-4 text-left">
									<ColHead label={__('Response', 'allfeedback')} />
								</th>
								{showForm && (
									<th className="w-[180px] px-4 py-4 text-left">
										<ColHead label={__('Form', 'allfeedback')} />
									</th>
								)}
								<th className="w-36 px-4 py-4 text-left">
									<ColHead
										label={__('Submitted', 'allfeedback')}
										col="created_at"
									/>
								</th>
								<th className="w-36 px-4 py-4 text-left">
									<ColHead label={__('Actions', 'allfeedback')} />
								</th>
							</tr>
						</thead>

						<tbody>
							{isLoading &&
								Array.from({ length: 5 }, (_, i) => (
									<SkeletonRow key={i} showForm={showForm} />
								))}

							{isError && !isLoading && (
								<tr>
									<td colSpan={numCols}>
										<EmptyState
											icon={AlertCircle}
											title={__('Failed to load responses', 'allfeedback')}
											description={__(
												'There was a problem fetching responses. Please try again.',
												'allfeedback',
											)}
										/>
									</td>
								</tr>
							)}

							{!isLoading && !isError && responses.length === 0 && (
								<tr>
									<td colSpan={numCols}>
										<EmptyState
											icon={MessageSquare}
											title={__('No responses yet', 'allfeedback')}
											description={__(
												'Responses will appear here once visitors submit forms.',
												'allfeedback',
											)}
										/>
									</td>
								</tr>
							)}

							{!isLoading &&
								!isError &&
								responses.length > 0 &&
								filtered.length === 0 && (
									<tr>
										<td colSpan={numCols}>
											<EmptyState
												icon={MessageSquare}
												title={__(
													'No responses match your search',
													'allfeedback',
												)}
												description={__(
													'Try a different keyword.',
													'allfeedback',
												)}
											/>
										</td>
									</tr>
								)}

							{!isLoading &&
								!isError &&
								filtered.map((response: SurveyResponse) => {
									const isSelected = checked.includes(response.id);
									const summary = getResponseSummary(response.response_data);
									return (
										<tr
											key={response.id}
											className={cn(
												'border-border border-b transition-colors last:border-0',
												!response.is_read && !isSelected
													? 'border-l-primary/50 border-l-[3px]'
													: 'border-l-[3px] border-l-transparent',
												isSelected
													? 'bg-primary/[0.05]'
													: !response.is_read
														? 'bg-muted/[0.22] hover:bg-muted/[0.36]'
														: 'hover:bg-muted/20',
											)}
										>
											{/* Checkbox */}
											<td className="w-12 px-4 py-5">
												<Checkbox
													checked={isSelected}
													onCheckedChange={() => toggleOne(response.id)}
												/>
											</td>

											{/* ID */}
											<td className="w-16 px-4 py-5">
												<span className={cn(cellCls, 'tabular-nums')}>
													#{response.id}
												</span>
											</td>

											{/* Response summary — clickable, opens detail page */}
											<td className="w-[220px] px-4 py-5">
												<button
													type="button"
													className="group/resp flex min-w-0 items-start gap-1.5 text-left"
													onClick={() => openDetail(response)}
												>
													<span
														className={cn(
															cellCls,
															'line-clamp-2 font-semibold break-words underline-offset-2 transition-colors',
															'group-hover/resp:text-primary group-hover/resp:underline',
														)}
													>
														{summary}
													</span>
													<Edit2 className="group-hover/resp:text-primary mt-0.5 size-3 shrink-0 opacity-0 transition-all group-hover/resp:opacity-60" />
												</button>
											</td>

											{/* Form — click to filter by this form */}
											{showForm && (
												<td className="w-[180px] px-4 py-5">
													<button
														type="button"
														className="group/form flex min-w-0 items-start gap-1 text-left"
														onClick={() => {
															setSelectedSurveyId(response.survey_id);
															setPage(1);
															setChecked([]);
														}}
													>
														<span
															className={cn(
																cellCls,
																'group-hover/form:text-primary line-clamp-2 break-words underline-offset-2 transition-colors group-hover/form:underline',
															)}
														>
															{surveyTitleMap[response.survey_id] ??
																`#${response.survey_id}`}
														</span>
													</button>
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
														className="bg-primary/[0.04] text-primary/80 hover:bg-primary/[0.08] hover:text-primary flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors max-sm:hidden"
													>
														<Eye className="size-3" />
														{__('View', 'allfeedback')}
													</button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<button
																type="button"
																style={{ border: '1.5px solid #E2E2E8' }}
																className="text-foreground/50 hover:bg-muted/50 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
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
																{__('View', 'allfeedback')}
															</DropdownMenuItem>
															<DropdownMenuItem
																onSelect={() => openDetail(response, true)}
															>
																<Pencil className="size-3.5" />
																{__('Edit', 'allfeedback')}
															</DropdownMenuItem>
															<DropdownMenuItem
																onSelect={() =>
																	markReadMutation.mutate({
																		id: response.id,
																		surveyId: response.survey_id,
																		isRead: !response.is_read,
																	})
																}
															>
																{response.is_read ? (
																	<Mail className="size-3.5" />
																) : (
																	<MailOpen className="size-3.5" />
																)}
																{response.is_read
																	? __('Mark as unread', 'allfeedback')
																	: __('Mark as read', 'allfeedback')}
															</DropdownMenuItem>
															<DropdownMenuItem
																destructive
																onSelect={() =>
																	setConfirmDelete({
																		id: response.id,
																		surveyId: response.survey_id,
																	})
																}
															>
																<Trash2 className="size-3.5" />
																{__('Delete', 'allfeedback')}
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
				onPerPageChange={(n) => {
					setPerPage(n);
					setPage(1);
				}}
			/>

			<BulkActionBar
				count={checked.length}
				showMarkRead={checked.length > 0}
				showMarkUnread={checked.length > 0}
				showDelete={checked.length > 0}
				onMarkRead={() =>
					bulkMarkReadMutation.mutate({ ids: checked, isRead: true })
				}
				onMarkUnread={() =>
					bulkMarkReadMutation.mutate({ ids: checked, isRead: false })
				}
				onDelete={() => setBulkConfirmOpen(true)}
				onTrash={() => {}}
				onRestore={() => {}}
				onClone={() => {}}
				onClear={() => setChecked([])}
				isMarkingRead={
					bulkMarkReadMutation.isPending &&
					bulkMarkReadMutation.variables?.isRead === true
				}
				isMarkingUnread={
					bulkMarkReadMutation.isPending &&
					bulkMarkReadMutation.variables?.isRead === false
				}
				isDeleting={bulkDeleteMutation.isPending}
			/>
		</div>
	);
};

export default Responses;
