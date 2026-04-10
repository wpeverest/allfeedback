import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { surveysApi } from '@/admin/api/surveys';
import { cn } from '@/lib/utils';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SurveyResponse } from '@/admin/api/surveys';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const cellCls = 'text-[13px] font-normal leading-[20px] text-[oklch(0.446_0.03_256.802)]';

const getResponseSummary = (data: Record<string, unknown> | null): string => {
	if (!data) return '—';
	const vals = Object.values(data).filter((v) => v !== null && v !== undefined && v !== '');
	if (!vals.length) return '—';
	const first = vals[0];
	if (Array.isArray(first)) return first.join(', ');
	return String(first);
};

/* ── Skeleton row ────────────────────────────────────────────────────────── */
const SkeletonRow = () => (
	<tr className="border-b border-border">
		<td className="w-12 px-4 py-4"><div className="size-[16px] animate-pulse rounded-[4px] bg-muted" /></td>
		<td className="w-14 px-4 py-4"><div className="h-4 w-8 animate-pulse rounded bg-muted" /></td>
		<td className="w-[220px] px-4 py-4"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></td>
		<td className="w-32 px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
		<td className="w-24 px-4 py-4"><div className="size-7 animate-pulse rounded-lg bg-muted" /></td>
	</tr>
);

/* ── ResponsesPanel ──────────────────────────────────────────────────────── */
interface ResponsesPanelProps {
	surveyId: number;
}

const ResponsesPanel = ({ surveyId }: ResponsesPanelProps) => {
	const queryClient = useQueryClient();

	const [page,    setPage]    = useState(1);
	const [perPage, setPerPage] = useState(10);
	const [sortBy,  setSortBy]  = useState<'id' | 'created_at'>('created_at');
	const [order,   setOrder]   = useState<'ASC' | 'DESC'>('DESC');
	const [checked,         setChecked]         = useState<number[]>([]);
	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
	const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

	const queryParams = { page, per_page: perPage };

	const { data, isLoading, isError, isFetching } = useQuery({
		queryKey: ['responses', surveyId, queryParams],
		queryFn:  () => surveysApi.listResponses(surveyId, queryParams),
		placeholderData: keepPreviousData,
	});

	const responses  = data?.responses ?? [];
	const total      = data?.total     ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));

	/* ── Sort (client-side within current page) ── */
	const sorted = [...responses].sort((a, b) => {
		const valA = sortBy === 'id' ? a.id : new Date(a.created_at).getTime();
		const valB = sortBy === 'id' ? b.id : new Date(b.created_at).getTime();
		return order === 'DESC' ? valB - valA : valA - valB;
	});

	/* ── Selection ── */
	const allChecked  = responses.length > 0 && responses.every((r) => checked.includes(r.id));
	const someChecked = checked.length > 0 && !allChecked;
	const toggleAll   = () => setChecked(allChecked ? [] : responses.map((r) => r.id));
	const toggleOne   = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	/* ── Delete mutation ── */
	const deleteMutation = useMutation({
		mutationFn: (responseId: number) => surveysApi.deleteResponse(surveyId, responseId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['responses', surveyId] });
			setChecked((prev) => prev.filter((id) => id !== confirmDeleteId));
			setConfirmDeleteId(null);
			toast.success(__('Response deleted.', 'all-feedback'));
		},
		onError: () => {
			setConfirmDeleteId(null);
			toast.error(__('Failed to delete response. Please try again.', 'all-feedback'));
		},
	});

	/* ── Bulk delete mutation ── */
	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: number[]) =>
			Promise.all(ids.map((id) => surveysApi.deleteResponse(surveyId, id))),
		onSuccess: (_, ids) => {
			void queryClient.invalidateQueries({ queryKey: ['responses', surveyId] });
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

	/* ── Col head ── */
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
		<div className="flex-1 overflow-y-auto bg-background p-5">

			{/* Single delete */}
			<ConfirmDialog
				open={confirmDeleteId !== null}
				onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setConfirmDeleteId(null); }}
				onConfirm={() => { if (confirmDeleteId !== null) deleteMutation.mutate(confirmDeleteId); }}
				title={__('Delete response?', 'all-feedback')}
				description={__('This action cannot be undone. The response will be permanently removed.', 'all-feedback')}
				confirmLabel={__('Delete', 'all-feedback')}
				cancelLabel={__('Cancel', 'all-feedback')}
				isPending={deleteMutation.isPending}
			/>

			{/* Bulk delete */}
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

			{/* Table card */}
			<div className="rounded-xl border border-border bg-card">
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
								<th className="w-14 px-4 py-4 text-left"><ColHead label={__('ID', 'all-feedback')} col="id" /></th>
								<th className="w-[220px] px-4 py-4 text-left"><ColHead label={__('Response', 'all-feedback')} /></th>
								<th className="w-32 px-4 py-4 text-left"><ColHead label={__('Submitted', 'all-feedback')} col="created_at" /></th>
								<th className="w-24 px-4 py-4 text-left"><ColHead label={__('Actions', 'all-feedback')} /></th>
							</tr>
						</thead>
						<tbody>
							{isLoading && Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}

							{isError && !isLoading && (
								<tr><td colSpan={5}>
									<EmptyState
										icon={AlertCircle}
										title={__('Failed to load responses', 'all-feedback')}
										description={__('There was a problem fetching responses. Please try again.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{!isLoading && !isError && responses.length === 0 && (
								<tr><td colSpan={5}>
									<EmptyState
										icon={MessageSquare}
										title={__('No responses yet', 'all-feedback')}
										description={__('Responses will appear here once visitors submit this form.', 'all-feedback')}
									/>
								</td></tr>
							)}

							{!isLoading && !isError && sorted.map((response: SurveyResponse) => {
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
										<td className="w-12 px-4 py-4">
											<Checkbox checked={isSelected} onCheckedChange={() => toggleOne(response.id)} />
										</td>
										<td className="w-14 px-4 py-4">
											<span className={cn(cellCls, 'tabular-nums text-foreground/40')}>#{response.id}</span>
										</td>
										<td className="w-[220px] px-4 py-4">
											<span className={cn(cellCls, 'line-clamp-1 block')}>{summary}</span>
										</td>
										<td className="w-32 px-4 py-4">
											<span className={cellCls}>{new Date(response.created_at).toLocaleDateString()}</span>
										</td>
										<td className="w-24 px-4 py-4">
											<div className="flex items-center gap-1">
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
															destructive
															onSelect={() => setConfirmDeleteId(response.id)}
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
				className="mt-4"
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
				showDelete={checked.length > 0}
				onDelete={() => setBulkConfirmOpen(true)}
				onTrash={() => {}}
				onRestore={() => {}}
				onClone={() => {}}
				onClear={() => setChecked([])}
				isDeleting={bulkDeleteMutation.isPending}
			/>
		</div>
	);
};

export default ResponsesPanel;
