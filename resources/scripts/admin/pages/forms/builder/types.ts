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
	starScale?: 'star' | 'number';
	starRange?: 5 | 10;
	scaleMin?: number;
	scaleMax?: number;
	scaleLowLabel?: string;
	scaleHighLabel?: string;
}

export interface FormSection {
	id: string;
	title: string;
	fields: FormField[];
}

export type TargetDevice = 'all' | 'desktop' | 'tablet' | 'mobile';
export type TargetPages  = 'all' | 'specific';

export interface FormSettings {
	thankYouEnabled:     boolean;
	thankYouTitle:       string;
	thankYouDescription: string;
	submitLabel:         string;
	nextLabel:           string;
	backLabel:           string;
	targetDevice:        TargetDevice;
	targetPages:         TargetPages;
	targetUrls:          string;
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
	thankYouEnabled:     true,
	thankYouTitle:       'Thank you!',
	thankYouDescription: 'Your response has been recorded.',
	submitLabel:         'Submit',
	nextLabel:           'Next',
	backLabel:           'Back',
	targetDevice:        'all',
	targetPages:         'all',
	targetUrls:          '',
};

export type PreviewMode = 'widget' | 'page' | 'success';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type BuilderTab = 'builder' | 'settings' | 'styling';
