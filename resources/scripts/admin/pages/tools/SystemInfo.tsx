import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import { Check, ClipboardCopy, Info, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';


const labelCls = 'text-base font-normal text-foreground/80';
const valueCls = 'text-base font-normal text-foreground';

const BoolValue = ({ value }: { value: boolean }) =>
	value ? (
		<Check className="size-[15px] text-success" strokeWidth={2.5} />
	) : (
		<X className="size-[15px] text-destructive" strokeWidth={2.5} />
	);

const Row = ({ label, value }: { label: string; value: string | boolean | null | undefined }) => (
	<div className="flex items-center gap-4 py-2">
		<label className={`${labelCls} w-[48%] shrink-0`}>{label}</label>
		{typeof value === 'boolean' ? (
			<BoolValue value={value} />
		) : (
			<span className={valueCls}>{value ?? '—'}</span>
		)}
	</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">
		{children}
	</p>
);

const formatBool = (v: boolean | null | undefined) =>
	v === true ? 'Yes' : v === false ? 'No' : '—';

const formatVal = (v: string | boolean | null | undefined) =>
	typeof v === 'boolean' ? formatBool(v) : (v ?? '—');

const buildCopyText = (info: typeof window.__ALLFB_ADMIN__): string => {
	const line = (label: string, value: string | boolean | null | undefined) =>
		`${label} ${formatVal(value)}`;

	return [
		'### WordPress Environment ###',
		line('Home URL:',               info.homeUrl),
		line('Site URL:',               info.siteUrl),
		line('WordPress Version:',      info.wpVersion),
		line('Plugin Version:',         `v${info.version ?? '—'}`),
		line('WordPress Multisite:',    info.isMultisite),
		line('WordPress Memory Limit:', info.wpMemoryLimit),
		line('WordPress Debug Mode:',   info.debug),
		line('WordPress CRON:',         info.wpCron),
		line('Language:',               info.language),
		line('External Object Cache:',  info.extObjectCache),
		'',
		'### Server Environment ###',
		line('Server Info:',       info.serverInfo),
		line('MySQL Version:',     info.mysqlVersion),
		line('PHP Version:',       info.phpVersion),
		line('Default Timezone:',  info.defaultTimezone),
		line('PHP Post Max Size:', info.phpPostMaxSize),
		line('PHP Time Limit:',    info.phpTimeLimit),
		line('fsockopen/cURL:',    info.hasFsockopen),
		line('GZip:',              info.hasGzip),
		line('DOMDocument:',       info.hasDomDocument),
		line('cURL Version:',      info.curlVersion),
		line('Multibyte String:',  info.hasMultibyte),
	].join('\n');
};

const SystemInfo = () => {
	const info = window.__ALLFB_ADMIN__ ?? ({} as typeof window.__ALLFB_ADMIN__);
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		const text = buildCopyText(info);
		const trigger = () => {
			toast.success(__('System info copied to clipboard.', 'all-feedback'));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};
		if (navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(text).then(trigger);
		} else {
			const el = document.createElement('textarea');
			el.value = text;
			el.style.cssText = 'position:fixed;opacity:0';
			document.body.appendChild(el);
			el.focus();
			el.select();
			document.execCommand('copy');
			document.body.removeChild(el);
			trigger();
		}
	};

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex flex-1 items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
						<Info className="size-[18px] text-primary" />
					</div>
					<h3 className="text-md font-semibold text-foreground" style={{ margin: 0 }}>
						{__('System Info', 'all-feedback')}
					</h3>
				</div>
				<Button variant="outline" size="sm" className="text-primary" onClick={handleCopy}>
					{copied ? (
						<>
							<Check className="size-3.5" strokeWidth={2.5} />
							{__('Copied!', 'all-feedback')}
						</>
					) : (
						<>
							<ClipboardCopy className="size-3.5" />
							{__('Copy System Info', 'all-feedback')}
						</>
					)}
				</Button>
			</div>

			<div className="px-6 pb-6 pt-4">

				<div className="space-y-1">
					<SectionLabel>{__('WordPress Environment', 'all-feedback')}</SectionLabel>
					<div className="grid grid-cols-2 gap-x-8">
						<div>
							<Row label={__('Home URL:', 'all-feedback')}             value={info.homeUrl} />
							<Row label={__('WordPress Version:', 'all-feedback')}    value={info.wpVersion} />
							<Row label={__('WordPress Multisite:', 'all-feedback')}  value={info.isMultisite} />
							<Row label={__('WordPress Debug Mode:', 'all-feedback')} value={info.debug} />
							<Row label={__('Language:', 'all-feedback')}             value={info.language} />
						</div>
						<div>
							<Row label={__('Site URL:', 'all-feedback')}               value={info.siteUrl} />
							<Row label={__('Plugin Version:', 'all-feedback')}         value={`v${info.version ?? '—'}`} />
							<Row label={__('WordPress Memory Limit:', 'all-feedback')} value={info.wpMemoryLimit} />
							<Row label={__('WordPress CRON:', 'all-feedback')}         value={info.wpCron} />
							<Row label={__('External Object Cache:', 'all-feedback')}  value={info.extObjectCache} />
						</div>
					</div>
				</div>

				<div className="my-5 border-t border-border/50" />

				<div className="space-y-1">
					<SectionLabel>{__('Server Environment', 'all-feedback')}</SectionLabel>
					<div className="grid grid-cols-2 gap-x-8">
						<div>
							<Row label={__('Server Info:', 'all-feedback')}       value={info.serverInfo} />
							<Row label={__('PHP Version:', 'all-feedback')}       value={info.phpVersion} />
							<Row label={__('PHP Post Max Size:', 'all-feedback')} value={info.phpPostMaxSize} />
							<Row label={__('PHP Time Limit:', 'all-feedback')}    value={info.phpTimeLimit} />
							<Row label={__('cURL Version:', 'all-feedback')}      value={info.curlVersion} />
							<Row label={__('Multibyte String:', 'all-feedback')}  value={info.hasMultibyte} />
						</div>
						<div>
							<Row label={__('MySQL Version:', 'all-feedback')}    value={info.mysqlVersion} />
							<Row label={__('Default Timezone:', 'all-feedback')} value={info.defaultTimezone} />
							<Row label={__('fsockopen/cURL:', 'all-feedback')}   value={info.hasFsockopen} />
							<Row label={__('GZip:', 'all-feedback')}             value={info.hasGzip} />
							<Row label={__('DOMDocument:', 'all-feedback')}      value={info.hasDomDocument} />
						</div>
					</div>
				</div>

			</div>
		</div>
	);
};

export default SystemInfo;
