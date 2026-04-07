import { __ } from '@wordpress/i18n';
import { BarChart2 } from 'lucide-react';

const Analytics = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="mb-6">
				<h1 className="text-lg font-semibold text-foreground">
					{__('Analytics', 'all-feedback')}
				</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{__('Response trends and form performance.', 'all-feedback')}
				</p>
			</div>

			<div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
				<div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
					<BarChart2 className="size-5 text-muted-foreground" />
				</div>
				<p className="text-sm font-medium text-foreground">{__('Analytics coming soon', 'all-feedback')}</p>
				<p className="mt-1 text-xs text-muted-foreground">{__('Charts and insights will appear here.', 'all-feedback')}</p>
			</div>
		</div>
	);
};

export default Analytics;
