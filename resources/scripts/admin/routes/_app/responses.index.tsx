/**
 * routes/_app/responses.index.tsx — Responses route
 *
 * File-based route: /_app/responses/
 */

import Responses from '@/admin/pages/responses/Responses';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/responses/')({
	validateSearch: (search: Record<string, unknown>) => ({
		surveyId: search.surveyId !== undefined ? Number(search.surveyId) : undefined,
	}),
	component: Responses,
});
