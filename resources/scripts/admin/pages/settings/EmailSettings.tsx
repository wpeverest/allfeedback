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
import { CheckCircle2, Eye, Loader2, Mail, Send, X, XCircle } from 'lucide-react';
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
	const [previewOpen, setPreviewOpen] = useState(false);

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

	return (<>
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
				<Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)} className="gap-1.5 text-primary" style={{ border: "1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)", color: 'var(--primary)' }}><Eye className="size-3.5" />{__('Preview email', 'allfeedback')}</Button>
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
						style={{
							border: testStatus === 'success'
								? '1.5px solid color-mix(in oklch, var(--success, #10b981) 40%, transparent)'
								: testStatus === 'error'
								? '1.5px solid color-mix(in oklch, var(--destructive) 40%, transparent)'
								: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)',
							color: testStatus === 'success'
								? undefined
								: testStatus === 'error'
								? 'var(--destructive)'
								: 'var(--primary)',
						}}
						className={cn(
							'shrink-0',
							testStatus === 'success' && 'bg-white text-emerald-700 hover:bg-emerald-50',
							testStatus === 'error'   && 'bg-white hover:bg-destructive/5',
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

		{previewOpen && (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPreviewOpen(false)}>
				<div className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
					<div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
						<span className="text-base font-semibold text-foreground/90">{__('Email Preview', 'allfeedback')}</span>
						<button type="button" onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="size-4" /></button>
					</div>
					<iframe
						srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;"><tr><td style="background:#6366f1;padding:24px 32px;"><h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">\</h1></td></tr><tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;"><p><strong>New response received</strong></p><p>A new response has been submitted to your form.</p><p><strong>From:</strong> \ &lt;\&gt;<br><strong>To:</strong> \</p></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;"><p style="margin:0;color:#9ca3af;font-size:12px;">&copy; \</p></td></tr></table></td></tr></table></body></html>`}
						className="flex-1 w-full border-0"
						title="Email Preview"
					/>
				</div>
			</div>
		)}
	</>);
};

export default EmailSettings;
