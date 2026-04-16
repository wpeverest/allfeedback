import type { FormSection, NormalizedSettings, SurveyField, SurveySettings } from './types';

export function normalizeSettings( raw: SurveySettings | null | undefined ): NormalizedSettings {
	const s = raw ?? {};
	return {
		submitLabel:         ( s.submitLabel         || s.submit_label         || '' ) || 'Submit',
		nextLabel:           ( s.nextLabel           || s.next_label           || '' ) || 'Next',
		backLabel:           ( s.backLabel           || s.back_label           || '' ) || 'Back',
		thankYouEnabled:     s.thankYouEnabled     ?? false,
		thankYouTitle:       s.thankYouTitle       || 'Thank you!',
		thankYouDescription: s.thankYouDescription || 'Your response has been recorded.',
	};
}

export function normalizeLabel( html: string ): string {
	const t = html.trim();
	if ( t.startsWith( '<p>' ) && t.endsWith( '</p>' ) && t.indexOf( '<p>', 1 ) === -1 ) {
		return t.slice( 3, -4 );
	}
	return t;
}

export function activeSections( sections: FormSection[] ): FormSection[] {
	return sections.filter( ( s ) => s.fields.length > 0 );
}

export function parseSections( rawSchema: unknown ): FormSection[] {
	if ( Array.isArray( rawSchema ) ) {
		return [ { id: 'default', title: '', fields: rawSchema as SurveyField[] } ];
	}
	const schema = rawSchema as { sections?: FormSection[] } | null;
	return schema?.sections ?? [];
}
