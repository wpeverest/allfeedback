/**
 * routes/_app/forms.index.tsx — All Forms route
 *
 * File-based route: /_app/forms/
 */

import AllForms from '@/admin/pages/forms/AllForms';
import { surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/forms/')({
	loader: async ({ context: { queryClient } }) => {
		try {
			await queryClient.ensureQueryData(surveysQuery());
		} catch {
			// Loader errors are handled by the component's isError state.
		}
	},
	component: AllForms,
});
