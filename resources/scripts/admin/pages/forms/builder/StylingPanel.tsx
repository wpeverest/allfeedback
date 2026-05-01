import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { MessageCircle, MessageSquare, PenLine, Smile, Star } from 'lucide-react';
import type {
	FormSettings,
	ProgressIndicator,
	TriggerIcon,
	WidgetPosition,
} from './types';

interface StylingPanelProps {
	settings: FormSettings;
	onChange: (next: FormSettings) => void;
	isMultiStep: boolean;
}

const DotsPreview = ({ active }: { active: boolean }) => (
	<div className="flex items-center gap-[3px]">
		<span
			className={cn(
				'block h-[5px] w-3 rounded-full',
				active ? 'bg-primary' : 'bg-foreground/25',
			)}
		/>
		<span
			className={cn(
				'block h-[5px] w-[5px] rounded-full',
				active ? 'bg-primary/30' : 'bg-foreground/15',
			)}
		/>
		<span
			className={cn(
				'block h-[5px] w-[5px] rounded-full',
				active ? 'bg-primary/30' : 'bg-foreground/15',
			)}
		/>
	</div>
);

const NumbersPreview = ({ active }: { active: boolean }) => (
	<span
		className={cn(
			'text-[10px] leading-none font-semibold tabular-nums',
			active ? 'text-primary' : 'text-foreground/40',
		)}
	>
		1 / 3
	</span>
);

const BarPreview = ({ active }: { active: boolean }) => (
	<div
		className={cn(
			'h-[4px] w-10 overflow-hidden rounded-sm',
			active ? 'bg-primary/20' : 'bg-foreground/10',
		)}
	>
		<div
			className={cn(
				'h-full w-2/5 rounded-sm',
				active ? 'bg-primary' : 'bg-foreground/30',
			)}
		/>
	</div>
);

const NonePreview = ({ active }: { active: boolean }) => (
	<span
		className={cn(
			'text-sm leading-none font-medium',
			active ? 'text-primary/50' : 'text-foreground/30',
		)}
	>
		—
	</span>
);

const PROGRESS_OPTIONS: {
	value: ProgressIndicator;
	label: string;
	Preview: (props: { active: boolean }) => React.ReactElement;
}[] = [
	{ value: 'dots', label: __('Dots', 'allfeedback'), Preview: DotsPreview },
	{
		value: 'numbers',
		label: __('Numbers', 'allfeedback'),
		Preview: NumbersPreview,
	},
	{ value: 'bar', label: __('Bar', 'allfeedback'), Preview: BarPreview },
	{ value: 'none', label: __('None', 'allfeedback'), Preview: NonePreview },
];

const ICON_OPTIONS: {
	value: TriggerIcon;
	label: string;
	Icon: React.ElementType;
}[] = [
	{
		value: 'message',
		label: __('Message', 'allfeedback'),
		Icon: MessageSquare,
	},
	{ value: 'chat', label: __('Chat', 'allfeedback'), Icon: MessageCircle },
	{ value: 'smile', label: __('Smile', 'allfeedback'), Icon: Smile },
	{ value: 'star', label: __('Star', 'allfeedback'), Icon: Star },
	{ value: 'pen', label: __('Pen', 'allfeedback'), Icon: PenLine },
];

const POSITION_OPTIONS: {
	value: WidgetPosition;
	label: string;
	Icon: () => React.ReactElement;
}[] = [
	{
		value: '',
		label: __('Default', 'allfeedback'),
		Icon: () => (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				className="size-4"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="14"
					height="14"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeDasharray="3 2"
				/>
			</svg>
		),
	},
	{
		value: 'bottom-right',
		label: __('Bottom right', 'allfeedback'),
		Icon: () => (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				className="size-4"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="14"
					height="14"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<circle cx="12" cy="12" r="2" fill="currentColor" />
			</svg>
		),
	},
	{
		value: 'bottom-left',
		label: __('Bottom left', 'allfeedback'),
		Icon: () => (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				className="size-4"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="14"
					height="14"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<circle cx="4" cy="12" r="2" fill="currentColor" />
			</svg>
		),
	},
	{
		value: 'side-tab',
		label: __('Side tab', 'allfeedback'),
		Icon: () => (
			<svg
				viewBox="0 0 16 16"
				fill="none"
				className="size-4"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="11"
					height="14"
					rx="2"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<rect x="12" y="5" width="3" height="6" rx="1" fill="currentColor" />
			</svg>
		),
	},
];

const chipCls = (active: boolean) =>
	cn(
		'rounded-lg border px-3 py-2 text-base transition-colors',
		active
			? 'border-primary/30 bg-primary/10 font-medium text-primary'
			: 'border-border bg-muted/30 text-foreground/70 hover:bg-muted/60',
	);

const Card = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div className="border-border bg-card overflow-hidden rounded-2xl border">
		<div className="border-border/50 border-b p-5">
			<div className="text-base font-semibold text-foreground/90">{title}</div>
		</div>
		<div className="p-5">{children}</div>
	</div>
);

const StylingPanel = ({
	settings,
	onChange,
	isMultiStep,
}: StylingPanelProps) => {
	const set = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) =>
		onChange({ ...settings, [key]: value });

	return (
		<div className="bg-background flex-1 overflow-y-auto p-5">
			<div className="w-full space-y-4">
				<Card title={__('Widget Position', 'allfeedback')}>
					<div className="flex flex-wrap gap-1.5">
						{POSITION_OPTIONS.map(({ value, label, Icon }) => {
							const isActive = settings.widgetPosition === value;
							return (
								<button
									key={value || 'default'}
									type="button"
									aria-pressed={isActive}
									onClick={() => set('widgetPosition', value)}
									className={cn(chipCls(isActive), 'flex items-center gap-2')}
								>
									<Icon />
									{label}
								</button>
							);
						})}
					</div>
				</Card>

				{isMultiStep && (
					<Card title={__('Progress Indicator', 'allfeedback')}>
						<div className="flex flex-wrap gap-1.5">
							{PROGRESS_OPTIONS.map(({ value, label, Preview }) => {
								const isActive = settings.progressIndicator === value;
								return (
									<button
										key={value}
										type="button"
										aria-pressed={isActive}
										onClick={() => set('progressIndicator', value)}
										className={cn(
											chipCls(isActive),
											'flex items-center gap-2.5',
										)}
									>
										<div className="flex h-4 shrink-0 items-center">
											<Preview active={isActive} />
										</div>
										{label}
									</button>
								);
							})}
						</div>
					</Card>
				)}

				<Card title={__('Trigger Icon', 'allfeedback')}>
					<div className="flex flex-wrap gap-1.5">
						{ICON_OPTIONS.map(({ value, label, Icon }) => {
							const isActive = settings.triggerIcon === value;
							return (
								<button
									key={value}
									type="button"
									aria-pressed={isActive}
									onClick={() => set('triggerIcon', value)}
									className={cn(
										chipCls(isActive),
										'flex flex-col items-center gap-1.5 px-4 py-2.5',
									)}
								>
									<Icon className="size-4" />
									<span className="text-xs leading-none">{label}</span>
								</button>
							);
						})}
					</div>
				</Card>
			</div>
		</div>
	);
};

export default StylingPanel;
