import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { FileText, Plus } from 'lucide-react';

const AllForms = () => {
	const navigate = useNavigate();

	return (
		<div className="p-5 md:p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold text-foreground">
						{__('All Forms', 'all-feedback')}
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						{__('Manage your feedback forms.', 'all-feedback')}
					</p>
				</div>
				<Button size="lg" onClick={() => navigate({ to: '/builder/' })}>
					<Plus />
					{__('Add New Form', 'all-feedback')}
				</Button>
			</div>

			<div className="rounded-xl border border-border bg-card">
				<EmptyState
					icon={FileText}
					title={__('No forms yet', 'all-feedback')}
					description={__('Create your first feedback form to start collecting responses.', 'all-feedback')}
					action={
						<Button onClick={() => navigate({ to: '/builder/' })}>
							<Plus />
							{__('Add New Form', 'all-feedback')}
						</Button>
					}
				/>
			</div>
		</div>
	);
};

export default AllForms;
