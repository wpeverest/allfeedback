/**
 * pages/forms/AllForms.tsx
 */

import { __ } from '@wordpress/i18n';
import { FileText } from 'lucide-react';

const AllForms = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="mb-6">
				<h1 className="text-lg font-semibold text-foreground">
					{__('All Forms', 'all-feedback')}
				</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					{__('Manage your feedback forms.', 'all-feedback')}
				</p>
			</div>

			<div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
				<div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
					<FileText className="size-5 text-muted-foreground" />
				</div>
				<p className="text-sm font-medium text-foreground">{__('No forms yet', 'all-feedback')}</p>
				<p className="mt-1 text-xs text-muted-foreground">{__('Your feedback forms will appear here.', 'all-feedback')}</p>
			</div>
		</div>
	);
};

export default AllForms;
