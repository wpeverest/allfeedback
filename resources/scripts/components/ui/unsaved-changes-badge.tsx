import { __ } from '@wordpress/i18n';

const UnsavedChangesBadge = () => (
	<div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5">
		<span className="size-2 animate-pulse rounded-full bg-amber-500" />
		<span className="text-sm font-semibold text-amber-700">
			{__('Unsaved changes', 'all-feedback')}
		</span>
	</div>
);

export default UnsavedChangesBadge;
