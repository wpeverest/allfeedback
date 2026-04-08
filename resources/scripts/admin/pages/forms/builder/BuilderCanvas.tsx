import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import { Plus } from 'lucide-react';
import EmptyCanvasIllustration from './EmptyCanvasIllustration';
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

	const duplicateSection = useCallback(
		(idx: number) => {
			const copy: FormSection = {
				...sections[idx],
				id:     `section-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				fields: sections[idx].fields.map((f) => ({
					...f,
					id: `field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				})),
			};
			const next = [...sections];
			next.splice(idx + 1, 0, copy);
			onSectionsChange(next);
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
			<div className="flex flex-1 items-center justify-center bg-background">
				<div className="flex flex-col items-center">
					<EmptyCanvasIllustration />
					{/* Button immediately after SVG — arrow tip points here */}
					<Button onClick={addSection} className="-mt-1">
						<Plus className="size-4" />
						{__('Add a Section', 'all-feedback')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto bg-background p-5">
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
						onSectionDuplicate={() => duplicateSection(idx)}
						onDragStart={handleSectionDragStart}
						onDragOver={handleSectionDragOver}
						onDragEnd={handleSectionDragEnd}
						onDrop={handleSectionDrop}
					/>
				))}

				<div className="flex justify-center py-2">
					<Button size="sm" variant="outline" onClick={addSection} className="border-dashed">
						<Plus className="size-3.5" />
						{__('Add Section', 'all-feedback')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default BuilderCanvas;
