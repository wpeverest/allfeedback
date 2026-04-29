import type { Settings } from '@/admin/api/settings';
import { settingsApi } from '@/admin/api/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { settingsQuery } from '@/admin/queries/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import UnsavedChangesBadge from '@/components/ui/unsaved-changes-badge';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { CheckCircle2, Loader2, Mail, Send, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const labelCls = 'text-base font-normal text-foreground/90';

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
				<p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground/90">
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
	<div className="mt-5 mb-4">
		<span className="text-sm font-semibold tracking-widest uppercase text-foreground/60">{children}</span>
	</div>
);

const EmailSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-28" />
		</div>
		<div className="space-y-3 px-6 pb-6 pt-4">
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
			<div className="!mt-6 h-px bg-border/50" />
			<Skeleton className="h-2.5 w-24" />
			<div className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/20 px-5 py-4">
				<Skeleton className="size-9 shrink-0 rounded-lg" />
				<div className="flex-1 space-y-1.5">
					<Skeleton className="h-3.5 w-36" />
					<Skeleton className="h-3 w-56" />
				</div>
				<Skeleton className="h-8 w-24 rounded-lg" />
			</div>
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
						{__('Email', 'allfeedback')}
					</h3>
				</div>
				{sharedIsDirty && !isSaving && <UnsavedChangesBadge />}
			</div>

			<div className="px-6 pb-6 pt-4">

				<div className="space-y-3">
				<SectionLabel>{__('Delivery', 'allfeedback')}</SectionLabel>

				<Row
					label={__('To email', 'allfeedback')}
					description={__('Notification emails will be sent to this address.', 'allfeedback')}
				>
					<Input
						type="email"
						value={values.to_email}
						onChange={(e) => form.setFieldValue('to_email', e.target.value)}
						placeholder="admin@yoursite.com"
					/>
				</Row>

				<Row
					label={__('From name', 'allfeedback')}
					description={__('The sender name that appears in the email inbox.', 'allfeedback')}
				>
					<Input
						type="text"
						value={values.from_name}
						onChange={(e) => form.setFieldValue('from_name', e.target.value)}
						placeholder="All Feedback"
					/>
				</Row>

				<Row
					label={__('From email', 'allfeedback')}
					description={__('The sender address used when sending emails.', 'allfeedback')}
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
				<SectionLabel>{__('Test email', 'allfeedback')}</SectionLabel>

				<div
					className={cn(
						'flex items-start gap-4 rounded-xl border px-5 py-4 transition-all duration-300',
						testStatus === 'success' ? 'border-emerald-200/70 bg-emerald-50/60'
							: testStatus === 'error' ? 'border-destructive/20 bg-destructive/[0.04]'
							: 'border-border/60 bg-muted/20',
					)}
				>
					<div
						className={cn(
							'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
							testStatus === 'success' ? 'border-emerald-200 bg-emerald-100 text-emerald-600'
								: testStatus === 'error'   ? 'border-destructive/20 bg-destructive/10 text-destructive'
								: testStatus === 'sending' ? 'border-primary/20 bg-primary/5 text-primary'
								: 'border-border/60 bg-background text-muted-foreground',
						)}
					>
						{testStatus === 'sending' && <Loader2 className="size-4 animate-spin" />}
						{testStatus === 'success' && <CheckCircle2 className="size-4" />}
						{testStatus === 'error'   && <XCircle className="size-4" />}
						{testStatus === 'idle'    && <Send className="size-4" />}
					</div>

					<div className="min-w-0 flex-1">
						<p className="!mb-1 !mt-0 !text-md font-medium text-foreground/90">
							{__('Send a test email', 'allfeedback')}
						</p>
						<p className="!mt-0 text-[13px] leading-relaxed text-muted-foreground/90">
							{values.to_email ? (
								<>
									{__('A test message will be sent to', 'allfeedback')}{' '}
									<span className="font-medium text-foreground/70">{values.to_email}</span>.
								</>
							) : (
								__('Set a "To email" address above to send a test.', 'allfeedback')
							)}
						</p>
					</div>

					<Button
						type="button"
						size="sm"
						variant="secondary"
						disabled={testStatus === 'sending' || !values.to_email}
						onClick={() => testMutation.mutate()}
						className={cn(
							'shrink-0',
							testStatus === 'success' && 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
							testStatus === 'error'   && 'border-destructive/30 bg-white text-destructive hover:bg-destructive/5',
						)}
					>
						{testStatus === 'sending' ? __('Sending…', 'allfeedback')
							: testStatus === 'success' ? __('Sent!', 'allfeedback')
							: testStatus === 'error'   ? __('Failed', 'allfeedback')
							: __('Send test', 'allfeedback')}
					</Button>
				</div>
				</div>

			</div>
		</div>
	);
};

export default EmailSettings;
