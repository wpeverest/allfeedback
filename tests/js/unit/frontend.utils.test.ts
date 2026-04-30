import { activeSections, normalizeSettings, parseSections } from '@/frontend/utils';
import type { FormSection } from '@/frontend/types';

describe('normalizeSettings', () => {
	it('returns defaults for null input', () => {
		const s = normalizeSettings(null);
		expect(s.submitLabel).toBe('Submit');
		expect(s.nextLabel).toBe('Next');
		expect(s.backLabel).toBe('Back');
		expect(s.progressIndicator).toBe('dots');
	});

	it('uses provided values', () => {
		const s = normalizeSettings({ submitLabel: 'Send', nextLabel: 'Continue' });
		expect(s.submitLabel).toBe('Send');
		expect(s.nextLabel).toBe('Continue');
		expect(s.backLabel).toBe('Back'); // default
	});

	it('falls back to snake_case keys', () => {
		const s = normalizeSettings({ submit_label: 'Go' } as never);
		expect(s.submitLabel).toBe('Go');
	});
});

describe('parseSections', () => {
	it('wraps flat array in default section', () => {
		const sections = parseSections([{ id: 'f1', type: 'short_text', label: 'Q1', required: false }]);
		expect(sections).toHaveLength(1);
		expect(sections[0].id).toBe('default');
		expect(sections[0].fields).toHaveLength(1);
	});

	it('parses schema with sections', () => {
		const schema = {
			sections: [
				{ id: 's1', title: 'Section 1', fields: [{ id: 'f1', type: 'short_text', label: 'Q', required: false }] },
			],
		};
		const sections = parseSections(schema);
		expect(sections).toHaveLength(1);
		expect(sections[0].id).toBe('s1');
	});

	it('returns empty array for null', () => {
		expect(parseSections(null)).toEqual([]);
	});
});

describe('activeSections', () => {
	it('filters out sections with no fields', () => {
		const sections: FormSection[] = [
			{ id: 's1', title: '', fields: [] },
			{ id: 's2', title: '', fields: [{ id: 'f1', type: 'short_text', label: 'Q', required: false }] },
		];
		expect(activeSections(sections)).toHaveLength(1);
		expect(activeSections(sections)[0].id).toBe('s2');
	});
});
