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
import { __ } from '@wordpress/i18n';
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye, MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Rating = 1 | 2 | 3 | 4 | 5;

interface Response {
	id:          number;
	form:        string;
	rating:      Rating;
	excerpt:     string;
	submittedAt: string;
}

const RATING_BADGE: Record<Rating, { variant: 'success' | 'info' | 'secondary' | 'warning' | 'danger' }> = {
	5: { variant: 'success'   },
	4: { variant: 'info'      },
	3: { variant: 'secondary' },
	2: { variant: 'warning'   },
	1: { variant: 'danger'    },
};

const PER_PAGE_OPTIONS = ['10', '25', '50'];

const Responses = () => {
	const [search,  setSearch]  = useState('');
	const [form,    setForm]    = useState('all');
	const [rating,  setRating]  = useState('all');
	const [perPage, setPerPage] = useState('10');
	const [page,    setPage]    = useState(1);
	const [checked, setChecked] = useState<number[]>([]);

	const responses: Response[] = [];

	const filtered = responses.filter((r) => {
		const matchSearch = r.excerpt.toLowerCase().includes(search.toLowerCase());
		const matchForm   = form === 'all' || r.form === form;
		const matchRating = rating === 'all' || r.rating === Number(rating);
		return matchSearch && matchForm && matchRating;
	});

	const perPageNum = Number(perPage);
	const total      = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / perPageNum));
	const start      = total === 0 ? 0 : (page - 1) * perPageNum + 1;
	const end        = Math.min(page * perPageNum, total);
	const paginated  = filtered.slice((page - 1) * perPageNum, page * perPageNum);

	const allChecked = paginated.length > 0 && paginated.every((r) => checked.includes(r.id));
	const toggleAll  = () => setChecked(allChecked ? [] : paginated.map((r) => r.id));
	const toggleOne  = (id: number) =>
		setChecked((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

	return (
		<div className="p-5 md:p-6">

			{/* Filter bar */}
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

				<Select value={form} onValueChange={(v) => { setForm(v); setPage(1); }}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder={__('All Forms', 'all-feedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All Forms', 'all-feedback')}</SelectItem>
					</SelectContent>
				</Select>

				<Select value={rating} onValueChange={(v) => { setRating(v); setPage(1); }}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder={__('All Ratings', 'all-feedback')} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{__('All Ratings', 'all-feedback')}</SelectItem>
						<SelectItem value="5">★★★★★ 5</SelectItem>
						<SelectItem value="4">★★★★☆ 4</SelectItem>
						<SelectItem value="3">★★★☆☆ 3</SelectItem>
						<SelectItem value="2">★★☆☆☆ 2</SelectItem>
						<SelectItem value="1">★☆☆☆☆ 1</SelectItem>
					</SelectContent>
				</Select>
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
									{__('Form', 'all-feedback')}
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{__('Response', 'all-feedback')}
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{__('Rating', 'all-feedback')}
								</th>
								<th className="px-4 py-3 text-left">
									<button type="button" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
										{__('Submitted', 'all-feedback')}
										<ArrowUpDown className="size-3" />
									</button>
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
											icon={MessageSquare}
											title={search || form !== 'all' || rating !== 'all'
												? __('No responses match your filters.', 'all-feedback')
												: __('No responses yet', 'all-feedback')
											}
											description={search || form !== 'all' || rating !== 'all'
												? __('Try adjusting your search or filter criteria.', 'all-feedback')
												: __('Responses will appear here once visitors submit your forms.', 'all-feedback')
											}
										/>
									</td>
								</tr>
							) : (
								paginated.map((response) => {
									const badge = RATING_BADGE[response.rating];
									return (
										<tr key={response.id} className="border-b border-border last:border-0 hover:bg-muted/20">
											<td className="px-4 py-3">
												<input
													type="checkbox"
													checked={checked.includes(response.id)}
													onChange={() => toggleOne(response.id)}
													className="size-4 cursor-pointer rounded accent-primary"
												/>
											</td>
											<td className="px-4 py-3 font-medium text-foreground">{response.form}</td>
											<td className="max-w-xs px-4 py-3 text-muted-foreground">
												<span className="line-clamp-1">{response.excerpt}</span>
											</td>
											<td className="px-4 py-3">
												<Badge variant={badge.variant}>{response.rating} ★</Badge>
											</td>
											<td className="px-4 py-3 text-muted-foreground">
												{new Date(response.submittedAt).toLocaleDateString()}
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center justify-end gap-1">
													<Button variant="ghost" size="icon-sm">
														<Eye className="size-3.5" />
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

			{/* Footer */}
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
				<span>
					{__('Showing', 'all-feedback')} {start} - {end} {__('of', 'all-feedback')} {total}
				</span>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<span className="text-sm">{__('Responses per page', 'all-feedback')}</span>
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

export default Responses;
