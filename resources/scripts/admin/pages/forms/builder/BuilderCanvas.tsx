import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutGrid, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import SectionCard from './SectionCard';
import type { FormSection } from './types';

interface BuilderCanvasProps {
	sections: FormSection[];
	onSectionsChange: (sections: FormSection[]) => void;
}

const BuilderCanvas = ({ sections, onSectionsChange }: BuilderCanvasProps) => {
	const [sectionDragIdx, setSectionDragIdx] = useState<number | null>(null);
	const [sectionDropIdx, setSectionDropIdx] = useState<number | null>(null);

	const addSection = useCallback(() => {
		const newSection: FormSection = {
			id: `section-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			title: `Section ${sections.length + 1}`,
			fields: [],
		};
		onSectionsChange([...sections, newSection]);
	}, [sections, onSectionsChange]);

	const handleSectionChange = useCallback(
		(idx: number, section: FormSection) => {
			const next = [...sections];
			next[idx] = section;
			onSectionsChange(next);
		},
		[sections, onSectionsChange],
	);

	const deleteSection = useCallback(
		(idx: number) => {
			onSectionsChange(sections.filter((_, i) => i !== idx));
		},
		[sections, onSectionsChange],
	);

	const handleSectionDragStart = (idx: number) => setSectionDragIdx(idx);

	const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
		e.preventDefault();
		setSectionDropIdx(idx);
	};

	const handleSectionDragEnd = () => {
		setSectionDragIdx(null);
		setSectionDropIdx(null);
	};

	const handleSectionDrop = (e: React.DragEvent, targetIdx: number) => {
		e.preventDefault();
		if (sectionDragIdx === null || sectionDragIdx === targetIdx) {
			setSectionDragIdx(null);
			setSectionDropIdx(null);
			return;
		}
		const next = [...sections];
		const [removed] = next.splice(sectionDragIdx, 1);
		next.splice(targetIdx, 0, removed);
		onSectionsChange(next);
		setSectionDragIdx(null);
		setSectionDropIdx(null);
	};

	if (sections.length === 0) {
		return (
			<div className="flex flex-1 cursor-pointer items-center justify-center overflow-y-auto bg-muted/25 p-6">
				<div className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-border/50 bg-white px-8 py-14 text-center">
					<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
						<LayoutGrid className="size-6 text-muted-foreground/60" />
					</div>
					<h3 className="text-[15px] font-semibold text-foreground">Start with a section</h3>
					<p className="mt-1.5 max-w-[230px] text-center text-[13px] leading-relaxed text-muted-foreground">
						Sections help you organize your form fields into groups
					</p>
					<Button onClick={addSection} className="mt-6 gap-1.5 px-5">
						<Plus className="size-4" />
						Add a Section
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 cursor-pointer overflow-y-auto bg-muted/25 p-5">
			<div className="w-full space-y-4">
				{sections.map((section, idx) => (
					<SectionCard
						key={section.id}
						section={section}
						index={idx}
						sectionCount={sections.length}
						isDragging={sectionDragIdx === idx}
						isDragOver={sectionDropIdx === idx && sectionDragIdx !== idx}
						onSectionChange={(s) => handleSectionChange(idx, s)}
						onSectionDelete={() => deleteSection(idx)}
						onDragStart={handleSectionDragStart}
						onDragOver={handleSectionDragOver}
						onDragEnd={handleSectionDragEnd}
						onDrop={handleSectionDrop}
					/>
				))}

				<div className="flex py-1">
					<Button
						size="sm"
						variant="secondary"
						onClick={addSection}
						className="cursor-pointer"
					>
						<Plus className="size-3.5" />
						Add Section
					</Button>
				</div>
			</div>
		</div>
	);
};

export default BuilderCanvas;
