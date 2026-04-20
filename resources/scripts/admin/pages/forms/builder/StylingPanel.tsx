import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Palette } from 'lucide-react';
import type { FormStyling, WidgetPosition } from './types';

interface StylingPanelProps {
	styling:  FormStyling;
	onChange: ( styling: FormStyling ) => void;
}

const labelCls = 'text-base font-normal text-foreground/80';

const inputCls = [
	'flex h-9 w-full rounded-lg border border-border/70 bg-transparent px-3 py-2',
	'text-sm text-foreground placeholder:text-muted-foreground/40',
	'transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10',
].join( ' ' );

const Row = ( { label, children }: { label: string; children: React.ReactNode } ) => (
	<div className="flex items-center gap-4">
		<label className={ cn( labelCls, 'w-[32%] shrink-0' ) }>{ label }</label>
		<div className="flex-1 min-w-0">{ children }</div>
	</div>
);

const Card = ( { title, children }: { title: string; children: React.ReactNode } ) => (
	<div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
		<div className="border-b border-border/50 p-5">
			<div className="text-md font-medium text-foreground">{ title }</div>
		</div>
		<div className="flex flex-col gap-5 p-5">{ children }</div>
	</div>
);

const POSITIONS: { value: WidgetPosition | ''; label: string }[] = [
	{ value: '',              label: __( 'Use global default', 'all-feedback' ) },
	{ value: 'bottom_right',  label: __( 'Bottom right',      'all-feedback' ) },
	{ value: 'bottom_left',   label: __( 'Bottom left',       'all-feedback' ) },
	{ value: 'top_right',     label: __( 'Top right',         'all-feedback' ) },
	{ value: 'top_left',      label: __( 'Top left',          'all-feedback' ) },
];

export const StylingPanel = ( { styling, onChange }: StylingPanelProps ) => {
	const set = <K extends keyof FormStyling>( key: K, value: FormStyling[K] ) =>
		onChange( { ...styling, [ key ]: value } );

	return (
		<div className="flex flex-1 flex-col overflow-y-auto">
			<div className="flex flex-1 flex-col gap-4 p-6">

				<Card title={ __( 'Widget', 'all-feedback' ) }>
					<Row label={ __( 'Position', 'all-feedback' ) }>
						<Select
							value={ styling.widgetPosition }
							onValueChange={ ( v ) => set( 'widgetPosition', v as WidgetPosition | '' ) }
						>
							<SelectTrigger className="h-9 text-sm">
								<SelectValue placeholder={ __( 'Use global default', 'all-feedback' ) } />
							</SelectTrigger>
							<SelectContent>
								{ POSITIONS.map( ( p ) => (
									<SelectItem key={ p.value } value={ p.value }>
										{ p.label }
									</SelectItem>
								) ) }
							</SelectContent>
						</Select>
					</Row>

					<Row label={ __( 'Button label', 'all-feedback' ) }>
						<input
							type="text"
							className={ inputCls }
							value={ styling.widgetLabel }
							placeholder={ __( 'Use global default', 'all-feedback' ) }
							maxLength={ 80 }
							onChange={ ( e ) => set( 'widgetLabel', e.target.value ) }
						/>
					</Row>

					<Row label={ __( 'Button icon', 'all-feedback' ) }>
						<input
							type="text"
							className={ inputCls }
							value={ styling.widgetIcon }
							placeholder={ __( 'Use global default', 'all-feedback' ) }
							maxLength={ 64 }
							onChange={ ( e ) => set( 'widgetIcon', e.target.value ) }
						/>
					</Row>
				</Card>

				<div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
					<div className="flex items-center gap-3 p-5">
						<Palette className="size-5 text-muted-foreground/40" />
						<div>
							<p className="text-base font-medium text-foreground">
								{ __( 'Form Styling', 'all-feedback' ) }
							</p>
							<p className="text-sm text-muted-foreground">
								{ __( 'Available in', 'all-feedback' ) }{ ' ' }
								<span className="font-semibold text-amber-600">PRO</span>
							</p>
						</div>
					</div>
				</div>

			</div>
		</div>
	);
};

export default StylingPanel;
