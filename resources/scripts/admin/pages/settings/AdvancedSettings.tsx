import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const Row = ({
	label,
	description,
	children,
}: {
	label: string;
	description?: string;
	children: React.ReactNode;
}) => (
	<div className="flex items-start gap-4 py-0.5">
		<div className="w-[40%] shrink-0">
			<label className={labelCls}>{label}</label>
			{description && (
				<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/55">
					{description}
				</p>
			)}
		</div>
		<div className={cn('min-w-0 flex-1', !description && 'flex items-center')} style={description ? { paddingTop: '2px' } : undefined}>
			{children}
		</div>
	</div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={onChange}
		className={cn(
			'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
			checked ? 'bg-primary' : 'bg-muted-foreground/25',
		)}
	>
		<span className={cn(
			'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
			checked ? 'translate-x-4' : 'translate-x-0',
		)} />
	</button>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
		{children}
	</p>
);

const AdvancedSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-24" />
		</div>

		<div className="p-5">
			<div className="space-y-4">
				<Skeleton className="h-2.5 w-20" />
				<div className="flex items-start gap-4">
					<div className="w-[40%] shrink-0 space-y-1.5">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-3 w-4/5" />
					</div>
					<Skeleton className="mt-0.5 h-5 w-9 rounded-full" />
				</div>
			</div>

			<div className="my-6 border-t border-border/50" />

			<div className="space-y-4">
				<Skeleton className="h-2.5 w-14" />
				<div className="flex items-center gap-4">
					<Skeleton className="h-4 w-[40%] shrink-0" />
					<Skeleton className="h-5 w-9 rounded-full" />
				</div>
			</div>

			<div className="my-6 border-t border-border/50" />

			<div className="space-y-4">
				<Skeleton className="h-2.5 w-28" />
				<div className="flex items-center gap-4">
					<Skeleton className="h-4 w-[40%] shrink-0" />
					<Skeleton className="h-5 w-9 rounded-full" />
				</div>
				<div className="flex items-center gap-4">
					<Skeleton className="h-4 w-[40%] shrink-0" />
					<Skeleton className="h-5 w-9 rounded-full" />
				</div>
			</div>
		</div>

		<div className="flex items-center justify-end border-t border-border/50 px-6 py-4">
			<Skeleton className="h-9 w-28 rounded-md" />
		</div>
	</div>
);

const DEFAULT_VALUES = {
	disable_user_details: false,
	logging_enabled:      false,
	delete_on_uninstall:  false,
	allow_usage_tracking: true,
};

const AdvancedSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, setDirty } = useSettingsDirty();

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			setDirty('advanced', false);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
		},
	});

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: async ({ value }) => {
			mutate(value);
		},
	});

	useEffect(() => {
		if (!data) return;
		form.reset({
			disable_user_details: data.disable_user_details ?? DEFAULT_VALUES.disable_user_details,
			logging_enabled:      data.logging_enabled      ?? DEFAULT_VALUES.logging_enabled,
			delete_on_uninstall:  data.delete_on_uninstall  ?? DEFAULT_VALUES.delete_on_uninstall,
			allow_usage_tracking: data.allow_usage_tracking ?? DEFAULT_VALUES.allow_usage_tracking,
		}, { keepDefaultValues: true });
	}, [data]);

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (isDirty) setDirty('advanced', true);
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

	if (isPending) return <AdvancedSettingsSkeleton />;

	return (
		<form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
			<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<SlidersHorizontal className="size-[18px] text-primary" />
				</div>
				<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
					{__('Advanced', 'all-feedback')}
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

			<div className="p-6">

				<div className="space-y-4">
					<SectionLabel>{__('User Privacy', 'all-feedback')}</SectionLabel>
					<Row
						label={__('Disable User Details', 'all-feedback')}
						description={__('Disable storing the IP address and User Agent on all forms.', 'all-feedback')}
					>
						<Toggle
							checked={values.disable_user_details}
							onChange={() => form.setFieldValue('disable_user_details', !values.disable_user_details)}
						/>
					</Row>
				</div>

				<div className="my-6 border-t border-border/50" />

				<div className="space-y-4">
					<SectionLabel>{__('Logging', 'all-feedback')}</SectionLabel>
					<Row label={__('Enable logging', 'all-feedback')}>
						<Toggle
							checked={values.logging_enabled}
							onChange={() => form.setFieldValue('logging_enabled', !values.logging_enabled)}
						/>
					</Row>
				</div>

				<div className="my-6 border-t border-border/50" />

				<div className="space-y-4">
					<SectionLabel>{__('Plugin Management', 'all-feedback')}</SectionLabel>
					<Row label={__('Delete data on uninstall', 'all-feedback')}>
						<Toggle
							checked={values.delete_on_uninstall}
							onChange={() => form.setFieldValue('delete_on_uninstall', !values.delete_on_uninstall)}
						/>
					</Row>
					<Row label={__('Allow usage tracking', 'all-feedback')}>
						<Toggle
							checked={values.allow_usage_tracking}
							onChange={() => form.setFieldValue('allow_usage_tracking', !values.allow_usage_tracking)}
						/>
					</Row>
				</div>

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

export default AdvancedSettings;
