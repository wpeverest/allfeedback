import { createFileRoute } from '@tanstack/react-router';
import SetupWizard from '@/admin/pages/wizard/SetupWizard';

export const Route = createFileRoute( '/wizard/' )( {
	component: SetupWizard,
} );
