import GlobalHeader from '@/admin/components/GlobalHeader';
import NotFound from '@/admin/pages/NotFound';
import { wizardApi, WIZARD_STATUS_QUERY_KEY } from '@/admin/api/wizard';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetchProgress } from '@/hooks/useFetchProgress';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

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
			throw redirect( { to: '/wizard/' } );
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
			<main className="flex flex-col flex-1 min-h-0 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}

function PendingLayout() {
	return (
		<div className="relative flex min-h-screen flex-col bg-background">
			<GlobalHeader />
			<main className="flex-1 p-5 md:p-6">
				<div className="space-y-5">
					<div className="flex items-center justify-between">
						<div className="space-y-1.5">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</div>
						<Skeleton className="h-10 w-28" />
					</div>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="rounded-xl border border-border bg-card p-5">
								<Skeleton className="mb-3 h-4 w-24" />
								<Skeleton className="h-7 w-16" />
							</div>
						))}
					</div>
					<div className="rounded-xl border border-border bg-card">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex gap-4 border-b border-border px-5 py-3.5 last:border-0">
								<Skeleton className="h-4 w-1/4" />
								<Skeleton className="h-4 w-1/6" />
								<Skeleton className="h-4 w-1/5" />
								<Skeleton className="h-4 w-1/6" />
							</div>
						))}
					</div>
				</div>
			</main>
			<div className="fixed top-[var(--wp-admin--admin-bar--height,32px)] right-0 left-0 z-[100] h-[3px] bg-primary/15">
				<Progress value={30} className="h-full rounded-none bg-primary/60" />
			</div>
		</div>
	);
}
