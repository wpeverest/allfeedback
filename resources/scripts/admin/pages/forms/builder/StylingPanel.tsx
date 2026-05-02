import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import {
	Check,
	MessageCircle,
	MessageSquare,
	PenLine,
	Smile,
	Star,
} from 'lucide-react';
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
			'h-[4px] w-8 overflow-hidden rounded-sm',
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

const PositionThumbnail = ({ position }: { position: WidgetPosition }) => {
	if (position === 'side-tab') {
		return (
			<svg
				viewBox="0 0 48 34"
				fill="none"
				className="h-6 w-full"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="36"
					height="32"
					rx="3"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeOpacity="0.5"
				/>
				<rect
					x="37"
					y="10"
					width="10"
					height="14"
					rx="2"
					fill="currentColor"
					fillOpacity="0.7"
				/>
			</svg>
		);
	}
	if (position === 'bottom-right') {
		return (
			<svg
				viewBox="0 0 48 34"
				fill="none"
				className="h-6 w-full"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="46"
					height="32"
					rx="3"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeOpacity="0.5"
				/>
				<circle cx="41" cy="28" r="4" fill="currentColor" fillOpacity="0.75" />
			</svg>
		);
	}
	if (position === 'bottom-left') {
		return (
			<svg
				viewBox="0 0 48 34"
				fill="none"
				className="h-6 w-full"
				aria-hidden="true"
			>
				<rect
					x="1"
					y="1"
					width="46"
					height="32"
					rx="3"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeOpacity="0.5"
				/>
				<circle cx="7" cy="28" r="4" fill="currentColor" fillOpacity="0.75" />
			</svg>
		);
	}
	return (
		<svg
			viewBox="0 0 48 34"
			fill="none"
			className="h-6 w-full"
			aria-hidden="true"
		>
			<rect
				x="1"
				y="1"
				width="46"
				height="32"
				rx="3"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeOpacity="0.4"
				strokeDasharray="3 2"
			/>
			<circle cx="41" cy="28" r="2.5" fill="currentColor" fillOpacity="0.3" />
			<circle cx="7" cy="28" r="2.5" fill="currentColor" fillOpacity="0.3" />
		</svg>
	);
};

const POSITION_OPTIONS: { value: WidgetPosition; label: string }[] = [
	{ value: '', label: __('Default', 'allfeedback') },
	{ value: 'bottom-right', label: __('Bottom right', 'allfeedback') },
	{ value: 'bottom-left', label: __('Bottom left', 'allfeedback') },
	{ value: 'side-tab', label: __('Side tab', 'allfeedback') },
];

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

const SectionCard = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<div className="border-border/60 overflow-hidden rounded-2xl border bg-white">
		<div className="border-border/50 border-b p-5">
			<p className="text-foreground/90 !my-0 text-sm font-semibold">{title}</p>
		</div>
		<div className="p-5">{children}</div>
	</div>
);

const optionBase = (active: boolean) =>
	cn(
		'group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
		active
			? 'border-primary/30 bg-primary/5 text-primary shadow-sm'
			: 'border-border bg-muted/20 text-foreground/50 hover:border-border/90 hover:bg-muted/40 hover:text-foreground/70',
	);

const ActiveBadge = () => (
	<span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full">
		<Check className="size-2.5" strokeWidth={3} />
	</span>
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
				<SectionCard title={__('Widget Position', 'allfeedback')}>
					<div className="grid grid-cols-4 gap-2">
						{POSITION_OPTIONS.map(({ value, label }) => {
							const isActive = settings.widgetPosition === value;
							return (
								<button
									key={value || 'default'}
									type="button"
									aria-pressed={isActive}
									onClick={() => set('widgetPosition', value)}
									className={optionBase(isActive)}
								>
									{isActive && <ActiveBadge />}
									<PositionThumbnail position={value} />
									<span
										className={cn(
											'text-xs leading-none font-medium',
											isActive ? 'text-primary' : 'text-foreground/55',
										)}
									>
										{label}
									</span>
								</button>
							);
						})}
					</div>
				</SectionCard>

				{isMultiStep && (
					<SectionCard title={__('Progress Indicator', 'allfeedback')}>
						<div className="grid grid-cols-4 gap-2">
							{PROGRESS_OPTIONS.map(({ value, label, Preview }) => {
								const isActive = settings.progressIndicator === value;
								return (
									<button
										key={value}
										type="button"
										aria-pressed={isActive}
										onClick={() => set('progressIndicator', value)}
										className={optionBase(isActive)}
									>
										{isActive && <ActiveBadge />}
										<div className="flex h-4 items-center">
											<Preview active={isActive} />
										</div>
										<span
											className={cn(
												'text-xs leading-none font-medium',
												isActive ? 'text-primary' : 'text-foreground/55',
											)}
										>
											{label}
										</span>
									</button>
								);
							})}
						</div>
					</SectionCard>
				)}

				<SectionCard title={__('Trigger Icon', 'allfeedback')}>
					<div className="grid grid-cols-5 gap-2">
						{ICON_OPTIONS.map(({ value, label, Icon }) => {
							const isActive = settings.triggerIcon === value;
							return (
								<button
									key={value}
									type="button"
									aria-pressed={isActive}
									onClick={() => set('triggerIcon', value)}
									className={optionBase(isActive)}
								>
									{isActive && <ActiveBadge />}
									<Icon className="size-5" />
									<span
										className={cn(
											'text-xs leading-none font-medium',
											isActive ? 'text-primary' : 'text-foreground/55',
										)}
									>
										{label}
									</span>
								</button>
							);
						})}
					</div>
				</SectionCard>
			</div>
		</div>
	);
};

export default StylingPanel;
