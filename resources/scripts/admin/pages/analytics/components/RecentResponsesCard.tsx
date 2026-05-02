import type { FormAnalyticsListItem } from '@/admin/api/analytics';
import type { SurveyResponse } from '@/admin/api/surveys';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

function ResponseRow({
	r,
	formTitle,
}: {
	r: SurveyResponse;
	formTitle: string;
}) {
	const timeAgo = formatDistanceToNow(new Date(r.created_at), {
		addSuffix: true,
	});

	const sentimentClass =
		r.score !== null
			? r.score >= 9
				? { label: __('Positive', 'allfeedback'), cls: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/80' }
				: r.score >= 7
					? { label: __('Neutral', 'allfeedback'), cls: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200/80' }
					: { label: __('Negative', 'allfeedback'), cls: 'text-red-700 bg-red-50 ring-1 ring-red-200/80' }
			: null;

	const responseText = (() => {
		if (!r.response_data) return '—';
		const vals = Object.values(r.response_data).filter(
			(v) => v !== null && v !== undefined && v !== '',
		);
		if (!vals.length) return '—';
		const first = vals[0];
		return Array.isArray(first) ? first.join(', ') : String(first);
	})();

	return (
		<Link
			to="/responses/$responseId"
			params={{ responseId: String(r.id) }}
			search={{ surveyId: r.survey_id, edit: false }}
			className={[
				'block grid gap-2 px-5 py-1.5 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer no-underline text-inherit',
				r.is_read
					? 'border-l-[3px] border-l-transparent'
					: 'border-l-[3px] border-l-primary/50 bg-muted/[0.18]',
			].join(' ')}
			style={{ gridTemplateColumns: '1fr auto' }}
		>
			<div className="min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					{formTitle && (
						<span className="text-[13px] font-medium text-muted-foreground">
							{formTitle}
						</span>
					)}
					{sentimentClass && (
						<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sentimentClass.cls}`}>
							<span className="size-1.5 rounded-full bg-current" />
							{sentimentClass.label}
						</span>
					)}
					{r.score !== null && (
						<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary/[0.07] text-primary ring-1 ring-primary/15">
							NPS {r.score}
						</span>
					)}
				</div>
				{responseText === '—' ? (
					<p className="text-[13px] leading-snug text-muted-foreground italic">
						{__('No response text.', 'allfeedback')}
					</p>
				) : (
					<p className="!mt-1 line-clamp-2 text-[13px] leading-snug text-foreground/80">
						&ldquo;{responseText}&rdquo;
					</p>
				)}
			</div>

			<span className="shrink-0 text-[12px] font-medium tabular-nums text-muted-foreground whitespace-nowrap self-start mt-0.5">
				{timeAgo}
			</span>
		</Link>
	);
}

export function RecentResponsesCard({
	responses,
	forms,
	loading,
	surveyId,
}: {
	responses: SurveyResponse[];
	forms: FormAnalyticsListItem[];
	loading: boolean;
	surveyId?: number;
}) {
	const formMap = useMemo(() => {
		const m = new Map<number, string>();
		forms.forEach((f) => m.set(f.id, f.title));
		return m;
	}, [forms]);

	return (
		<div
			style={{
				background: 'var(--card)',
				borderRadius: 'var(--radius-2xl)',
				boxShadow: 'var(--shadow-card)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '16px 20px',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<div>
					<h3
						style={{
							fontSize: 'var(--text-md)',
							fontWeight: 600,
							letterSpacing: '-0.01em',
							color: 'color-mix(in oklch, var(--foreground) 80%, transparent)',
							margin: 0,
						}}
					>
						{__('Recent responses', 'allfeedback')}
					</h3>
					{loading ? (
						<Skeleton
							style={{ height: 12, width: 120, borderRadius: 4, marginTop: 5 }}
						/>
					) : (
						<p
							style={{
								marginTop: 2,
								fontSize: '12px',
								color: 'var(--muted-foreground)',
							}}
						>
							{responses.length} {__('shown · sorted by newest', 'allfeedback')}
						</p>
					)}
				</div>
				{!loading && responses.length === 0 ? (
					<span
						className="inline-flex items-center gap-1.5 rounded-lg bg-transparent px-3 py-1.5 text-sm font-medium cursor-not-allowed opacity-40"
						style={{ border: '1.5px solid var(--border)', color: 'var(--muted-foreground)' }}
					>
						{__('View all', 'allfeedback')}
						<ArrowRight className="size-3.5" />
					</span>
				) : (
					<Link
						to="/responses"
						search={{ surveyId: surveyId ?? undefined }}
						className="inline-flex items-center gap-1.5 rounded-lg bg-transparent px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
						style={{ border: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)', color: 'var(--primary)' }}
					>
						{__('View all', 'allfeedback')}
						<ArrowRight className="size-3.5" />
					</Link>
				)}
			</div>

			{loading ? (
				<div>
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="flex items-start justify-between gap-3.5 px-5 py-4 border-b border-border last:border-0"
						>
							<div className="flex flex-col gap-1.5 min-w-0 flex-1">
								<Skeleton className="h-3 w-28 rounded" />
								<Skeleton className="h-3 w-4/5 rounded" />
							</div>
							<Skeleton className="h-3 w-14 rounded shrink-0 mt-0.5" />
						</div>
					))}
				</div>
			) : !responses.length ? (
				<div className="py-12 text-center">
					<p className="text-sm text-muted-foreground">
						{__('No responses yet.', 'allfeedback')}
					</p>
				</div>
			) : (
				responses.map((r) => (
					<ResponseRow
						key={r.id}
						r={r}
						formTitle={formMap.get(r.survey_id) ?? ''}
					/>
				))
			)}
		</div>
	);
}
