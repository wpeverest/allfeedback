import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { useSettingsDirty } from '@/admin/pages/settings/Settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Loader2, MessageSquare, Pipette, Settings2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const DEFAULT_WIDGET_COLOR = '#6366F1';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const Row = ({ label, children, top }: { label: string; children: React.ReactNode; top?: boolean }) => (
	<div className={cn('flex gap-4', top ? 'items-start' : 'items-center')}>
		<label className={cn(labelCls, 'w-[40%] shrink-0', top && 'pt-2')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<div className="flex items-center gap-3">
		<span className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground/50">
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
				<code className="text-[12px] text-muted-foreground/70">{value.toUpperCase()}</code>
			</div>
		</div>
	);
};

type Position = Settings['widget_position'];

const BOTTOM_POSITIONS: { value: Position; label: string }[] = [
	{ value: 'bottom-left',  label: __('Bottom left',  'all-feedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'all-feedback') },
];
const ALL_POSITIONS: { value: Position; label: string }[] = [
	...BOTTOM_POSITIONS,
	{ value: 'side-tab', label: __('Side tab', 'all-feedback') },
];

const hexToRgba = (hex: string, alpha: number) => {
	const h = hex.replace('#', '');
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PositionPicker = ({ value, onChange, color }: { value: Position; onChange: (v: Position) => void; color: string }) => (
	<div className="space-y-3">
		<div
			className="relative overflow-hidden rounded-2xl bg-[#12121f] shadow-lg"
			style={{ aspectRatio: '16/8', maxWidth: 460 }}
		>
			<div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-1.5 border-b border-white/[0.07] bg-[#1c1c2e] px-4">
				<span className="size-2.5 rounded-full bg-[#ff5f57]" />
				<span className="size-2.5 rounded-full bg-[#ffbd2e]" />
				<span className="size-2.5 rounded-full bg-[#28c840]" />
				<div className="ml-3 h-4 flex-1 rounded-full bg-white/[0.06]" />
			</div>

			<div className="absolute inset-x-0 bottom-4 flex items-end px-4">
				{BOTTOM_POSITIONS.map((pos) => {
					const isActive = value === pos.value;
					return (
						<div key={pos.value} className={cn(
							'flex flex-1',
							pos.value === 'bottom-left'  && 'justify-start',
							pos.value === 'bottom-right' && 'justify-end',
						)}>
							<button
								type="button"
								title={pos.label}
								onClick={() => onChange(pos.value)}
								style={isActive ? { backgroundColor: color, boxShadow: `0 4px 16px ${hexToRgba(color, 0.5)}` } : undefined}
								className={cn(
									'flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
									isActive
										? 'size-11 text-white scale-105'
										: 'size-10 bg-white/[0.08] text-white/30 hover:bg-white/[0.15] hover:text-white/60 hover:scale-105',
								)}
							>
								<MessageSquare className={cn('transition-all', isActive ? 'size-5' : 'size-4')} />
							</button>
						</div>
					);
				})}
			</div>

			<button
				type="button"
				title={__('Side tab', 'all-feedback')}
				onClick={() => onChange('side-tab')}
				style={value === 'side-tab' ? { backgroundColor: color, boxShadow: `0 4px 16px ${hexToRgba(color, 0.5)}` } : undefined}
				className={cn(
					'absolute right-0 top-1/2 -translate-y-1/2 rounded-l-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 flex items-center justify-center',
					value === 'side-tab'
						? 'text-white py-4 px-2.5'
						: 'bg-white/[0.08] text-white/30 hover:bg-white/[0.15] hover:text-white/60 py-3.5 px-2',
				)}
			>
				<span
					className="select-none text-[11px] font-semibold tracking-widest"
					style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
				>
					{__('Feedback', 'all-feedback')}
				</span>
			</button>
		</div>

		<div className="inline-flex items-center rounded-lg border border-border/60 p-0.5">
			{ALL_POSITIONS.map((pos) => (
				<button
					key={pos.value}
					type="button"
					onClick={() => onChange(pos.value)}
					className={cn(
						'rounded-md px-4 py-2 text-[13px] font-medium transition-colors',
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
					<Skeleton className="rounded-2xl" style={{ aspectRatio: '16/8', maxWidth: 460 }} />
					<div className="flex flex-wrap gap-2" style={{ maxWidth: 460 }}>
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-8 w-[90px] rounded-lg" />
						))}
					</div>
				</div>
			</div>
		</div>

		<div className="flex items-center justify-end border-t border-border/50 px-6 py-4">
			<Skeleton className="h-9 w-28 rounded-md" />
		</div>
	</div>
);

const DEFAULT_VALUES = {
	widget_color:    DEFAULT_WIDGET_COLOR,
	widget_position: 'bottom-right' as Position,
};

const GeneralSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());
	const { isDirty: sharedIsDirty, setDirty } = useSettingsDirty();

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			setDirty('general', false);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
		},
	});

	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: async ({ value }) => {
			mutate(value);
		},
	});

	useEffect(() => {
		if (!data) return;
		form.reset({
			widget_color:     data.widget_color     ?? DEFAULT_VALUES.widget_color,
			widget_position:  data.widget_position  ?? DEFAULT_VALUES.widget_position,
		}, { keepDefaultValues: true });
	}, [data]);

	const values  = useStore(form.store, (s) => s.values);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	useEffect(() => {
		if (isDirty) setDirty('general', true);
	}, [isDirty, setDirty]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault();
				void form.handleSubmit();
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [form]);

	if (isPending) return <GeneralSettingsSkeleton />;

	return (
		<form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
			<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<Settings2 className="size-[18px] text-primary" />
				</div>
				<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
					{__('General', 'all-feedback')}
				</h3>
				{sharedIsDirty && !isSaving && (
					<div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
						<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
						<span className="text-[12px] font-medium text-amber-600">
							{__('Unsaved changes', 'all-feedback')}
						</span>
					</div>
				)}
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

			<div className="flex items-center justify-end border-t border-border/50 px-6 py-4">
				<Button type="submit" disabled={isSaving}>
					{isSaving && <Loader2 className="animate-spin" />}
					{isSaving ? __('Saving…', 'all-feedback') : __('Save Changes', 'all-feedback')}
				</Button>
			</div>
		</form>
	);
};

export default GeneralSettings;
