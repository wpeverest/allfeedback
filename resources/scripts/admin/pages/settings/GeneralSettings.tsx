/**
 * pages/settings/GeneralSettings.tsx — General settings tab
 *
 * Loads plugin settings via TanStack Query, lets the admin update them,
 * and persists changes via the REST API.
 */

import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { toast } from 'sonner';

const GeneralSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			toast.success(__('Settings saved.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings.', 'all-feedback'));
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		mutate({
			plugin_name:   String(form.get('plugin_name') ?? ''),
			sample_option: String(form.get('sample_option') ?? ''),
		});
	};

	return (
		<div className="p-6">
			<div className="mb-6 border-b border-gray-100 pb-4">
				<h2 className="text-base font-semibold text-gray-900">
					{__('General', 'all-feedback')}
				</h2>
				<p className="mt-0.5 text-sm text-gray-500">
					{__('Core plugin settings.', 'all-feedback')}
				</p>
			</div>

			{isPending ? (
				<div className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : (
				<form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
					<div className="space-y-1.5">
						<Label htmlFor="plugin_name">
							{__('Plugin Name', 'all-feedback')}
						</Label>
						<Input
							id="plugin_name"
							name="plugin_name"
							defaultValue={data?.plugin_name ?? ''}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="sample_option">
							{__('Sample Option', 'all-feedback')}
						</Label>
						<Input
							id="sample_option"
							name="sample_option"
							defaultValue={data?.sample_option ?? ''}
						/>
					</div>

					<Button type="submit" disabled={isSaving}>
						{isSaving
							? __('Saving…', 'all-feedback')
							: __('Save Changes', 'all-feedback')}
					</Button>
				</form>
			)}
		</div>
	);
};

export default GeneralSettings;
