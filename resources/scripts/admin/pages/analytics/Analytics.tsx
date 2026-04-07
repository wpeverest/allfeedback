import { EmptyState } from '@/components/ui/empty-state';
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

			<div className="rounded-xl border border-border bg-card">
				<EmptyState
					icon={BarChart2}
					title={__('No data yet', 'all-feedback')}
					description={__('Analytics will appear here once your forms start receiving responses.', 'all-feedback')}
				/>
			</div>
		</div>
	);
};

export default Analytics;
