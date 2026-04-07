import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

function SectionHeader({ title, description }: { title: string; description: string }) {
	return (
		<div className="mb-5 border-b border-border pb-4">
			<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
		</div>
	);
}

/* ── Field group ─────────────────────────────────────────────────────────── */

function FieldGroup({ label, hint, children }: {
	label:    string;
	hint?:    string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start">
			<div className="pt-1">
				<Label className="text-sm font-medium text-foreground">{label}</Label>
				{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
			</div>
			<div>{children}</div>
		</div>
	);
}

/* ── Component ───────────────────────────────────────────────────────────── */

const GeneralSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
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

	if (isPending) {
		return (
			<div className="p-5">
				<div className="mb-5 space-y-2 border-b border-border pb-4">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-4 w-56" />
				</div>
				<div className="space-y-5">
					{[1, 2].map((i) => (
						<div key={i} className="grid gap-1.5 sm:grid-cols-[200px_1fr]">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-9 w-full" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="p-5">
			<SectionHeader
				title={__('General Settings', 'all-feedback')}
				description={__('Configure core plugin options.', 'all-feedback')}
			/>

			<form onSubmit={handleSubmit} className="space-y-5">
				<FieldGroup
					label={__('Plugin Name', 'all-feedback')}
					hint={__('Used in admin labels and email notifications.', 'all-feedback')}
				>
					<Input
						id="plugin_name"
						name="plugin_name"
						placeholder={__('e.g. Customer Feedback', 'all-feedback')}
						defaultValue={data?.plugin_name ?? ''}
						className="max-w-sm"
					/>
				</FieldGroup>

				<FieldGroup
					label={__('Sample Option', 'all-feedback')}
					hint={__('A placeholder setting — replace with your own.', 'all-feedback')}
				>
					<Input
						id="sample_option"
						name="sample_option"
						placeholder={__('Value…', 'all-feedback')}
						defaultValue={data?.sample_option ?? ''}
						className="max-w-sm"
					/>
				</FieldGroup>

				{/* Divider + save */}
				<div className="border-t border-border pt-4">
					<Button type="submit" disabled={isSaving} size="sm">
						{isSaving ? (
							<>
								<span className="animate-spin">⟳</span>
								{__('Saving…', 'all-feedback')}
							</>
						) : (
							<>
								<Save className="size-3.5" />
								{__('Save Changes', 'all-feedback')}
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default GeneralSettings;
