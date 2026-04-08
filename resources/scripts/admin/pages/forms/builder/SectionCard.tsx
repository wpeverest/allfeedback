import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Check, ChevronDown, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
	autoFocus?: boolean;
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
	autoFocus = false,
	onSectionChange,
	onSectionDelete,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: SectionCardProps) => {
	const [isCollapsed,   setIsCollapsed]   = useState(false);
	const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
	const [fieldDragIdx, setFieldDragIdx] = useState<number | null>(null);
	const [fieldDropIdx, setFieldDropIdx] = useState<number | null>(null);
	const addFieldBtnRef = useRef<HTMLButtonElement>(null);

	// ── Section title editing ──────────────────────────────────────────────
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const titleSnapshotRef                    = useRef('');
	const titleInputRef                       = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditingTitle) {
			titleInputRef.current?.focus();
			titleInputRef.current?.select();
		}
	}, [isEditingTitle]);

	// Start in edit mode when section is freshly added
	useEffect(() => {
		if (autoFocus) startEditingTitle();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const startEditingTitle = () => {
		titleSnapshotRef.current = section.title;
		setIsEditingTitle(true);
	};

	const commitTitle = () => {
		if (!section.title.trim()) {
			onSectionChange({ ...section, title: titleSnapshotRef.current });
		}
		setIsEditingTitle(false);
	};

	const cancelTitle = () => {
		onSectionChange({ ...section, title: titleSnapshotRef.current });
		setIsEditingTitle(false);
	};

	// ── Field type menu ────────────────────────────────────────────────────
	const toggleMenu = () => {
		if (menuAnchorRect) {
			setMenuAnchorRect(null);
			return;
		}
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
	const handleFieldDragOver  = (_e: React.DragEvent, fieldIdx: number) => setFieldDropIdx(fieldIdx);
	const handleFieldDragEnd   = () => { setFieldDragIdx(null); setFieldDropIdx(null); };

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
					: 'border-border/60 shadow-card',
			)}
		>
			{/* ── Section header ─────────────────────────────────────────── */}
			<div
				draggable
				onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
				onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
				onClick={() => setIsCollapsed((v) => !v)}
				className="flex cursor-pointer items-center border-b border-border/50 bg-white px-5 py-4 transition-colors hover:bg-muted/20"
			>
				{/* Left group (flex-1): grip + title */}
				<div className="flex flex-1 items-center gap-2">
					<span className="cursor-grab text-primary/30 transition-colors hover:text-primary/60 active:cursor-grabbing">
						<GripVertical className="size-4 shrink-0" />
					</span>

					{isEditingTitle ? (
						<div
						className="flex items-center gap-1.5"
						onClick={(e) => e.stopPropagation()}
						onBlur={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget as Node)) commitTitle();
						}}
					>
							<input
								ref={titleInputRef}
								type="text"
								value={section.title}
								onChange={(e) => onSectionChange({ ...section, title: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitTitle();
									if (e.key === 'Escape') cancelTitle();
								}}
								onMouseDown={(e) => e.stopPropagation()}
								className="section-title-input w-[260px] rounded-md border border-border/70 bg-transparent px-2 py-1 text-[15px] font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/10"
							/>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={commitTitle}
								className="shrink-0 text-success hover:bg-success/10 active:bg-success/15"
								aria-label={__('Confirm', 'all-feedback')}
							>
								<Check className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={cancelTitle}
								className="shrink-0"
								aria-label={__('Cancel', 'all-feedback')}
							>
								<X className="size-3.5" />
							</Button>
						</div>
					) : (
						<button
							type="button"
							className="section-title-btn group flex w-[260px] items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left text-[15px] font-semibold text-foreground transition-colors hover:border-border/50 hover:bg-black/[0.04]"
							onDoubleClick={(e) => { e.stopPropagation(); startEditingTitle(); }}
							title={__('Click the pencil or double-click to edit', 'all-feedback')}
							onClick={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
						>
							<span className="min-w-0 flex-1 truncate">{section.title}</span>
							<Pencil
								className="size-3 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
								onClick={(e) => { e.stopPropagation(); startEditingTitle(); }}
							/>
						</button>
					)}
				</div>

				{/* Right actions: collapse toggle + delete — stop propagation so header click doesn't double-fire */}
				<div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => setIsCollapsed((v) => !v)}
						aria-label={isCollapsed ? __('Expand section', 'all-feedback') : __('Collapse section', 'all-feedback')}
					>
						<ChevronDown className={cn('size-3.5 text-muted-foreground/50 transition-transform duration-200', isCollapsed && '-rotate-90')} />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onSectionDelete}
						className="shrink-0 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15"
						aria-label={__('Delete section', 'all-feedback')}
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* ── Section body ───────────────────────────────────────────── */}
			<div className={cn('p-5', isCollapsed && 'hidden')}>
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
					<Button ref={addFieldBtnRef} size="sm" variant="secondary" onClick={toggleMenu}>
						<Plus className="size-3.5" />
						{__('Add Field', 'all-feedback')}
					</Button>
				</div>
			</div>

			{menuAnchorRect && (
				<FieldTypeMenu anchorRect={menuAnchorRect} triggerRef={addFieldBtnRef} onSelect={addField} onClose={closeMenu} />
			)}
		</div>
	);
};

export default SectionCard;
