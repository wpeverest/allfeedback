﻿import type { ContentSearchItem } from '@/admin/api/surveys';
import { surveysApi } from '@/admin/api/surveys';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { FileText, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
	DelayUnit,
	DismissUnit,
	DisplayFrequency,
	FormSettings,
	TargetPages,
	TriggerType,
	UserState,
} from './types';

interface SettingsPanelProps {
	settings: FormSettings;
	onChange: (settings: FormSettings) => void;
	onScrollChange?: (scrolled: boolean, progress: number) => void;
}

const labelCls = 'text-base font-normal text-foreground/80';

const inputCls = [
	'flex h-9 w-full rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-sm text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const textareaCls = [
	'flex w-full resize-none rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-sm text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
	'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const Row = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className="flex items-center gap-4">
		<label className={cn(labelCls, 'w-[32%] shrink-0')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

const Card = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div className="border-border/60 overflow-hidden rounded-2xl border bg-white">
		<div className="border-border/50 border-b p-5">
			<div className="text-md text-foreground font-medium">{title}</div>
		</div>
		<div className="space-y-4 p-5">{children}</div>
	</div>
);

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
					'rounded-lg border px-3 py-2 text-base transition-colors',
					value === opt.value
						? 'border-primary/30 bg-primary/10 text-primary font-medium'
						: 'border-border/60 bg-muted/30 text-foreground/70 hover:border-border hover:bg-muted/60',
				)}
			>
				{opt.label}
			</button>
		))}
	</div>
);

const Collapse = ({
	open,
	children,
}: {
	open: boolean;
	children: React.ReactNode;
}) => (
	<div
		className={cn(
			'grid transition-[grid-template-rows] duration-200 ease-in-out',
			open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
		)}
	>
		<div className="overflow-hidden">
			<div className="border-primary/20 ml-1 border-l-2 pt-4 pl-4">
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
	numberValue: number;
	unit: U;
	unitOptions: { value: U; label: string }[];
	onNumberChange: (v: number) => void;
	onUnitChange: (v: U) => void;
	min?: number;
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
					<SelectItem key={o.value} value={o.value}>
						{o.label}
					</SelectItem>
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
	selected: PickerItem[];
	onChange: (items: PickerItem[]) => void;
	postType: 'page' | 'post';
	placeholder: string;
}) => {
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const [dropPos, setDropPos] = useState<React.CSSProperties>({});

	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const debouncedQuery = useDebouncedValue(query, 300);

	const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
		useInfiniteQuery({
			queryKey: ['content-search', postType, debouncedQuery],
			queryFn: ({ pageParam }) =>
				surveysApi.contentSearch({
					search: debouncedQuery,
					post_type: postType,
					page: pageParam as number,
					per_page: 10,
				}),
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
			top: rect.bottom + 4,
			left: rect.left,
			width: rect.width,
			zIndex: 100001,
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
			const inList = listRef.current?.contains(target);
			if (!inWrapper && !inList) setOpen(false);
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [open]);

	const fetchStateRef = useRef({
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	});
	useEffect(() => {
		fetchStateRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		const root = scrollRef.current;
		const sentinel = sentinelRef.current;
		if (!root || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) return;
				const {
					hasNextPage: has,
					isFetchingNextPage: fetching,
					fetchNextPage: fetchNext,
				} = fetchStateRef.current;
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
			className="border-border relative overflow-hidden rounded-lg border bg-white shadow-lg"
			onMouseDown={(e) => e.preventDefault()}
		>
			<div
				ref={scrollRef}
				className="max-h-52 overflow-x-hidden overflow-y-auto p-1"
			>
				{isFirstLoad ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="text-muted-foreground/50 size-4 animate-spin" />
					</div>
				) : visible.length === 0 ? (
					<p className="text-muted-foreground px-2 py-1.5 text-base">
						{results.length > 0
							? __('All results already selected.', 'allfeedback')
							: query
								? __('No results found.', 'allfeedback')
								: __('Type to search…', 'allfeedback')}
					</p>
				) : (
					<>
						{visible.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => select(item)}
								className="text-foreground hover:bg-accent relative flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-base transition-colors outline-none select-none"
							>
								<span className="min-w-0 flex-1 truncate text-left">
									{item.title}
								</span>
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
							className="border-border/60 bg-muted/40 text-foreground/80 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
						>
							<FileText className="text-muted-foreground/60 size-3 shrink-0" />
							<span className="max-w-[140px] truncate">{title}</span>
							<button
								type="button"
								onClick={() => remove(id)}
								className="text-muted-foreground/60 hover:text-destructive ml-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full"
							>
								<X className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="relative">
				<Search className="text-muted-foreground/50 absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
				<input
					ref={inputRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => {
						updateDropPos();
						setOpen(true);
					}}
					placeholder={placeholder}
					className={cn(inputCls, 'pr-8 pl-9')}
				/>
				{isFetching && (
					<Loader2 className="text-foreground/50 absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
				)}
			</div>

			{typeof document !== 'undefined' && createPortal(dropdown, document.body)}
		</div>
	);
};

const PAGE_OPTIONS: { value: TargetPages; label: string }[] = [
	{ value: 'all', label: __('All', 'allfeedback') },
	{ value: 'specific_pages', label: __('Specific Pages', 'allfeedback') },
	{ value: 'specific_posts', label: __('Specific Posts', 'allfeedback') },
];

const DISMISS_UNIT_OPTIONS: { value: DismissUnit; label: string }[] = [
	{ value: 'hours', label: __('Hours', 'allfeedback') },
	{ value: 'days', label: __('Days', 'allfeedback') },
	{ value: 'weeks', label: __('Weeks', 'allfeedback') },
];

const DELAY_UNIT_OPTIONS: { value: DelayUnit; label: string }[] = [
	{ value: 'seconds', label: __('Seconds', 'allfeedback') },
	{ value: 'minutes', label: __('Minutes', 'allfeedback') },
	{ value: 'hours', label: __('Hours', 'allfeedback') },
];

const SettingsPanel = ({
	settings,
	onChange,
	onScrollChange,
}: SettingsPanelProps) => {
	const update = (patch: Partial<FormSettings>) =>
		onChange({ ...settings, ...patch });

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		const scrolled = el.scrollTop > 0;
		const progress =
			el.scrollHeight <= el.clientHeight
				? 0
				: el.scrollTop / (el.scrollHeight - el.clientHeight);
		onScrollChange?.(scrolled, progress);
	};

	return (
		<div
			className="bg-background flex-1 overflow-y-auto p-5"
			onScroll={handleScroll}
		>
			<div className="w-full space-y-4">
				<Card title={__('Widget Label', 'allfeedback')}>
					<Row label={__('Widget label', 'allfeedback')}>
						<input
							type="text"
							className={inputCls}
							value={settings.widgetLabel}
							placeholder={__('Feedback', 'allfeedback')}
							onChange={(e) => update({ widgetLabel: e.target.value })}
						/>
					</Row>
				</Card>

				<Card title={__('Targeting', 'allfeedback')}>
					<Row label={__('Show to', 'allfeedback')}>
						<Select
							value={settings.userState}
							onValueChange={(v) => update({ userState: v as UserState })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[100000]">
								<SelectItem value="all">
									{__('Everyone', 'allfeedback')}
								</SelectItem>
								<SelectItem value="logged_in">
									{__('Logged in users', 'allfeedback')}
								</SelectItem>
								<SelectItem value="logged_out">
									{__('Logged out visitors', 'allfeedback')}
								</SelectItem>
							</SelectContent>
						</Select>
					</Row>
					<Row label={__('Show on', 'allfeedback')}>
						<Chips
							options={PAGE_OPTIONS}
							value={settings.targetPages}
							onChange={(v) => update({ targetPages: v })}
						/>
					</Row>
					<div>
						<Collapse open={settings.targetPages === 'specific_pages'}>
							<Row label={__('Select pages', 'allfeedback')}>
								<ContentPicker
									postType="page"
									selected={settings.targetPageIds}
									onChange={(items) => update({ targetPageIds: items })}
									placeholder={__('Search pages…', 'allfeedback')}
								/>
							</Row>
						</Collapse>
						<Collapse open={settings.targetPages === 'specific_posts'}>
							<Row label={__('Select posts', 'allfeedback')}>
								<ContentPicker
									postType="post"
									selected={settings.targetPostIds}
									onChange={(items) => update({ targetPostIds: items })}
									placeholder={__('Search posts…', 'allfeedback')}
								/>
							</Row>
						</Collapse>
					</div>
				</Card>

				<Card title={__('Trigger', 'allfeedback')}>
					<Row label={__('When to appear', 'allfeedback')}>
						<Select
							value={settings.triggerType}
							onValueChange={(v) => update({ triggerType: v as TriggerType })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[100000]">
								<SelectItem value="immediate">
									{__('Page load — Immediately', 'allfeedback')}
								</SelectItem>
								<SelectItem value="time_delay">
									{__('Page load — After a delay', 'allfeedback')}
								</SelectItem>
							</SelectContent>
						</Select>
					</Row>
					<Collapse open={settings.triggerType === 'time_delay'}>
						<Row label={__('Delay', 'allfeedback')}>
							<NumberWithUnit
								numberValue={settings.delayValue}
								unit={settings.delayUnit}
								unitOptions={DELAY_UNIT_OPTIONS}
								onNumberChange={(v) => update({ delayValue: v })}
								onUnitChange={(v) => update({ delayUnit: v })}
								min={1}
							/>
						</Row>
					</Collapse>
				</Card>

				<Card title={__('Frequency & Limits', 'allfeedback')}>
					<Row label={__('Display frequency', 'allfeedback')}>
						<Select
							value={settings.displayFrequency}
							onValueChange={(v) =>
								update({ displayFrequency: v as DisplayFrequency })
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[100000]">
								<SelectItem value="until_submit">
									{__('Until submitted', 'allfeedback')}
								</SelectItem>
								<SelectItem value="once">
									{__('Once only', 'allfeedback')}
								</SelectItem>
							</SelectContent>
						</Select>
					</Row>
					<Collapse open={settings.displayFrequency === 'until_submit'}>
						<div className="space-y-4">
							<Row label={__('Max impressions', 'allfeedback')}>
								<input
									type="number"
									min={0}
									value={settings.maxImpressions}
									onChange={(e) =>
										update({
											maxImpressions: Math.max(0, Number(e.target.value)),
										})
									}
									className={cn(inputCls, 'w-24')}
								/>
							</Row>
							<Row label={__('Re-show after dismissal', 'allfeedback')}>
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

				<Card title={__('Thank You Page', 'allfeedback')}>
					<Row label={__('Enable', 'allfeedback')}>
						<Switch
							checked={settings.thankYouEnabled}
							onCheckedChange={(v) => update({ thankYouEnabled: v })}
						/>
					</Row>
					<Collapse open={settings.thankYouEnabled}>
						<div className="space-y-4">
							<Row label={__('Title', 'allfeedback')}>
								<input
									value={settings.thankYouTitle}
									onChange={(e) => update({ thankYouTitle: e.target.value })}
									placeholder={__('Thank you!', 'allfeedback')}
									className={inputCls}
								/>
							</Row>
							<Row label={__('Description', 'allfeedback')}>
								<textarea
									value={settings.thankYouDescription}
									onChange={(e) =>
										update({ thankYouDescription: e.target.value })
									}
									placeholder={__(
										'Your response has been recorded.',
										'allfeedback',
									)}
									rows={3}
									className={textareaCls}
								/>
							</Row>
						</div>
					</Collapse>
				</Card>

				<Card title={__('Submit Buttons', 'allfeedback')}>
					<Row label={__('Submit label', 'allfeedback')}>
						<input
							value={settings.submitLabel}
							onChange={(e) => update({ submitLabel: e.target.value })}
							placeholder="Submit"
							className={inputCls}
						/>
					</Row>
					<Row label={__('Next label', 'allfeedback')}>
						<input
							value={settings.nextLabel}
							onChange={(e) => update({ nextLabel: e.target.value })}
							placeholder="Next"
							className={inputCls}
						/>
					</Row>
					<Row label={__('Back label', 'allfeedback')}>
						<input
							value={settings.backLabel}
							onChange={(e) => update({ backLabel: e.target.value })}
							placeholder="Back"
							className={inputCls}
						/>
					</Row>
				</Card>
			</div>
		</div>
	);
};

export default SettingsPanel;
