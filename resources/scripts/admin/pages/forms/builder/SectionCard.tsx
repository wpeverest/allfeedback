import { Tooltip } from '@/admin/components/Tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import {
	Check,
	ChevronDown,
	Copy,
	GripVertical,
	Pencil,
	Plus,
	Trash2,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import FieldEditor from './FieldEditor';
import FieldTypeMenu from './FieldTypeMenu';
import { FIELD_TYPES } from './fieldTypes';
import type { FieldType, FormField, FormSection } from './types';

interface FieldPos {
	sectionIdx: number;
	fieldIdx: number;
}

interface SectionCardProps {
	section: FormSection;
	index: number;
	sectionCount: number;
	isDragging: boolean;
	isDragOver: boolean;
	autoFocus?: boolean;
	fieldDrag: FieldPos | null;
	fieldDrop: FieldPos | null;
	onSectionChange: (section: FormSection) => void;
	onSectionDelete: () => void;
	onSectionDuplicate: () => void;
	onSectionFocus?: () => void;
	onDragStart: (index: number) => void;
	onDragOver: (e: React.DragEvent, index: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, index: number) => void;
	onFieldDragStart: (sectionIdx: number, fieldIdx: number) => void;
	onFieldDragOver: (sectionIdx: number, fieldIdx: number) => void;
	onFieldDragLeave: () => void;
	onFieldDragEnd: () => void;
	onFieldDrop: (sectionIdx: number, fieldIdx: number) => void;
}

const SectionCard = ({
	section,
	index,
	isDragging,
	isDragOver,
	autoFocus = false,
	fieldDrag,
	fieldDrop,
	onSectionChange,
	onSectionDelete,
	onSectionDuplicate,
	onSectionFocus,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
	onFieldDragStart,
	onFieldDragOver,
	onFieldDragLeave,
	onFieldDragEnd,
	onFieldDrop,
}: SectionCardProps) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [newFieldId, setNewFieldId] = useState<string | null>(null);
	const addFieldBtnRef = useRef<HTMLButtonElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const titleSnapshotRef = useRef('');
	const titleInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditingTitle) {
			titleInputRef.current?.focus();
			titleInputRef.current?.select();
		}
	}, [isEditingTitle]);

	useEffect(() => {
		if (autoFocus) startEditingTitle();
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
		if (section.title !== titleSnapshotRef.current) {
			onSectionChange({ ...section, title: titleSnapshotRef.current });
		}
		setIsEditingTitle(false);
	};

	const toggleMenu = () => setMenuOpen((v) => !v);
	const closeMenu = () => setMenuOpen(false);

	const addField = useCallback(
		(type: FieldType) => {
			const typeConfig = FIELD_TYPES.find((t) => t.type === type)!;
			const id = `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
			const newField: FormField = {
				id,
				type,
				label: typeConfig.defaultLabel,
				required: false,
				...(type === 'radio' || type === 'checkboxes'
					? { options: ['Option 1', 'Option 2', 'Option 3'] }
					: {}),
				...(type === 'short_text' || type === 'long_text'
					? { placeholder: '' }
					: {}),
			};
			onSectionChange({ ...section, fields: [...section.fields, newField] });
			setNewFieldId(id);
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

	return (
		<div
			ref={cardRef}
			onPointerDown={() => onSectionFocus?.()}
			onDragOver={(e) => {
				e.preventDefault();
				onDragOver(e, index);
			}}
			onDrop={(e) => {
				e.preventDefault();
				onDrop(e, index);
			}}
			className={cn(
				'overflow-hidden rounded-2xl border bg-white transition-all duration-150',
				isDragging && 'scale-[0.98] opacity-40',
				isDragOver && !isDragging
					? 'border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]'
					: 'border-border/60',
			)}
		>
			<div
				draggable
				onDragStart={(e) => {
					e.stopPropagation();
					const el = cardRef.current ?? (e.currentTarget as HTMLElement);
					const clone = el.cloneNode(true) as HTMLElement;
					Object.assign(clone.style, {
						position: 'fixed',
						top: '-9999px',
						left: '-9999px',
						width: `${el.offsetWidth}px`,
						transform: 'rotate(1deg) scale(1.01)',
						boxShadow:
							'0 20px 40px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.08)',
						borderRadius: '16px',
						overflow: 'hidden',
						pointerEvents: 'none',
					});
					document.body.appendChild(clone);
					e.dataTransfer.setDragImage(clone, el.offsetWidth / 2, 40);
					requestAnimationFrame(() => document.body.removeChild(clone));
					onDragStart(index);
				}}
				onDragEnd={(e) => {
					e.stopPropagation();
					onDragEnd();
				}}
				onClick={() => setIsCollapsed((v) => !v)}
				className="border-border/50 hover:bg-muted/20 flex cursor-pointer items-center border-b bg-white px-5 py-3.5 transition-colors"
			>
				<div className="flex flex-1 items-center gap-2">
					<Tooltip content={__('Drag to reorder', 'allfeedback')}>
						<span className="text-muted-foreground/40 hover:text-muted-foreground/70 cursor-grab transition-colors active:cursor-grabbing">
							<GripVertical className="size-4 shrink-0" />
						</span>
					</Tooltip>

					{isEditingTitle ? (
						<div
							className="flex items-center gap-1.5"
							onClick={(e) => e.stopPropagation()}
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node))
									commitTitle();
							}}
						>
							<Input
								ref={titleInputRef}
								type="text"
								value={section.title}
								onChange={(e) =>
									onSectionChange({ ...section, title: e.target.value })
								}
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitTitle();
									if (e.key === 'Escape') cancelTitle();
								}}
								onMouseDown={(e) => e.stopPropagation()}
								className="section-title-input w-[260px] bg-transparent font-semibold"
							/>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={commitTitle}
								className="text-success hover:bg-success/10 active:bg-success/15 shrink-0"
								aria-label={__('Confirm', 'allfeedback')}
							>
								<Check className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={cancelTitle}
								className="shrink-0"
								aria-label={__('Cancel', 'allfeedback')}
							>
								<X className="size-3.5" />
							</Button>
						</div>
					) : (
						<Tooltip content={__('Click to edit', 'allfeedback')}>
							<button
								type="button"
								className="section-title-btn group text-base text-foreground/90 hover:border-border/50 flex w-[260px] items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left font-semibold transition-colors hover:bg-black/[0.04]"
								onClick={(e) => {
									e.stopPropagation();
									startEditingTitle();
								}}
								onMouseDown={(e) => e.stopPropagation()}
							>
								<span className="min-w-0 flex-1 truncate px-[2px] py-[4.5px]">
									{section.title}
								</span>
								<Pencil className="text-muted-foreground/40 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
							</button>
						</Tooltip>
					)}
				</div>

				<div
					className="flex items-center gap-0.5"
					onClick={(e) => e.stopPropagation()}
				>
					<Tooltip
						content={
							isCollapsed
								? __('Expand section', 'allfeedback')
								: __('Collapse section', 'allfeedback')
						}
					>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={() => setIsCollapsed((v) => !v)}
							aria-label={
								isCollapsed
									? __('Expand section', 'allfeedback')
									: __('Collapse section', 'allfeedback')
							}
						>
							<ChevronDown
								className={cn(
									'size-3.5 transition-transform duration-200',
									isCollapsed && '-rotate-90',
								)}
							/>
						</Button>
					</Tooltip>
					<Tooltip content={__('Duplicate section', 'allfeedback')}>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onSectionDuplicate}
							aria-label={__('Duplicate section', 'allfeedback')}
						>
							<Copy className="size-3.5" />
						</Button>
					</Tooltip>
					<Tooltip content={__('Delete section', 'allfeedback')}>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onSectionDelete}
							className="hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15 shrink-0"
							aria-label={__('Delete section', 'allfeedback')}
						>
							<Trash2 className="size-3.5" />
						</Button>
					</Tooltip>
				</div>
			</div>

			<div
				className={cn(
					'grid transition-[grid-template-rows] duration-200 ease-in-out',
					isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
				)}
			>
				<div className="overflow-hidden">
					<div className="bg-white p-5">
						{section.fields.length > 0 && (
							<div
								className="mb-3 space-y-4"
								onDragOver={(e) => e.stopPropagation()}
								onDragLeave={(e) => {
									if (!e.currentTarget.contains(e.relatedTarget as Node)) {
										onFieldDragLeave();
									}
								}}
							>
								{section.fields.map((field, fieldIdx) => (
									<FieldEditor
										key={field.id}
										field={field}
										index={fieldIdx}
										isDragging={
											fieldDrag?.sectionIdx === index &&
											fieldDrag?.fieldIdx === fieldIdx
										}
										isDragOver={
											fieldDrop?.sectionIdx === index &&
											fieldDrop?.fieldIdx === fieldIdx &&
											!(
												fieldDrag?.sectionIdx === index &&
												fieldDrag?.fieldIdx === fieldIdx
											)
										}
										autoFocus={newFieldId === field.id}
										onChange={(f) => handleFieldChange(fieldIdx, f)}
										onDelete={() => deleteField(fieldIdx)}
										onDuplicate={() => duplicateField(fieldIdx)}
										onDragStart={() => onFieldDragStart(index, fieldIdx)}
										onDragOver={(_e, _i) => onFieldDragOver(index, fieldIdx)}
										onDragEnd={onFieldDragEnd}
										onDrop={(_e, _i) => onFieldDrop(index, fieldIdx)}
									/>
								))}
							</div>
						)}

						<div className="flex">
							<Button
								ref={addFieldBtnRef}
								size="sm"
								variant="ghost"
								onMouseDown={(e) => e.preventDefault()}
								onClick={toggleMenu}
								className={cn(menuOpen && 'bg-muted/60 text-foreground')}
							>
								{menuOpen ? (
									<>
										<X className="size-3.5" />
										{__('Close', 'allfeedback')}
									</>
								) : (
									<>
										<Plus className="size-3.5" />
										{__('Add Field', 'allfeedback')}
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>

			{menuOpen && (
				<FieldTypeMenu
					triggerRef={addFieldBtnRef}
					onSelect={addField}
					onClose={closeMenu}
				/>
			)}
		</div>
	);
};

export default SectionCard;
