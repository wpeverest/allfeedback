import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
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
	const [newSectionId,   setNewSectionId]   = useState<string | null>(null);

	const addSection = useCallback(() => {
		const newSection: FormSection = {
			id: `section-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			title: `Section ${sections.length + 1}`,
			fields: [],
		};
		setNewSectionId(newSection.id);
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
			<div className="flex flex-1 items-center justify-center bg-white">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8">
						<LayoutGrid className="size-6 text-primary" />
					</div>
					<span className="block text-[15px] font-semibold text-foreground">
						{__('No sections yet', 'all-feedback')}
					</span>
					<span className="block max-w-[340px] text-[13px] leading-relaxed text-muted-foreground">
						{__('Sections help you group related questions. Add your first one to get started.', 'all-feedback')}
					</span>
					<Button onClick={addSection}>
						<Plus className="size-4" />
						{__('Add a Section', 'all-feedback')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto bg-white p-5">
			<div className="w-full space-y-4">
				{sections.map((section, idx) => (
					<SectionCard
						key={section.id}
						section={section}
						index={idx}
						sectionCount={sections.length}
						autoFocus={section.id === newSectionId}
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
					<Button size="sm" variant="secondary" onClick={addSection}>
						<Plus className="size-3.5" />
						{__('Add Section', 'all-feedback')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default BuilderCanvas;
