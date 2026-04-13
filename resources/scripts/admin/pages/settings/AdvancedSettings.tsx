import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';
const textareaCls = [
	'flex w-full resize-none rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-[13px] text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const Row = ({ label, children, top }: { label: string; children: React.ReactNode; top?: boolean }) => (
	<div className={cn('flex gap-4', top ? 'items-start' : 'items-center')}>
		<label className={cn(labelCls, 'w-[40%] shrink-0', top && 'pt-2')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
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
	<div className="flex items-center gap-3">
		<span className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground/50">
			{children}
		</span>
		<div className="flex-1 border-t border-border/50" />
	</div>
);

const AdvancedSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-24" />
		</div>

		<div className="space-y-5 p-5">
			<div className="flex items-center gap-3">
				<Skeleton className="h-2.5 w-8" />
				<Skeleton className="h-px flex-1" />
			</div>

			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-[40%] shrink-0" />
				<Skeleton className="h-9 flex-1 rounded-lg" />
			</div>

			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-[40%] shrink-0" />
				<Skeleton className="h-5 w-9 rounded-full" />
			</div>

			<div className="flex items-center gap-3">
				<Skeleton className="h-2.5 w-28" />
				<Skeleton className="h-px flex-1" />
			</div>

			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-[40%] shrink-0" />
				<Skeleton className="h-5 w-9 rounded-full" />
			</div>

			<div className="flex items-center gap-4">
				<Skeleton className="h-4 w-[40%] shrink-0" />
				<Skeleton className="h-5 w-9 rounded-full" />
			</div>
		</div>

		<div className="flex items-center justify-end border-t border-border/50 px-5 py-3.5">
			<Skeleton className="h-9 w-28 rounded-md" />
		</div>
	</div>
);

const DEFAULT_VALUES = {
	data_retention:      'forever' as Settings['data_retention'],
	delete_on_uninstall: false,
	collect_ip:          true,
	ip_anonymization:    false,
	consent_required:    false,
	consent_text:        __('I agree to allow this website to collect my feedback data.', 'all-feedback'),
};

const AdvancedSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, setDirty } = useSettingsDirty();

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

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: async ({ value }) => {
			mutate(value);
		},
	});

	useEffect(() => {
		if (!data) return;
		form.reset({
			data_retention:      data.data_retention      ?? DEFAULT_VALUES.data_retention,
			delete_on_uninstall: data.delete_on_uninstall ?? DEFAULT_VALUES.delete_on_uninstall,
			collect_ip:          data.collect_ip          ?? DEFAULT_VALUES.collect_ip,
			ip_anonymization:    data.ip_anonymization    ?? DEFAULT_VALUES.ip_anonymization,
			consent_required:    data.consent_required    ?? DEFAULT_VALUES.consent_required,
			consent_text:        data.consent_text        ?? DEFAULT_VALUES.consent_text,
		}, { keepDefaultValues: true });
	}, [data]);

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		setDirty('advanced', isDirty);
		return () => setDirty('advanced', false);
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
			<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
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

			<div className="space-y-5 p-5">

				<SectionLabel>{__('Data', 'all-feedback')}</SectionLabel>

				<Row label={__('Data retention', 'all-feedback')}>
					<Select
						value={values.data_retention}
						onValueChange={(v) => form.setFieldValue('data_retention', v as Settings['data_retention'])}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="forever">{__('Forever',  'all-feedback')}</SelectItem>
							<SelectItem value="30d">{__('30 days',  'all-feedback')}</SelectItem>
							<SelectItem value="90d">{__('90 days',  'all-feedback')}</SelectItem>
							<SelectItem value="180d">{__('180 days', 'all-feedback')}</SelectItem>
							<SelectItem value="1y">{__('1 year',   'all-feedback')}</SelectItem>
						</SelectContent>
					</Select>
				</Row>

				<Row label={__('Delete data on uninstall', 'all-feedback')}>
					<Toggle
						checked={values.delete_on_uninstall}
						onChange={() => form.setFieldValue('delete_on_uninstall', !values.delete_on_uninstall)}
					/>
				</Row>

				<SectionLabel>{__('GDPR & Privacy', 'all-feedback')}</SectionLabel>

				<Row label={__('Collect IP address', 'all-feedback')}>
					<Toggle
						checked={values.collect_ip}
						onChange={() => form.setFieldValue('collect_ip', !values.collect_ip)}
					/>
				</Row>

				{values.collect_ip && (
					<Row label={__('Anonymize IP address', 'all-feedback')}>
						<Toggle
							checked={values.ip_anonymization}
							onChange={() => form.setFieldValue('ip_anonymization', !values.ip_anonymization)}
						/>
					</Row>
				)}

				<Row label={__('Require consent', 'all-feedback')}>
					<Toggle
						checked={values.consent_required}
						onChange={() => form.setFieldValue('consent_required', !values.consent_required)}
					/>
				</Row>

				{values.consent_required && (
					<Row label={__('Consent message', 'all-feedback')} top>
						<textarea
							rows={3}
							value={values.consent_text}
							onChange={(e) => form.setFieldValue('consent_text', e.target.value)}
							placeholder={__('I agree to allow this website to collect my feedback data.', 'all-feedback')}
							className={textareaCls}
						/>
					</Row>
				)}

			</div>

			<div className="flex items-center justify-end border-t border-border/50 px-5 py-3.5">
				<Button type="submit" disabled={isSaving}>
					{isSaving && <Loader2 className="animate-spin" />}
					{isSaving ? __('Saving…', 'all-feedback') : __('Save Changes', 'all-feedback')}
				</Button>
			</div>
		</form>
	);
};

export default AdvancedSettings;
