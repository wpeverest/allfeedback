/**
 * queries/sample.ts — TanStack Query definitions for the sample resource
 */

import { sampleApi } from '@/admin/api/sample';
import type { SampleListParams } from '@/admin/api/sample';

export const sampleQuery = (params?: SampleListParams) => ({
	queryKey: ['sample', params ?? {}] as const,
	queryFn:  () => sampleApi.list(params),
});

export const sampleItemQuery = (id: number) => ({
	queryKey: ['sample', id] as const,
	queryFn:  () => sampleApi.get(id),
});
