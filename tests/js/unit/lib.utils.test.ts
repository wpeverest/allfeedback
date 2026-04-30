import { cn, deepMerge, htmlToText } from '@/lib/utils';

describe('cn', () => {
	it('merges class names', () => {
		expect(cn('a', 'b')).toBe('a b');
	});

	it('resolves tailwind conflicts (last wins)', () => {
		const result = cn('p-2', 'p-4');
		expect(result).toBe('p-4');
	});

	it('ignores falsy values', () => {
		expect(cn('a', false, undefined, null as unknown as string, 'b')).toBe('a b');
	});
});

describe('htmlToText', () => {
	it('strips HTML tags', () => {
		expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('returns empty string for empty input', () => {
		expect(htmlToText('')).toBe('');
	});

	it('handles plain text passthrough', () => {
		expect(htmlToText('plain text')).toBe('plain text');
	});
});

describe('deepMerge', () => {
	it('merges shallow keys', () => {
		expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
	});

	it('deep merges nested objects', () => {
		const result = deepMerge({ a: { x: 1 } }, { a: { y: 2 } });
		expect(result).toEqual({ a: { x: 1, y: 2 } });
	});

	it('later source overwrites primitive', () => {
		expect(deepMerge({ a: 1 }, { a: 99 })).toEqual({ a: 99 });
	});

	it('does not merge arrays — replaces them', () => {
		const result = deepMerge({ a: [1, 2] }, { a: [3] });
		expect(result.a).toEqual([3]);
	});
});
