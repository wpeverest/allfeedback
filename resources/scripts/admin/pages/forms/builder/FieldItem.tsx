import { cn } from '@/lib/utils';
import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { FIELD_TYPES } from './fieldTypes';
import type { FormField } from './types';

interface FieldItemProps {
	field: FormField;
	index: number;
	isDragging: boolean;
	isDragOver: boolean;
	onDragStart: (index: number) => void;
	onDragOver: (e: React.DragEvent, index: number) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent, index: number) => void;
	onDelete: (id: string) => void;
	onDuplicate: (id: string) => void;
}

const FieldItem = ({
	field,
	index,
	isDragging,
	isDragOver,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
	onDelete,
	onDuplicate,
}: FieldItemProps) => {
	const typeConfig = FIELD_TYPES.find((t) => t.type === field.type);

	return (
		<div
			draggable
			onDragStart={() => onDragStart(index)}
			onDragOver={(e) => onDragOver(e, index)}
			onDragEnd={onDragEnd}
			onDrop={(e) => onDrop(e, index)}
			className={cn(
				'group flex items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-3 transition-all select-none',
				isDragging && 'opacity-40 scale-[0.98]',
				isDragOver && !isDragging && 'border-primary/50 shadow-sm ring-1 ring-primary/20',
				!isDragging && 'hover:border-border hover:shadow-sm',
			)}
		>
			<span className="cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground/60 active:cursor-grabbing">
				<GripVertical className="size-4" />
			</span>

			{typeConfig && (
				<span
					className="flex size-8 shrink-0 items-center justify-center rounded-lg"
					style={{ backgroundColor: typeConfig.iconBg }}
				>
					<typeConfig.Icon className="size-4" style={{ color: typeConfig.iconColor }} />
				</span>
			)}

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{field.label}</p>
				<p className="text-sm text-muted-foreground">{typeConfig?.label}</p>
			</div>

			<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					type="button"
					onClick={() => onDuplicate(field.id)}
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<Copy className="size-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onDelete(field.id)}
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>
		</div>
	);
};

export default FieldItem;
