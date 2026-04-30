import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it('returns initial value immediately', () => {
		const { result } = renderHook(() => useDebouncedValue('hello', 300));
		expect(result.current).toBe('hello');
	});

	it('does not update before delay elapses', () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: 'a' } },
		);
		rerender({ value: 'b' });
		act(() => { jest.advanceTimersByTime(100); });
		expect(result.current).toBe('a');
	});

	it('updates after delay elapses', () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: 'a' } },
		);
		rerender({ value: 'b' });
		act(() => { jest.advanceTimersByTime(300); });
		expect(result.current).toBe('b');
	});

	it('resets timer on rapid updates', () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 300),
			{ initialProps: { value: 'a' } },
		);
		rerender({ value: 'b' });
		act(() => { jest.advanceTimersByTime(200); });
		rerender({ value: 'c' });
		act(() => { jest.advanceTimersByTime(200); });
		expect(result.current).toBe('a'); // timer reset, not yet elapsed
		act(() => { jest.advanceTimersByTime(100); });
		expect(result.current).toBe('c');
	});
});
