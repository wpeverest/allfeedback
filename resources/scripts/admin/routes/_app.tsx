import GlobalHeader from '@/admin/components/GlobalHeader';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetchProgress } from '@/hooks/useFetchProgress';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app')({
	component: AppLayout,
	pendingComponent: PendingLayout,
});

function AppLayout() {
	const progress = useFetchProgress();
	return (
		<div className="relative flex min-h-screen flex-col bg-background">
			{}
			{progress !== 0 && (
				<div className="fixed top-[var(--wp-admin--admin-bar--height,32px)] right-0 left-0 z-[100] h-0.5 bg-border">
					<Progress value={progress} className="h-full rounded-none bg-primary" />
				</div>
			)}
			<GlobalHeader />
			<main className="flex-1">
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
					{}
					<div className="flex items-center justify-between">
						<div className="space-y-1.5">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</div>
						<Skeleton className="h-10 w-28" />
					</div>
					{}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="rounded-xl border border-border bg-card p-5">
								<Skeleton className="mb-3 h-4 w-24" />
								<Skeleton className="h-7 w-16" />
							</div>
						))}
					</div>
					{}
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
			<div className="fixed top-[var(--wp-admin--admin-bar--height,32px)] right-0 left-0 z-[100] h-0.5 bg-border">
				<Progress value={30} className="h-full rounded-none bg-primary" />
			</div>
		</div>
	);
}
