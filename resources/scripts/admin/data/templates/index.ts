import type { CreateSurveyData } from '@/admin/api/surveys';
import { FileText, Globe, Package, Star, TrendingUp, Zap } from 'lucide-react';
import npsSchema           from './nps.json';
import csatSchema          from './csat.json';
import cesSchema           from './ces.json';
import productSchema       from './product-feedback.json';
import websiteSchema       from './website-feedback.json';

export type TemplateId = 'scratch' | 'nps' | 'csat' | 'ces' | 'product' | 'website';

export interface FormTemplate {
	id:          Exclude<TemplateId, 'scratch'>;
	label:       string;
	description: string;
	Icon:        typeof FileText;
	iconBg:      string;
	iconColor:   string;
	badge:       string;
	badgeCls:    string;
	createTitle: string;
	schema:      CreateSurveyData['form_schema'];
}

export const FORM_TEMPLATES: FormTemplate[] = [
	{
		id:          'nps',
		label:       'NPS Survey',
		description: 'Measure how likely customers are to recommend you to others.',
		Icon:        TrendingUp,
		iconBg:      'bg-blue-500/10',
		iconColor:   'text-blue-500',
		badge:       'NPS',
		badgeCls:    'bg-blue-500/10 text-blue-600',
		createTitle: 'NPS Survey',
		schema:      npsSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'csat',
		label:       'CSAT Survey',
		description: 'Gauge satisfaction after a support interaction or purchase.',
		Icon:        Star,
		iconBg:      'bg-amber-500/10',
		iconColor:   'text-amber-500',
		badge:       'CSAT',
		badgeCls:    'bg-amber-500/10 text-amber-600',
		createTitle: 'CSAT Survey',
		schema:      csatSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'ces',
		label:       'CES Survey',
		description: 'Measure effort customers expend to resolve an issue or complete a task.',
		Icon:        Zap,
		iconBg:      'bg-violet-500/10',
		iconColor:   'text-violet-500',
		badge:       'CES',
		badgeCls:    'bg-violet-500/10 text-violet-600',
		createTitle: 'CES Survey',
		schema:      cesSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'product',
		label:       'Product Feedback',
		description: 'Collect structured feedback on a specific product feature or release.',
		Icon:        Package,
		iconBg:      'bg-emerald-500/10',
		iconColor:   'text-emerald-500',
		badge:       'Product',
		badgeCls:    'bg-emerald-500/10 text-emerald-600',
		createTitle: 'Product Feedback',
		schema:      productSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'website',
		label:       'Website Feedback',
		description: 'Understand visitor experience and surface issues on your site.',
		Icon:        Globe,
		iconBg:      'bg-sky-500/10',
		iconColor:   'text-sky-500',
		badge:       'Website',
		badgeCls:    'bg-sky-500/10 text-sky-600',
		createTitle: 'Website Feedback',
		schema:      websiteSchema as CreateSurveyData['form_schema'],
	},
];
