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

interface FieldPos { sectionIdx: number; fieldIdx: number }

const BuilderCanvas = ({ sections, onSectionsChange }: BuilderCanvasProps) => {
	const [sectionDragIdx, setSectionDragIdx] = useState<number | null>(null);
	const [sectionDropIdx, setSectionDropIdx] = useState<number | null>(null);
	const [newSectionId,   setNewSectionId]   = useState<string | null>(null);

	/* ── Field drag state (cross-section) ──────────────────────────────── */
	const [fieldDrag, setFieldDrag] = useState<FieldPos | null>(null);
	const [fieldDrop, setFieldDrop] = useState<FieldPos | null>(null);

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

	/* ── Section drag handlers ─────────────────────────────────────────── */
	const handleSectionDragStart = (idx: number) => setSectionDragIdx(idx);

	const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
		e.preventDefault();
		if (sectionDragIdx !== null) setSectionDropIdx(idx);
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

	/* ── Field drag handlers (shared across sections) ──────────────────── */
	const handleFieldDragStart = (sectionIdx: number, fieldIdx: number) => {
		setFieldDrag({ sectionIdx, fieldIdx });
	};

	const handleFieldDragOver = (sectionIdx: number, fieldIdx: number) => {
		if (fieldDrag !== null) setFieldDrop({ sectionIdx, fieldIdx });
	};

	const handleFieldDragLeave = () => setFieldDrop(null);

	const handleFieldDragEnd = () => {
		setFieldDrag(null);
		setFieldDrop(null);
	};

	const handleFieldDrop = (targetSectionIdx: number, targetFieldIdx: number) => {
		if (!fieldDrag) { setFieldDrag(null); setFieldDrop(null); return; }
		const { sectionIdx: fromSec, fieldIdx: fromField } = fieldDrag;
		if (fromSec === targetSectionIdx && fromField === targetFieldIdx) {
			setFieldDrag(null); setFieldDrop(null); return;
		}
		const next = sections.map((s) => ({ ...s, fields: [...s.fields] }));
		const [removed] = next[fromSec].fields.splice(fromField, 1);
		next[targetSectionIdx].fields.splice(targetFieldIdx, 0, removed);
		onSectionsChange(next);
		setFieldDrag(null);
		setFieldDrop(null);
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
			<div
				className="w-full space-y-4"
				onDragLeave={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node)) {
						setSectionDropIdx(null);
					}
				}}
			>
				{sections.map((section, idx) => (
					<SectionCard
						key={section.id}
						section={section}
						index={idx}
						sectionCount={sections.length}
						autoFocus={section.id === newSectionId}
						isDragging={sectionDragIdx === idx}
						isDragOver={sectionDropIdx === idx && sectionDragIdx !== idx}
						fieldDrag={fieldDrag}
						fieldDrop={fieldDrop}
						onSectionChange={(s) => handleSectionChange(idx, s)}
						onSectionDelete={() => deleteSection(idx)}
						onSectionDuplicate={() => duplicateSection(idx)}
						onDragStart={handleSectionDragStart}
						onDragOver={handleSectionDragOver}
						onDragEnd={handleSectionDragEnd}
						onDrop={handleSectionDrop}
						onFieldDragStart={handleFieldDragStart}
						onFieldDragOver={handleFieldDragOver}
						onFieldDragLeave={handleFieldDragLeave}
						onFieldDragEnd={handleFieldDragEnd}
						onFieldDrop={handleFieldDrop}
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
