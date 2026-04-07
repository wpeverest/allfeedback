/**
 * lib/utils.ts — Shared utility functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Tailwind className helper ─────────────────────────────────────────

/**
 * Merge Tailwind classes, resolving conflicts intelligently.
 * Drop-in replacement for clsx() when Tailwind is involved.
 *
 * @example cn('px-2 py-1', condition && 'bg-red-500', 'px-4') → 'py-1 bg-red-500 px-4'
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

// ── URL / string helpers ──────────────────────────────────────────────

const WP_ADMIN_PAGE_PARAM = /[?&]page=all-feedback[^&]*/g;

/** Strip the WordPress ?page=all-feedback query param from a URL or string. */
export function stripWpParam(value: string): string {
	return value.replace(WP_ADMIN_PAGE_PARAM, '').trim();
}

/** Parse an unknown value as a non-empty string (undefined if empty). */
export function parseString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	return stripWpParam(value) || undefined;
}

/** Parse an unknown value as a positive integer (undefined if invalid). */
export function parsePositiveInt(value: unknown): number | undefined {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value > 0 ? value : undefined;
	}
	const str = parseString(value);
	if (!str) return undefined;
	const num = Number(str);
	return Number.isInteger(num) && num > 0 ? num : undefined;
}

/** Parse an unknown value as a valid ISO date string (undefined if invalid). */
export function parseDate(value: unknown): string | undefined {
	const str = parseString(value);
	if (!str) return undefined;
	const date = new Date(str);
	return isNaN(date.getTime()) ? undefined : str;
}

/** Parse an unknown value as a member of an allowed enum (undefined if not in list). */
export function parseEnum<T extends string | number>(
	value: unknown,
	allowed: readonly T[],
): T | undefined {
	const parsed =
		typeof allowed[0] === 'number'
			? parsePositiveInt(value)
			: parseString(value);
	return allowed.includes(parsed as T) ? (parsed as T) : undefined;
}

// ── Pagination helpers ────────────────────────────────────────────────

export type PerPage = 10 | 25 | 50 | 100;

export interface BaseListSearchParams {
	page:      number;
	per_page:  PerPage;
	search:    string | undefined;
	from_date: string | undefined;
	to_date:   string | undefined;
}

const DEFAULTS = { page: 1, per_page: 10 as PerPage } as const;
const ALLOWED_PER_PAGE = [10, 25, 50, 100] as const satisfies readonly PerPage[];

/**
 * Sanitise raw search params (from TanStack Router) into a typed object.
 * Accepts an optional `extend` callback for route-specific extra params.
 */
export function sanitizeSearchParams<
	TExtra extends Record<string, unknown> = Record<never, never>,
>(
	raw: Record<string, unknown>,
	extend?: (raw: Record<string, unknown>) => TExtra,
): BaseListSearchParams & TExtra {
	const base: BaseListSearchParams = {
		page:      parsePositiveInt(raw.page)     ?? DEFAULTS.page,
		per_page:  parseEnum(raw.per_page, ALLOWED_PER_PAGE) ?? DEFAULTS.per_page,
		search:    parseString(raw.search),
		from_date: parseDate(raw.from_date),
		to_date:   parseDate(raw.to_date),
	};
	return { ...base, ...(extend?.(raw) ?? ({} as TExtra)) };
}

// ── Clipboard helper ──────────────────────────────────────────────────

/** Copy text to the clipboard; falls back to execCommand on older browsers. */
export async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return;
		} catch {
			// fall through to execCommand fallback
		}
	}
	const el = document.createElement('textarea');
	el.value = text;
	el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
	document.body.appendChild(el);
	el.select();
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	const ok = document.execCommand('copy');
	document.body.removeChild(el);
	if (!ok) throw new Error('Failed to copy to clipboard');
}
