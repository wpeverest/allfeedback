/**
 * pages/responses/Responses.tsx
 */

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

			<div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
				<div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
					<MessageSquare className="size-5 text-muted-foreground" />
				</div>
				<p className="text-sm font-medium text-foreground">{__('No responses yet', 'all-feedback')}</p>
				<p className="mt-1 text-xs text-muted-foreground">{__('Responses will appear here once forms are submitted.', 'all-feedback')}</p>
			</div>
		</div>
	);
};

export default Responses;
