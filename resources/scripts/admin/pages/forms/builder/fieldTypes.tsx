import { AlignLeft, BarChart3, CheckSquare, CircleDot, Gauge, LayoutList, Star, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldType } from './types';

export interface FieldTypeConfig {
	type: FieldType;
	label: string;
	Icon: LucideIcon;
	iconBg: string;
	iconColor: string;
	defaultLabel: string;
}

export const FIELD_TYPES: FieldTypeConfig[] = [
	{
		type: 'short_text',
		label: 'Short Text',
		Icon: Type,
		iconBg: '#fef2f2',
		iconColor: '#f43f5e',
		defaultLabel: 'Short Answer',
	},
	{
		type: 'long_text',
		label: 'Long Text',
		Icon: AlignLeft,
		iconBg: '#eff6ff',
		iconColor: '#3b82f6',
		defaultLabel: 'Long Answer',
	},
	{
		type: 'multi_select',
		label: 'Multi-Select',
		Icon: LayoutList,
		iconBg: '#f5f3ff',
		iconColor: '#8b5cf6',
		defaultLabel: 'Select all that apply',
	},
	{
		type: 'checkboxes',
		label: 'Checkboxes',
		Icon: CheckSquare,
		iconBg: '#f0fdf4',
		iconColor: '#22c55e',
		defaultLabel: 'Checkboxes',
	},
	{
		type: 'multiple_choice',
		label: 'Multiple Choice',
		Icon: CircleDot,
		iconBg: '#fff1f2',
		iconColor: '#f43f5e',
		defaultLabel: 'Multiple Choice',
	},
	{
		type: 'star_rating',
		label: 'Star Rating',
		Icon: Star,
		iconBg: '#fffbeb',
		iconColor: '#f59e0b',
		defaultLabel: 'Star Rating',
	},
	{
		type: 'scale',
		label: 'Scale',
		Icon: BarChart3,
		iconBg: '#ecfdf5',
		iconColor: '#10b981',
		defaultLabel: 'Scale',
	},
	{
		type: 'nps',
		label: 'NPS',
		Icon: Gauge,
		iconBg: '#fff1f2',
		iconColor: '#e11d48',
		defaultLabel: 'NPS Score',
	},
];
