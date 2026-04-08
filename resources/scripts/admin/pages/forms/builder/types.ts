export type FieldType =
	| 'short_text'
	| 'long_text'
	| 'radio'
	| 'checkboxes'
	| 'star_rating'
	| 'scale'
	| 'nps';

export interface FormField {
	id: string;
	type: FieldType;
	label: string;
	required: boolean;
	placeholder?: string;
	options?: string[];
}

export interface FormSection {
	id: string;
	title: string;
	fields: FormField[];
}

export type PreviewMode = 'widget' | 'page' | 'success';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type BuilderTab = 'builder' | 'settings' | 'styling';
