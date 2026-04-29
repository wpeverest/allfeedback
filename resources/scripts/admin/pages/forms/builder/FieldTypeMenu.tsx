import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { useEffect, useRef } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FieldType } from './types';

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
					className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
				>
					<Icon className="size-4 shrink-0" />
					{label}
				</button>
			))}
		</div>
	);
};

export default FieldTypeMenu;
