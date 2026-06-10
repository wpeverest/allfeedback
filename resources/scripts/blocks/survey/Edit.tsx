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
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 128 128"
		fill="none"
	>
		<path
			d="M112 0C120.837 0 128 7.16344 128 16V112C128 120.837 120.837 128 112 128H16C7.16344 128 0 120.837 0 112V16C0 7.16344 7.16344 0 16 0H112ZM105.165 37.7334C105.165 29.5231 98.0074 23.1475 89.8516 24.0928L35.1514 30.4326C28.2254 31.2354 23.0002 37.1019 23 44.0742V80.04C23.0005 87.5099 28.9652 93.5867 36.3916 93.7676V103.146C36.392 106.043 39.5758 107.811 42.0352 106.281L62.1367 93.7725H91.4326C99.0165 93.7724 105.165 87.6238 105.165 80.04V37.7334ZM90.543 30.0527C95.135 29.5208 99.1646 33.1107 99.165 37.7334V80.04C99.1646 84.3101 95.7028 87.7724 91.4326 87.7725H60.2744V87.8643L42.3916 98.9922V87.7705H36.6602C32.4232 87.7317 29.0005 84.286 29 80.04V44.0742C29.0002 40.1485 31.9422 36.8457 35.8418 36.3936L90.543 30.0527ZM43.8916 58.8916C42.2349 58.8916 40.8918 60.2349 40.8916 61.8916V74.8916C40.8916 76.5484 42.2348 77.8916 43.8916 77.8916C45.5484 77.8916 46.8916 76.5484 46.8916 74.8916V61.8916C46.8914 60.2349 45.5484 58.8916 43.8916 58.8916ZM56.8916 46.8916C55.2349 46.8916 53.8918 48.2349 53.8916 49.8916V74.8916C53.8916 76.5484 55.2348 77.8916 56.8916 77.8916C58.5484 77.8916 59.8916 76.5484 59.8916 74.8916V49.8916C59.8914 48.2349 58.5484 46.8916 56.8916 46.8916ZM69.8916 51.8916C68.2348 51.8916 66.8918 53.2349 66.8916 54.8916V74.8916C66.8916 76.5484 68.2348 77.8916 69.8916 77.8916C71.5484 77.8916 72.8916 76.5484 72.8916 74.8916V54.8916C72.8914 53.2349 71.5484 51.8916 69.8916 51.8916ZM82.8916 38.8916C81.2348 38.8916 79.8918 40.2349 79.8916 41.8916V74.8916C79.8916 76.5484 81.2348 77.8916 82.8916 77.8916C84.5484 77.8916 85.8916 76.5484 85.8916 74.8916V41.8916C85.8914 40.2349 84.5484 38.8916 82.8916 38.8916Z"
			fill="#605CFF"
		/>
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
