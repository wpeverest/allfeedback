import { Tooltip } from '@/admin/components/Tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, htmlToText } from '@/lib/utils';
import HighlightExtension from '@tiptap/extension-highlight';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import UnderlineExtension from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { __ } from '@wordpress/i18n';
import type { LucideIcon } from 'lucide-react';
import {
	Quote as BlockquoteIcon,
	Bold as BoldIcon,
	List as BulletListIcon,
	ChevronDown,
	Code as CodeIcon,
	Copy,
	GripVertical,
	Highlighter as HighlighterIcon,
	Italic as ItalicIcon,
	ListOrdered as OrderedListIcon,
	Pencil,
	Plus,
	Strikethrough as StrikethroughIcon,
	Trash2,
	Underline as UnderlineIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FormField } from './types';

const RequiredSwitch = ({
	value,
	onChange,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
}) => (
	<button
		type="button"
		role="switch"
		aria-checked={value}
		onClick={() => onChange(!value)}
		className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-black/[0.04]"
	>
		<span className="text-base font-normal text-foreground/80 select-none">
			{__('Required', 'allfeedback')}
		</span>
		<span
			className={cn(
				'relative inline-flex h-[14px] w-6 shrink-0 items-center rounded-full transition-colors duration-200',
				value ? 'bg-primary' : 'bg-border',
			)}
		>
			<span
				className={cn(
					'inline-block size-[10px] rounded-full bg-white shadow-sm transition-transform duration-200',
					value ? 'translate-x-[11px]' : 'translate-x-[2px]',
				)}
			/>
		</span>
	</button>
);

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
		onDragStart={(e) => {
			e.stopPropagation();
			onDragStart(index);
		}}
		onDragOver={(e) => {
			e.stopPropagation();
			e.preventDefault();
			onDragOver(e, index);
		}}
		onDragEnd={(e) => {
			e.stopPropagation();
			onDragEnd();
		}}
		onDrop={(e) => {
			e.stopPropagation();
			e.preventDefault();
			onDrop(e, index);
		}}
		className={cn(
			'flex items-center gap-2 transition-opacity',
			isDragging && 'opacity-40',
		)}
	>
		<span className="text-muted-foreground/25 hover:text-muted-foreground/60 cursor-grab transition-colors">
			<GripVertical className="size-3.5" />
		</span>

		<div
			className={cn(
				'flex flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-150',
				isDragOver && !isDragging
					? 'border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]'
					: 'border-border/50 hover:border-border/80 hover:bg-muted/20 focus-within:border-primary/50 focus-within:bg-primary/[0.015] border-dashed',
			)}
		>
			<span
				className={cn(
					'border-border/60 flex shrink-0 items-center justify-center border bg-white',
					fieldType === 'radio'
						? 'size-3.5 rounded-full'
						: 'size-3.5 rounded-[3px]',
				)}
			/>

			<input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={`Option ${index + 1}`}
				className="option-row-input text-foreground/90 placeholder:text-muted-foreground/40 flex-1 text-base focus:outline-none"
			/>
		</div>

		<div className="flex items-center gap-0.5">
			<button
				type="button"
				onClick={onDelete}
				className="text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive flex size-6 items-center justify-center rounded transition-colors"
			>
				<Trash2 className="size-3" />
			</button>
			<button
				type="button"
				onClick={onAddAfter}
				className="text-muted-foreground/40 hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded transition-colors"
			>
				<Plus className="size-3" />
			</button>
		</div>
	</div>
);

interface QuestionEditorProps {
	value: string;
	onChange: (html: string) => void;
	autoFocus?: boolean;
	focusTrigger?: number;
}

const QuestionEditor = ({
	value,
	onChange,
	autoFocus,
	focusTrigger,
}: QuestionEditorProps) => {
	const [isFocused, setIsFocused] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const onChangeRef = useRef(onChange);
	const didFocusRef = useRef(false);
	onChangeRef.current = onChange;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
				codeBlock: false,
				horizontalRule: false,
			}),
			UnderlineExtension,
			HighlightExtension.configure({ multicolor: false }),
			PlaceholderExtension.configure({
				placeholder: __('Write a question…', 'allfeedback'),
			}),
		],
		content: value || '',
		onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
		onFocus: () => {
			setIsFocused(true);
			setIsOpen(true);
		},
		onBlur: () => setIsFocused(false),
	});

	useEffect(() => {
		if (editor && !editor.isFocused && value !== editor.getHTML()) {
			editor.commands.setContent(value || '', false);
		}
	}, [value, editor]);

	useEffect(() => {
		if (autoFocus && editor && !didFocusRef.current) {
			didFocusRef.current = true;
			editor.commands.focus('end');
		}
	}, [autoFocus, editor]);

	useEffect(() => {
		if (focusTrigger && editor) editor.commands.focus('end');
	}, [focusTrigger, editor]);

	type FormatMark =
		| 'bold'
		| 'italic'
		| 'underline'
		| 'strike'
		| 'code'
		| 'highlight'
		| 'bulletList'
		| 'orderedList'
		| 'blockquote';

	const toggleFormat = (fmt: FormatMark) => {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (fmt === 'bold') chain.toggleBold().run();
		if (fmt === 'italic') chain.toggleItalic().run();
		if (fmt === 'underline') chain.toggleUnderline().run();
		if (fmt === 'strike') chain.toggleStrike().run();
		if (fmt === 'code') chain.toggleCode().run();
		if (fmt === 'highlight') chain.toggleHighlight().run();
		if (fmt === 'bulletList') chain.toggleBulletList().run();
		if (fmt === 'orderedList') chain.toggleOrderedList().run();
		if (fmt === 'blockquote') chain.toggleBlockquote().run();
	};

	const clearAllMarks = () => editor?.chain().focus().unsetAllMarks().run();

	const TOOLBAR_GROUPS: {
		fmt: FormatMark;
		Icon: LucideIcon;
		title: string;
	}[][] = [
		[
			{ fmt: 'bold', Icon: BoldIcon, title: __('Bold', 'allfeedback') },
			{ fmt: 'italic', Icon: ItalicIcon, title: __('Italic', 'allfeedback') },
			{
				fmt: 'underline',
				Icon: UnderlineIcon,
				title: __('Underline', 'allfeedback'),
			},
			{
				fmt: 'strike',
				Icon: StrikethroughIcon,
				title: __('Strikethrough', 'allfeedback'),
			},
		],
		[
			{ fmt: 'code', Icon: CodeIcon, title: __('Inline code', 'allfeedback') },
			{
				fmt: 'highlight',
				Icon: HighlighterIcon,
				title: __('Highlight', 'allfeedback'),
			},
		],
		[
			{
				fmt: 'bulletList',
				Icon: BulletListIcon,
				title: __('Bullet list', 'allfeedback'),
			},
			{
				fmt: 'orderedList',
				Icon: OrderedListIcon,
				title: __('Ordered list', 'allfeedback'),
			},
			{
				fmt: 'blockquote',
				Icon: BlockquoteIcon,
				title: __('Blockquote', 'allfeedback'),
			},
		],
	];

	return (
		<div>
			<div
				className={cn(
					'mb-2 flex items-center gap-px overflow-hidden transition-all duration-150',
					isOpen
						? 'max-h-7 opacity-100'
						: 'pointer-events-none max-h-0 opacity-0',
				)}
			>
				{TOOLBAR_GROUPS.map((group, gi) => (
					<>
						{gi > 0 && (
							<span
								key={`sep-${gi}`}
								className="bg-border/70 mx-1 h-3.5 w-px"
							/>
						)}
						{group.map(({ fmt, Icon, title }) => {
							const active = editor?.isActive(fmt) ?? false;
							return (
								<Tooltip key={fmt} content={title}>
									<button
										type="button"
										onMouseDown={(e) => {
											e.preventDefault();
											toggleFormat(fmt);
										}}
										className={cn(
											'flex size-[22px] items-center justify-center rounded transition-colors',
											active
												? 'bg-primary/10 text-primary'
												: 'text-muted-foreground/50 hover:bg-muted hover:text-foreground',
										)}
									>
										<Icon className="size-3.5" />
									</button>
								</Tooltip>
							);
						})}
					</>
				))}

				<span className="bg-border/70 mx-1 h-3.5 w-px" />
				<Tooltip content={__('Clear formatting', 'allfeedback')}>
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							clearAllMarks();
						}}
						className="text-muted-foreground/50 hover:bg-muted hover:text-foreground flex size-[22px] items-center justify-center rounded transition-colors"
					>
						<span className="text-2xs leading-none font-bold">
							T<span className="text-2xs">✕</span>
						</span>
					</button>
				</Tooltip>

				<span className="bg-border/70 mx-1 h-3.5 w-px" />
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						editor?.commands.blur();
						setIsOpen(false);
					}}
					className="text-2xs text-muted-foreground/60 hover:bg-muted hover:text-foreground flex h-[22px] items-center justify-center rounded px-1.5 font-medium transition-colors"
				>
					{__('Close', 'allfeedback')}
				</button>
			</div>

			<div
				data-focused={isOpen}
				className={cn(
					'question-editor-field rounded-lg border border-dashed transition-colors',
					'[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4',
					'[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4',
					'[&_li]:my-0.5',
					'[&_blockquote]:border-border [&_blockquote]:text-foreground/80 [&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic',
					isOpen
						? 'border-primary/50 bg-primary/[0.015]'
						: 'border-border/50 hover:border-border/80 hover:bg-muted/20',
				)}
			>
				<EditorContent editor={editor} />
			</div>
		</div>
	);
};

const TextFieldConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
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
			<label className="text-foreground/90 block text-base font-normal">
				{__('Placeholder', 'allfeedback')}
			</label>
			<Input
				value={field.placeholder ?? ''}
				onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
				placeholder="e.g. Enter your answer…"
			/>
		</div>
	</div>
);

const OptionsConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
	focusTrigger?: number;
}) => {
	const options = field.options ?? ['Option 1', 'Option 2', 'Option 3'];
	const [optDragIdx, setOptDragIdx] = useState<number | null>(null);
	const [optDropIdx, setOptDropIdx] = useState<number | null>(null);

	const updateOptions = (next: string[]) =>
		onChange({ ...field, options: next });

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
			<div className="space-y-1.5">
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
						onDragStart={(idx) => setOptDragIdx(idx)}
						onDragOver={(e, idx) => { e.preventDefault(); setOptDropIdx(idx); }}
						onDragEnd={() => { setOptDragIdx(null); setOptDropIdx(null); }}
						onDrop={handleOptDrop}
					/>
				))}
			</div>
		</div>
	);
};

const StarRatingConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
	focusTrigger?: number;
}) => {
	const range = field.starRange ?? 5;
	const labelCls = 'block text-base font-normal text-foreground/90';
	const chipCls = (active: boolean) =>
		cn(
			'flex h-8 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors',
			active
				? 'border-primary bg-primary/10 text-primary'
				: 'border-border/60 text-muted-foreground/60 hover:border-primary/40 hover:text-primary/70',
		);

	return (
		<div className="space-y-4">
			<QuestionEditor
				value={field.label}
				onChange={(html) => onChange({ ...field, label: html })}
				autoFocus={autoFocus}
				focusTrigger={focusTrigger}
			/>

			<div className="flex items-center gap-3">
				<span className={labelCls}>{__('Range', 'allfeedback')}</span>
				<div className="flex gap-1">
					<button type="button" onClick={() => onChange({ ...field, starRange: 5 })} className={chipCls(range === 5)}>5</button>
					<button type="button" onClick={() => onChange({ ...field, starRange: 10 })} className={chipCls(range === 10)}>10</button>
				</div>
			</div>
		</div>
	);
};

const ScaleConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
	focusTrigger?: number;
}) => {
	const min = field.scaleMin ?? 0;
	const max = field.scaleMax ?? 10;

	return (
		<div className="space-y-4">
			<QuestionEditor
				value={field.label}
				onChange={(html) => onChange({ ...field, label: html })}
				autoFocus={autoFocus}
				focusTrigger={focusTrigger}
			/>
			<div className="space-y-2">
				<label className="block text-base font-normal text-foreground/90">{__('Scale endpoints', 'allfeedback')}</label>
				<div className="flex items-center gap-2">
					<Input type="number" value={min} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0 && v < max) onChange({ ...field, scaleMin: v }); }} className="!w-16 text-center" />
					<Input value={field.scaleLowLabel ?? ''} onChange={(e) => onChange({ ...field, scaleLowLabel: e.target.value })} placeholder={__('e.g. Not likely', 'allfeedback')} />
					<span className="text-muted-foreground/40 shrink-0">—</span>
					<Input value={field.scaleHighLabel ?? ''} onChange={(e) => onChange({ ...field, scaleHighLabel: e.target.value })} placeholder={__('e.g. Very likely', 'allfeedback')} />
					<Input type="number" value={max} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > min) onChange({ ...field, scaleMax: v }); }} className="!w-16 text-center" />
				</div>
			</div>
		</div>
	);
};
const NpsConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
	focusTrigger?: number;
}) => (
	<div className="space-y-4">
		<QuestionEditor
			value={field.label}
			onChange={(html) => onChange({ ...field, label: html })}
			autoFocus={autoFocus}
			focusTrigger={focusTrigger}
		/>
		<p className="text-muted-foreground/60 text-sm">
			{__('0–6 detractors · 7–8 passives · 9–10 promoters', 'allfeedback')}
		</p>
	</div>
);

const DefaultFieldConfig = ({
	field,
	onChange,
	autoFocus,
	focusTrigger,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
	autoFocus?: boolean;
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
	const typeConfig = FIELD_TYPES.find((t) => t.type === field.type);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [focusTrigger, setFocusTrigger] = useState(0);

	const renderConfig = () => {
		switch (field.type) {
			case 'short_text':
			case 'long_text':
				return (
					<TextFieldConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
			case 'radio':
			case 'checkboxes':
				return (
					<OptionsConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
			case 'star_rating':
				return (
					<StarRatingConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
			case 'scale':
				return (
					<ScaleConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
			case 'nps':
				return (
					<NpsConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
			default:
				return (
					<DefaultFieldConfig
						field={field}
						onChange={onChange}
						autoFocus={autoFocus}
						focusTrigger={focusTrigger}
					/>
				);
		}
	};

	const cardRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={cardRef}
			onDragOver={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onDragOver(e, index);
			}}
			onDrop={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onDrop(e, index);
			}}
			className={cn(
				'relative rounded-xl border bg-white transition-all duration-150',
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
						transform: 'rotate(1.5deg) scale(1.02)',
						boxShadow:
							'0 20px 40px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.08)',
						borderRadius: '12px',
						overflow: 'hidden',
						pointerEvents: 'none',
					});
					document.body.appendChild(clone);
					e.dataTransfer.setDragImage(clone, el.offsetWidth / 2, 32);
					requestAnimationFrame(() => document.body.removeChild(clone));
					onDragStart(index);
				}}
				onDragEnd={(e) => {
					e.stopPropagation();
					onDragEnd();
				}}
				className="border-border/50 bg-muted/20 hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-t-xl border-b px-4 py-3 transition-colors"
				onClick={() => setIsCollapsed((v) => !v)}
			>
				<Tooltip content={__('Drag to reorder', 'allfeedback')}>
					<span
						className="text-muted-foreground/40 hover:text-foreground/80 cursor-grab transition-colors active:cursor-grabbing"
						onClick={(e) => e.stopPropagation()}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<GripVertical className="size-4" />
					</span>
				</Tooltip>

				{typeConfig && (
					<Tooltip content={typeConfig.label}>
						<span
							className="flex shrink-0 items-center"
							onClick={(e) => e.stopPropagation()}
						>
							<typeConfig.Icon className="text-muted-foreground/60 size-4" />
						</span>
					</Tooltip>
				)}

				<button
					type="button"
					className="group/title hover:border-border/50 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:bg-black/[0.04]"
					onClick={(e) => {
						e.stopPropagation();
						setIsCollapsed(false);
						setFocusTrigger((v) => v + 1);
					}}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<span className="text-foreground/90 min-w-0 flex-1 truncate text-base font-medium">
						{htmlToText(field.label) || __('Untitled', 'allfeedback')}
					</span>
					<Pencil className="text-muted-foreground/40 size-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100" />
				</button>

				<div className="ml-auto flex items-center gap-1">
					<div
						onClick={(e) => e.stopPropagation()}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<RequiredSwitch
							value={field.required}
							onChange={(v) => onChange({ ...field, required: v })}
						/>
					</div>

					<span className="flex size-6 items-center justify-center rounded transition-colors hover:bg-black/[0.06]">
						<ChevronDown
							className={cn(
								'size-3.5 transition-transform duration-200',
								isCollapsed && '-rotate-90',
							)}
						/>
					</span>

					<div
						className="flex items-center gap-0.5"
						onClick={(e) => e.stopPropagation()}
					>
						<Tooltip content={__('Duplicate field', 'allfeedback')}>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={onDuplicate}
								aria-label={__('Duplicate field', 'allfeedback')}
							>
								<Copy className="size-3" />
							</Button>
						</Tooltip>
						<Tooltip content={__('Delete field', 'allfeedback')}>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={onDelete}
								className="hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15"
								aria-label={__('Delete field', 'allfeedback')}
							>
								<Trash2 className="size-3" />
							</Button>
						</Tooltip>
					</div>
				</div>
			</div>

			<div
				className={cn(
					'grid transition-[grid-template-rows] duration-200 ease-in-out',
					isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
				)}
			>
				<div className="overflow-hidden">
					<div className="space-y-3 px-5 py-4">{renderConfig()}</div>
				</div>
			</div>
		</div>
	);
};

export default FieldEditor;
