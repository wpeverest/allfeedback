import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Loader2, ScrollText } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-center gap-4">
		<label className={cn(labelCls, 'w-[38%] shrink-0')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

const LoggingSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-20" />
		</div>

		<div className="space-y-4 p-5">
			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-[38%] shrink-0" />
				<Skeleton className="h-5 w-9 rounded-full" />
			</div>
		</div>

		<div className="flex items-center justify-end border-t border-border/50 px-6 py-4">
			<Skeleton className="h-9 w-28 rounded-md" />
		</div>
	</div>
);

const DEFAULT_VALUES = { logging_enabled: false };

const LoggingSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, setDirty } = useSettingsDirty();

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			setDirty('logging', false);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
		},
	});

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: async ({ value }) => { mutate(value); },
	});

	useEffect(() => {
		if (!data) return;
		form.reset({ logging_enabled: data.logging_enabled ?? false }, { keepDefaultValues: true });
	}, [data]);

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (isDirty) setDirty('logging', true);
	}, [isDirty, setDirty]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				void form.handleSubmit();
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [form]);

	if (isPending) return <LoggingSettingsSkeleton />;

	return (
		<form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
			<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<ScrollText className="size-[18px] text-primary" />
				</div>
				<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
					{__('Logging', 'all-feedback')}
				</h3>
				{sharedIsDirty && !isSaving && (
					<div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
						<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
						<span className="text-[12px] font-medium text-amber-600">
							{__('Unsaved changes', 'all-feedback')}
						</span>
					</div>
				)}
			</div>

			<div className="space-y-4 p-6">
				<Row label={__('Enable logging', 'all-feedback')}>
					<Switch
						checked={values.logging_enabled}
						onCheckedChange={(v) => form.setFieldValue('logging_enabled', v)}
					/>
				</Row>
			</div>

			<div className="flex items-center justify-end border-t border-border/50 px-6 py-4">
				<Button type="submit" disabled={isSaving}>
					{isSaving && <Loader2 className="animate-spin" />}
					{isSaving ? __('Saving…', 'all-feedback') : __('Save Changes', 'all-feedback')}
				</Button>
			</div>
		</form>
	);
};

export default LoggingSettings;
