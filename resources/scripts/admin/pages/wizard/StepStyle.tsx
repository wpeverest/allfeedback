import type { WizardCompletePayload } from '@/admin/api/wizard';
import { ColorPicker } from '@/admin/components/ColorPicker';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Check, Globe, Lock, MessageSquare } from 'lucide-react';

export type PositionValue = WizardCompletePayload['position'];

const ALL_POSITIONS: { value: PositionValue; label: string }[] = [
	{ value: 'bottom-left',  label: __('Bottom left',  'allfeedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'allfeedback') },
	{ value: 'side-tab',     label: __('Side tab',     'allfeedback') },
];

const BOTTOM_POSITIONS = ALL_POSITIONS.filter((p) => p.value !== 'side-tab');

const POSITION_SUB: Record<string, string> = {
	'bottom-left':  __('Floating bubble', 'allfeedback'),
	'bottom-right': __('Floating bubble', 'allfeedback'),
	'side-tab':     __('Vertical anchor', 'allfeedback'),
};

function PositionThumbnail({ value, selected }: { value: PositionValue; selected: boolean }) {
	return (
		<div className="relative h-9 w-[52px] shrink-0 overflow-hidden rounded-md border border-border/30 bg-muted/20">
			<div className="absolute inset-1 flex flex-col gap-[3px]">
				<div className="h-[3px] w-full rounded-full bg-foreground/10" />
				<div className="h-[3px] w-3/4 rounded-full bg-foreground/[0.07]" />
				<div className="h-[3px] w-1/2 rounded-full bg-foreground/[0.05]" />
			</div>
			{value === 'bottom-left' && (
				<div
					className="absolute bottom-1 left-1 size-2.5 rounded-full transition-colors"
					style={{
						backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)',
						opacity: selected ? 1 : 0.15,
					}}
				/>
			)}
			{value === 'bottom-right' && (
				<div
					className="absolute bottom-1 right-1 size-2.5 rounded-full transition-colors"
					style={{
						backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)',
						opacity: selected ? 1 : 0.15,
					}}
				/>
			)}
			{value === 'side-tab' && (
				<div
					className="absolute right-0 top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-l-sm transition-colors"
					style={{
						backgroundColor: selected ? 'var(--color-primary)' : 'var(--color-foreground)',
						opacity: selected ? 1 : 0.15,
					}}
				/>
			)}
		</div>
	);
}

export function BrowserPreview({
	color,
	position,
}: {
	color: string;
	position: PositionValue;
}) {
	return (
		<div
			className="border-border/50 shadow-card flex w-full max-w-[440px] flex-col overflow-hidden rounded-xl border bg-white"
			style={{ aspectRatio: '16/9' }}
		>
			<div className="shrink-0 bg-[#dee1e6] select-none">
				<div className="flex items-end px-2.5 pt-1.5">
					<div className="flex shrink-0 items-center gap-[5px] pr-2.5 pb-[5px]">
						<span className="size-[9px] rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
						<span className="size-[9px] rounded-full bg-[#28C840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
					</div>
					<div className="flex items-center gap-1 rounded-t-[5px] bg-white px-2 pt-[4px] pb-[5px]">
						<Globe className="text-muted-foreground/50 size-2.5 shrink-0" />
						<span className="text-foreground/60 text-[9px]">yoursite.com</span>
					</div>
				</div>
				<div className="flex items-center px-2 pt-1 pb-1.5">
					<div className="flex flex-1 items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.06)]">
						<Lock className="size-2 shrink-0 text-[#1e8e3e]" />
						<span className="text-foreground/60 flex-1 text-center text-[8.5px]">yoursite.com</span>
					</div>
				</div>
			</div>

			<div className="relative flex-1 overflow-hidden bg-[#f8f9fa]">
				<div className="flex h-[22px] shrink-0 items-center gap-2 border-b border-black/[0.06] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
					<div className="bg-foreground/10 h-2 w-10 rounded-full" />
					<div className="flex flex-1 items-center justify-end gap-2">
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
						<div className="bg-foreground/[0.08] h-1.5 w-5 rounded-full" />
					</div>
				</div>
				<div className="pointer-events-none flex flex-col items-center gap-1.5 px-4 pt-3">
					<div className="bg-foreground/10 h-2 w-2/5 rounded-full" />
					<div className="bg-foreground/[0.07] h-1.5 w-1/4 rounded-full" />
					<div className="bg-foreground/[0.08] mt-1 h-4 w-14 rounded-md" />
				</div>

				{BOTTOM_POSITIONS.map((pos) => (
					<div
						key={pos.value}
						className={cn(
							'absolute bottom-3 flex size-8 items-center justify-center rounded-xl transition-all duration-300',
							pos.value === 'bottom-left'  && 'left-3',
							pos.value === 'bottom-right' && 'right-3',
							position === pos.value
								? 'scale-110 text-white'
								: 'bg-foreground/[0.07] text-foreground/20',
						)}
						style={
							position === pos.value
								? { backgroundColor: color, boxShadow: `0 4px 12px -2px ${color}55` }
								: undefined
						}
					>
						<MessageSquare className="size-3.5" />
					</div>
				))}

				<div
					className={cn(
						'absolute top-1/2 right-0 -translate-y-1/2 rounded-l-lg px-1.5 py-3 transition-all duration-300',
						position === 'side-tab' ? 'text-white' : 'bg-foreground/[0.07] text-foreground/20',
					)}
					style={position === 'side-tab' ? { backgroundColor: color } : undefined}
				>
					<span
						className="text-[8px] font-semibold tracking-widest select-none"
						style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
					>
						{__('Feedback', 'allfeedback')}
					</span>
				</div>
			</div>
		</div>
	);
}

export function StepStyle({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	return (
		<div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[2fr_3fr]">

			<div className="flex flex-col">
				<div className="border-border/50 bg-card shadow-card flex h-full flex-col rounded-2xl border p-5 md:p-6">
					<div className="flex flex-col gap-5">

						<div className="space-y-2.5">
							<label className="text-foreground block text-[13px] font-semibold">
								{__('Brand color', 'allfeedback')}
							</label>
							<ColorPicker
								value={state.brand_color}
								onChange={(v) => set({ brand_color: v })}
								className="w-full"
							/>
						</div>

						<div className="space-y-2.5">
							<label className="text-foreground block text-[13px] font-semibold">
								{__('Widget position', 'allfeedback')}
							</label>
							<div className="flex flex-col gap-2">
								{ALL_POSITIONS.map((pos) => {
									const isSelected = state.position === pos.value;
									return (
										<button
											key={pos.value}
											type="button"
											onClick={() => set({ position: pos.value })}
											className={cn(
												'flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
												isSelected ? 'bg-primary/[0.03]' : 'bg-muted/10 hover:bg-muted/30',
											)}
											style={{
												border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
												borderRadius: '0.5rem',
											}}
										>
											<PositionThumbnail value={pos.value} selected={isSelected} />
											<div className="flex-1 text-left">
												<div className={cn('text-[13px] font-semibold leading-tight', isSelected ? 'text-primary' : 'text-foreground')}>
													{pos.label}
												</div>
												<div className="text-muted-foreground mt-0.5 text-[11px]">
													{POSITION_SUB[pos.value]}
												</div>
											</div>
											<div className={cn(
												'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
												isSelected ? 'border-primary bg-primary' : 'border-border',
											)}>
												{isSelected && <Check className="size-2.5 text-white" strokeWidth={3.5} />}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="border-border/50 bg-card shadow-card overflow-hidden rounded-2xl border">
				<div className="border-border/50 bg-muted/10 flex shrink-0 items-center gap-2.5 border-b px-6 py-4">
					<div className="flex gap-1.5">
						<span className="size-2.5 rounded-full bg-[#FF5F57]" />
						<span className="size-2.5 rounded-full bg-[#FFBD2E]" />
						<span className="size-2.5 rounded-full bg-[#28C840]" />
					</div>
					<div className="ml-2 flex items-center gap-1.5">
						<span className="size-1.5 animate-pulse rounded-full bg-green-500" />
						<span className="text-muted-foreground/90 text-xs font-bold tracking-widest uppercase">
							{__('Live Preview', 'allfeedback')}
						</span>
					</div>
				</div>
				<div className="bg-muted/5 flex items-center justify-center p-6 md:p-12">
					<BrowserPreview
						color={state.brand_color}
						position={state.position as PositionValue}
					/>
				</div>
			</div>
		</div>
	);
}
