import { cn } from '@/lib/utils';
import { Eye, Minus, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import type { FormField, FormSection, PreviewDevice } from './types';
import { __ } from '@wordpress/i18n';

interface PreviewPanelProps {
	sections: FormSection[];
	device: PreviewDevice;
	onDeviceChange: (device: PreviewDevice) => void;
}

const DEVICES: { value: PreviewDevice; label: string; Icon: typeof Monitor }[] = [
	{ value: 'desktop', label: 'Desktop', Icon: Monitor },
	{ value: 'tablet', label: 'Tablet', Icon: Tablet },
	{ value: 'mobile', label: 'Mobile', Icon: Smartphone },
];

/** Strip HTML tags to get plain text — safe for our own editor output */
const htmlToText = (html: string): string => {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div.textContent ?? div.innerText ?? '';
};

const FieldPreview = ({ field }: { field: FormField }) => {
	const inputBase =
		'w-full rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[11px] text-foreground/80 placeholder:text-muted-foreground/50 focus:outline-none';

	const labelText = htmlToText(field.label) || 'Untitled';

	return (
		<div className="space-y-1">
			<div className="flex items-center gap-1">
				<p className="text-[10.5px] font-semibold text-foreground">{labelText}</p>
				{field.required && <span className="text-[9px] font-bold text-destructive">*</span>}
			</div>

			{field.type === 'short_text' && (
				<input
					readOnly
					placeholder={field.placeholder || 'Short answer…'}
					className={inputBase}
				/>
			)}

			{field.type === 'long_text' && (
				<textarea
					readOnly
					placeholder={field.placeholder || 'Long answer…'}
					rows={2}
					className={cn(inputBase, 'resize-none')}
				/>
			)}

			{(field.type === 'checkboxes' || field.type === 'radio') && (
				<div className="space-y-1.5">
					{(field.options ?? []).map((opt, i) => (
						<label key={i} className="flex items-center gap-2">
							<span className={cn(
								'flex shrink-0 items-center justify-center border border-border/70 bg-white',
								field.type === 'radio' ? 'size-3 rounded-full' : 'size-3 rounded-[2px]',
							)} />
							<span className="text-[10.5px] text-foreground/75">{opt || `Option ${i + 1}`}</span>
						</label>
					))}
				</div>
			)}

			{!['short_text', 'long_text', 'checkboxes', 'radio'].includes(field.type) && (
				<div className="h-5 rounded-md border border-border/60 bg-muted/40" />
			)}
		</div>
	);
};

const allFields = (sections: FormSection[]): FormField[] =>
	sections.flatMap((s) => s.fields);

const PreviewPanel = ({ sections, device, onDeviceChange }: PreviewPanelProps) => {
	const fields = allFields(sections);
	const hasFields = fields.length > 0;

	return (
		<div className="flex h-full flex-col bg-white">
			<div className="flex shrink-0 items-center border-b border-border px-6 py-5.5">
				<span className="text-[13.5px] font-medium text-foreground">{__("Preview changes","all-feedback")}</span>
			</div>

			<div className="flex flex-1 flex-col overflow-hidden p-4">
				<div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-[#f3f4f6]">
					<div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-white/95 px-3.5 py-2.5">
						<div className="flex items-center gap-1.5">
							<span className="size-3 rounded-full bg-[#ff5f57]" />
							<span className="size-3 rounded-full bg-[#ffbd2e]" />
							<span className="size-3 rounded-full bg-[#28c840]" />
						</div>
						<div className="flex flex-1 items-center gap-1.5 rounded-md bg-muted/70 px-2.5 py-1">
							<span className="text-[10px] font-medium text-primary">✦</span>
							<span className="text-[11px] text-muted-foreground">https://</span>
							<span className="text-[11px] text-foreground/80">yourwebsite.com</span>
						</div>
					</div>

					<div className="relative flex-1 overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-b from-[#f3f4f6] to-[#e9eaec]" />

						<div className="absolute bottom-5 right-4 w-[230px] overflow-hidden rounded-2xl border border-border/60 shadow-lg">
							<div className="flex items-center justify-between bg-primary px-4 py-3">
								<span className="text-[13px] font-semibold text-white">Quick Feedback</span>
								<div className="flex items-center gap-0.5">
									<button
										type="button"
										className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10"
									>
										<Minus className="size-3.5" />
									</button>
									<button
										type="button"
										className="flex size-6 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10"
									>
										<X className="size-3.5" />
									</button>
								</div>
							</div>

							<div className="max-h-[280px] overflow-y-auto bg-white px-4 py-4">
								{!hasFields ? (
									<div className="flex flex-col items-center justify-center py-4">
										<Eye className="mb-2 size-5 text-muted-foreground/25" />
										<p className="text-[11px] text-muted-foreground/55">{__("Add fields to preview","all-feedback")}</p>
									</div>
								) : (
									<div className="space-y-4">
										{fields.map((field) => (
											<FieldPreview key={field.id} field={field} />
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-4 py-3">
				{DEVICES.map(({ value, label, Icon }) => (
					<button
						key={value}
						type="button"
						onClick={() => onDeviceChange(value)}
						className={cn(
							'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
							device === value ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
						)}
					>
						<span
							className={cn(
								'flex size-[14px] shrink-0 items-center justify-center rounded-sm border transition-colors',
								device === value ? 'border-primary bg-primary' : 'border-border',
							)}
						>
							{device === value && (
								<svg viewBox="0 0 8 8" className="size-2.5 text-white" fill="none">
									<path
										d="M1.5 4L3 5.5L6.5 2"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</span>
						<Icon className="size-3.5" />
						{label}
					</button>
				))}
			</div>
		</div>
	);
};

export default PreviewPanel;
