import { surveysApi } from '@/admin/api/surveys';
import type { ContentSearchItem } from '@/admin/api/surveys';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Check, FileText, Lock, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
	DisplayFrequency,
	DismissUnit,
	FormSettings,
	TargetPages,
	UserState,
} from './types';

interface SettingsPanelProps {
	settings:        FormSettings;
	onChange:        (settings: FormSettings) => void;
	onScrollChange?: (scrolled: boolean, progress: number) => void;
}

/* ── Shared primitives ────────────────────────────────────────────────── */

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const inputCls = [
	'flex h-9 w-full rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-[13px] text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const textareaCls = [
	'flex w-full resize-none rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-[13px] text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

/** Horizontal label + control row */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-center gap-4">
		<label className={cn(labelCls, 'w-[32%] shrink-0')}>{label}</label>
		<div className="flex-1 min-w-0">{children}</div>
	</div>
);

/** Card wrapper */
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
		<div className="border-b border-border/50 px-5 py-3.5">
			<h3 className="text-[14px] font-semibold text-foreground" style={{ margin: 0 }}>
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

/** Chip button group */
const Chips = <T extends string>({
	options,
	value,
	onChange,
}: {
	options:  { value: T; label: string }[];
	value:    T;
	onChange: (v: T) => void;
}) => (
	<div className="flex flex-wrap gap-1.5">
		{options.map((opt) => (
			<button
				key={opt.value}
				type="button"
				onClick={() => onChange(opt.value)}
				className={cn(
					'rounded-lg border px-3 py-2 text-[13.5px] transition-colors',
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

/** Animated collapse / expand */
const Collapse = ({ open, children }: { open: boolean; children: React.ReactNode }) => (
	<div className={cn(
		'grid transition-[grid-template-rows] duration-200 ease-in-out',
		open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
	)}>
		<div className="overflow-hidden">
			<div className="pt-4">{children}</div>
		</div>
	</div>
);

/** Number input + Select unit side-by-side */
const NumberWithUnit = <U extends string>({
	numberValue,
	unit,
	unitOptions,
	onNumberChange,
	onUnitChange,
	min = 0,
}: {
	numberValue:    number;
	unit:           U;
	unitOptions:    { value: U; label: string }[];
	onNumberChange: (v: number) => void;
	onUnitChange:   (v: U) => void;
	min?:           number;
}) => (
	<div className="flex items-center gap-2">
		<input
			type="number"
			min={min}
			value={numberValue}
			onChange={(e) => onNumberChange(Math.max(min, Number(e.target.value)))}
			className={cn(inputCls, 'w-24')}
		/>
		<Select value={unit} onValueChange={(v) => onUnitChange(v as U)}>
			<SelectTrigger className="flex-1">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="z-[100000]">
				{unitOptions.map((o) => (
					<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
				))}
			</SelectContent>
		</Select>
	</div>
);

/* ── Page picker ──────────────────────────────────────────────────────── */

const PagePicker = ({
	selectedIds,
	onChange,
}: {
	selectedIds: number[];
	onChange:    (ids: number[]) => void;
}) => {
	const [query,   setQuery]   = useState('');
	const [open,    setOpen]    = useState(false);
	const [pageMap, setPageMap] = useState<Record<number, string>>({});
	const wrapperRef            = useRef<HTMLDivElement>(null);
	const debouncedQuery        = useDebouncedValue(query, 300);

	const { data, isFetching } = useQuery({
		queryKey: ['content-search', debouncedQuery],
		queryFn:  () => surveysApi.contentSearch({ search: debouncedQuery, per_page: 12 }),
		enabled:  open,
		placeholderData: keepPreviousData,
	});

	const results = data?.items ?? [];

	useEffect(() => {
		if (!open) return;
		const handle = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [open]);

	const select = (item: ContentSearchItem) => {
		if (selectedIds.includes(item.id)) return;
		setPageMap((prev) => ({ ...prev, [item.id]: item.title }));
		onChange([...selectedIds, item.id]);
		setQuery('');
	};

	const remove = (id: number) => onChange(selectedIds.filter((i) => i !== id));

	return (
		<div ref={wrapperRef} className="space-y-2">
			{selectedIds.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selectedIds.map((id) => (
						<span
							key={id}
							className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] text-foreground/80"
						>
							<FileText className="size-3 shrink-0 text-muted-foreground/60" />
							<span className="max-w-[160px] truncate">{pageMap[id] ?? `#${id}`}</span>
							<button
								type="button"
								onClick={() => remove(id)}
								className="ml-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:text-destructive"
							>
								<X className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="relative">
				<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setOpen(true)}
					placeholder={__('Search pages & posts…', 'all-feedback')}
					className={cn(inputCls, 'pl-9 pr-8')}
				/>
				{isFetching && (
					<Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground/50" />
				)}
				{open && (
					<div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
						{results.length === 0 && !isFetching ? (
							<p className="px-4 py-3 text-[12px] text-muted-foreground/70">
								{query ? __('No results found.', 'all-feedback') : __('Start typing to search…', 'all-feedback')}
							</p>
						) : results.map((item) => {
							const isSelected = selectedIds.includes(item.id);
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => select(item)}
									disabled={isSelected}
									className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
								>
									<FileText className="size-3.5 shrink-0 text-muted-foreground/50" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-[13px] text-foreground">{item.title}</p>
										<p className="truncate text-[11px] text-muted-foreground/60">{item.url}</p>
									</div>
									<span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
										{item.type}
									</span>
									{isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

/* ── Options ──────────────────────────────────────────────────────────── */

const PAGE_OPTIONS: { value: TargetPages; label: string }[] = [
	{ value: 'all',      label: __('All pages',      'all-feedback') },
	{ value: 'specific', label: __('Specific pages', 'all-feedback') },
];

const DISMISS_UNIT_OPTIONS: { value: DismissUnit; label: string }[] = [
	{ value: 'hours', label: __('Hours', 'all-feedback') },
	{ value: 'days',  label: __('Days',  'all-feedback') },
	{ value: 'weeks', label: __('Weeks', 'all-feedback') },
];

/* ── Display Trigger PRO card ─────────────────────────────────────────── */

const ProCard = ({ title }: { title: string }) => (
	<div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white">

		{/* Blurred content */}
		<div className="pointer-events-none select-none opacity-60">
			<div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
				<h3 className="text-[14px] font-semibold text-foreground" style={{ margin: 0 }}>
					{title}
				</h3>
				<span className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
					<Lock className="size-2.5" />
					PRO
				</span>
			</div>
			<div className="space-y-4 p-5">
				<Row label={__('Trigger', 'all-feedback')}>
					<div className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-3 text-[13px] text-foreground/70">
						<span>{__('Time delay', 'all-feedback')}</span>
						<span className="text-muted-foreground/50">▾</span>
					</div>
				</Row>
				<Row label={__('Wait for', 'all-feedback')}>
					<div className="flex gap-2">
						<div className="flex h-9 w-24 items-center rounded-lg border border-border bg-muted/50 px-3 text-[13px] text-foreground/60">
							3
						</div>
						<div className="flex h-9 flex-1 items-center justify-between rounded-lg border border-border bg-muted/50 px-3 text-[13px] text-foreground/60">
							<span>{__('Seconds', 'all-feedback')}</span>
							<span className="text-muted-foreground/50">▾</span>
						</div>
					</div>
				</Row>
				<Row label={__('Scroll depth', 'all-feedback')}>
					<div className="flex items-center gap-3">
						<div className="h-1.5 flex-1 rounded-full bg-border">
							<div className="h-full w-1/2 rounded-full bg-primary/40" />
						</div>
						<div className="flex h-9 w-20 items-center rounded-lg border border-border bg-muted/50 px-3 text-[13px] text-foreground/60">
							50
						</div>
					</div>
				</Row>
			</div>
		</div>
	</div>
);

/* ── SettingsPanel ────────────────────────────────────────────────────── */

const SettingsPanel = ({ settings, onChange, onScrollChange }: SettingsPanelProps) => {
	const update = (patch: Partial<FormSettings>) => onChange({ ...settings, ...patch });

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		const scrolled  = el.scrollTop > 0;
		const progress  = el.scrollHeight <= el.clientHeight
			? 0
			: el.scrollTop / (el.scrollHeight - el.clientHeight);
		onScrollChange?.(scrolled, progress);
	};

	return (
		<div className="flex-1 overflow-y-auto bg-background p-5" onScroll={handleScroll}>
			<div className="w-full space-y-4">

				{/* ── Submit Buttons ─────────────────────────────────────── */}
				<Card title={__('Submit Buttons', 'all-feedback')}>
					<Row label={__('Submit label', 'all-feedback')}>
						<input
							value={settings.submitLabel}
							onChange={(e) => update({ submitLabel: e.target.value })}
							placeholder="Submit"
							className={inputCls}
						/>
					</Row>
					<Row label={__('Next label', 'all-feedback')}>
						<input
							value={settings.nextLabel}
							onChange={(e) => update({ nextLabel: e.target.value })}
							placeholder="Next"
							className={inputCls}
						/>
					</Row>
					<Row label={__('Back label', 'all-feedback')}>
						<input
							value={settings.backLabel}
							onChange={(e) => update({ backLabel: e.target.value })}
							placeholder="Back"
							className={inputCls}
						/>
					</Row>
				</Card>

				{/* ── Targeting ──────────────────────────────────────────── */}
				<Card title={__('Targeting', 'all-feedback')}>
					<Row label={__('Show to', 'all-feedback')}>
						<Select value={settings.userState} onValueChange={(v) => update({ userState: v as UserState })}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[100000]">
								<SelectItem value="all">{__('Everyone', 'all-feedback')}</SelectItem>
								<SelectItem value="logged_in">{__('Logged in users', 'all-feedback')}</SelectItem>
								<SelectItem value="logged_out">{__('Logged out visitors', 'all-feedback')}</SelectItem>
							</SelectContent>
						</Select>
					</Row>
					<Row label={__('Pages', 'all-feedback')}>
						<Chips
							options={PAGE_OPTIONS}
							value={settings.targetPages}
							onChange={(v) => update({ targetPages: v })}
						/>
					</Row>
					<Collapse open={settings.targetPages === 'specific'}>
						<Row label={__('Select pages', 'all-feedback')}>
							<PagePicker
								selectedIds={settings.targetPageIds}
								onChange={(ids) => update({ targetPageIds: ids })}
							/>
						</Row>
					</Collapse>
				</Card>

				{/* ── Display Trigger (PRO) ──────────────────────────────── */}
				<ProCard title={__('Display Trigger', 'all-feedback')} />

				{/* ── Frequency & Limits ─────────────────────────────────── */}
				<Card title={__('Frequency & Limits', 'all-feedback')}>
					<Row label={__('Display frequency', 'all-feedback')}>
						<Select value={settings.displayFrequency} onValueChange={(v) => update({ displayFrequency: v as DisplayFrequency })}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[100000]">
								<SelectItem value="until_submit">{__('Until submitted', 'all-feedback')}</SelectItem>
								<SelectItem value="once">{__('Once only', 'all-feedback')}</SelectItem>
							</SelectContent>
						</Select>
					</Row>
					<Collapse open={settings.displayFrequency === 'until_submit'}>
						<div className="space-y-4">
							<Row label={__('Max impressions', 'all-feedback')}>
								<input
									type="number"
									min={0}
									value={settings.maxImpressions}
									onChange={(e) => update({ maxImpressions: Math.max(0, Number(e.target.value)) })}
									className={cn(inputCls, 'w-24')}
								/>
							</Row>
							<Row label={__('Re-show after dismissal', 'all-feedback')}>
								<NumberWithUnit
									numberValue={settings.dismissWaitValue}
									unit={settings.dismissWaitUnit}
									unitOptions={DISMISS_UNIT_OPTIONS}
									onNumberChange={(v) => update({ dismissWaitValue: v })}
									onUnitChange={(v) => update({ dismissWaitUnit: v })}
								/>
							</Row>
						</div>
					</Collapse>
				</Card>

				{/* ── Thank You Page ─────────────────────────────────────── */}
				<Card title={__('Thank You Page', 'all-feedback')}>
					<Row label={__('Enable', 'all-feedback')}>
						<Toggle
							checked={settings.thankYouEnabled}
							onChange={() => update({ thankYouEnabled: !settings.thankYouEnabled })}
						/>
					</Row>
					<Collapse open={settings.thankYouEnabled}>
						<div className="space-y-4">
							<Row label={__('Title', 'all-feedback')}>
								<input
									value={settings.thankYouTitle}
									onChange={(e) => update({ thankYouTitle: e.target.value })}
									placeholder={__('Thank you!', 'all-feedback')}
									className={inputCls}
								/>
							</Row>
							<Row label={__('Description', 'all-feedback')}>
								<textarea
									value={settings.thankYouDescription}
									onChange={(e) => update({ thankYouDescription: e.target.value })}
									placeholder={__('Your response has been recorded.', 'all-feedback')}
									rows={3}
									className={textareaCls}
								/>
							</Row>
						</div>
					</Collapse>
				</Card>

			</div>
		</div>
	);
};

export default SettingsPanel;
