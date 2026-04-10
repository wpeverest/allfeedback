import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/responses/')({
	validateSearch: (search: Record<string, unknown>) => ({
		surveyId: search.surveyId !== undefined ? Number(search.surveyId) : undefined,
	}),
	component: lazyRouteComponent(() => import('@/admin/pages/responses/Responses')),
});
