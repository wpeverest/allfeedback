import { useEffect, useRef } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FieldType } from './types';

interface FieldTypeMenuProps {
	anchorRect: DOMRect;
	onSelect: (type: FieldType) => void;
	onClose: () => void;
}

const FieldTypeMenu = ({ anchorRect, onSelect, onClose }: FieldTypeMenuProps) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handle = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [onClose]);

	useEffect(() => {
		const handle = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handle);
		return () => document.removeEventListener('keydown', handle);
	}, [onClose]);

	const left = Math.min(anchorRect.left, window.innerWidth - 240);

	return (
		<div
			ref={menuRef}
			style={{
				position: 'fixed',
				top: anchorRect.bottom + 8,
				left,
				zIndex: 100000,
				width: 232,
			}}
			className="overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-[0_4px_16px_oklch(0_0_0/0.10),0_1px_4px_oklch(0_0_0/0.06)]"
		>
			{FIELD_TYPES.map(({ type, label, Icon, iconBg, iconColor }) => (
				<button
					key={type}
					type="button"
					onClick={() => {
						onSelect(type);
						onClose();
					}}
					className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted/60"
				>
					<span
						className="flex size-8 shrink-0 items-center justify-center rounded-lg"
						style={{ backgroundColor: iconBg }}
					>
						<Icon className="size-4" style={{ color: iconColor }} />
					</span>
					{label}
				</button>
			))}
		</div>
	);
};

export default FieldTypeMenu;
