import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import FieldEditor from './FieldEditor';
import FieldTypeMenu from './FieldTypeMenu';
import { FIELD_TYPES } from './fieldTypes';
import type { FieldType, FormField, FormSection } from './types';

interface SectionCardProps {
	section: FormSection;
	index: number;
	sectionCount: number;
	isDragging: boolean;
	isDragOver: boolean;
	onSectionChange: (section: FormSection) => void;
	onSectionDelete: () => void;
	onDragStart: (index: number) => void;
	onDragOver: (e: React.DragEvent, index: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, index: number) => void;
}

const SectionCard = ({
	section,
	index,
	isDragging,
	isDragOver,
	onSectionChange,
	onSectionDelete,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: SectionCardProps) => {
	const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
	const [fieldDragIdx, setFieldDragIdx] = useState<number | null>(null);
	const [fieldDropIdx, setFieldDropIdx] = useState<number | null>(null);
	const addFieldBtnRef = useRef<HTMLButtonElement>(null);

	const openMenu = () => {
		if (!addFieldBtnRef.current) return;
		setMenuAnchorRect(addFieldBtnRef.current.getBoundingClientRect());
	};

	const closeMenu = () => setMenuAnchorRect(null);

	const addField = useCallback(
		(type: FieldType) => {
			const typeConfig = FIELD_TYPES.find((t) => t.type === type)!;
			const newField: FormField = {
				id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				type,
				label: typeConfig.defaultLabel,
				required: false,
				...(type === 'multi_select' ? { options: ['Option 1', 'Option 2', 'Option 3'] } : {}),
				...(type === 'short_text' || type === 'long_text' ? { placeholder: '' } : {}),
			};
			onSectionChange({ ...section, fields: [...section.fields, newField] });
		},
		[section, onSectionChange],
	);

	const handleFieldChange = useCallback(
		(fieldIdx: number, field: FormField) => {
			const next = [...section.fields];
			next[fieldIdx] = field;
			onSectionChange({ ...section, fields: next });
		},
		[section, onSectionChange],
	);

	const deleteField = useCallback(
		(fieldIdx: number) => {
			onSectionChange({
				...section,
				fields: section.fields.filter((_, i) => i !== fieldIdx),
			});
		},
		[section, onSectionChange],
	);

	const duplicateField = useCallback(
		(fieldIdx: number) => {
			const copy: FormField = {
				...section.fields[fieldIdx],
				id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			};
			const next = [...section.fields];
			next.splice(fieldIdx + 1, 0, copy);
			onSectionChange({ ...section, fields: next });
		},
		[section, onSectionChange],
	);

	const handleFieldDragStart = (fieldIdx: number) => setFieldDragIdx(fieldIdx);

	const handleFieldDragOver = (_e: React.DragEvent, fieldIdx: number) =>
		setFieldDropIdx(fieldIdx);

	const handleFieldDragEnd = () => {
		setFieldDragIdx(null);
		setFieldDropIdx(null);
	};

	const handleFieldDrop = (_e: React.DragEvent, targetIdx: number) => {
		if (fieldDragIdx === null || fieldDragIdx === targetIdx) {
			setFieldDragIdx(null);
			setFieldDropIdx(null);
			return;
		}
		const next = [...section.fields];
		const [removed] = next.splice(fieldDragIdx, 1);
		next.splice(targetIdx, 0, removed);
		onSectionChange({ ...section, fields: next });
		setFieldDragIdx(null);
		setFieldDropIdx(null);
	};

	return (
		<div
			onDragOver={(e) => { e.preventDefault(); onDragOver(e, index); }}
			onDrop={(e) => { e.preventDefault(); onDrop(e, index); }}
			className={cn(
				'overflow-hidden rounded-2xl border bg-white transition-all',
				isDragging && 'opacity-40 scale-[0.99]',
				isDragOver && !isDragging
					? 'border-primary/50 shadow-[0_0_0_3px_oklch(var(--primary)/0.10)]'
					: 'border-border/70 shadow-sm',
			)}
		>
			<div
				draggable
				onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
				onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
				className="flex items-center gap-3 border-b border-border/50 bg-gradient-to-r from-primary/[0.05] to-transparent px-5 py-3.5"
			>
				<span className="cursor-grab text-primary/30 transition-colors hover:text-primary/60 active:cursor-grabbing">
					<GripVertical className="size-4 shrink-0" />
				</span>

				<span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-bold tabular-nums text-primary">
					{index + 1}
				</span>

				<input
					value={section.title}
					onChange={(e) => onSectionChange({ ...section, title: e.target.value })}
					placeholder="Section title"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
					className="min-w-[120px] flex-1 cursor-text border-b border-transparent bg-transparent px-1.5 py-0.5 text-[13px] font-semibold text-foreground placeholder:text-muted-foreground/40 transition-colors hover:border-border/60 focus:border-primary/60 focus:outline-none"
				/>

				<button
					type="button"
					onClick={onSectionDelete}
					className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/35 transition-colors hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>

			<div className="p-5">
				{section.fields.length > 0 && (
					<div className="mb-3 space-y-2">
						{section.fields.map((field, fieldIdx) => (
							<FieldEditor
								key={field.id}
								field={field}
								index={fieldIdx}
								isDragging={fieldDragIdx === fieldIdx}
								isDragOver={fieldDropIdx === fieldIdx && fieldDragIdx !== fieldIdx}
								onChange={(f) => handleFieldChange(fieldIdx, f)}
								onDelete={() => deleteField(fieldIdx)}
								onDuplicate={() => duplicateField(fieldIdx)}
								onDragStart={handleFieldDragStart}
								onDragOver={handleFieldDragOver}
								onDragEnd={handleFieldDragEnd}
								onDrop={handleFieldDrop}
							/>
						))}
					</div>
				)}

				<div className="flex">
					<Button
						ref={addFieldBtnRef}
						size="sm"
						variant="secondary"
						onClick={openMenu}
						className="cursor-pointer"
					>
						<Plus className="size-3.5" />
						Add Field
					</Button>
				</div>
			</div>

			{menuAnchorRect && (
				<FieldTypeMenu anchorRect={menuAnchorRect} onSelect={addField} onClose={closeMenu} />
			)}
		</div>
	);
};

export default SectionCard;
