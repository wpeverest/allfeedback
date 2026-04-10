import { __ } from '@wordpress/i18n';
import { FileText, MessageSquare, Star, TrendingUp } from 'lucide-react';

const STATS = [
	{
		label: __('Total Forms', 'all-feedback'),
		value: '12',
		icon: FileText,
		color: 'bg-primary/10 text-primary',
	},
	{
		label: __('Total Responses', 'all-feedback'),
		value: '1,284',
		icon: MessageSquare,
		color: 'bg-success-subtle text-success',
	},
	{
		label: __('Avg. Rating', 'all-feedback'),
		value: '4.3 ★',
		icon: Star,
		color: 'bg-warning-subtle text-warning',
	},
	{
		label: __('Response Rate', 'all-feedback'),
		value: '67%',
		icon: TrendingUp,
		color: 'bg-info-subtle text-info',
	},
];

const Dashboard = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{STATS.map(({ label, value, icon: Icon, color }) => (
					<div
						key={label}
						className="border-border bg-card rounded-xl border p-5 shadow-sm"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-muted-foreground text-xs font-medium">
									{label}
								</p>
								<p className="text-foreground mt-1.5 text-2xl font-bold">
									{value}
								</p>
							</div>
							<div
								className={`flex size-9 items-center justify-center rounded-lg ${color}`}
							>
								<Icon className="size-4" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Dashboard;
