import { cn } from '@/lib/utils';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FIELD_TYPES } from './fieldTypes';
import type { FormField } from './types';

interface RequiredToggleProps {
	value: boolean;
	onChange: (v: boolean) => void;
}

const RequiredToggle = ({ value, onChange }: RequiredToggleProps) => (
	<div className="flex items-center justify-between">
		<span className="text-[12px] font-medium text-muted-foreground">Required</span>
		<button
			type="button"
			role="switch"
			aria-checked={value}
			onClick={() => onChange(!value)}
			className={cn(
				'relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none',
				value ? 'bg-primary' : 'bg-border',
			)}
		>
			<span
				className={cn(
					'absolute top-[2px] inline-block size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform',
					value ? 'translate-x-[14px]' : 'translate-x-[2px]',
				)}
			/>
		</button>
	</div>
);

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

const TextFieldConfig = ({
	field,
	onChange,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
}) => (
	<div className="space-y-3">
		<input
			value={field.label}
			onChange={(e) => onChange({ ...field, label: e.target.value })}
			placeholder="Question"
			className="w-full border-b border-transparent bg-transparent px-1.5 py-1 text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/45 transition-colors hover:border-border/60 focus:border-primary/60 focus:outline-none"
		/>
		<input
			value={field.placeholder ?? ''}
			onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
			placeholder="Placeholder text (optional)"
			className="w-full rounded-lg border border-border/70 bg-transparent px-3 py-2 text-[12.5px] text-muted-foreground placeholder:text-muted-foreground/45 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10"
		/>
		<RequiredToggle value={field.required} onChange={(v) => onChange({ ...field, required: v })} />
	</div>
);

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
		<div className="space-y-3">
			<input
				value={field.label}
				onChange={(e) => onChange({ ...field, label: e.target.value })}
				placeholder="Question"
				className="w-full border-b border-transparent bg-transparent px-1.5 py-1 text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/45 transition-colors hover:border-border/60 focus:border-primary/60 focus:outline-none"
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
			<RequiredToggle value={field.required} onChange={(v) => onChange({ ...field, required: v })} />
		</div>
	);
};

const DefaultFieldConfig = ({
	field,
	onChange,
}: {
	field: FormField;
	onChange: (f: FormField) => void;
}) => (
	<div className="space-y-3">
		<input
			value={field.label}
			onChange={(e) => onChange({ ...field, label: e.target.value })}
			placeholder="Question"
			className="w-full border-b border-transparent bg-transparent px-1.5 py-1 text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/45 transition-colors hover:border-border/60 focus:border-primary/60 focus:outline-none"
		/>
		<RequiredToggle value={field.required} onChange={(v) => onChange({ ...field, required: v })} />
	</div>
);

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
	const typeConfig = FIELD_TYPES.find((t) => t.type === field.type);

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
				'group relative cursor-pointer rounded-xl border border-border/60 bg-background p-5 transition-all',
				isDragging && 'opacity-40 scale-[0.99]',
				isDragOver && !isDragging && 'border-primary/40 ring-1 ring-primary/15',
			)}
		>
			<div className="mb-3 flex items-center gap-2">
				<span className="cursor-grab text-muted-foreground/25 hover:text-muted-foreground/60">
					<GripVertical className="size-4" />
				</span>
				{typeConfig && (
					<span
						className="flex size-6 shrink-0 items-center justify-center rounded-md"
						style={{ backgroundColor: typeConfig.iconBg }}
					>
						<typeConfig.Icon className="size-3.5" style={{ color: typeConfig.iconColor }} />
					</span>
				)}
				<span className="text-[11.5px] font-medium text-muted-foreground">
					{typeConfig?.label}
				</span>
				<div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
						className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
					>
						<Copy className="size-3" />
					</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); onDelete(); }}
						className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
					>
						<Trash2 className="size-3" />
					</button>
				</div>
			</div>

			{renderConfig()}
		</div>
	);
};

export default FieldEditor;
