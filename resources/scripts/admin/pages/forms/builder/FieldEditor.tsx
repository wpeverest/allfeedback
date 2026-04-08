import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import HighlightExtension from '@tiptap/extension-highlight';
import UnderlineExtension from '@tiptap/extension-underline';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import {
	Bold as BoldIcon,
	ChevronDown,
	Code as CodeIcon,
	Copy,
	GripVertical,
	Highlighter as HighlighterIcon,
	Italic as ItalicIcon,
	Pencil,
	Plus,
	Strikethrough as StrikethroughIcon,
	Trash2,
	Underline as UnderlineIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
	fieldType: 'radio' | 'checkboxes';
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
	fieldType,
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
			'flex items-center gap-2 transition-opacity',
			isDragging && 'opacity-40',
		)}
	>
		{/* Drag handle */}
		<span className="cursor-grab text-muted-foreground/25 transition-colors hover:text-muted-foreground/60">
			<GripVertical className="size-3.5" />
		</span>

		{/* Dashed-border input — same visual language as QuestionEditor */}
		<div className={cn(
			'flex flex-1 items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 transition-colors',
			isDragOver && !isDragging
				? 'border-primary/50 bg-primary/[0.015]'
				: 'border-border/50 hover:border-border/80 hover:bg-muted/20 focus-within:border-primary/50 focus-within:bg-primary/[0.015]',
		)}>
			{/* Type indicator */}
			<span className={cn(
				'flex shrink-0 items-center justify-center border border-border/60 bg-white',
				fieldType === 'radio' ? 'size-3.5 rounded-full' : 'size-3.5 rounded-[3px]',
			)} />

			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={`Option ${index + 1}`}
				className="option-row-input flex-1 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
			/>
		</div>

		{/* Actions */}
		<div className="flex items-center gap-0.5">
			<button
				type="button"
				onClick={onDelete}
				className="flex size-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 className="size-3" />
			</button>
			<button
				type="button"
				onClick={onAddAfter}
				className="flex size-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
			>
				<Plus className="size-3" />
			</button>
		</div>
	</div>
);

/* ── Question rich-text editor (Tiptap) ────────────────────────────────── */
interface QuestionEditorProps {
	value: string;
	onChange: (html: string) => void;
	autoFocus?:    boolean;
	focusTrigger?: number;
}

const QuestionEditor = ({ value, onChange, autoFocus, focusTrigger }: QuestionEditorProps) => {
	const [isFocused, setIsFocused] = useState(false);
	const onChangeRef   = useRef(onChange);
	const didFocusRef   = useRef(false);
	onChangeRef.current = onChange;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading:        false,
				bulletList:     false,
				orderedList:    false,
				blockquote:     false,
				codeBlock:      false,
				horizontalRule: false,
			}),
			UnderlineExtension,
			HighlightExtension.configure({ multicolor: false }),
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

	/* Auto-focus when a new field is added */
	useEffect(() => {
		if (autoFocus && editor && !didFocusRef.current) {
			didFocusRef.current = true;
			editor.commands.focus('end');
		}
	}, [autoFocus, editor]);

	/* Focus triggered from the header title/pencil click */
	useEffect(() => {
		if (focusTrigger && editor) editor.commands.focus('end');
	}, [focusTrigger, editor]);

	type FormatMark = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight';

	const toggleFormat = (fmt: FormatMark) => {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (fmt === 'bold')      chain.toggleBold().run();
		if (fmt === 'italic')    chain.toggleItalic().run();
		if (fmt === 'underline') chain.toggleUnderline().run();
		if (fmt === 'strike')    chain.toggleStrike().run();
		if (fmt === 'code')      chain.toggleCode().run();
		if (fmt === 'highlight') chain.toggleHighlight().run();
	};

	const clearAllMarks = () => editor?.chain().focus().unsetAllMarks().run();

	/* Two groups separated by a divider */
	const TOOLBAR_GROUPS: { fmt: FormatMark; Icon: LucideIcon; title: string }[][] = [
		[
			{ fmt: 'bold',      Icon: BoldIcon,          title: __('Bold', 'all-feedback') },
			{ fmt: 'italic',    Icon: ItalicIcon,        title: __('Italic', 'all-feedback') },
			{ fmt: 'underline', Icon: UnderlineIcon,     title: __('Underline', 'all-feedback') },
			{ fmt: 'strike',    Icon: StrikethroughIcon, title: __('Strikethrough', 'all-feedback') },
		],
		[
			{ fmt: 'code',      Icon: CodeIcon,          title: __('Inline code', 'all-feedback') },
			{ fmt: 'highlight', Icon: HighlighterIcon,   title: __('Highlight', 'all-feedback') },
		],
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
				{TOOLBAR_GROUPS.map((group, gi) => (
					<>
						{gi > 0 && <span key={`sep-${gi}`} className="mx-1 h-3.5 w-px bg-border/70" />}
						{group.map(({ fmt, Icon, title }) => {
							const active = editor?.isActive(fmt) ?? false;
							return (
								<button
									key={fmt}
									type="button"
									title={title}
									onMouseDown={(e) => { e.preventDefault(); toggleFormat(fmt); }}
									className={cn(
										'flex size-[22px] items-center justify-center rounded transition-colors',
										active
											? 'bg-primary/10 text-primary'
											: 'text-muted-foreground/50 hover:bg-muted hover:text-foreground',
									)}
								>
									<Icon className="size-3.5" />
								</button>
							);
						})}
					</>
				))}

				{/* Separator + clear */}
				<span className="mx-1 h-3.5 w-px bg-border/70" />
				<button
					type="button"
					title={__('Clear formatting', 'all-feedback')}
					onMouseDown={(e) => { e.preventDefault(); clearAllMarks(); }}
					className="flex size-[22px] items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
				>
					<span className="text-[10px] font-bold leading-none">T<span className="text-[8px]">✕</span></span>
				</button>
			</div>

			{/* Tiptap editor — dashed border always visible to signal editability */}
			<div
				data-focused={isFocused}
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
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?:    boolean;
	focusTrigger?: number;
}) => (
	<div className="space-y-4">
		<QuestionEditor
			value={field.label}
			onChange={(html) => onChange({ ...field, label: html })}
			autoFocus={autoFocus}
			focusTrigger={focusTrigger}
		/>

		<div className="space-y-1.5">
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

/* ── Options config (radio + checkboxes) ───────────────────────────────── */
const OptionsConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?:    boolean;
	focusTrigger?: number;
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

	const fieldType = field.type as 'radio' | 'checkboxes';

	return (
		<div className="space-y-4">
			<QuestionEditor
				value={field.label}
				onChange={(html) => onChange({ ...field, label: html })}
				autoFocus={autoFocus}
				focusTrigger={focusTrigger}
			/>
			<div className="space-y-2">
				{options.map((opt, i) => (
					<OptionRow
						key={i}
						fieldType={fieldType}
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
				<button
					type="button"
					onClick={() => addOptionAfter(options.length - 1)}
					className="flex items-center gap-1.5 pl-[22px] text-[12.5px] text-muted-foreground/60 transition-colors hover:text-primary"
				>
					<Plus className="size-3.5" />
					{__('Add option', 'all-feedback')}
				</button>
			</div>
		</div>
	);
};

/* ── Default field config (rating, scale, nps, etc.) ──────────────────── */
const DefaultFieldConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?:    boolean;
	focusTrigger?: number;
}) => (
	<div className="space-y-4">
		<QuestionEditor
			value={field.label}
			onChange={(html) => onChange({ ...field, label: html })}
			autoFocus={autoFocus}
			focusTrigger={focusTrigger}
		/>
	</div>
);

/* ── FieldEditor card ──────────────────────────────────────────────────── */
export interface FieldEditorProps {
	field: FormField;
	index: number;
	isDragging: boolean;
	isDragOver: boolean;
	autoFocus?: boolean;
	onChange: (field: FormField) => void;
	onDelete: () => void;
	onDuplicate: () => void;
	onDragStart: (index: number) => void;
	onDragOver: (e: React.DragEvent, index: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, index: number) => void;
}

/* Strip HTML tags and decode basic entities to plain text */
const htmlToText = (html: string): string =>
	html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

const FieldEditor = ({
	field,
	index,
	isDragging,
	isDragOver,
	autoFocus,
	onChange,
	onDelete,
	onDuplicate,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: FieldEditorProps) => {
	const typeConfig   = FIELD_TYPES.find((t) => t.type === field.type);
	const [isCollapsed,   setIsCollapsed]   = useState(false);
	const [focusTrigger,  setFocusTrigger]  = useState(0);

	const renderConfig = () => {
		switch (field.type) {
			case 'short_text':
			case 'long_text':
				return <TextFieldConfig field={field} onChange={onChange} autoFocus={autoFocus} focusTrigger={focusTrigger} />;
			case 'radio':
			case 'checkboxes':
				return <OptionsConfig field={field} onChange={onChange} autoFocus={autoFocus} focusTrigger={focusTrigger} />;
			default:
				return <DefaultFieldConfig field={field} onChange={onChange} autoFocus={autoFocus} focusTrigger={focusTrigger} />;
		}
	};

	return (
		<div
			draggable
			onDragStart={(e) => {
				e.stopPropagation();
				const el = e.currentTarget as HTMLElement;
				const clone = el.cloneNode(true) as HTMLElement;
				Object.assign(clone.style, {
					position: 'fixed', top: '-9999px', left: '-9999px',
					width: `${el.offsetWidth}px`,
					transform: 'rotate(1.5deg) scale(1.02)',
					boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.08)',
					borderRadius: '12px', overflow: 'hidden', pointerEvents: 'none',
				});
				document.body.appendChild(clone);
				e.dataTransfer.setDragImage(clone, el.offsetWidth / 2, 32);
				requestAnimationFrame(() => document.body.removeChild(clone));
				onDragStart(index);
			}}
			onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); onDragOver(e, index); }}
			onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
			onDrop={(e) => { e.stopPropagation(); e.preventDefault(); onDrop(e, index); }}
			className={cn(
				'relative overflow-hidden rounded-xl border border-border/60 bg-white transition-all duration-150',
				isDragging && 'opacity-40 scale-[0.98]',
				isDragOver && !isDragging && 'border-t-[3px] border-t-primary bg-primary/[0.02]',
			)}
		>
			{/* ── Header bar — click to collapse ── */}
			<div
				className="flex cursor-pointer items-center gap-2 border-b border-border/50 bg-muted/25 px-4 py-2.5 transition-colors hover:bg-muted/40"
				onClick={() => setIsCollapsed((v) => !v)}
			>
				<span
					title={__('Drag to reorder', 'all-feedback')}
					className="cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground/70 active:cursor-grabbing"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<GripVertical className="size-4" />
				</span>

				{typeConfig && (
					<span title={typeConfig.label} className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
						<typeConfig.Icon className="size-4 text-muted-foreground/60" />
					</span>
				)}

				{/* Field title — click focuses the question editor */}
				<button
					type="button"
					className="group/title flex w-[180px] shrink-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border/50 hover:bg-black/[0.04]"
					onClick={(e) => {
						e.stopPropagation();
						setIsCollapsed(false);
						setFocusTrigger((v) => v + 1);
					}}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<span className="min-w-0 flex-1 truncate text-[12px] text-foreground/75">
						{htmlToText(field.label) || __('Untitled', 'all-feedback')}
					</span>
					<Pencil className="size-3 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover/title:opacity-100" />
				</button>

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
							title={__('Duplicate field', 'all-feedback')}
							aria-label={__('Duplicate field', 'all-feedback')}
						>
							<Copy className="size-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onDelete}
							className="hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15"
							title={__('Delete field', 'all-feedback')}
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
					<div className="space-y-3 px-5 py-4">
						{renderConfig()}
						<div className="pt-1">
							<RequiredCheckbox
								fieldId={field.id}
								value={field.required}
								onChange={(v) => onChange({ ...field, required: v })}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FieldEditor;
