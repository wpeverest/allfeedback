/**
 * routes/builder.index.tsx — Form builder route
 *
 * File-based route: /builder/
 * Intentionally placed outside /_app so the global header is NOT rendered.
 * The builder has its own full-screen header with a back button.
 */

import FormBuilder from '@/admin/pages/forms/FormBuilder';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/builder/')({
	validateSearch: (search: Record<string, unknown>) => ({
		new: search.new === true || search.new === 'true',
	}),
	component: FormBuilder,
});
