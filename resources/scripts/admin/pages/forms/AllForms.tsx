import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
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
import { surveysQuery } from '@/admin/queries/surveys';
import { cn } from '@/lib/utils';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import {
	AlertCircle,
	Archive,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ArrowUpRight,
	Copy,
	Edit2,
	FileText,
	Loader2,
	MoreVertical,
	Plus,
	RotateCcw,
	Trash2,
} from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SurveyStatus } from '@/admin/api/surveys';

const STATUS_CONFIG: Record<SurveyStatus, {
	variant: 'success' | 'secondary' | 'outline' | 'warning' | 'info' | 'danger';
	label:   string;
	dot:     string;
}> = {
	published: { variant: 'success', label: __('Published', 'all-feedback'), dot: 'bg-success' },
	draft:     { variant: 'info',    label: __('Draft',     'all-feedback'), dot: 'bg-info' },
	paused:    { variant: 'warning', label: __('Paused',    'all-feedback'), dot: 'bg-warning' },
	archived:  { variant: 'danger',  label: __('Archived',  'all-feedback'), dot: 'bg-muted-foreground/30' },
	trashed:   { variant: 'danger',  label: __('Trash',     'all-feedback'), dot: 'bg-destructive' },
};

const STATUS_FILTER_OPTIONS = [
	{ value: 'all',       label: __('All Status',  'all-feedback'), dot: null },
	{ value: 'published', label: __('Published',   'all-feedback'), dot: 'bg-success' },
	{ value: 'draft',     label: __('Draft',       'all-feedback'), dot: 'bg-muted-foreground/40' },
	{ value: 'paused',    label: __('Paused',      'all-feedback'), dot: 'bg-warning' },
	{ value: 'archived',  label: __('Archived',    'all-feedback'), dot: 'bg-muted-foreground/30' },
	{ value: 'trashed',   label: __('Trash',       'all-feedback'), dot: 'bg-destructive' },
];

const PER_PAGE_OPTIONS = [10, 25, 50];

const cellCls = 'text-[14px] font-normal leading-[20px] text-[oklch(0.446_0.03_256.802)]';

const SkeletonRow = () => (
	<tr className="border-b border-border">
		<td className="w-12 px-4 py-5">
			<div className="size-[16px] animate-pulse rounded-[4px] bg-muted" />
		</td>
		<td className="w-16 px-4 py-5">
			<div className="h-4 w-8 animate-pulse rounded bg-muted" />
		</td>
		<td className="px-4 py-5">
			<div className="h-4 w-48 animate-pulse rounded bg-muted" />
		</td>
		<td className="w-28 px-4 py-5">
			<div className="h-4 w-10 animate-pulse rounded bg-muted" />
		</td>
		<td className="w-36 px-4 py-5">
			<div className="h-4 w-24 animate-pulse rounded bg-muted" />
		</td>
		<td className="w-32 px-4 py-5">
			<div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
		</td>
		<td className="w-24 px-4 py-5">
			<div className="flex items-center gap-1.5">
				<div className="h-7 w-14 animate-pulse rounded-lg bg-muted" />
				<div className="size-7 animate-pulse rounded-lg bg-muted" />
			</div>
		</td>
	</tr>
);

const AllForms = () => {
	const navigate    = useNavigate();
	const queryClient = useQueryClient();

	const [search,  setSearch]  = useState('');
	const debouncedSearch       = useDebouncedValue(search, 300);
	const [status,  setStatus]  = useState('all');
	const [perPage, setPerPage] = useState(10);
	const [page,    setPage]    = useState(1);
	const [orderby, setOrderby] = useState('created_at');
	const [order,   setOrder]   = useState<'ASC' | 'DESC'>('DESC');

	const [checked,           setChecked]           = useState<number[]>([]);
	const [confirmDeleteId,   setConfirmDeleteId]   = useState<number | null>(null);
	const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
	const [confirmBulkTrash,  setConfirmBulkTrash]  = useState(false);

	const queryParams = {
		page,
		per_page: perPage,
		orderby,
		order,
		...(debouncedSearch  && { search: debouncedSearch }),
		...(status !== 'all' && { status }),
	};

	const { data, isLoading, isError, isFetching } = useQuery({
		...surveysQuery(queryParams),
		placeholderData: keepPreviousData,
	});

	const surveys    = data?.surveys ?? [];
	const total      = data?.total   ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));

	useEffect(() => { setPage(1); }, [debouncedSearch]);

	const handleSort = (column: string) => {
		if (orderby === column) {
			setOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
		} else {
			setOrderby(column);
			setOrder('DESC');
		}
		setPage(1);
	};

	const colHeadCls = 'flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide leading-[16px] select-none text-[oklch(0.446_0.03_256.802)]';

	const ColHead = ({ column, label, sortable = false }: { column?: string; label: string; sortable?: boolean }) => {
		const isActive = sortable && column !== undefined && orderby === column;
		const Icon     = isActive ? (order === 'DESC' ? ArrowDown : ArrowUp) : ArrowUpDown;
		return (
			<span
				role={sortable && column ? 'button' : undefined}
				tabIndex={sortable && column ? 0 : undefined}
				onClick={sortable && column ? () => handleSort(column) : undefined}
				onKeyDown={sortable && column ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleSort(column); } : undefined}
				className={cn(
					colHeadCls,
					sortable && column ? 'cursor-pointer transition-colors' : '',
					isActive ? 'text-foreground' : '',
					sortable && column && !isActive ? 'hover:text-foreground' : '',
				)}
			>
				{label}
				{sortable && <Icon className={cn('size-3 shrink-0', isActive ? 'opacity-100' : 'opacity-35')} />}
			</span>
		);
	};

	const allChecked  = surveys.length > 0 && surveys.every((s) => checked.includes(s.id));
	const someChecked = checked.length > 0 && !allChecked;
	const toggleAll   = () => setChecked(allChecked ? [] : surveys.map((s) => s.id));
	const toggleOne   = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	const checkedSurveys      = surveys.filter((s) => checked.includes(s.id));
	const allSelectedTrashed  = checkedSurveys.length > 0 && checkedSurveys.every((s) => s.status === 'trashed');
	const anySelectedTrashed  = checkedSurveys.some((s) => s.status === 'trashed');
	const anySelectedNotTrashed = checkedSurveys.some((s) => s.status !== 'trashed');

	const createMutation = useMutation({
		mutationFn: () => surveysApi.create({ title: __('Untitled Form', 'all-feedback') }),
		onSuccess: (survey) => {
			void navigate({ to: '/builder/', search: { new: true, id: survey.id } });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => surveysApi.delete(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			setConfirmDeleteId(null);
			setChecked((prev) => prev.filter((id) => id !== confirmDeleteId));
			toast.success(__('Form permanently deleted.', 'all-feedback'));
		},
		onError: () => {
			setConfirmDeleteId(null);
			toast.error(__('Failed to delete form. Please try again.', 'all-feedback'));
		},
	});

	const trashMutation = useMutation({
		mutationFn: (id: number) => surveysApi.trash(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			toast.success(__('Form moved to trash.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to trash form. Please try again.', 'all-feedback'));
		},
	});

	const restoreMutation = useMutation({
		mutationFn: (id: number) => surveysApi.update(id, { status: 'draft' }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			toast.success(__('Form restored to draft.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to restore form. Please try again.', 'all-feedback'));
		},
	});

	const bulkRestoreMutation = useMutation({
		mutationFn: (ids: number[]) => Promise.all(ids.map((id) => surveysApi.update(id, { status: 'draft' }))),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			setChecked([]);
			toast.success(__('Selected forms restored to draft.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to restore some forms. Please try again.', 'all-feedback'));
		},
	});

	const cloneMutation = useMutation({
		mutationFn: (id: number) => surveysApi.duplicate(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			toast.success(__('Form cloned successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to clone form. Please try again.', 'all-feedback'));
		},
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: number[]) => surveysApi.bulkDelete(ids),
		onSuccess: (result) => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			setChecked([]);
			setConfirmBulkDelete(false);
			if (result.failed.length > 0) {
				toast.warning(__('Some forms could not be deleted.', 'all-feedback'));
			} else {
				toast.success(__('Selected forms permanently deleted.', 'all-feedback'));
			}
		},
		onError: () => {
			setConfirmBulkDelete(false);
			toast.error(__('Failed to delete forms. Please try again.', 'all-feedback'));
		},
	});

	const bulkTrashMutation = useMutation({
		mutationFn: (ids: number[]) => surveysApi.bulkTrash(ids),
		onSuccess: (result) => {
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			setChecked([]);
			setConfirmBulkTrash(false);
			if (result.failed.length > 0) {
				toast.warning(__('Some forms could not be moved to trash.', 'all-feedback'));
			} else {
				toast.success(__('Selected forms moved to trash.', 'all-feedback'));
			}
		},
		onError: () => {
			setConfirmBulkTrash(false);
			toast.error(__('Failed to trash forms. Please try again.', 'all-feedback'));
		},
	});

	return (
		<div className="p-5 md:p-6">

			{}
			<ConfirmDialog
				open={confirmDeleteId !== null}
				onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setConfirmDeleteId(null); }}
				onConfirm={() => { if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId); }}
				title={__('Permanently delete form?', 'all-feedback')}
				description={__('This action cannot be undone. All responses collected for this form will also be permanently deleted.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={deleteMutation.isPending}
			/>

			{}
			<ConfirmDialog
				open={confirmBulkDelete}
				onOpenChange={(open) => { if (!open && !bulkDeleteMutation.isPending) setConfirmBulkDelete(false); }}
				onConfirm={() => bulkDeleteMutation.mutate(checked)}
				title={__('Permanently delete selected forms?', 'all-feedback')}
				description={__('This action cannot be undone. All responses for the selected forms will also be permanently deleted.', 'all-feedback')}
				confirmLabel={__('Delete all', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={bulkDeleteMutation.isPending}
			/>

			{}
			<ConfirmDialog
				open={confirmBulkTrash}
				onOpenChange={(open) => { if (!open && !bulkTrashMutation.isPending) setConfirmBulkTrash(false); }}
				onConfirm={() => bulkTrashMutation.mutate(checked)}
				title={__('Move selected forms to trash?', 'all-feedback')}
				description={__('The selected forms will be moved to trash and hidden from this list.', 'all-feedback')}
				confirmLabel={__('Move to trash', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={bulkTrashMutation.isPending}
			/>

			{}
			<div className="mb-4 flex flex-wrap items-center gap-3 py-1">
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
						placeholder={__('Search forms…', 'all-feedback')}
						className="pl-9"
					/>
				</div>

				<Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
					<SelectTrigger className="w-full sm:w-[150px]">
						<SelectValue placeholder={__('All Status', 'all-feedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All Status',  'all-feedback')}</SelectItem>
						<SelectItem value="published">{__('Published', 'all-feedback')}</SelectItem>
						<SelectItem value="draft">{__('Draft',      'all-feedback')}</SelectItem>
						<SelectItem value="trashed">{__('Trash',    'all-feedback')}</SelectItem>
					</SelectContent>
				</Select>

				<div className="w-full sm:ml-auto sm:w-auto">
					<Button className="w-full sm:w-auto" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
						{createMutation.isPending
							? <Loader2 className="size-4 animate-spin" />
							: <Plus className="size-4" />
						}
						{__('Add New Form', 'all-feedback')}
					</Button>
				</div>
			</div>

			{}
			<div className="rounded-xl border border-border bg-card">
				<div className="overflow-x-auto">
					<table className="w-full table-fixed">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								{}
								<th className="w-12 px-4 py-4 text-left">
									<Checkbox
										checked={someChecked ? 'indeterminate' : allChecked}
										onCheckedChange={toggleAll}
										disabled={isLoading || surveys.length === 0}
									/>
								</th>
								{}
								<th className="w-16 px-4 py-4 text-left">
									<ColHead column="id" label={__('ID', 'all-feedback')} sortable />
								</th>
								{}
								<th className="w-[220px] px-4 py-4 text-left">
									<ColHead label={__('Form Name', 'all-feedback')} />
								</th>
								{}
								<th className="w-28 px-4 py-4 text-left">
									<ColHead column="response_count" label={__('Responses', 'all-feedback')} sortable />
								</th>
								{}
								<th className="w-36 px-4 py-4 text-left">
									<ColHead column="created_at" label={__('Created', 'all-feedback')} sortable />
								</th>
								{}
								<th className="w-32 px-4 py-4 text-left">
									<ColHead label={__('Status', 'all-feedback')} />
								</th>
								{}
								<th className="w-24 px-4 py-4 text-left">
									<ColHead label={__('Actions', 'all-feedback')} />
								</th>
							</tr>
						</thead>

						<tbody>
							{}
							{isLoading && Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}

							{}
							{isError && !isLoading && (
								<tr><td colSpan={7}>
									<EmptyState
										icon={AlertCircle}
										title={__('Failed to load forms', 'all-feedback')}
										description={__('There was a problem fetching your forms. Please try refreshing the page.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{}
							{!isLoading && !isError && surveys.length === 0 && (
								<tr><td colSpan={7}>
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
								</td></tr>
							)}

							{}
							{!isLoading && !isError && surveys.map((survey) => {
								const statusCfg = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.draft;
								const isSelected = checked.includes(survey.id);

								return (
									<tr
										key={survey.id}
										className={cn(
											'border-b border-border last:border-0 transition-colors',
											isSelected ? 'bg-primary/[0.03]' : 'hover:bg-muted/20',
										)}
									>
										{}
										<td className="w-12 px-4 py-5">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleOne(survey.id)}
											/>
										</td>

										{}
										<td className="w-16 px-4 py-5">
											<span className={cn(cellCls, 'tabular-nums text-foreground/40')}>
												#{survey.id}
											</span>
										</td>

										{}
										<td className="w-[220px] px-4 py-5">
											<button
												type="button"
												className="group/name flex min-w-0 items-center gap-1.5 text-left"
												onClick={() => void navigate({
													to: '/builder/', search: { new: false, id: survey.id },
												})}
											>
												<span className={cn(cellCls, 'truncate font-medium underline-offset-2 transition-all group-hover/name:text-primary group-hover/name:underline')}>
													{survey.title}
												</span>
												<Edit2 className="size-3 shrink-0 opacity-0 transition-all group-hover/name:text-primary group-hover/name:opacity-60" />
											</button>
										</td>

										{}
										<td className="w-28 px-4 py-5">
											{survey.response_count > 0 ? (
												<button
													type="button"
													className="group/resp inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-medium tabular-nums text-primary/70 transition-colors hover:bg-primary/[0.06] hover:text-primary"
													onClick={() => void navigate({ to: '/responses/', search: { surveyId: survey.id } })}
												>
													{survey.response_count.toLocaleString()}
													<ArrowUpRight className="size-3 opacity-50 transition-opacity group-hover/resp:opacity-100" />
												</button>
											) : (
												<span className={cn(cellCls, 'px-2 tabular-nums text-foreground/40')}>
													0
												</span>
											)}
										</td>

										{}
										<td className="w-36 px-4 py-5">
											<span className={cellCls}>
												{format(new Date(survey.created_at), 'MMM d, yyyy')}
											</span>
										</td>

										{}
										<td className="w-32 px-4 py-5">
											<Badge variant={statusCfg.variant}>
												<span className={cn('size-1.5 rounded-full', statusCfg.dot)} />
												{statusCfg.label}
											</Badge>
										</td>

										{}
										<td className="w-24 px-4 py-5">
											<div className="flex items-center gap-1">
												{}
												<button
													type="button"
													onClick={() => void navigate({
														to: '/builder/', search: { new: false, id: survey.id },
													})}
													style={{ border: '1.5px solid #E2E2E8' }}
													className="flex max-sm:hidden items-center gap-1 rounded-lg bg-primary/[0.04] px-2 py-1 text-[11px] font-medium text-primary/80 transition-colors hover:bg-primary/[0.08] hover:text-primary"
												>
													<Edit2 className="size-3" />
													{__('Edit', 'all-feedback')}
												</button>

												{}
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
														{}
														<DropdownMenuItem
															className="max-sm:flex sm:hidden"
															onSelect={() => void navigate({
																to: '/builder/', search: { new: false, id: survey.id },
															})}
														>
															<Edit2 className="size-3.5" />
															{__('Edit', 'all-feedback')}
														</DropdownMenuItem>

														{}
														{survey.status === 'trashed' && (
															<DropdownMenuItem
																onSelect={() => restoreMutation.mutate(survey.id)}
																disabled={restoreMutation.isPending}
															>
																{restoreMutation.isPending
																	? <Loader2 className="size-3.5 animate-spin" />
																	: <RotateCcw className="size-3.5" />
																}
																{__('Restore', 'all-feedback')}
															</DropdownMenuItem>
														)}

														{}
														<DropdownMenuItem
															onSelect={() => cloneMutation.mutate(survey.id)}
															disabled={cloneMutation.isPending}
														>
															{cloneMutation.isPending
																? <Loader2 className="size-3.5 animate-spin" />
																: <Copy className="size-3.5" />
															}
															{__('Clone', 'all-feedback')}
														</DropdownMenuItem>

														{}
														{survey.status !== 'trashed' && (
															<DropdownMenuItem
																onSelect={() => trashMutation.mutate(survey.id)}
																disabled={trashMutation.isPending}
															>
																{trashMutation.isPending
																	? <Loader2 className="size-3.5 animate-spin" />
																	: <Archive className="size-3.5" />
																}
																{__('Move to Trash', 'all-feedback')}
															</DropdownMenuItem>
														)}

														{}
														{survey.status === 'trashed' && (
															<DropdownMenuItem
																destructive
																onSelect={() => setConfirmDeleteId(survey.id)}
															>
																<Trash2 className="size-3.5" />
																{__('Delete', 'all-feedback')}
															</DropdownMenuItem>
														)}
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

			{}
			<Pagination
				className="mt-6"
				page={page}
				totalPages={totalPages}
				total={total}
				perPage={perPage}
				perPageOptions={PER_PAGE_OPTIONS}
				isLoading={isFetching}
				onPageChange={setPage}
				onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
			/>

			{}
			<BulkActionBar
				count={checked.length}
				showTrash={anySelectedNotTrashed}
				showDelete={allSelectedTrashed}
				showRestore={anySelectedTrashed}
				isDeleting={bulkDeleteMutation.isPending}
				isTrashing={bulkTrashMutation.isPending}
				isRestoring={bulkRestoreMutation.isPending}
				onDelete={() => setConfirmBulkDelete(true)}
				onTrash={() => setConfirmBulkTrash(true)}
				onRestore={() => bulkRestoreMutation.mutate(checked)}
				onClone={() => {}}
				onClear={() => setChecked([])}
			/>
		</div>
	);
};

export default AllForms;
