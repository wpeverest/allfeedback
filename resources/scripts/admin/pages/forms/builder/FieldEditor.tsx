import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FormField } from './types';

/* ── Required checkbox ─────────────────────────────────────────────────── */
interface RequiredCheckboxProps {
	fieldId: string;
	value: boolean;
	onChange: (v: boolean) => void;
}

const RequiredCheckbox = ({ fieldId, value, onChange }: RequiredCheckboxProps) => (
	<div className="flex items-center gap-2">
		<input
			type="checkbox"
			id={`required-${fieldId}`}
			checked={value}
			onChange={(e) => onChange(e.target.checked)}
			className="field-required-checkbox"
		/>
		<label
			htmlFor={`required-${fieldId}`}
			className="cursor-pointer select-none text-[12px] font-medium text-muted-foreground"
		>
			{__('Required', 'all-feedback')}
		</label>
	</div>
);

/* ── Option row (multi-select / checkboxes) ────────────────────────────── */
interface OptionRowProps {
	value: string;
	index: number;
	isDragging: boolean;
	isDragOver: boolean;
	onChange: (value: string) => void;
	onDelete: () => void;
	onAddAfter: () => void;
	onDragStart: (i: number) => void;
	onDragOver: (e: React.DragEvent, i: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, i: number) => void;
}

const OptionRow = ({
	value,
	index,
	isDragging,
	isDragOver,
	onChange,
	onDelete,
	onAddAfter,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: OptionRowProps) => (
	<div
		draggable
		onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
		onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); onDragOver(e, index); }}
		onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
		onDrop={(e) => { e.stopPropagation(); e.preventDefault(); onDrop(e, index); }}
		className={cn(
			'flex items-center border-b border-border/60 last:border-0 transition-colors',
			isDragging && 'opacity-40',
			isDragOver && !isDragging && 'bg-primary/[0.03]',
		)}
	>
		<span className="cursor-grab px-2.5 text-muted-foreground/30 hover:text-muted-foreground/60">
			<GripVertical className="size-4" />
		</span>
		<input
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={`Option ${index + 1}`}
			className="flex-1 border-0 bg-transparent py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/45 focus:outline-none"
		/>
		<div className="flex items-stretch border-l border-border/60">
			<button
				type="button"
				onClick={onDelete}
				className="flex items-center justify-center px-3 py-2 text-muted-foreground/40 transition-colors hover:bg-destructive/5 hover:text-destructive"
			>
				<Trash2 className="size-3.5" />
			</button>
			<div className="w-px self-stretch bg-border/60" />
			<button
				type="button"
				onClick={onAddAfter}
				className="flex items-center justify-center px-3 py-2 text-muted-foreground/40 transition-colors hover:bg-muted/60 hover:text-foreground"
			>
				<Plus className="size-3.5" />
			</button>
		</div>
	</div>
);

/* ── Question rich-text editor (Tiptap) ────────────────────────────────── */
interface QuestionEditorProps {
	value: string;
	onChange: (html: string) => void;
}

const QuestionEditor = ({ value, onChange }: QuestionEditorProps) => {
	const [isFocused, setIsFocused] = useState(false);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading:        false,
				bulletList:     false,
				orderedList:    false,
				blockquote:     false,
				code:           false,
				codeBlock:      false,
				horizontalRule: false,
			}),
			UnderlineExtension,
			PlaceholderExtension.configure({
				placeholder: __('Write a question…', 'all-feedback'),
			}),
		],
		content:  value || '',
		onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
		onFocus:  () => setIsFocused(true),
		onBlur:   () => setIsFocused(false),
	});

	/* Sync external value changes (e.g. undo/redo from parent) */
	useEffect(() => {
		if (editor && !editor.isFocused && value !== editor.getHTML()) {
			editor.commands.setContent(value || '', false);
		}
	}, [value, editor]);

	type FormatMark = 'bold' | 'italic' | 'underline' | 'strike';

	const toggleFormat = (fmt: FormatMark) => {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (fmt === 'bold')      chain.toggleBold().run();
		if (fmt === 'italic')    chain.toggleItalic().run();
		if (fmt === 'underline') chain.toggleUnderline().run();
		if (fmt === 'strike')    chain.toggleStrike().run();
	};

	const clearAllMarks = () => editor?.chain().focus().unsetAllMarks().run();

	const TOOLBAR_MARKS: { fmt: FormatMark; label: string; className?: string }[] = [
		{ fmt: 'bold',      label: 'B',  className: 'font-bold' },
		{ fmt: 'italic',    label: 'I',  className: 'italic' },
		{ fmt: 'underline', label: 'U',  className: 'underline underline-offset-[2px]' },
		{ fmt: 'strike',    label: 'S',  className: 'line-through' },
	];

	return (
		<div>
			{/* Format toolbar — slides in when editor is focused */}
			<div
				className={cn(
					'mb-2 flex items-center gap-px overflow-hidden transition-all duration-150',
					isFocused ? 'max-h-7 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
				)}
			>
				{TOOLBAR_MARKS.map(({ fmt, label, className }) => {
					const active = editor?.isActive(fmt) ?? false;
					return (
						<button
							key={fmt}
							type="button"
							title={fmt.charAt(0).toUpperCase() + fmt.slice(1)}
							onMouseDown={(e) => { e.preventDefault(); toggleFormat(fmt); }}
							className={cn(
								'flex size-[22px] items-center justify-center rounded text-[11.5px] leading-none transition-colors',
								className,
								active
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground/50 hover:bg-muted hover:text-foreground',
							)}
						>
							{label}
						</button>
					);
				})}

				{/* Separator */}
				<span className="mx-1 h-3.5 w-px bg-border/70" />

				{/* Clear formatting */}
				<button
					type="button"
					title={__('Clear formatting', 'all-feedback')}
					onMouseDown={(e) => { e.preventDefault(); clearAllMarks(); }}
					className="flex size-[22px] items-center justify-center rounded text-[9px] font-bold leading-none text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
				>
					T<span className="text-[7px]">✕</span>
				</button>
			</div>

			{/* Tiptap editor — dashed border always visible to signal editability */}
			<div
				className={cn(
					'question-editor-field rounded-lg border border-dashed transition-colors',
					isFocused
						? 'border-primary/50 bg-primary/[0.015]'
						: 'border-border/50 hover:border-border/80 hover:bg-muted/20',
				)}
			>
				<EditorContent editor={editor} />
			</div>
		</div>
	);
};

/* ── Text field config (short_text / long_text) ────────────────────────── */
const TextFieldConfig = ({
	field,
	onChange,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
}) => (
	<div className="space-y-4">
		<QuestionEditor
			value={field.label}
			onChange={(html) => onChange({ ...field, label: html })}
		/>

		<div className="space-y-1.5 border-t border-border/40 pt-4">
			<label className="block text-[11.5px] font-medium text-muted-foreground/70">
				{__('Placeholder', 'all-feedback')}
			</label>
			<input
				value={field.placeholder ?? ''}
				onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
				placeholder="e.g. Enter your answer…"
				className="w-full rounded-lg border border-border/70 bg-transparent px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10"
			/>
		</div>
	</div>
);

/* ── Multi-select config ───────────────────────────────────────────────── */
const MultiSelectConfig = ({
	field,
	onChange,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
}) => {
	const options = field.options ?? ['Option 1', 'Option 2', 'Option 3'];
	const [optDragIdx, setOptDragIdx] = useState<number | null>(null);
	const [optDropIdx, setOptDropIdx] = useState<number | null>(null);

	const updateOptions = (next: string[]) => onChange({ ...field, options: next });

	const updateOption = (i: number, val: string) => {
		const next = [...options];
		next[i] = val;
		updateOptions(next);
	};

	const addOptionAfter = (i: number) => {
		const next = [...options];
		next.splice(i + 1, 0, '');
		updateOptions(next);
	};

	const removeOption = (i: number) => {
		if (options.length <= 1) return;
		updateOptions(options.filter((_, idx) => idx !== i));
	};

	const handleOptDrop = (_e: React.DragEvent, targetIdx: number) => {
		if (optDragIdx === null || optDragIdx === targetIdx) {
			setOptDragIdx(null);
			setOptDropIdx(null);
			return;
		}
		const next = [...options];
		const [removed] = next.splice(optDragIdx, 1);
		next.splice(targetIdx, 0, removed);
		updateOptions(next);
		setOptDragIdx(null);
		setOptDropIdx(null);
	};

	return (
		<div className="space-y-4">
			<QuestionEditor
				value={field.label}
				onChange={(html) => onChange({ ...field, label: html })}
			/>
			<div className="overflow-hidden rounded-xl border border-border/70">
				{options.map((opt, i) => (
					<OptionRow
						key={i}
						value={opt}
						index={i}
						isDragging={optDragIdx === i}
						isDragOver={optDropIdx === i && optDragIdx !== i}
						onChange={(v) => updateOption(i, v)}
						onDelete={() => removeOption(i)}
						onAddAfter={() => addOptionAfter(i)}
						onDragStart={setOptDragIdx}
						onDragOver={(_e, idx) => setOptDropIdx(idx)}
						onDragEnd={() => { setOptDragIdx(null); setOptDropIdx(null); }}
						onDrop={handleOptDrop}
					/>
				))}
			</div>
		</div>
	);
};

/* ── Default field config (rating, scale, nps, etc.) ──────────────────── */
const DefaultFieldConfig = ({
	field,
	onChange,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
}) => (
	<div className="space-y-4">
		<QuestionEditor
			value={field.label}
			onChange={(html) => onChange({ ...field, label: html })}
		/>
	</div>
);

/* ── FieldEditor card ──────────────────────────────────────────────────── */
export interface FieldEditorProps {
	field: FormField;
	index: number;
	isDragging: boolean;
	isDragOver: boolean;
	onChange: (field: FormField) => void;
	onDelete: () => void;
	onDuplicate: () => void;
	onDragStart: (index: number) => void;
	onDragOver: (e: React.DragEvent, index: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, index: number) => void;
}

const FieldEditor = ({
	field,
	index,
	isDragging,
	isDragOver,
	onChange,
	onDelete,
	onDuplicate,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: FieldEditorProps) => {
	const typeConfig   = FIELD_TYPES.find((t) => t.type === field.type);
	const [isCollapsed, setIsCollapsed] = useState(false);

	const renderConfig = () => {
		switch (field.type) {
			case 'short_text':
			case 'long_text':
				return <TextFieldConfig field={field} onChange={onChange} />;
			case 'multi_select':
				return <MultiSelectConfig field={field} onChange={onChange} />;
			default:
				return <DefaultFieldConfig field={field} onChange={onChange} />;
		}
	};

	return (
		<div
			draggable
			onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
			onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); onDragOver(e, index); }}
			onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
			onDrop={(e) => { e.stopPropagation(); e.preventDefault(); onDrop(e, index); }}
			className={cn(
				'group relative overflow-hidden rounded-xl border border-border/60 bg-white transition-all',
				isDragging && 'opacity-40 scale-[0.99]',
				isDragOver && !isDragging && 'border-primary/40 ring-1 ring-primary/15',
			)}
		>
			{/* ── Header bar — click to collapse ── */}
			<div
				className="flex cursor-pointer items-center gap-2 border-b border-border/50 bg-muted/25 px-4 py-2.5 transition-colors hover:bg-muted/40"
				onClick={() => setIsCollapsed((v) => !v)}
			>
				<span
					className="cursor-grab text-muted-foreground/25 hover:text-muted-foreground/60"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<GripVertical className="size-4" />
				</span>

				{typeConfig && (
					<span className="field-type-icon size-[22px]" data-type={field.type}>
						<typeConfig.Icon className="size-3" />
					</span>
				)}

				<span className="text-[11.5px] font-medium text-muted-foreground">
					{typeConfig?.label}
				</span>

				<div className="ml-auto flex items-center gap-1">
					{/* Chevron — always visible */}
					<ChevronDown className={cn(
						'size-3.5 transition-transform duration-200',
						isCollapsed && '-rotate-90',
					)} />

					{/* Copy / delete — always visible */}
					<div
						className="flex items-center gap-0.5"
						onClick={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onDuplicate}
							aria-label={__('Duplicate field', 'all-feedback')}
						>
							<Copy className="size-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onDelete}
							className="hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15"
							aria-label={__('Delete field', 'all-feedback')}
						>
							<Trash2 className="size-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* ── Collapsible body ── */}
			<div className={cn(
				'grid transition-[grid-template-rows] duration-200 ease-in-out',
				isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
			)}>
				<div className="overflow-hidden">
					{/* Field config */}
					<div className="px-5 py-4">
						{renderConfig()}
					</div>

					{/* Footer: field properties */}
					<div className="flex items-center border-t border-border/40 bg-muted/20 px-4 py-2.5">
						<RequiredCheckbox
							fieldId={field.id}
							value={field.required}
							onChange={(v) => onChange({ ...field, required: v })}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FieldEditor;
