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
	component: FormBuilder,
});
