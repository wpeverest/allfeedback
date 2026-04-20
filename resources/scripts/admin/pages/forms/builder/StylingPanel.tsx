import { __ } from '@wordpress/i18n';
import { Palette } from 'lucide-react';
import type { FormStyling } from './types';

interface StylingPanelProps {
	styling:  FormStyling;
	onChange: ( styling: FormStyling ) => void;
}

export const StylingPanel = ( { styling: _styling, onChange: _onChange }: StylingPanelProps ) => (
	<div className="flex flex-1 flex-col overflow-y-auto">
		<div className="flex flex-1 flex-col gap-4 p-6">

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

export default StylingPanel;
