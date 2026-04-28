import { surveyQuery, surveyResponseQuery, surveyResponsesQuery, surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

const ResponseDetailPending = () => (
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
						<div key={i} className="px-6 py-5">
							<div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
							<div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
						</div>
					))}
				</div>
				<div className="rounded-2xl border border-border/60 bg-white">
					<div className="border-b border-border/50 px-5 py-4">
						<div className="h-4 w-16 animate-pulse rounded bg-muted" />
					</div>
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i} className="border-b border-border/40 px-5 py-4 last:border-0">
							<div className="mb-1.5 h-2.5 w-16 animate-pulse rounded bg-muted" />
							<div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
						</div>
					))}
				</div>
			</div>
		</div>
	</div>
);

export const Route = createFileRoute('/_app/responses/$responseId')({
	validateSearch: (search: Record<string, unknown>) => {
		const rawId = search.surveyId;
		const id    = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return {
			surveyId: id !== undefined && Number.isFinite(id) && id > 0 ? id : 0,
			edit:     search.edit === true || search.edit === 'true',
		};
	},
	loaderDeps: ({ search }) => ({ surveyId: search.surveyId }),
	loader: ({ context: { queryClient }, params: { responseId }, deps: { surveyId } }) =>
		Promise.all([
			queryClient.ensureQueryData(surveyQuery(surveyId)).catch(() => undefined),
			queryClient.ensureQueryData(surveyResponseQuery(surveyId, Number(responseId))).catch(() => undefined),
			queryClient.ensureQueryData(surveysQuery({ per_page: 100 })).catch(() => undefined),
			queryClient.ensureQueryData(surveyResponsesQuery(surveyId, { per_page: 100, page: 1 })).catch(() => undefined),
		]),
	component:        lazyRouteComponent(() => import('@/admin/pages/responses/ResponseDetail')),
	pendingComponent: ResponseDetailPending,
	pendingMs:        100,
	pendingMinMs:     300,
});
