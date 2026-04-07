/**
 * routes/_app.tsx — App layout route
 *
 * Wraps all authenticated admin pages with the GlobalHeader and a
 * top-of-page fetch-progress bar. The pendingComponent renders an
 * identical shell with skeleton rows so the layout never shifts.
 */

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
		<div className="relative flex min-h-screen flex-col bg-gray-100">
			<GlobalHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			{progress !== 0 && (
				<div className="absolute top-0 right-0 left-0 z-50 h-1 bg-gray-200">
					<Progress value={progress} className="h-full rounded-none" />
				</div>
			)}
		</div>
	);
}

function PendingLayout() {
	return (
		<div className="relative flex min-h-screen flex-col bg-gray-100">
			<GlobalHeader />
			<main className="flex-1 p-4 md:p-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-9 w-32" />
					</div>
					<div className="rounded-md border border-gray-200 bg-white">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex gap-4 border-b border-gray-100 px-4 py-3.5 last:border-b-0"
							>
								<Skeleton className="h-4 w-1/4" />
								<Skeleton className="h-4 w-1/3" />
								<Skeleton className="h-4 w-1/6" />
								<Skeleton className="h-4 w-1/6" />
							</div>
						))}
					</div>
				</div>
			</main>
			<div className="absolute top-0 right-0 left-0 z-50 h-1 bg-gray-200">
				<Progress value={30} className="h-full rounded-none" />
			</div>
		</div>
	);
}
