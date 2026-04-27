import type { Settings } from '@/admin/api/settings';
import { settingsApi } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import UnsavedChangesBadge from '@/components/ui/unsaved-changes-badge';
import { CheckCircle2, Loader2, Mail, Send, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const labelCls = 'text-base font-normal text-foreground/80';

const Row = ({
	label,
	description,
	children,
}: {
	label:        string;
	description?: string;
	children:     React.ReactNode;
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
	<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">
		{children}
	</p>
);

const EmailSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-28" />
		</div>
		<div className="px-6 pb-6 pt-4">
			<Skeleton className="h-2.5 w-20" />
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex items-start gap-4">
					<div className="w-[40%] shrink-0 space-y-1.5">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-full" />
					</div>
					<Skeleton className="h-9 flex-1 rounded-lg" />
				</div>
			))}
			<div className="mt-2 h-px bg-border/50" />
			<Skeleton className="h-2.5 w-24" />
			<Skeleton className="h-[88px] w-full rounded-xl" />
		</div>
	</div>
);

const FORM_KEY = 'email';

const EmailSettings = () => {
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, isSaving, setDirty, patches, setPatch } = useSettingsDirty();

	const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

	const stagedEmail = (patches[FORM_KEY] as { email?: { delivery?: Partial<Settings['email']['delivery']> } } | undefined)?.email?.delivery;
	const serverEmail = data?.email?.delivery;

	const DEFAULT_VALUES = {
		to_email:   serverEmail?.to_email   ?? '',
		from_name:  serverEmail?.from_name  ?? '',
		from_email: serverEmail?.from_email ?? '',
	};

	const initValues = stagedEmail
		? {
			to_email:   stagedEmail.to_email   ?? DEFAULT_VALUES.to_email,
			from_name:  stagedEmail.from_name  ?? DEFAULT_VALUES.from_name,
			from_email: stagedEmail.from_email ?? DEFAULT_VALUES.from_email,
		}
		: DEFAULT_VALUES;

	const form = useForm({
		defaultValues: initValues,
		onSubmit: async () => {},
	});

	const markedDirtyRef = useRef(false);
	useEffect(() => {
		if (stagedEmail && !markedDirtyRef.current) {
			setDirty(FORM_KEY, true);
			markedDirtyRef.current = true;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!data || patches[FORM_KEY]) return;
		form.reset({
			to_email:   data.email?.delivery?.to_email   ?? '',
			from_name:  data.email?.delivery?.from_name  ?? '',
			from_email: data.email?.delivery?.from_email ?? '',
		}, { keepDefaultValues: true });
	}, [data]); // eslint-disable-line react-hooks/exhaustive-deps

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (!isDirty) return;
		const sv = data?.email?.delivery;
		if (
			values.to_email   === (sv?.to_email   ?? '') &&
			values.from_name  === (sv?.from_name  ?? '') &&
			values.from_email === (sv?.from_email ?? '')
		) return;
		setDirty(FORM_KEY, true);
		setPatch(FORM_KEY, { email: { delivery: { to_email: values.to_email, from_name: values.from_name, from_email: values.from_email } } } as Record<string, unknown>);
	}, [values, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

	const testMutation = useMutation({
		mutationFn: settingsApi.sendTestEmail,
		onMutate:   () => setTestStatus('sending'),
		onSuccess:  () => { setTestStatus('success'); setTimeout(() => setTestStatus('idle'), 4000); },
		onError:    () => { setTestStatus('error');   setTimeout(() => setTestStatus('idle'), 4000); },
	});

	if (isPending) return <EmailSettingsSkeleton />;

	return (
		<div>
			<div className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
						<Mail className="size-[18px] text-primary" />
					</div>
					<h3 className="text-md font-semibold text-foreground" style={{ margin: 0 }}>
						{__('Email', 'all-feedback')}
					</h3>
				</div>
				{sharedIsDirty && !isSaving && <UnsavedChangesBadge />}
			</div>

			<div className="px-6 pb-6 pt-4">

				<div className="space-y-3">
				<SectionLabel>{__('Delivery', 'all-feedback')}</SectionLabel>

				<Row
					label={__('To email', 'all-feedback')}
					description={__('Notification emails will be sent to this address.', 'all-feedback')}
				>
					<Input
						type="email"
						value={values.to_email}
						onChange={(e) => form.setFieldValue('to_email', e.target.value)}
						placeholder="admin@yoursite.com"
					/>
				</Row>

				<Row
					label={__('From name', 'all-feedback')}
					description={__('The sender name that appears in the email inbox.', 'all-feedback')}
				>
					<Input
						type="text"
						value={values.from_name}
						onChange={(e) => form.setFieldValue('from_name', e.target.value)}
						placeholder="All Feedback"
					/>
				</Row>

				<Row
					label={__('From email', 'all-feedback')}
					description={__('The sender address used when sending emails.', 'all-feedback')}
				>
					<Input
						type="email"
						value={values.from_email}
						onChange={(e) => form.setFieldValue('from_email', e.target.value)}
						placeholder="noreply@yoursite.com"
					/>
				</Row>
				</div>

				<div className="my-6 border-t border-border/50" />

				<div className="space-y-3">
				<SectionLabel>{__('Test email', 'all-feedback')}</SectionLabel>

				<div className="rounded-xl border border-border/60 bg-muted/20 p-5">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className={labelCls}>{__('Send a test email', 'all-feedback')}</p>
							<p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
								{values.to_email
									? <>
										{__('A test message will be sent to', 'all-feedback')}{' '}
										<span className="font-medium text-foreground/70">{values.to_email}</span>.
									</>
									: __('Set a "To email" address above before sending a test.', 'all-feedback')
								}
							</p>
						</div>

						<button
							type="button"
							disabled={testStatus === 'sending' || !values.to_email}
							onClick={() => testMutation.mutate()}
							className={cn(
								'inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
								'disabled:cursor-not-allowed disabled:opacity-50',
								testStatus === 'success'
									? 'border-success/30 bg-success/10 text-success'
									: testStatus === 'error'
										? 'border-destructive/30 bg-destructive/10 text-destructive'
										: 'border-border bg-white text-foreground hover:bg-muted/60',
							)}
						>
							{testStatus === 'sending' && <Loader2 className="size-3.5 animate-spin" />}
							{testStatus === 'success' && <CheckCircle2 className="size-3.5" />}
							{testStatus === 'error'   && <XCircle className="size-3.5" />}
							{testStatus === 'idle'    && <Send className="size-3.5" />}
							{testStatus === 'sending' ? __('Sending…', 'all-feedback')
								: testStatus === 'success' ? __('Sent!', 'all-feedback')
								: testStatus === 'error'   ? __('Failed', 'all-feedback')
								: __('Send test', 'all-feedback')}
						</button>
					</div>
				</div>
				</div>

			</div>
		</div>
	);
};

export default EmailSettings;
