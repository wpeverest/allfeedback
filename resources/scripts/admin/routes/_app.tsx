import { WIZARD_STATUS_QUERY_KEY, wizardApi } from '@/admin/api/wizard';
import GlobalHeader from '@/admin/components/GlobalHeader';
import NotFound from '@/admin/pages/NotFound';
import { Progress } from '@/components/ui/progress';
import { useFetchProgress } from '@/hooks/useFetchProgress';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

const AppNotFound = () => (
	<NotFound
		title="Page not found"
		description="The page you're looking for doesn't exist or has been moved."
		showFormsLink={ false }
		className="flex-1"
	/>
);

export const Route = createFileRoute( '/_app' )( {
	beforeLoad: async ( { context: { queryClient } } ) => {
		const status = await queryClient.ensureQueryData( {
			queryKey: WIZARD_STATUS_QUERY_KEY,
			queryFn:  wizardApi.getStatus,
			staleTime: Infinity,
		} );
		if ( status.status === 'pending_redirect' || status.status === 'not_started' ) {
			throw redirect( { to: '/wizard' } );
		}
	},
	component:         AppLayout,
	notFoundComponent: AppNotFound,
	pendingComponent:  PendingLayout,
} );

function AppLayout() {
	const progress = useFetchProgress();
	return (
		<div
			className="relative flex flex-col bg-background"
			style={{ height: 'calc(100vh - var(--wp-admin--admin-bar--height, 32px))' }}
		>
			{progress !== 0 && (
				<div className="fixed top-[var(--wp-admin--admin-bar--height,32px)] right-0 left-0 z-[100] h-[3px] bg-primary/15">
					<Progress value={progress} className="h-full rounded-none bg-primary/60" />
				</div>
			)}
			<GlobalHeader />
			<main className={
				'flex flex-col flex-1 min-h-0 overflow-auto transition-opacity duration-200'}>
				<Outlet />
			</main>
		</div>
	);
}

function PendingLayout() {
	return (
		<div
			className="relative flex flex-col bg-background"
			style={{ height: 'calc(100vh - var(--wp-admin--admin-bar--height, 32px))' }}
		>
			<div className="fixed top-[var(--wp-admin--admin-bar--height,32px)] right-0 left-0 z-[100] h-[3px] bg-primary/15">
				<Progress value={30} className="h-full rounded-none bg-primary/60" />
			</div>
			<GlobalHeader />
			<div className="flex flex-1 items-center justify-center">
				<Loader2 className="size-8 animate-spin text-primary/40" />
			</div>
		</div>
	);
}
