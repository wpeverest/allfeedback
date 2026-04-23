import { __, sprintf } from '@wordpress/i18n';
import {
	FileText,
	MessageSquare,
	ArrowRight,
	Eye,
	TrendingUp,
	CheckCircle2,
	Inbox,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardQuery } from '@/admin/queries/surveys';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const StatCard = ({ label, value, icon: Icon, color, loading }: any) => (
	<div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
		<div className="flex items-start justify-between">
			<div className="space-y-2">
				<p className="text-sm font-medium text-muted-foreground">{label}</p>
				{loading ? (
					<Skeleton className="h-8 w-20" />
				) : (
					<h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
				)}
			</div>
			<div className={cn('flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110', color)}>
				<Icon className="size-6" />
			</div>
		</div>
		<div className="absolute -bottom-2 -right-2 size-24 opacity-[0.03] transition-transform group-hover:scale-125">
			<Icon className="size-full" />
		</div>
	</div>
);

const Dashboard = () => {
	const navigate = useNavigate();
	const { data, isLoading } = useQuery(dashboardQuery());

	const stats = [
		{
			label: __('Total Forms', 'all-feedback'),
			value: data?.stats?.surveys ?? 0,
			icon: FileText,
			color: 'bg-indigo-50 text-indigo-600',
		},
		{
			label: __('Total Responses', 'all-feedback'),
			value: data?.stats?.responses ?? 0,
			icon: MessageSquare,
			color: 'bg-emerald-50 text-emerald-600',
		},
		{
			label: __('Unread Responses', 'all-feedback'),
			value: data?.stats?.unread ?? 0,
			icon: Inbox,
			color: 'bg-rose-50 text-rose-600',
		},
		{
			label: __('Completion Rate', 'all-feedback'),
			value: '84%',
			icon: TrendingUp,
			color: 'bg-amber-50 text-amber-600',
		},
	];

	return (
		<div className="space-y-8 p-6 lg:p-8">
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<StatCard key={stat.label} {...stat} loading={isLoading} />
				))}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-4">
					<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
						<div className="mb-6 flex items-center justify-between">
							<h3 className="font-semibold text-foreground">{__('Responses over time', 'all-feedback')}</h3>
							<Badge variant="outline" className="font-medium">
								{__('Last 30 days', 'all-feedback')}
							</Badge>
						</div>
						
						<div className="relative h-[240px] w-full pt-4">
							{isLoading ? (
								<div className="flex h-full items-center justify-center">
									<Skeleton className="h-full w-full rounded-lg" />
								</div>
							) : (
								<div className="flex h-full items-end justify-between gap-1">
									{data?.chart?.map((day: any, i: number) => {
										const max = Math.max(...data.chart.map((d: any) => d.count), 1);
										const height = (day.count / max) * 100;
										return (
											<div key={day.date} className="group relative flex flex-1 flex-col items-center">
												<div 
													className="w-full rounded-t-sm bg-primary/20 transition-all hover:bg-primary/40" 
													style={{ height: `${Math.max(height, 2)}%` }}
												/>
												<div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
													{day.count}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
						<div className="mt-4 flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
							<span>{data?.chart?.[0]?.date}</span>
							<span>{data?.chart?.[data.chart?.length - 1]?.date}</span>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="font-semibold text-foreground">{__('Recent Responses', 'all-feedback')}</h3>
						<Button 
							variant="ghost" 
							size="sm" 
							className="h-8 text-xs font-medium hover:bg-muted"
							onClick={() => navigate({ to: '/responses' })}
						>
							{__('View All', 'all-feedback')}
							<ArrowRight className="ml-1 size-3" />
						</Button>
					</div>

					<div className="space-y-5">
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="size-10 shrink-0 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-3 w-2/3" />
									</div>
								</div>
							))
						) : data?.recent?.length > 0 ? (
							data.recent.map((resp: any) => (
								<div 
									key={resp.id} 
									className="group flex cursor-pointer items-start gap-4"
									onClick={() => navigate({ 
										to: '/responses/$responseId', 
										params: { responseId: String(resp.id) },
										search: { surveyId: resp.survey_id }
									})}
								>
									<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
										<MessageSquare className="size-5" />
									</div>
									<div className="min-w-0 flex-1 border-b border-border/50 pb-4 group-last:border-0">
										<div className="flex items-center justify-between gap-2">
											<p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
												{resp.summary}
											</p>
											<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
												{formatDistanceToNow(new Date(resp.created_at), { addSuffix: true })}
											</span>
										</div>
										<p className="mt-0.5 truncate text-xs text-muted-foreground">
											{sprintf(__('Response #%d', 'all-feedback'), resp.id)}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
									<CheckCircle2 className="size-6 text-muted-foreground/40" />
								</div>
								<p className="text-sm font-medium text-muted-foreground">
									{__('No recent responses', 'all-feedback')}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;

