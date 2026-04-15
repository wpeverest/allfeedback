import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Layout, Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-start gap-4">
		<label className={cn(labelCls, 'w-[38%] shrink-0 pt-2')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

type Position = Settings['general']['widget']['position'];

const BOTTOM_POSITIONS: { value: Position; label: string; flex: string }[] = [
	{ value: 'bottom-left',  label: __('Bottom left',  'all-feedback'), flex: 'justify-start' },
	{ value: 'bottom-right', label: __('Bottom right', 'all-feedback'), flex: 'justify-end'   },
];

const ALL_POSITIONS: { value: Position; label: string }[] = [
	{ value: 'bottom-left',  label: __('Bottom left',  'all-feedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'all-feedback') },
	{ value: 'side-tab',     label: __('Side tab',     'all-feedback') },
];

const PositionPicker = ({
	value,
	onChange,
}: {
	value:    Position;
	onChange: (v: Position) => void;
}) => {
	const isSideTab = value === 'side-tab';

	return (
		<div className="space-y-4">
			<div
				className="relative overflow-hidden rounded-2xl bg-[#12121f] shadow-xl"
				style={{ aspectRatio: '16 / 8', maxWidth: 520 }}
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
							<div key={pos.value} className={cn('flex flex-1', pos.flex)}>
								<button
									type="button"
									title={pos.label}
									onClick={() => onChange(pos.value)}
									className={cn(
										'flex items-center justify-center rounded-xl transition-all duration-200',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
										isActive
											? 'size-11 bg-primary text-white shadow-[0_4px_16px_rgba(99,82,255,0.5)] scale-105'
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
					className={cn(
						'absolute right-0 top-1/2 -translate-y-1/2 rounded-l-xl transition-all duration-200',
						'flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
						isSideTab
							? 'bg-primary text-white shadow-[0_4px_16px_rgba(99,82,255,0.5)] py-4 px-2.5'
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

			<div className="flex flex-wrap gap-2" style={{ maxWidth: 520 }}>
				{ALL_POSITIONS.map((pos) => {
					const isActive = value === pos.value;
					return (
						<button
							key={pos.value}
							type="button"
							onClick={() => onChange(pos.value)}
							className={cn(
								'rounded-lg border px-3 py-2 text-[13px] transition-colors',
								isActive
									? 'border-primary/30 bg-primary/10 font-medium text-primary'
									: 'border-border/60 bg-muted/30 text-foreground/70 hover:border-border hover:bg-muted/60',
							)}
						>
							{pos.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};

const WidgetSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());

	const [position, setPosition] = useState<Position>('bottom-right');

	useEffect(() => {
		if (!data) return;
		setPosition(data.general?.widget?.position ?? 'bottom-right');
	}, [data]);

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (pos: Position) =>
			settingsApi.update({ general: { widget: { position: pos } } }),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		mutate(position);
	};

	if (isPending) {
		return (
			<div>
				<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
					<Skeleton className="size-9 rounded-xl" />
					<Skeleton className="h-5 w-20" />
				</div>
				<div className="space-y-4 p-5">
					<div className="flex items-start gap-4">
						<Skeleton className="h-4 w-[38%]" />
						<div className="flex-1 space-y-3">
							<Skeleton className="h-52 w-full max-w-[520px] rounded-2xl" />
							<div className="flex gap-2">
								{[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-24 rounded-lg" />)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<Layout className="size-[18px] text-primary" />
				</div>
				<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
					{__('Widget', 'all-feedback')}
				</h3>
			</div>

			<div className="space-y-5 p-5">
				<Row label={__('Position', 'all-feedback')}>
					<PositionPicker value={position} onChange={setPosition} />
				</Row>
			</div>

			<div className="flex justify-end border-t border-border/50 px-5 py-3.5">
				<Button type="submit" disabled={isSaving}>
					{isSaving && <Loader2 className="animate-spin" />}
					{isSaving ? __('Saving…', 'all-feedback') : __('Save Changes', 'all-feedback')}
				</Button>
			</div>
		</form>
	);
};

export default WidgetSettings;
