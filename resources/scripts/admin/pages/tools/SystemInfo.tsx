import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import { Check, ClipboardCopy, Info, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-base font-normal text-foreground/80';
const valueCls = 'text-base font-normal text-foreground';

const BoolValue = ({ value }: { value: boolean }) =>
	value ? (
		<Check className="text-success size-[15px]" strokeWidth={2.5} />
	) : (
		<X className="text-destructive size-[15px]" strokeWidth={2.5} />
	);

const Row = ({
	label,
	value,
}: {
	label: string;
	value: string | boolean | null | undefined;
}) => (
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
	<p className="text-2xs text-muted-foreground/70 font-semibold tracking-widest uppercase">
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
		line('Home URL:', info.homeUrl),
		line('Site URL:', info.siteUrl),
		line('WordPress Version:', info.wpVersion),
		line('Plugin Version:', `v${info.version ?? '—'}`),
		line('WordPress Multisite:', info.isMultisite),
		line('WordPress Memory Limit:', info.wpMemoryLimit),
		line('WordPress Debug Mode:', info.debug),
		line('WordPress CRON:', info.wpCron),
		line('Language:', info.language),
		line('External Object Cache:', info.extObjectCache),
		'',
		'### Server Environment ###',
		line('Server Info:', info.serverInfo),
		line('MySQL Version:', info.mysqlVersion),
		line('PHP Version:', info.phpVersion),
		line('Default Timezone:', info.defaultTimezone),
		line('PHP Post Max Size:', info.phpPostMaxSize),
		line('PHP Time Limit:', info.phpTimeLimit),
		line('fsockopen/cURL:', info.hasFsockopen),
		line('GZip:', info.hasGzip),
		line('DOMDocument:', info.hasDomDocument),
		line('cURL Version:', info.curlVersion),
		line('Multibyte String:', info.hasMultibyte),
	].join('\n');
};

const SystemInfo = () => {
	const info = window.__ALLFB_ADMIN__ ?? ({} as typeof window.__ALLFB_ADMIN__);
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		const text = buildCopyText(info);
		const trigger = () => {
			toast.success(__('System info copied to clipboard.', 'allfeedback'));
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
			<div className="border-border/50 flex items-center gap-3 border-b px-6 py-4">
				<div className="flex flex-1 items-center gap-3">
					<div className="bg-primary/10 flex size-9 items-center justify-center rounded-xl">
						<Info className="text-primary size-[18px]" />
					</div>
					<h3
						className="text-md text-foreground font-semibold"
						style={{ margin: 0 }}
					>
						{__('System Info', 'allfeedback')}
					</h3>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="text-primary"
					onClick={handleCopy}
				>
					{copied ? (
						<>
							<Check className="size-3.5" strokeWidth={2.5} />
							{__('Copied!', 'allfeedback')}
						</>
					) : (
						<>
							<ClipboardCopy className="size-3.5" />
							{__('Copy System Info', 'allfeedback')}
						</>
					)}
				</Button>
			</div>

			<div className="px-6 pt-4 pb-6">
				<div className="space-y-1">
					<SectionLabel>
						{__('WordPress Environment', 'allfeedback')}
					</SectionLabel>
					<div className="grid grid-cols-2 gap-x-8">
						<div>
							<Row
								label={__('Home URL:', 'allfeedback')}
								value={info.homeUrl}
							/>
							<Row
								label={__('WordPress Version:', 'allfeedback')}
								value={info.wpVersion}
							/>
							<Row
								label={__('WordPress Multisite:', 'allfeedback')}
								value={info.isMultisite}
							/>
							<Row
								label={__('WordPress Debug Mode:', 'allfeedback')}
								value={info.debug}
							/>
							<Row
								label={__('Language:', 'allfeedback')}
								value={info.language}
							/>
						</div>
						<div>
							<Row
								label={__('Site URL:', 'allfeedback')}
								value={info.siteUrl}
							/>
							<Row
								label={__('Plugin Version:', 'allfeedback')}
								value={`v${info.version ?? '—'}`}
							/>
							<Row
								label={__('WordPress Memory Limit:', 'allfeedback')}
								value={info.wpMemoryLimit}
							/>
							<Row
								label={__('WordPress CRON:', 'allfeedback')}
								value={info.wpCron}
							/>
							<Row
								label={__('External Object Cache:', 'allfeedback')}
								value={info.extObjectCache}
							/>
						</div>
					</div>
				</div>

				<div className="border-border/50 my-5 border-t" />

				<div className="space-y-1">
					<SectionLabel>{__('Server Environment', 'allfeedback')}</SectionLabel>
					<div className="grid grid-cols-2 gap-x-8">
						<div>
							<Row
								label={__('Server Info:', 'allfeedback')}
								value={info.serverInfo}
							/>
							<Row
								label={__('PHP Version:', 'allfeedback')}
								value={info.phpVersion}
							/>
							<Row
								label={__('PHP Post Max Size:', 'allfeedback')}
								value={info.phpPostMaxSize}
							/>
							<Row
								label={__('PHP Time Limit:', 'allfeedback')}
								value={info.phpTimeLimit}
							/>
							<Row
								label={__('cURL Version:', 'allfeedback')}
								value={info.curlVersion}
							/>
							<Row
								label={__('Multibyte String:', 'allfeedback')}
								value={info.hasMultibyte}
							/>
						</div>
						<div>
							<Row
								label={__('MySQL Version:', 'allfeedback')}
								value={info.mysqlVersion}
							/>
							<Row
								label={__('Default Timezone:', 'allfeedback')}
								value={info.defaultTimezone}
							/>
							<Row
								label={__('fsockopen/cURL:', 'allfeedback')}
								value={info.hasFsockopen}
							/>
							<Row label={__('GZip:', 'allfeedback')} value={info.hasGzip} />
							<Row
								label={__('DOMDocument:', 'allfeedback')}
								value={info.hasDomDocument}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SystemInfo;
