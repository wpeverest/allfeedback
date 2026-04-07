/**
 * routes/_app/analytics.index.tsx — Analytics route
 *
 * File-based route: /_app/analytics/
 */

import Analytics from '@/admin/pages/analytics/Analytics';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/analytics/')({
	component: Analytics,
});
