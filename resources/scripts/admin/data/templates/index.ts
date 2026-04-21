import type { CreateSurveyData } from '@/admin/api/surveys';
import { Bug, FileText, Globe, Lightbulb, MessageSquare, Package, TrendingUp } from 'lucide-react';
import npsSchema           from './nps.json';
import productSchema       from './product-feedback.json';
import websiteSchema       from './website-feedback.json';
import bugReportSchema     from './bug-report.json';
import featureRequestSchema from './feature-request.json';
import generalFeedbackSchema from './general-feedback.json';

export type TemplateId = 'scratch' | 'nps' | 'product' | 'website' | 'bug_report' | 'feature_request' | 'general_feedback';

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
		id:          'general_feedback',
		label:       'General Feedback',
		description: 'Collect general thoughts and suggestions from your users.',
		Icon:        MessageSquare,
		iconBg:      'bg-amber-500/10',
		iconColor:   'text-amber-500',
		badge:       'Feedback',
		badgeCls:    'bg-amber-500/10 text-amber-600',
		createTitle: 'General Feedback',
		schema:      generalFeedbackSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'bug_report',
		label:       'Bug Report',
		description: 'Allow users to report technical issues and software bugs.',
		Icon:        Bug,
		iconBg:      'bg-red-500/10',
		iconColor:   'text-red-500',
		badge:       'Bug',
		badgeCls:    'bg-red-500/10 text-red-600',
		createTitle: 'Bug Report',
		schema:      bugReportSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'feature_request',
		label:       'Feature Request',
		description: 'Gather ideas for new features and product improvements.',
		Icon:        Lightbulb,
		iconBg:      'bg-violet-500/10',
		iconColor:   'text-violet-500',
		badge:       'Feature',
		badgeCls:    'bg-violet-500/10 text-violet-600',
		createTitle: 'Feature Request',
		schema:      featureRequestSchema as CreateSurveyData['form_schema'],
	},
	{
		id:          'product',
		label:       'Product Feedback',
		description: 'Collect structured feedback on a specific product feature.',
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
