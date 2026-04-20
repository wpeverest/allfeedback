import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Mail, MessageCircle, MessageSquare } from 'lucide-react';
import type { FormSettings, ProgressIndicator, TriggerIcon, WidgetPosition } from './types';

const TypingBubbleIcon = ( props: React.SVGProps<SVGSVGElement> ) => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" { ...props }>
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		<circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
		<circle cx="12" cy="11" r="1" fill="currentColor" stroke="none" />
		<circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
	</svg>
);

const CommentBubbleIcon = ( props: React.SVGProps<SVGSVGElement> ) => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" { ...props }>
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		<line x1="9" y1="9" x2="15" y2="9" />
		<line x1="9" y1="13" x2="13" y2="13" />
	</svg>
);

interface StylingPanelProps {
	settings:    FormSettings;
	onChange:    (next: FormSettings) => void;
	isMultiStep: boolean;
}

const DotsPreview = ( { active }: { active: boolean } ) => (
	<div className="flex items-center gap-[3px]">
		<span className={ cn( 'block h-[5px] w-3 rounded-full', active ? 'bg-primary' : 'bg-foreground/25' ) } />
		<span className={ cn( 'block h-[5px] w-[5px] rounded-full', active ? 'bg-primary/30' : 'bg-foreground/15' ) } />
		<span className={ cn( 'block h-[5px] w-[5px] rounded-full', active ? 'bg-primary/30' : 'bg-foreground/15' ) } />
	</div>
);

const NumbersPreview = ( { active }: { active: boolean } ) => (
	<span className={ cn( 'text-[10px] font-semibold tabular-nums leading-none', active ? 'text-primary' : 'text-foreground/40' ) }>
		1 / 3
	</span>
);

const BarPreview = ( { active }: { active: boolean } ) => (
	<div className={ cn( 'h-[4px] w-10 overflow-hidden rounded-sm', active ? 'bg-primary/20' : 'bg-foreground/10' ) }>
		<div className={ cn( 'h-full w-2/5 rounded-sm', active ? 'bg-primary' : 'bg-foreground/30' ) } />
	</div>
);

const NonePreview = ( { active }: { active: boolean } ) => (
	<span className={ cn( 'text-sm font-medium leading-none', active ? 'text-primary/50' : 'text-foreground/30' ) }>—</span>
);

const PROGRESS_OPTIONS: {
	value:   ProgressIndicator;
	label:   string;
	Preview: ( props: { active: boolean } ) => React.ReactElement;
}[] = [
	{ value: 'dots',    label: __( 'Dots',    'all-feedback' ), Preview: DotsPreview    },
	{ value: 'numbers', label: __( 'Numbers', 'all-feedback' ), Preview: NumbersPreview },
	{ value: 'bar',     label: __( 'Bar',     'all-feedback' ), Preview: BarPreview     },
	{ value: 'none',    label: __( 'None',    'all-feedback' ), Preview: NonePreview    },
];

const ICON_OPTIONS: { value: TriggerIcon; label: string; Icon: React.ElementType }[] = [
	{ value: 'message', label: __( 'Message', 'all-feedback' ), Icon: MessageSquare    },
	{ value: 'chat',    label: __( 'Chat',    'all-feedback' ), Icon: MessageCircle    },
	{ value: 'typing',  label: __( 'Typing',  'all-feedback' ), Icon: TypingBubbleIcon },
	{ value: 'comment', label: __( 'Comment', 'all-feedback' ), Icon: CommentBubbleIcon },
	{ value: 'mail',    label: __( 'Mail',    'all-feedback' ), Icon: Mail             },
];

const POSITION_OPTIONS: { value: WidgetPosition; label: string; Icon: () => React.ReactElement }[] = [
	{
		value: '',
		label: __( 'Default', 'all-feedback' ),
		Icon:  () => (
			<svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
				<rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
			</svg>
		),
	},
	{
		value: 'bottom-right',
		label: __( 'Bottom right', 'all-feedback' ),
		Icon:  () => (
			<svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
				<rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
				<circle cx="12" cy="12" r="2" fill="currentColor" />
			</svg>
		),
	},
	{
		value: 'bottom-left',
		label: __( 'Bottom left', 'all-feedback' ),
		Icon:  () => (
			<svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
				<rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
				<circle cx="4" cy="12" r="2" fill="currentColor" />
			</svg>
		),
	},
	{
		value: 'side-tab',
		label: __( 'Side tab', 'all-feedback' ),
		Icon:  () => (
			<svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
				<rect x="1" y="1" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
				<rect x="12" y="5" width="3" height="6" rx="1" fill="currentColor" />
			</svg>
		),
	},
];

const chipCls = ( active: boolean ) => cn(
	'rounded-lg border px-3 py-2 text-base transition-colors',
	active
		? 'border-primary/30 bg-primary/10 font-medium text-primary'
		: 'border-border bg-muted/30 text-foreground/70 hover:bg-muted/60',
);

const Card = ( { title, children }: { title: string; children: React.ReactNode } ) => (
	<div className="overflow-hidden rounded-2xl border border-border bg-card">
		<div className="border-b border-border/50 p-5">
			<div className="text-md font-medium text-foreground">{ title }</div>
		</div>
		<div className="p-5">{ children }</div>
	</div>
);

const StylingPanel = ( { settings, onChange, isMultiStep }: StylingPanelProps ) => {
	const set = <K extends keyof FormSettings>( key: K, value: FormSettings[ K ] ) =>
		onChange( { ...settings, [ key ]: value } );

	return (
		<div className="flex-1 overflow-y-auto bg-background p-5">
			<div className="w-full space-y-4">

				<Card title={ __( 'Widget Position', 'all-feedback' ) }>
					<div className="flex flex-wrap gap-1.5">
						{ POSITION_OPTIONS.map( ( { value, label, Icon } ) => {
							const isActive = settings.widgetPosition === value;
							return (
								<button
									key={ value || 'default' }
									type="button"
									aria-pressed={ isActive }
									onClick={ () => set( 'widgetPosition', value ) }
									className={ cn( chipCls( isActive ), 'flex items-center gap-2' ) }
								>
									<Icon />
									{ label }
								</button>
							);
						} ) }
					</div>
				</Card>

				{ isMultiStep && (
					<Card title={ __( 'Progress Indicator', 'all-feedback' ) }>
						<div className="flex flex-wrap gap-1.5">
							{ PROGRESS_OPTIONS.map( ( { value, label, Preview } ) => {
								const isActive = settings.progressIndicator === value;
								return (
									<button
										key={ value }
										type="button"
										aria-pressed={ isActive }
										onClick={ () => set( 'progressIndicator', value ) }
										className={ cn( chipCls( isActive ), 'flex items-center gap-2.5' ) }
									>
										<div className="flex h-4 shrink-0 items-center">
											<Preview active={ isActive } />
										</div>
										{ label }
									</button>
								);
							} ) }
						</div>
					</Card>
				) }

				<Card title={ __( 'Trigger Icon', 'all-feedback' ) }>
					<div className="flex flex-wrap gap-1.5">
						{ ICON_OPTIONS.map( ( { value, label, Icon } ) => {
							const isActive = settings.triggerIcon === value;
							return (
								<button
									key={ value }
									type="button"
									aria-pressed={ isActive }
									onClick={ () => set( 'triggerIcon', value ) }
									className={ cn(
										chipCls( isActive ),
										'flex flex-col items-center gap-1.5 px-4 py-2.5',
									) }
								>
									<Icon className="size-4" />
									<span className="text-xs leading-none">{ label }</span>
								</button>
							);
						} ) }
					</div>
				</Card>

			</div>
		</div>
	);
};

export default StylingPanel;
