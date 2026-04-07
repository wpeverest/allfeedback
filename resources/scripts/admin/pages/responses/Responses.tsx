import { EmptyState } from '@/components/ui/empty-state';
import { __ } from '@wordpress/i18n';
import { MessageSquare } from 'lucide-react';

const Responses = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="mb-6">
				<h1 className="text-lg font-semibold text-foreground">
					{__('Responses', 'all-feedback')}
				</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{__('All feedback responses across your forms.', 'all-feedback')}
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card">
				<EmptyState
					icon={MessageSquare}
					title={__('No responses yet', 'all-feedback')}
					description={__('Responses will appear here once visitors start submitting your forms.', 'all-feedback')}
				/>
			</div>
		</div>
	);
};

export default Responses;
