/**
 * routes/builder.index.tsx — Form builder route
 *
 * Intentionally outside /_app so the global header is NOT rendered.
 *
 * The loader calls ensureQueryData so survey data is guaranteed to be in the
 * TanStack Query cache before the component mounts — on both programmatic
 * navigation and hard page refresh.
 *
 * We deliberately avoid loaderDeps: on hash-history initial load the validated
 * search is not always available when loaderDeps runs, which can produce NaN.
 * Instead we read `location.search` directly inside the loader, which always
 * reflects the target location (navigation or refresh).
 */

import FormBuilder from '@/admin/pages/forms/FormBuilder';
import { surveyQuery } from '@/admin/queries/surveys';
import { createFileRoute } from '@tanstack/react-router';

/** Skeleton shown while the route loader fetches survey data (navigation + refresh). */
const BuilderPending = () => (
	<div className="allfb-builder fixed inset-0 z-[99999] flex flex-col bg-background">
		{/* Header */}
		<header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-white px-6">
			<div className="flex flex-1 items-center gap-2">
				{/* Back button placeholder */}
				<div className="size-8 animate-pulse rounded-lg bg-muted/60" />
				<span className="h-5 w-px bg-border" />
				{/* Title placeholder */}
				<div className="h-7 w-64 animate-pulse rounded-lg bg-muted/60" />
			</div>
			<div className="flex items-center gap-3">
				{/* Undo/redo */}
				<div className="flex gap-0.5">
					<div className="size-8 animate-pulse rounded-lg bg-muted/60" />
					<div className="size-8 animate-pulse rounded-lg bg-muted/60" />
				</div>
				{/* Publish button */}
				<div className="h-10 w-28 animate-pulse rounded-lg bg-muted/60" />
			</div>
		</header>

		{/* Stepper nav */}
		<div className="flex h-[72px] shrink-0 items-center justify-center gap-6 border-b border-border/40 bg-white px-8">
			{[100, 90, 80].map((w, i) => (
				<div key={i} className="flex items-center gap-2.5">
					{i > 0 && <div className="h-px w-12 bg-border/50" />}
					<div className="size-10 animate-pulse rounded-full bg-muted/60" />
					<div className={`h-4 animate-pulse rounded bg-muted/60`} style={{ width: w }} />
				</div>
			))}
		</div>

		{/* Body */}
		<div className="flex flex-1 overflow-hidden">
			{/* Canvas area */}
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-5">
				{[1, 2].map((n) => (
					<div key={n} className="overflow-hidden rounded-2xl border border-border/60 bg-white">
						<div className="flex items-center gap-3 border-b border-border/50 bg-white px-5 py-4">
							<div className="size-4 animate-pulse rounded bg-muted/60" />
							<div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
						</div>
						<div className="space-y-3 p-5">
							<div className="h-20 animate-pulse rounded-xl bg-muted/60" />
							<div className="h-10 animate-pulse rounded-lg bg-muted/60" />
						</div>
					</div>
				))}
			</div>

			{/* Resize handle */}
			<div className="w-3 shrink-0 border-x border-border bg-white" />

			{/* Preview panel */}
			<div className="w-[45vw] shrink-0 bg-background p-5">
				<div className="h-full animate-pulse rounded-2xl bg-muted/60" />
			</div>
		</div>
	</div>
);

export const Route = createFileRoute('/builder/')({
	validateSearch: (search: Record<string, unknown>) => {
		// On hash-history refresh, TanStack Router may call validateSearch before the
		// hash search string is available, so `search` arrives empty/incomplete.
		// Fall back to parsing window.location.hash directly so the id is never lost.
		let rawId = search.id;
		if ((rawId === undefined || rawId === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) {
				rawId = new URLSearchParams(window.location.hash.slice(qi + 1)).get('id') ?? undefined;
			}
		}
		const numId = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;

		let rawNew = search.new;
		if ((rawNew === undefined || rawNew === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) {
				rawNew = new URLSearchParams(window.location.hash.slice(qi + 1)).get('new') ?? undefined;
			}
		}

		return {
			new: rawNew === true || rawNew === 'true',
			// Guard against NaN — Number('abc') or Number(undefined) would produce it.
			id:  numId !== undefined && !Number.isNaN(numId) ? numId : undefined,
		};
	},

	loader: async ({ context: { queryClient }, location }) => {
		// Prefer the validated search; fall back to raw hash for timing safety on refresh.
		let id = (location.search as { id?: number }).id;
		if ((id === undefined || Number.isNaN(id as number)) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) {
				const raw = new URLSearchParams(window.location.hash.slice(qi + 1)).get('id');
				if (raw !== null) {
					const n = Number(raw);
					if (!Number.isNaN(n)) id = n;
				}
			}
		}
		if (id !== undefined && !Number.isNaN(id as number)) {
			await queryClient.ensureQueryData(surveyQuery(id));
		}
	},

	component:        FormBuilder,
	pendingComponent: BuilderPending,
	pendingMs:        100,   // show pending UI only if loader takes >100 ms
	pendingMinMs:     300,   // once shown, keep it for at least 300 ms to avoid flash
});
