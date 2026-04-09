import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import type { FormSettings, TargetDevice, TargetPages } from './types';

interface SettingsPanelProps {
	settings: FormSettings;
	onChange: (settings: FormSettings) => void;
}

/** Consistent label + control row */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex flex-wrap items-center gap-y-2">
		<span className="w-[25%] shrink-0 pr-4 text-[13.5px] text-foreground/80">
			{label}
		</span>
		<div className="w-[75%] min-w-[180px]">{children}</div>
	</div>
);

/** Card wrapper */
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
		<div className="border-b border-border/50 px-5 py-4">
			<h3 className="font-semibold text-foreground" style={{ fontSize: '17px', margin: 0 }}>
				{title}
			</h3>
		</div>
		<div className="space-y-4 p-5">{children}</div>
	</div>
);

/** Pill toggle */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={onChange}
		className={cn(
			'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
			checked ? 'bg-primary' : 'bg-muted-foreground/25',
		)}
	>
		<span className={cn(
			'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
			checked ? 'translate-x-4' : 'translate-x-0',
		)} />
	</button>
);

/** Chip button group */
const Chips = <T extends string>({
	options,
	value,
	onChange,
}: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) => (
	<div className="flex flex-wrap gap-1.5">
		{options.map((opt) => (
			<button
				key={opt.value}
				type="button"
				onClick={() => onChange(opt.value)}
				className={cn(
					'rounded-lg border px-3 py-1.5 text-[13px] transition-colors',
					value === opt.value
						? 'border-primary/30 bg-primary/10 font-medium text-primary'
						: 'border-border/60 bg-muted/30 text-foreground/70 hover:border-border hover:bg-muted/60',
				)}
			>
				{opt.label}
			</button>
		))}
	</div>
);

const DEVICE_OPTIONS: { value: TargetDevice; label: string }[] = [
	{ value: 'all',     label: __('All',     'all-feedback') },
	{ value: 'desktop', label: __('Desktop', 'all-feedback') },
	{ value: 'tablet',  label: __('Tablet',  'all-feedback') },
	{ value: 'mobile',  label: __('Mobile',  'all-feedback') },
];

const PAGE_OPTIONS: { value: TargetPages; label: string }[] = [
	{ value: 'all',      label: __('All pages',      'all-feedback') },
	{ value: 'specific', label: __('Specific pages', 'all-feedback') },
];

const SettingsPanel = ({ settings, onChange }: SettingsPanelProps) => {
	const update = (patch: Partial<FormSettings>) => onChange({ ...settings, ...patch });

	return (
		<div className="flex-1 overflow-y-auto bg-background p-5">
			<div className="w-full space-y-4">

				{/* ── Submit Buttons ─────────────────────────────────────── */}
				<Card title={__('Submit Buttons', 'all-feedback')}>
					<Row label={__('Submit label', 'all-feedback')}>
						<Input
							value={settings.submitLabel}
							onChange={(e) => update({ submitLabel: e.target.value })}
							placeholder="Submit"
						/>
					</Row>
					<Row label={__('Next label', 'all-feedback')}>
						<Input
							value={settings.nextLabel}
							onChange={(e) => update({ nextLabel: e.target.value })}
							placeholder="Next"
						/>
					</Row>
					<Row label={__('Back label', 'all-feedback')}>
						<Input
							value={settings.backLabel}
							onChange={(e) => update({ backLabel: e.target.value })}
							placeholder="Back"
						/>
					</Row>
				</Card>

				{/* ── Targeting ──────────────────────────────────────────── */}
				<Card title={__('Targeting', 'all-feedback')}>
					<Row label={__('Device', 'all-feedback')}>
						<Chips
							options={DEVICE_OPTIONS}
							value={settings.targetDevice}
							onChange={(v) => update({ targetDevice: v })}
						/>
					</Row>
					<Row label={__('Pages', 'all-feedback')}>
						<Chips
							options={PAGE_OPTIONS}
							value={settings.targetPages}
							onChange={(v) => update({ targetPages: v })}
						/>
					</Row>

					{/* URL list — shown only for specific pages */}
					<div className={cn(
						'grid transition-[grid-template-rows] duration-200 ease-in-out',
						settings.targetPages === 'specific' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
					)}>
						<div className="overflow-hidden">
							<div className="pt-1">
								<Row label={__('URLs', 'all-feedback')}>
									<textarea
										value={settings.targetUrls}
										onChange={(e) => update({ targetUrls: e.target.value })}
										placeholder={__('https://example.com/contact\nhttps://example.com/pricing', 'all-feedback')}
										rows={3}
										className="flex w-full resize-none rounded-lg border border-transparent bg-muted/60 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground transition-colors focus:border-border focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
									/>
									<p className="mt-1.5 text-[12px] text-muted-foreground/60">
										{__('One URL per line. Supports wildcards, e.g. /blog/*', 'all-feedback')}
									</p>
								</Row>
							</div>
						</div>
					</div>
				</Card>

				{/* ── Thank You Page ─────────────────────────────────────── */}
				<Card title={__('Thank You Page', 'all-feedback')}>
					<Row label={__('Enable', 'all-feedback')}>
						<Toggle
							checked={settings.thankYouEnabled}
							onChange={() => update({ thankYouEnabled: !settings.thankYouEnabled })}
						/>
					</Row>

					<div className={cn(
						'grid transition-[grid-template-rows] duration-200 ease-in-out',
						settings.thankYouEnabled ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
					)}>
						<div className="overflow-hidden">
							<div className="space-y-4 pt-1">
								<Row label={__('Title', 'all-feedback')}>
									<Input
										value={settings.thankYouTitle}
										onChange={(e) => update({ thankYouTitle: e.target.value })}
										placeholder={__('Thank you!', 'all-feedback')}
									/>
								</Row>
								<Row label={__('Description', 'all-feedback')}>
									<textarea
										value={settings.thankYouDescription}
										onChange={(e) => update({ thankYouDescription: e.target.value })}
										placeholder={__('Your response has been recorded.', 'all-feedback')}
										rows={3}
										className="flex w-full resize-none rounded-lg border border-transparent bg-muted/60 px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground transition-colors focus:border-border focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
									/>
								</Row>
							</div>
						</div>
					</div>
				</Card>

			</div>
		</div>
	);
};

export default SettingsPanel;
