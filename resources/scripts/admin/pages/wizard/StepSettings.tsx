import type { WizardCompletePayload } from '@/admin/api/wizard';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { AlertCircle, Info } from 'lucide-react';

export function StepSettings({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	const emailRe      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const adminEmailOk = !state.admin_email || emailRe.test(state.admin_email);
	const fromEmailOk  = !state.from_email  || emailRe.test(state.from_email);

	const inputCls = (valid: boolean) =>
		cn(
			'bg-muted/40 border-border/50 focus:border-primary/40 h-10 focus:bg-white',
			!valid && 'border-destructive/40 bg-destructive/5 focus:border-destructive/60',
		);

	return (
		<div className="flex flex-col gap-4">
			<div className="border-border/50 bg-card shadow-card rounded-2xl border">
				<div className="space-y-5 p-5 md:p-6">

					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('Where to send notifications', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__('Your weekly digest summary will be sent to this address.', 'allfeedback')}
							</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder="you@company.com"
								value={state.admin_email}
								onChange={(e) => set({ admin_email: e.target.value })}
								className={inputCls(adminEmailOk)}
							/>
							{!adminEmailOk && (
								<div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
									<AlertCircle className="size-4" />
									<span>{__('Enter a valid email address.', 'allfeedback')}</span>
								</div>
							)}
						</div>
					</div>

					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('From name', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__('The sender name shown in the recipient inbox.', 'allfeedback')}
							</p>
						</div>
						<Input
							type="text"
							placeholder={__('e.g. AllFeedback', 'allfeedback')}
							value={state.from_name}
							onChange={(e) => set({ from_name: e.target.value })}
							className="bg-muted/40 border-border/50 focus:border-primary/40 h-10 focus:bg-white"
						/>
					</div>

					<div className="space-y-3">
						<div className="space-y-1">
							<label className="text-foreground text-base font-medium">
								{__('From email', 'allfeedback')}
							</label>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{__('The sender address used when dispatching emails.', 'allfeedback')}
							</p>
						</div>
						<div className="space-y-2">
							<Input
								type="email"
								placeholder={__('e.g. noreply@yoursite.com', 'allfeedback')}
								value={state.from_email}
								onChange={(e) => set({ from_email: e.target.value })}
								className={inputCls(fromEmailOk)}
							/>
							{!fromEmailOk && (
								<div className="text-destructive flex items-center gap-2 text-[12px] font-medium">
									<AlertCircle className="size-4" />
									<span>{__('Enter a valid email address.', 'allfeedback')}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="border-info/20 bg-info-subtle/50 flex items-start gap-3 rounded-xl border px-5 py-4">
				<Info className="text-info size-4 shrink-0" />
				<p className="text-foreground/70 !m-0 text-sm leading-relaxed">
					{__(
						'All feedback is stored on your server only — no data is shared with third parties. Consent banners and IP anonymization can be configured in',
						'allfeedback',
					)}{' '}
					<strong className="text-foreground font-semibold">
						{__('Settings → Advanced', 'allfeedback')}
					</strong>
					{'.'}
				</p>
			</div>
		</div>
	);
}
