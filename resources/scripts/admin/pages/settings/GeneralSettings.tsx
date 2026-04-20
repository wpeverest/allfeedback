import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import UnsavedChangesBadge from '@/components/ui/unsaved-changes-badge';
import { Globe, Lock, MessageSquare, Pipette, Settings2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

const DEFAULT_WIDGET_COLOR = '#6366F1';

const labelCls = 'text-base font-normal text-foreground/80';

const Row = ({ label, children, top }: { label: string; children: React.ReactNode; top?: boolean }) => (
	<div className={cn('flex gap-4', top ? 'items-start' : 'items-center')}>
		<label className={cn(labelCls, 'w-[40%] shrink-0', top && 'pt-2')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<div className="flex items-center gap-3">
		<span className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70">
			{children}
		</span>
		<div className="flex-1 border-t border-border/50" />
	</div>
);

const COLOR_PRESETS = [
	'#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
];

const ColorPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
	const isPreset = COLOR_PRESETS.includes(value);

	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center gap-1.5">
				{COLOR_PRESETS.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => onChange(color)}
						className={cn(
							'size-7 rounded-lg border-2 transition-all duration-150',
							value === color
								? 'border-foreground/30 scale-110 shadow-sm'
								: 'border-transparent hover:scale-105 hover:border-foreground/10',
						)}
						style={{ backgroundColor: color }}
					/>
				))}

				<label
					title={__('Custom color', 'all-feedback')}
					className={cn(
						'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-150',
						!isPreset
							? 'border-foreground/30 scale-110 shadow-sm bg-muted text-muted-foreground'
							: 'border-dashed border-border/60 bg-muted text-muted-foreground/50 hover:border-border hover:text-muted-foreground',
					)}
				>
					<Pipette className="size-3.5" />
					{!isPreset && (
						<span
							className="absolute bottom-0.5 right-0.5 size-2 rounded-full border border-white/60"
							style={{ backgroundColor: value }}
						/>
					)}
					<input
						type="color"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="absolute inset-0 cursor-pointer opacity-0"
					/>
				</label>
			</div>

			<div className="flex items-center gap-2">
				<div className="size-4 rounded border border-border/60" style={{ backgroundColor: value }} />
				<code className="text-xs text-muted-foreground/70">{value.toUpperCase()}</code>
			</div>
		</div>
	);
};

type Position = Settings['general']['widget']['position'];

const BOTTOM_POSITIONS: { value: Position; label: string }[] = [
	{ value: 'bottom-left',  label: __('Bottom left',  'all-feedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'all-feedback') },
];
const ALL_POSITIONS: { value: Position; label: string }[] = [
	...BOTTOM_POSITIONS,
	{ value: 'side-tab', label: __('Side tab', 'all-feedback') },
];

const PositionPicker = ({ value, onChange, color }: { value: Position; onChange: (v: Position) => void; color: string }) => (
	<div className="space-y-3">
		<div
			className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-white shadow-md"
			style={{ aspectRatio: '16/9', maxWidth: 460 }}
		>
			{/* Tab bar */}
			<div className="shrink-0 select-none bg-[#dee1e6]">
				<div className="flex items-end px-2.5 pt-1.5">
					<div className="flex shrink-0 items-center gap-[5px] pb-[5px] pr-2.5">
						<span className="size-[9px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
					</div>
					<div className="flex items-center gap-1 rounded-t-[5px] bg-white px-2 pb-[5px] pt-[4px]">
						<Globe className="size-2.5 shrink-0 text-muted-foreground/50" />
						<span className="text-[9px] text-foreground/60">yoursite.com</span>
					</div>
				</div>
				{/* Address bar */}
				<div className="flex items-center px-2 pb-1.5 pt-1">
					<div className="flex flex-1 items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]">
						<Lock className="size-2 shrink-0 text-[#1e8e3e]" />
						<span className="flex-1 text-center text-[8.5px] text-foreground/60">yoursite.com</span>
					</div>
				</div>
			</div>

			{/* Page content */}
			<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
				{/* Fake navbar */}
				<div className="flex h-[22px] shrink-0 items-center gap-2 border-b border-black/[0.06] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
					<div className="h-2 w-10 rounded-full bg-foreground/10" />
					<div className="flex flex-1 items-center justify-end gap-2">
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
						<div className="h-1.5 w-5 rounded-full bg-foreground/[0.08]" />
					</div>
				</div>

				{/* Page skeleton */}
				<div className="pointer-events-none flex flex-col items-center gap-1.5 px-4 pt-3">
					<div className="h-2 w-2/5 rounded-full bg-foreground/10" />
					<div className="h-1.5 w-1/4 rounded-full bg-foreground/[0.07]" />
					<div className="mt-1 h-4 w-14 rounded-md bg-foreground/[0.08]" />
				</div>

				{/* Widget buttons */}
				{BOTTOM_POSITIONS.map((pos) => {
					const isActive = value === pos.value;
					return (
						<button
							key={pos.value}
							type="button"
							title={pos.label}
							onClick={() => onChange(pos.value)}
							style={isActive ? { backgroundColor: color } : undefined}
							className={cn(
								'absolute bottom-3 flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none',
								pos.value === 'bottom-left'  && 'left-3',
								pos.value === 'bottom-right' && 'right-3',
								isActive
									? 'size-9 text-white scale-105'
									: 'size-8 bg-foreground/[0.09] text-foreground/30 hover:bg-foreground/[0.14] hover:text-foreground/50 hover:scale-105',
							)}
						>
							<MessageSquare className={cn('transition-all', isActive ? 'size-4' : 'size-3.5')} />
						</button>
					);
				})}

				<button
					type="button"
					title={__('Side tab', 'all-feedback')}
					onClick={() => onChange('side-tab')}
					style={value === 'side-tab' ? { backgroundColor: color } : undefined}
					className={cn(
						'absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-l-lg transition-all duration-200 focus-visible:outline-none',
						value === 'side-tab'
							? 'py-3.5 px-2 text-white'
							: 'bg-foreground/[0.09] text-foreground/30 hover:bg-foreground/[0.14] hover:text-foreground/50 py-3 px-1.5',
					)}
				>
					<span
						className="select-none text-[9px] font-semibold tracking-widest"
						style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
					>
						{__('Feedback', 'all-feedback')}
					</span>
				</button>
			</div>
		</div>

		<div className="inline-flex items-center rounded-lg border border-border/60 p-0.5">
			{ALL_POSITIONS.map((pos) => (
				<button
					key={pos.value}
					type="button"
					onClick={() => onChange(pos.value)}
					className={cn(
						'rounded-md px-4 py-2 text-sm font-medium transition-colors',
						value === pos.value
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
					)}
				>
					{pos.label}
				</button>
			))}
		</div>
	</div>
);

const GeneralSettingsSkeleton = () => (
	<div>
		<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
			<Skeleton className="size-9 rounded-xl" />
			<Skeleton className="h-5 w-24" />
		</div>

		<div className="space-y-5 p-5">
			<div className="flex items-center gap-3">
				<Skeleton className="h-2.5 w-14" />
				<Skeleton className="h-px flex-1" />
			</div>

			<div className="flex items-start gap-4">
				<Skeleton className="mt-2 h-4 w-[40%] shrink-0" />
				<div className="min-w-0 flex-1 space-y-2.5">
					<div className="flex items-center gap-1.5">
						{[...Array(6)].map((_, i) => (
							<Skeleton key={i} className="size-7 rounded-lg" />
						))}
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="size-4 rounded" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			</div>

			<div className="flex items-start gap-4">
				<Skeleton className="mt-2 h-4 w-[40%] shrink-0" />
				<div className="min-w-0 flex-1 space-y-3">
					<Skeleton className="rounded-2xl" style={{ aspectRatio: '16/9', maxWidth: 460 }} />
					<div className="flex flex-wrap gap-2" style={{ maxWidth: 460 }}>
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-8 w-[90px] rounded-lg" />
						))}
					</div>
				</div>
			</div>
		</div>
	</div>
);

const DEFAULT_VALUES = {
	widget_color:    DEFAULT_WIDGET_COLOR,
	widget_position: 'bottom-right' as Position,
};

const FORM_KEY = 'general';

const GeneralSettings = () => {
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, isSaving, setDirty, patches, setPatch } = useSettingsDirty();

 	const stagedWidget = (patches[FORM_KEY] as { general?: { widget?: Partial<Settings['general']['widget']> } } | undefined)?.general?.widget;
	const initValues = stagedWidget
		? { widget_color: stagedWidget.color ?? DEFAULT_VALUES.widget_color, widget_position: stagedWidget.position ?? DEFAULT_VALUES.widget_position }
		: data
			? { widget_color: data.general.widget.color ?? DEFAULT_VALUES.widget_color, widget_position: data.general.widget.position ?? DEFAULT_VALUES.widget_position }
			: DEFAULT_VALUES;

	const form = useForm({
		defaultValues: initValues,
		onSubmit: async () => {
			// saving is handled centrally by Settings.tsx
		},
	});

 	const markedDirtyRef = useRef(false);
	useEffect(() => {
		if (stagedWidget && !markedDirtyRef.current) {
			setDirty(FORM_KEY, true);
			markedDirtyRef.current = true;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

 	useEffect(() => {
		if (!data || patches[FORM_KEY]) return;
		form.reset({
			widget_color:    data.general.widget.color    ?? DEFAULT_VALUES.widget_color,
			widget_position: data.general.widget.position ?? DEFAULT_VALUES.widget_position,
		}, { keepDefaultValues: true });
	}, [data]); // eslint-disable-line react-hooks/exhaustive-deps

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (!isDirty) return;
		// Skip when values still match server data (e.g. right after a save resets the form)
		const serverColor    = data?.general.widget.color    ?? DEFAULT_VALUES.widget_color;
		const serverPosition = data?.general.widget.position ?? DEFAULT_VALUES.widget_position;
		if (values.widget_color === serverColor && values.widget_position === serverPosition) return;
		setDirty(FORM_KEY, true);
		setPatch(FORM_KEY, { general: { widget: { color: values.widget_color, position: values.widget_position } } } as Record<string, unknown>);
	}, [values, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

	if (isPending) return <GeneralSettingsSkeleton />;

	return (
		<div>
			<div className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
						<Settings2 className="size-[18px] text-primary" />
					</div>
					<h3 className="text-md font-semibold text-foreground" style={{ margin: 0 }}>
						{__('General', 'all-feedback')}
					</h3>
				</div>
				{sharedIsDirty && !isSaving && <UnsavedChangesBadge />}
			</div>

			<div className="space-y-4 p-6">

				<Row label={__('Widget color', 'all-feedback')} top>
					<ColorPicker
						value={values.widget_color}
						onChange={(v) => form.setFieldValue('widget_color', v)}
					/>
				</Row>

				<Row label={__('Position', 'all-feedback')} top>
					<PositionPicker
						value={values.widget_position}
						onChange={(v) => form.setFieldValue('widget_position', v)}
						color={values.widget_color}
					/>
				</Row>


			</div>
		</div>
	);
};

export default GeneralSettings;
