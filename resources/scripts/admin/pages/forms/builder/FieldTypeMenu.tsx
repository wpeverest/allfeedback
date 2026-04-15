import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { Smile, Target, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FieldType } from './types';
import { __ } from '@wordpress/i18n';

const PRO_FIELD_TYPES = [
	{ label: 'PMF',  description: 'Product Market Fit',    Icon: Target },
	{ label: 'CSAT', description: 'Customer Satisfaction', Icon: Smile  },
	{ label: 'CES',  description: 'Customer Effort Score', Icon: Zap    },
];

interface FieldTypeMenuProps {
	triggerRef: React.RefObject<HTMLElement | null>;
	onSelect: (type: FieldType) => void;
	onClose: () => void;
}

const FieldTypeMenu = ({ triggerRef, onSelect, onClose }: FieldTypeMenuProps) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handle = (e: MouseEvent) => {
			const target = e.target as Node;
			if (triggerRef.current?.contains(target)) return;
			if (menuRef.current && !menuRef.current.contains(target)) onClose();
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [onClose, triggerRef]);

	useEffect(() => {
		const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', handle);
		return () => document.removeEventListener('keydown', handle);
	}, [onClose]);

	useEffect(() => {
		const menu    = menuRef.current;
		const trigger = triggerRef.current;
		if (!menu || !trigger) return;

		computePosition(trigger, menu, {
			placement: 'bottom-start',
			strategy:  'fixed',
			middleware: [
				offset(8),
				flip({ padding: 8 }),
				shift({ padding: 8 }),
			],
		}).then(({ x, y }) => {
			Object.assign(menu.style, {
				left:       `${x}px`,
				top:        `${y}px`,
				visibility: 'visible',
			});
		});
	}, [triggerRef]);

	return (
		<div
			ref={menuRef}
			className="field-type-menu overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-dropdown"
			style={{ visibility: 'hidden' }}
		>
			{FIELD_TYPES.map(({ type, label, Icon }) => (
				<button
					key={type}
					type="button"
					onClick={() => { onSelect(type); onClose(); }}
					className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
				>
					<Icon className="size-4 shrink-0" />
					{label}
				</button>
			))}

			<div className="my-1 border-t border-border/60" />

			{PRO_FIELD_TYPES.map(({ label, description, Icon }) => (
				<div
					key={label}
					className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-muted-foreground opacity-55"
					title={__('Available in Pro plan', 'all-feedback')}
				>
					<Icon className="size-4 shrink-0" />
					<span className="flex-1">{description}</span>
					<span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-2xs font-semibold text-amber-600">
						Pro
					</span>
				</div>
			))}
		</div>
	);
};

export default FieldTypeMenu;
