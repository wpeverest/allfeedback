/**
 * Survey block — editor component.
 *
 * Canvas: logo + inline survey picker (no survey) or static preview (survey selected).
 * Sidebar: InspectorControls panel with a combobox for searching/changing the survey.
 */

import apiFetch from '@wordpress/api-fetch';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import type { BlockEditProps } from '@wordpress/blocks';
import {
	Notice,
	PanelBody,
	SelectControl,
	Spinner,
} from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { PreviewSurvey } from '../../shared/formPreview';
import { surveyPreviewHtml } from '../../shared/formPreview';

// ---------------------------------------------------------------------------
// Plugin colour injected by PHP → wp_add_inline_script.
// ---------------------------------------------------------------------------
const BLOCK_CFG = (window as unknown as Record<string, unknown>)
	.__ALLFB_BLOCK__ as { color?: string } | undefined;
const ACCENT_COLOR = BLOCK_CFG?.color ?? '#6366f1';

interface SurveyListItem {
	id: number;
	title: string;
	status: string;
}

interface SurveyOption {
	value: string;
	label: string;
	status: string;
	[key: string]: unknown;
}

export interface Attributes {
	surveyId: number;
	[key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Brand icon
// ---------------------------------------------------------------------------
const AllFeedbackIcon = () => (
	<svg
		width="48"
		height="48"
		viewBox="0 0 48 48"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect
			width="48"
			height="48"
			rx="12"
			fill={ACCENT_COLOR}
			fillOpacity="0.12"
		/>
		<path
			d="M24 10C16.268 10 10 15.82 10 23c0 3.406 1.374 6.51 3.627 8.847L12 38l6.763-2.118A14.7 14.7 0 0 0 24 36c7.732 0 14-5.82 14-13S31.732 10 24 10Z"
			fill={ACCENT_COLOR}
			fillOpacity="0.18"
			stroke={ACCENT_COLOR}
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<rect x="18" y="21" width="12" height="2" rx="1" fill={ACCENT_COLOR} />
		<rect x="18" y="25" width="8" height="2" rx="1" fill={ACCENT_COLOR} />
	</svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Edit({
	attributes,
	setAttributes,
}: BlockEditProps<Attributes>) {
	const { surveyId } = attributes;
	const blockProps = useBlockProps({ style: { padding: 0 } });

	const [options, setOptions] = useState<SurveyOption[]>([]);
	const [loadingOptions, setLoadingOptions] = useState(true);
	const [optionsError, setOptionsError] = useState('');

	const [survey, setSurvey] = useState<PreviewSurvey | null>(null);
	const [loadingPreview, setLoadingPreview] = useState(false);

	useEffect(() => {
		apiFetch<{ success: boolean; data: { surveys: SurveyListItem[] } }>({
			path: '/allfeedback/v1/surveys?per_page=100',
		})
			.then((json) => {
				setOptions(
					(json?.data?.surveys ?? [])
						.filter((s) => s.status !== 'trashed')
						.map((s) => ({
							value: String(s.id),
							label: s.title || `Survey #${s.id}`,
							status: s.status,
						})),
				);
			})
			.catch(() =>
				setOptionsError(__('Could not load surveys.', 'allfeedback')),
			)
			.finally(() => setLoadingOptions(false));
	}, []);

	useEffect(() => {
		if (!surveyId) {
			setSurvey(null);
			return;
		}
		setLoadingPreview(true);
		setSurvey(null);
		apiFetch<{ success: boolean; data: PreviewSurvey }>({
			path: `/allfeedback/v1/surveys/${surveyId}`,
		})
			.then((json) => setSurvey(json?.data ?? null))
			.catch(() => setSurvey(null))
			.finally(() => setLoadingPreview(false));
	}, [surveyId]);

	const selectOptions = [
		{ value: '', label: __('Select a survey', 'allfeedback') },
		...options,
	];

	const previewHtml = useMemo(
		() => (survey ? surveyPreviewHtml(survey, ACCENT_COLOR) : ''),
		[survey],
	);

	// -------------------------------------------------------------------------
	// Sidebar panel (always shown)
	// -------------------------------------------------------------------------
	const sidebarPanel = (
		<InspectorControls>
			<PanelBody title={__('All Feedback Survey', 'allfeedback')} initialOpen>
				{optionsError ? (
					<Notice status="error" isDismissible={false}>
						{optionsError}
					</Notice>
				) : loadingOptions ? (
					<Spinner />
				) : (
					<SelectControl
						label={__('Select survey', 'allfeedback')}
						help={__(
							'Only published surveys render on the frontend.',
							'allfeedback',
						)}
						value={surveyId ? String(surveyId) : ''}
						options={selectOptions}
						onChange={(val: string) =>
							setAttributes({ surveyId: val ? parseInt(val, 10) : 0 })
						}
						__nextHasNoMarginBottom
					/>
				)}
			</PanelBody>
		</InspectorControls>
	);

	// -------------------------------------------------------------------------
	// Canvas — no survey selected: show logo + inline picker
	// -------------------------------------------------------------------------
	if (surveyId === 0) {
		return (
			<>
				{sidebarPanel}
				<div {...blockProps}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '16px',
							padding: '40px 24px',
							border: '1px dashed #d1d5db',
							borderRadius: '4px',
							background: '#fafafa',
							minHeight: '160px',
						}}
					>
						{loadingOptions ? (
							<Spinner />
						) : (
							<>
								<AllFeedbackIcon />

								<p
									style={{
										margin: 0,
										fontWeight: 600,
										fontSize: '15px',
										color: '#1a1a1a',
									}}
								>
									{__('All Feedback Survey', 'allfeedback')}
								</p>

								{optionsError ? (
									<Notice status="error" isDismissible={false}>
										{optionsError}
									</Notice>
								) : (
									<div style={{ width: '100%', maxWidth: '360px' }}>
										<SelectControl
											value={''}
											options={selectOptions}
											onChange={(val: string) =>
												setAttributes({ surveyId: val ? parseInt(val, 10) : 0 })
											}
											__nextHasNoMarginBottom
										/>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — survey selected: show preview or loading state
	// -------------------------------------------------------------------------
	return (
		<>
			{sidebarPanel}
			<div {...blockProps}>
				{loadingPreview ? (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '10px',
							minHeight: '80px',
							padding: '16px',
						}}
					>
						<Spinner />
						<span style={{ fontSize: '13px', color: '#6b7280' }}>
							{__('Loading preview…', 'allfeedback')}
						</span>
					</div>
				) : previewHtml ? (
					<div dangerouslySetInnerHTML={{ __html: previewHtml }} />
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '12px',
							padding: '40px 24px',
							border: '1px dashed #d1d5db',
							borderRadius: '4px',
							background: '#fafafa',
						}}
					>
						<AllFeedbackIcon />
						<p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
							{__('Survey not found or no longer available.', 'allfeedback')}
						</p>
					</div>
				)}
			</div>
		</>
	);
}
