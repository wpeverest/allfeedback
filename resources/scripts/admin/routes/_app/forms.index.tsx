/**
 * routes/_app/forms.index.tsx — All Forms route
 *
 * File-based route: /_app/forms/
 */

import AllForms from '@/admin/pages/forms/AllForms';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/forms/')({
	component: AllForms,
});
