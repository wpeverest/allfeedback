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
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Shared layout primitives ─────────────────────────────────────────────────

const labelCls = 'text-base font-normal text-foreground/90';

const Row = ( {
	label,
	description,
	children,
}: {
	label:        string;
	description?: string;
	children:     React.ReactNode;
} ) => (
	<div className="flex items-start gap-4">
		<div className="w-[40%] shrink-0">
			<label className={labelCls}>{label}</label>
			{description && (
				<p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground/90">
					{description}
				</p>
			)}
		</div>
		<div
			className={cn( 'min-w-0 flex-1', ! description && 'flex items-center' )}
			style={description ? { paddingTop: '2px' } : undefined}
		>
			{children}
		</div>
	</div>
);

const SectionLabel = ( { children }: { children: React.ReactNode } ) => (
	<div className="mt-5 mb-4">
		<span className="text-sm font-semibold tracking-widest uppercase text-foreground/60">
			{children}
		</span>
	</div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const EmailSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-28" />
			<div className="flex-1" />
		</div>
		<div className="space-y-3 px-6 pb-6 pt-4">
			<Skeleton className="h-2.5 w-20" />
			{[1, 2, 3].map( ( i ) => (
				<div key={i} className="flex items-start gap-4">
					<div className="w-[40%] shrink-0 space-y-1.5">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-full" />
					</div>
					<Skeleton className="h-9 flex-1 rounded-lg" />
				</div>
			) )}
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

// ─── Email preview helpers ────────────────────────────────────────────────────

/** Escape a plain string for safe interpolation into HTML attributes and text. */
const escHtml = ( s: string ): string =>
	s
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' );

/**
 * Build a full HTML document for the individual response-alert email preview.
 * Includes a sample NPS score badge (Promoter · 9/10) and CTA button.
 */
const buildResponseAlertHtml = ( fromName: string, toEmail: string ): string => {
	const siteName = escHtml( fromName.trim() || __( 'Your Site', 'allfeedback' ) );
	const today    = new Date().toLocaleString( undefined, {
		year: 'numeric', month: 'long', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	} );

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email Preview</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#6366f1;padding:20px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${siteName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;">
            <p style="margin:0 0 16px 0;">A new response has been submitted for your survey.</p>
            <p style="margin:0 0 8px 0;"><strong>Survey:</strong> Q1 NPS Survey</p>
            <p style="margin:0 0 12px 0;"><span style="display:inline-block;background:#dcfce7;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:600;color:#16a34a;">Promoter &middot; 9/10</span></p>
            <p style="margin:0 0 8px 0;"><strong>Response ID:</strong> #42</p>
            <p style="margin:0 0 16px 0;"><strong>Submitted at:</strong> ${escHtml( today )}</p>
            ${toEmail ? `<p style="margin:0 0 20px 0;color:#6b7280;font-size:13px;">Delivered to: ${escHtml( toEmail )}</p>` : ''}
            <a href="#" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View Response &rarr;</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#9ca3af;font-size:12px;">&copy; ${siteName}</td>
              <td align="right" style="color:#9ca3af;font-size:11px;">Powered by <a href="#" style="color:#9ca3af;text-decoration:underline;">AllFeedback</a></td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

/**
 * Build a full HTML document for the weekly digest email preview.
 * Shows a generic template that works for any survey type — score row is
 * omitted here to represent surveys with no numeric score field.
 */
const buildWeeklyDigestHtml = ( fromName: string ): string => {
	const siteName  = escHtml( fromName.trim() || __( 'Your Site', 'allfeedback' ) );
	const today     = new Date();
	const dateFrom  = new Date( today );
	dateFrom.setDate( today.getDate() - 6 );
	const fmt       = ( d: Date ) => d.toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
	const dateRange = `${escHtml( fmt( dateFrom ) )}–${escHtml( fmt( today ) )}`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Email Preview</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#6366f1;padding:20px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${siteName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;">
            <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Weekly Report</p>
            <p style="margin:0 0 24px 0;font-size:12px;color:#9ca3af;">${dateRange}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
              <td style="vertical-align:middle;">
                <span style="display:block;font-size:36px;font-weight:700;color:#111827;line-height:1;">47</span>
                <span style="display:block;margin-top:4px;font-size:13px;color:#6b7280;">responses this week</span>
              </td>
              <td style="vertical-align:middle;text-align:right;">
                <span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;background:#dcfce7;color:#16a34a;">+31% vs last week</span>
              </td>
            </tr></table>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;margin-bottom:24px;">
              <tr>
                <td style="padding:11px 0;font-size:13px;color:#374151;">Completion rate this week</td>
                <td style="padding:11px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;">64% <span style="font-size:11px;font-weight:500;color:#16a34a;">&#x2191; vs 61%</span></td>
              </tr>
            </table>

            <p style="margin:0 0 10px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Survey Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">Product Feedback Survey</td>
                <td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">32 responses</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#374151;">Customer Feedback</td>
                <td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right;">15 responses</td>
              </tr>
            </table>

            <a href="#" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View Analytics &rarr;</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="color:#9ca3af;font-size:12px;">&copy; ${siteName}</td>
              <td align="right" style="color:#9ca3af;font-size:11px;">Powered by <a href="#" style="color:#9ca3af;text-decoration:underline;">AllFeedback</a></td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Preview modal component ──────────────────────────────────────────────────

type PreviewTab = { key: string; label: string; html: string };

const PreviewModal = ( {
	tabs,
	onClose,
}: {
	tabs:    PreviewTab[];
	onClose: () => void;
} ) => {
	const [active, setActive]   = useState( tabs[0]?.key ?? '' );
	const [loaded, setLoaded]   = useState<Set<string>>( new Set() );
	const markLoaded = ( key: string ) =>
		setLoaded( ( prev ) => new Set( [...prev, key] ) );

	useEffect( () => {
		const onKey = ( e: KeyboardEvent ) => { if ( e.key === 'Escape' ) onClose(); };
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [onClose] );

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={__( 'Email preview', 'allfeedback' )}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
			onClick={onClose}
		>
			<div
				className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
				onClick={( e ) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
					<span className="text-[15px] font-semibold text-foreground">
						{__( 'Email preview', 'allfeedback' )}
					</span>
					<button
						type="button"
						aria-label={__( 'Close preview', 'allfeedback' )}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onClick={onClose}
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Tab bar */}
				{tabs.length > 1 && (
					<div className="flex shrink-0 items-center bg-[#f4f4f5] px-5 pt-2 pb-0 gap-4">
						{tabs.map( ( tab ) => (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActive( tab.key )}
								className={cn(
									'mr-5 py-2.5 text-[13px] font-medium transition-colors',
									active === tab.key
										? 'text-foreground'
										: 'text-muted-foreground hover:text-foreground',
								)}
								style={active === tab.key ? { boxShadow: 'inset 0 -2px 0 var(--primary)' } : undefined}
							>
								{tab.label}
							</button>
						) )}
					</div>
				)}

				<div className="relative flex-1 min-h-0">
					{tabs.map( ( tab ) => (
						<iframe
							key={tab.key}
							srcDoc={tab.html}
							sandbox="allow-same-origin"
							className="absolute inset-0 w-full h-full border-0"
							title={tab.label}
							onLoad={() => markLoaded( tab.key )}
							style={{ display: tab.key === active ? 'block' : 'none' }}
						/>
					) )}
					{/* Spinner shown until the active iframe first paints */}
					{!loaded.has( active ) && (
						<div className="absolute inset-0 flex items-center justify-center bg-[#f4f4f5]">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_KEY = 'email';

// ─── Main component ───────────────────────────────────────────────────────────

const EmailSettings = () => {
	const { data, isPending }                                                = useQuery( settingsQuery() );
	const { isDirty: sharedIsDirty, isSaving, setDirty, patches, setPatch } = useSettingsDirty();

	const [testStatus, setTestStatus]   = useState<'idle' | 'sending' | 'success' | 'error'>( 'idle' );
	const [previewOpen, setPreviewOpen] = useState( false );

	const openPreview  = useCallback( () => setPreviewOpen( true ),  [] );
	const closePreview = useCallback( () => setPreviewOpen( false ), [] );

	// ── Staged & server delivery values ──────────────────────────────────────

	type DeliveryPatch = Partial<Pick<Settings['email']['delivery'], 'to_email' | 'from_name' | 'from_email'>>;

	const stagedEmail = (
		patches[FORM_KEY] as { email?: { delivery?: DeliveryPatch } } | undefined
	)?.email?.delivery;

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

	// ── Form ──────────────────────────────────────────────────────────────────

	const form = useForm( {
		defaultValues: initValues,
		onSubmit:      async () => {},
	} );

	const markedDirtyRef = useRef( false );
	useEffect( () => {
		if ( stagedEmail && ! markedDirtyRef.current ) {
			setDirty( FORM_KEY, true );
			markedDirtyRef.current = true;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	useEffect( () => {
		if ( ! data || patches[FORM_KEY] ) return;
		form.reset( {
			to_email:   data.email?.delivery?.to_email   ?? '',
			from_name:  data.email?.delivery?.from_name  ?? '',
			from_email: data.email?.delivery?.from_email ?? '',
		}, { keepDefaultValues: true } );
	}, [data] ); // eslint-disable-line react-hooks/exhaustive-deps

	const values  = useStore( form.store, ( s ) => s.values );
	const isDirty = useStore( form.store, ( s ) => s.isDirty );

	useEffect( () => {
		if ( ! isDirty ) return;
		const sv = data?.email?.delivery;
		const unchanged =
			values.to_email   === ( sv?.to_email   ?? '' ) &&
			values.from_name  === ( sv?.from_name  ?? '' ) &&
			values.from_email === ( sv?.from_email ?? '' );

		if ( unchanged ) return;

		setDirty( FORM_KEY, true );
		setPatch( FORM_KEY, {
			email: {
				delivery: {
					to_email:   values.to_email,
					from_name:  values.from_name,
					from_email: values.from_email,
				},
			},
		} as Record<string, unknown> );
	}, [values, isDirty] ); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Test email mutation ───────────────────────────────────────────────────

	const testMutation = useMutation( {
		mutationFn: settingsApi.sendTestEmail,
		onMutate:   () => setTestStatus( 'sending' ),
		onSuccess:  () => { setTestStatus( 'success' ); setTimeout( () => setTestStatus( 'idle' ), 4000 ); },
		onError:    () => { setTestStatus( 'error' );   setTimeout( () => setTestStatus( 'idle' ), 4000 ); },
	} );

	// ── Render ────────────────────────────────────────────────────────────────

	if ( isPending ) return <EmailSettingsSkeleton />;

	return (
		<>
			<div>

				{/* Card header */}
				<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
						<Mail className="size-[18px] text-primary" />
					</div>
					<h3 className="text-md font-semibold text-foreground" style={{ margin: 0 }}>
						{__( 'Email', 'allfeedback' )}
					</h3>
					{sharedIsDirty && ! isSaving && <UnsavedChangesBadge />}
					<div className="ml-auto">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={openPreview}
							className="gap-1.5"
							style={{ border: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)', color: 'var(--primary)' }}
						>
							<Eye className="size-3.5" />
							{__( 'Preview email', 'allfeedback' )}
						</Button>
					</div>
				</div>

				<div className="px-6 pb-6 pt-4">

					{/* ── Delivery ──────────────────────────────────────── */}
					<div className="space-y-3">
						<SectionLabel>{__( 'Delivery', 'allfeedback' )}</SectionLabel>

						<Row
							label={__( 'To email', 'allfeedback' )}
							description={__( 'Admin notification emails will be sent to this address.', 'allfeedback' )}
						>
							<Input
								type="email"
								value={values.to_email}
								onChange={( e ) => form.setFieldValue( 'to_email', e.target.value )}
								placeholder="admin@yoursite.com"
							/>
						</Row>

						<Row
							label={__( 'From name', 'allfeedback' )}
							description={__( 'The sender name that appears in the recipient\'s inbox.', 'allfeedback' )}
						>
							<Input
								type="text"
								value={values.from_name}
								onChange={( e ) => form.setFieldValue( 'from_name', e.target.value )}
								placeholder="AllFeedback"
							/>
						</Row>

						<Row
							label={__( 'From email', 'allfeedback' )}
							description={__( 'The sender address used when dispatching emails.', 'allfeedback' )}
						>
							<Input
								type="email"
								value={values.from_email}
								onChange={( e ) => form.setFieldValue( 'from_email', e.target.value )}
								placeholder="noreply@yoursite.com"
							/>
						</Row>
					</div>

					<div className="my-6 border-t border-border/50" />

					{/* ── Test email ────────────────────────────────────── */}
					<div className="space-y-3">
						<SectionLabel>{__( 'Test email', 'allfeedback' )}</SectionLabel>

						<div
							className={cn(
								'flex items-start gap-4 rounded-xl border px-5 py-4 transition-all duration-300',
								testStatus === 'success' ? 'border-emerald-200/70 bg-emerald-50/60'
									: testStatus === 'error' ? 'border-destructive/20 bg-destructive/[0.04]'
									: 'border-border/60 bg-muted/20',
							)}
						>
							<div className={cn(
								'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
								testStatus === 'success' ? 'border-emerald-200 bg-emerald-100 text-emerald-600'
									: testStatus === 'error'   ? 'border-destructive/20 bg-destructive/10 text-destructive'
									: testStatus === 'sending' ? 'border-primary/20 bg-primary/5 text-primary'
									: 'border-border/60 bg-background text-muted-foreground',
							)}>
								{testStatus === 'sending' && <Loader2 className="size-4 animate-spin" />}
								{testStatus === 'success' && <CheckCircle2 className="size-4" />}
								{testStatus === 'error'   && <XCircle className="size-4" />}
								{testStatus === 'idle'    && <Send className="size-4" />}
							</div>

							<div className="min-w-0 flex-1">
								<p className="!mb-1 !mt-0 !text-md font-medium text-foreground/90">
									{__( 'Send a test email', 'allfeedback' )}
								</p>
								<p className="!mt-0 text-[13px] leading-relaxed text-muted-foreground/90">
									{values.to_email ? (
										<>
											{__( 'A test message will be sent to', 'allfeedback' )}{' '}
											<span className="font-medium text-foreground/70">{values.to_email}</span>.
										</>
									) : (
										__( 'Set a "To email" address above to send a test.', 'allfeedback' )
									)}
								</p>
							</div>

							<Button
								type="button"
								size="sm"
								variant="secondary"
								disabled={testStatus === 'sending' || ! values.to_email}
								onClick={() => testMutation.mutate()}
								style={{
									border: testStatus === 'success'
										? '1.5px solid color-mix(in oklch, #10b981 40%, transparent)'
										: testStatus === 'error'
										? '1.5px solid color-mix(in oklch, var(--destructive) 40%, transparent)'
										: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)',
									color: testStatus === 'success'
										? '#065f46'
										: testStatus === 'error'
										? 'var(--destructive)'
										: 'var(--primary)',
								}}
								className={cn(
									'shrink-0',
									testStatus === 'success' && 'bg-white hover:bg-emerald-50',
									testStatus === 'error'   && 'bg-white hover:bg-destructive/5',
								)}
							>
								{testStatus === 'sending' ? __( 'Sending…', 'allfeedback' )
									: testStatus === 'success' ? __( 'Sent!', 'allfeedback' )
									: testStatus === 'error'   ? __( 'Failed', 'allfeedback' )
									: __( 'Send test', 'allfeedback' )}
							</Button>
						</div>
					</div>

				</div>
			</div>

			{previewOpen && (
				<PreviewModal
					tabs={[
						{
							key:   'response',
							label: __( 'Response alert', 'allfeedback' ),
							html:  buildResponseAlertHtml( values.from_name, values.to_email ),
						},
						{
							key:   'digest',
							label: __( 'Weekly digest', 'allfeedback' ),
							html:  buildWeeklyDigestHtml( values.from_name ),
						},
					]}
					onClose={closePreview}
				/>
			)}
		</>
	);
};

export default EmailSettings;
