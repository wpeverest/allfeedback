import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { ArrowUpDown, ChevronLeft, ChevronRight, Edit2, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

type FormStatus = 'active' | 'paused' | 'draft';

interface FeedbackForm {
	id:        number;
	name:      string;
	status:    FormStatus;
	responses: number;
	createdAt: string;
}

const STATUS_BADGE: Record<FormStatus, { variant: 'success' | 'secondary' | 'outline'; label: string }> = {
	active: { variant: 'success',   label: __('Active', 'all-feedback') },
	paused: { variant: 'secondary', label: __('Paused', 'all-feedback') },
	draft:  { variant: 'outline',   label: __('Draft',  'all-feedback') },
};

const PER_PAGE_OPTIONS = ['10', '25', '50'];

const AllForms = () => {
	const navigate   = useNavigate();
	const [search,   setSearch]   = useState('');
	const [status,   setStatus]   = useState('all');
	const [perPage,  setPerPage]  = useState('10');
	const [page,     setPage]     = useState(1);
	const [checked,  setChecked]  = useState<number[]>([]);

	const forms: FeedbackForm[] = [];

	const filtered = forms.filter((f) => {
		const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
		const matchStatus = status === 'all' || f.status === status;
		return matchSearch && matchStatus;
	});

	const perPageNum = Number(perPage);
	const total      = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / perPageNum));
	const start      = total === 0 ? 0 : (page - 1) * perPageNum + 1;
	const end        = Math.min(page * perPageNum, total);
	const paginated  = filtered.slice((page - 1) * perPageNum, page * perPageNum);

	const allChecked = paginated.length > 0 && paginated.every((f) => checked.includes(f.id));
	const toggleAll  = () => setChecked(allChecked ? [] : paginated.map((f) => f.id));
	const toggleOne  = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	return (
		<div className="p-5 md:p-6">

				{/* Filter bar — on page background, no card */}
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
						<SelectItem value="active">{__('Active', 'all-feedback')}</SelectItem>
						<SelectItem value="paused">{__('Paused', 'all-feedback')}</SelectItem>
						<SelectItem value="draft">{__('Draft',  'all-feedback')}</SelectItem>
					</SelectContent>
				</Select>

				<div className="ml-auto">
					<Button onClick={() => navigate({ to: '/builder/' })}>
						<Plus />
						{__('Add New Form', 'all-feedback')}
					</Button>
				</div>
			</div>

			<div className="rounded-xl border border-border bg-card">

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="w-10 px-4 py-3 text-left">
									<input
										type="checkbox"
										checked={allChecked}
										onChange={toggleAll}
										className="size-4 cursor-pointer rounded accent-primary"
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
							{paginated.length === 0 ? (
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
							) : (
								paginated.map((form) => {
									const badge = STATUS_BADGE[form.status];
									return (
										<tr key={form.id} className="border-b border-border last:border-0 hover:bg-muted/20">
											<td className="px-4 py-3">
												<input
													type="checkbox"
													checked={checked.includes(form.id)}
													onChange={() => toggleOne(form.id)}
													className="size-4 cursor-pointer rounded accent-primary"
												/>
											</td>
											<td className="px-4 py-3 font-medium text-foreground">{form.name}</td>
											<td className="px-4 py-3 text-muted-foreground">{form.responses.toLocaleString()}</td>
											<td className="px-4 py-3 text-muted-foreground">
												{new Date(form.createdAt).toLocaleDateString()}
											</td>
											<td className="px-4 py-3">
												<Badge variant={badge.variant}>{badge.label}</Badge>
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center justify-end gap-1">
													<Button variant="ghost" size="icon-sm">
														<Edit2 className="size-3.5" />
													</Button>
													<Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
														<Trash2 className="size-3.5" />
													</Button>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Footer — outside the card */}
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
				<span>
					{__('Showing', 'all-feedback')} {start} - {end} {__('of', 'all-feedback')} {total}
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
						<Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
							<ChevronLeft className="size-3.5" />
						</Button>
						<span className="flex size-7 items-center justify-center rounded-md border border-border text-xs font-medium text-foreground">
							{page}
						</span>
						<Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
							<ChevronRight className="size-3.5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AllForms;
