import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import UnsavedChangesBadge from '@/components/ui/unsaved-changes-badge';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';

const labelCls = 'text-base font-normal text-foreground/80';

const Row = ({
	label,
	description,
	children,
}: {
	label: string;
	description?: string;
	children: React.ReactNode;
}) => (
	<div className="flex items-start gap-4">
		<div className="w-[40%] shrink-0">
			<label className={labelCls}>{label}</label>
			{description && (
				<p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
					{description}
				</p>
			)}
		</div>
		<div className={cn('min-w-0 flex-1', !description && 'flex items-center')} style={description ? { paddingTop: '2px' } : undefined}>
			{children}
		</div>
	</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/50">
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
	</div>
);

const DEFAULT_VALUES = {
	disable_user_details: false,
	logging_enabled:      false,
	delete_on_uninstall:  false,
	allow_usage_tracking: true,
};

const FORM_KEY = 'advanced';

type AdvancedPatch = { advanced?: { privacy?: Partial<Settings['advanced']['privacy']>; logging?: Partial<Settings['advanced']['logging']>; plugin?: Partial<Settings['advanced']['plugin']> } };

const AdvancedSettings = () => {
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, isSaving, setDirty, patches, setPatch } = useSettingsDirty();

 	const stagedAdv = (patches[FORM_KEY] as AdvancedPatch | undefined)?.advanced;
	const initValues = stagedAdv
		? {
			disable_user_details: stagedAdv.privacy?.disable_user_details ?? DEFAULT_VALUES.disable_user_details,
			logging_enabled:      stagedAdv.logging?.enabled              ?? DEFAULT_VALUES.logging_enabled,
			delete_on_uninstall:  stagedAdv.plugin?.delete_on_uninstall   ?? DEFAULT_VALUES.delete_on_uninstall,
			allow_usage_tracking: stagedAdv.plugin?.allow_usage_tracking  ?? DEFAULT_VALUES.allow_usage_tracking,
		  }
		: data
			? {
				disable_user_details: data.advanced.privacy.disable_user_details ?? DEFAULT_VALUES.disable_user_details,
				logging_enabled:      data.advanced.logging.enabled              ?? DEFAULT_VALUES.logging_enabled,
				delete_on_uninstall:  data.advanced.plugin.delete_on_uninstall   ?? DEFAULT_VALUES.delete_on_uninstall,
				allow_usage_tracking: data.advanced.plugin.allow_usage_tracking  ?? DEFAULT_VALUES.allow_usage_tracking,
			  }
			: DEFAULT_VALUES;

	const form = useForm({
		defaultValues: initValues,
		onSubmit: async () => {
			// saving is handled centrally by Settings.tsx
		},
	});

	const markedDirtyRef = useRef(false);
	useEffect(() => {
		if (stagedAdv && !markedDirtyRef.current) {
			setDirty(FORM_KEY, true);
			markedDirtyRef.current = true;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!data || patches[FORM_KEY]) return;
		form.reset({
			disable_user_details: data.advanced.privacy.disable_user_details ?? DEFAULT_VALUES.disable_user_details,
			logging_enabled:      data.advanced.logging.enabled              ?? DEFAULT_VALUES.logging_enabled,
			delete_on_uninstall:  data.advanced.plugin.delete_on_uninstall   ?? DEFAULT_VALUES.delete_on_uninstall,
			allow_usage_tracking: data.advanced.plugin.allow_usage_tracking  ?? DEFAULT_VALUES.allow_usage_tracking,
		}, { keepDefaultValues: true });
	}, [data]); // eslint-disable-line react-hooks/exhaustive-deps

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (!isDirty) return;
		// Skip when values still match server data (e.g. right after a save resets the form)
		const srv = data?.advanced;
		if (
			values.disable_user_details === (srv?.privacy.disable_user_details ?? DEFAULT_VALUES.disable_user_details) &&
			values.logging_enabled      === (srv?.logging.enabled              ?? DEFAULT_VALUES.logging_enabled) &&
			values.delete_on_uninstall  === (srv?.plugin.delete_on_uninstall   ?? DEFAULT_VALUES.delete_on_uninstall) &&
			values.allow_usage_tracking === (srv?.plugin.allow_usage_tracking  ?? DEFAULT_VALUES.allow_usage_tracking)
		) return;
		setDirty(FORM_KEY, true);
		setPatch(FORM_KEY, {
			advanced: {
				privacy: { disable_user_details: values.disable_user_details },
				logging: { enabled: values.logging_enabled },
				plugin:  { delete_on_uninstall: values.delete_on_uninstall, allow_usage_tracking: values.allow_usage_tracking },
			},
		} as Record<string, unknown>);
	}, [values, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

	if (isPending) return <AdvancedSettingsSkeleton />;

	return (
		<div>
			<div className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
						<SlidersHorizontal className="size-[18px] text-primary" />
					</div>
					<h3 className="text-md font-semibold text-foreground" style={{ margin: 0 }}>
						{__('Advanced', 'all-feedback')}
					</h3>
				</div>
				{sharedIsDirty && !isSaving && <UnsavedChangesBadge />}
			</div>

			<div className="px-6 pb-6 pt-4">

				<div className="space-y-3">
					<SectionLabel>{__('User Privacy', 'all-feedback')}</SectionLabel>
					<Row
						label={__('Disable User Details', 'all-feedback')}
						description={__('Disable storing the IP address and User Agent on all forms.', 'all-feedback')}
					>
						<Switch
							checked={values.disable_user_details}
							onCheckedChange={(v) => form.setFieldValue('disable_user_details', v)}
						/>
					</Row>
				</div>

				<div className="my-6 border-t border-border/50" />

				<div className="space-y-3">
					<SectionLabel>{__('Logging', 'all-feedback')}</SectionLabel>
					<Row label={__('Enable logging', 'all-feedback')}>
						<Switch
							checked={values.logging_enabled}
							onCheckedChange={(v) => form.setFieldValue('logging_enabled', v)}
						/>
					</Row>
				</div>

				<div className="my-6 border-t border-border/50" />

				<div className="space-y-3">
					<SectionLabel>{__('Plugin Management', 'all-feedback')}</SectionLabel>
					<Row label={__('Delete data on uninstall', 'all-feedback')}>
						<Switch
							checked={values.delete_on_uninstall}
							onCheckedChange={(v) => form.setFieldValue('delete_on_uninstall', v)}
						/>
					</Row>
					<Row label={__('Allow usage tracking', 'all-feedback')}>
						<Switch
							checked={values.allow_usage_tracking}
							onCheckedChange={(v) => form.setFieldValue('allow_usage_tracking', v)}
						/>
					</Row>
				</div>

			</div>
		</div>
	);
};

export default AdvancedSettings;
