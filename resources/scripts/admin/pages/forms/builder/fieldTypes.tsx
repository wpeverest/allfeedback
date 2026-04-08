import { AlignLeft, BarChart3, CheckSquare, CircleDot, Gauge, Star, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldType } from './types';
import { __ } from '@wordpress/i18n';

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
		label: __('Short Text', 'all-feedback'),
		Icon: Type,
		iconBg: '#fef2f2',
		iconColor: '#f43f5e',
		defaultLabel: 'Short Answer',
	},
	{
		type: 'long_text',
		label: __('Long Text', 'all-feedback'),
		Icon: AlignLeft,
		iconBg: '#eff6ff',
		iconColor: '#3b82f6',
		defaultLabel: 'Long Answer',
	},
	{
		type: 'radio',
		label: __('Radio', 'all-feedback'),
		Icon: CircleDot,
		iconBg: '#f5f3ff',
		iconColor: '#8b5cf6',
		defaultLabel: 'Choose one',
	},
	{
		type: 'checkboxes',
		label: __('Checkboxes', 'all-feedback'),
		Icon: CheckSquare,
		iconBg: '#f0fdf4',
		iconColor: '#22c55e',
		defaultLabel: 'Select all that apply',
	},
	{
		type: 'star_rating',
		label: __('Star Rating', 'all-feedback'),
		Icon: Star,
		iconBg: '#fffbeb',
		iconColor: '#f59e0b',
		defaultLabel: 'Star Rating',
	},
	{
		type: 'scale',
		label: __('Scale', 'all-feedback'),
		Icon: BarChart3,
		iconBg: '#ecfdf5',
		iconColor: '#10b981',
		defaultLabel: 'Scale',
	},
	{
		type: 'nps',
		label: __('NPS', 'all-feedback'),
		Icon: Gauge,
		iconBg: '#fff1f2',
		iconColor: '#e11d48',
		defaultLabel: 'NPS Score',
	},
];
