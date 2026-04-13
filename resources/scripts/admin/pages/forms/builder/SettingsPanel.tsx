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
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { FileText, Lock, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-center gap-4">
		<label className={cn(labelCls, 'w-[32%] shrink-0')}>{label}</label>
		<div className="flex-1 min-w-0">{children}</div>
	</div>
);

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

const Collapse = ({ open, children }: { open: boolean; children: React.ReactNode }) => (
	<div className={cn(
		'grid transition-[grid-template-rows] duration-200 ease-in-out',
		open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
	)}>
		<div className="overflow-hidden">
			<div className="ml-1 border-l-2 border-primary/20 pl-4 pt-4">
				{children}
			</div>
		</div>
	</div>
);

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

type PickerItem = { id: number; title: string };

const ContentPicker = ({
	selected,
	onChange,
	postType,
	placeholder,
}: {
	selected:    PickerItem[];
	onChange:    (items: PickerItem[]) => void;
	postType:    'page' | 'post';
	placeholder: string;
}) => {
	const [query,   setQuery]   = useState('');
	const [open,    setOpen]    = useState(false);
	const [dropPos, setDropPos] = useState<React.CSSProperties>({});

	const wrapperRef  = useRef<HTMLDivElement>(null);
	const inputRef    = useRef<HTMLInputElement>(null);
	const listRef     = useRef<HTMLDivElement>(null);
	const scrollRef   = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const debouncedQuery = useDebouncedValue(query, 300);

	const {
		data,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey:         ['content-search', postType, debouncedQuery],
		queryFn:          ({ pageParam }) =>
			surveysApi.contentSearch({ search: debouncedQuery, post_type: postType, page: pageParam as number, per_page: 10 }),
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) => {
			const fetched = allPages.reduce((n, p) => n + p.items.length, 0);
			return fetched < lastPage.total ? allPages.length + 1 : undefined;
		},
		placeholderData: keepPreviousData,
		enabled: open,
	});

	const results = data?.pages.flatMap((p) => p.items) ?? [];

	const updateDropPos = useCallback(() => {
		if (!inputRef.current) return;
		const rect = inputRef.current.getBoundingClientRect();
		setDropPos({
			position: 'fixed',
			top:      rect.bottom + 4,
			left:     rect.left,
			width:    rect.width,
			zIndex:   100001,
		});
	}, []);

	useEffect(() => {
		if (!open) return;
		updateDropPos();
		window.addEventListener('scroll', updateDropPos, true);
		window.addEventListener('resize', updateDropPos);
		return () => {
			window.removeEventListener('scroll', updateDropPos, true);
			window.removeEventListener('resize', updateDropPos);
		};
	}, [open, updateDropPos]);

	useEffect(() => {
		if (!open) return;
		const handle = (e: MouseEvent) => {
			const target = e.target as Node;
			const inWrapper = wrapperRef.current?.contains(target);
			const inList    = listRef.current?.contains(target);
			if (!inWrapper && !inList) setOpen(false);
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [open]);

	const fetchStateRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage });
	useEffect(() => {
		fetchStateRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		const root     = scrollRef.current;
		const sentinel = sentinelRef.current;
		if (!root || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;
				const { hasNextPage: has, isFetchingNextPage: fetching, fetchNextPage: fetchNext } = fetchStateRef.current;
				if (has && !fetching) void fetchNext();
			},
			{ root, threshold: 0 },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();

	}, [open, results.length]);

	const selectedIds = selected.map((s) => s.id);

	const select = (item: ContentSearchItem) => {
		if (selectedIds.includes(item.id)) return;
		onChange([...selected, { id: item.id, title: item.title }]);
		inputRef.current?.focus();
	};

	const remove = (id: number) => onChange(selected.filter((s) => s.id !== id));

	const isFirstLoad = isFetching && !isFetchingNextPage && results.length === 0;

	const visible = results.filter((item) => !selectedIds.includes(item.id));

	const dropdown = open && (
		<div
			ref={listRef}
			style={dropPos}
			className="relative overflow-hidden rounded-lg border border-border bg-white shadow-lg"
			onMouseDown={(e) => e.preventDefault()}
		>
			<div
				ref={scrollRef}
				className="max-h-52 overflow-y-auto overflow-x-hidden p-1"
			>
				{isFirstLoad ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="size-4 animate-spin text-muted-foreground/50" />
					</div>
				) : visible.length === 0 ? (
					<p className="px-2 py-1.5 text-[14px] text-muted-foreground">
						{results.length > 0
							? __('All results already selected.', 'all-feedback')
							: query
								? __('No results found.', 'all-feedback')
								: __('Type to search…', 'all-feedback')
						}
					</p>
				) : (
					<>
						{visible.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => select(item)}
								className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-[14px] text-foreground outline-none transition-colors hover:bg-accent"
							>
								<span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
							</button>
						))}
						<div ref={sentinelRef} className="h-px" />
					</>
				)}
			</div>
		</div>
	);

	return (
		<div ref={wrapperRef} className="space-y-2">
			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map(({ id, title }) => (
						<span
							key={id}
							className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] text-foreground/80"
						>
							<FileText className="size-3 shrink-0 text-muted-foreground/60" />
							<span className="max-w-[140px] truncate">{title}</span>
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
					ref={inputRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => { updateDropPos(); setOpen(true); }}
					placeholder={placeholder}
					className={cn(inputCls, 'pl-9 pr-8')}
				/>
				{isFetching && (
					<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-foreground/50" />
				)}
			</div>

			{typeof document !== 'undefined' && createPortal(dropdown, document.body)}
		</div>
	);
};

const PAGE_OPTIONS: { value: TargetPages; label: string }[] = [
	{ value: 'all',            label: __('All',            'all-feedback') },
	{ value: 'specific_pages', label: __('Specific Pages', 'all-feedback') },
	{ value: 'specific_posts', label: __('Specific Posts', 'all-feedback') },
];

const DISMISS_UNIT_OPTIONS: { value: DismissUnit; label: string }[] = [
	{ value: 'hours', label: __('Hours', 'all-feedback') },
	{ value: 'days',  label: __('Days',  'all-feedback') },
	{ value: 'weeks', label: __('Weeks', 'all-feedback') },
];

const ProCard = ({ title }: { title: string }) => (
	<div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white">

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
					<Row label={__('Show on', 'all-feedback')}>
						<Chips
							options={PAGE_OPTIONS}
							value={settings.targetPages}
							onChange={(v) => update({ targetPages: v })}
						/>
					</Row>
					<div>
						<Collapse open={settings.targetPages === 'specific_pages'}>
							<Row label={__('Select pages', 'all-feedback')}>
								<ContentPicker
									postType="page"
									selected={settings.targetPageIds}
									onChange={(items) => update({ targetPageIds: items })}
									placeholder={__('Search pages…', 'all-feedback')}
								/>
							</Row>
						</Collapse>
						<Collapse open={settings.targetPages === 'specific_posts'}>
							<Row label={__('Select posts', 'all-feedback')}>
								<ContentPicker
									postType="post"
									selected={settings.targetPostIds}
									onChange={(items) => update({ targetPostIds: items })}
									placeholder={__('Search posts…', 'all-feedback')}
								/>
							</Row>
						</Collapse>
					</div>
				</Card>

				<ProCard title={__('Display Trigger', 'all-feedback')} />

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
