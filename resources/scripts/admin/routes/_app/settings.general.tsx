/**
 * routes/_app/settings.general.tsx — General settings tab
 *
 * File-based route: /_app/settings/general
 */

import GeneralSettings from '@/admin/pages/settings/GeneralSettings';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/general')({
	component: GeneralSettings,
});
