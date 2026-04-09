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

export const Route = createFileRoute('/builder/')({
	validateSearch: (search: Record<string, unknown>) => {
		const rawId = search.id;
		const numId  = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return {
			new: search.new === true || search.new === 'true',
			// Guard against NaN — Number('abc') or Number(undefined) would produce it.
			id:  numId !== undefined && !Number.isNaN(numId) ? numId : undefined,
		};
	},

	loader: async ({ context: { queryClient }, location }) => {
		const { id } = location.search as { id?: number };
		if (id !== undefined && !Number.isNaN(id)) {
			await queryClient.ensureQueryData(surveyQuery(id));
		}
	},

	component: FormBuilder,
});
