import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { useRouter } from '@tanstack/react-router';
import { Route } from '@/admin/routes/builder.index';
import { surveyQuery } from '@/admin/queries/surveys';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, Check, ChevronDown, Info, LayoutGrid, Loader2, Palette, Pencil, Redo2, Settings2, Undo2, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import BuilderCanvas from './builder/BuilderCanvas';
import PreviewPanel from './builder/PreviewPanel';
import SettingsPanel from './builder/SettingsPanel';
import type { BuilderTab, FieldType, FormField, FormSection, FormSettings, PreviewDevice } from './builder/types';
import { DEFAULT_FORM_SETTINGS } from './builder/types';
import { surveysApi } from '@/admin/api/surveys';
import type { SurveyFormSchema, SurveyStatus } from '@/admin/api/surveys';

const WP_ELEMENTS = ['#wpadminbar', '#adminmenuwrap', '#adminmenuback'] as const;

const TABS: { value: BuilderTab; label: string; Icon: typeof LayoutGrid; pro?: boolean }[] = [
	{ value: 'builder',  label: __('Builder',  'all-feedback'), Icon: LayoutGrid },
	{ value: 'settings', label: __('Settings', 'all-feedback'), Icon: Settings2  },
	{ value: 'styling',  label: __('Styling',  'all-feedback'), Icon: Palette,   pro: true },
];

const deserializeFormSchema = (schema: SurveyFormSchema | null): FormSection[] => {
	if (!schema) return [];
	return schema.sections.map((section) => ({
		id:     section.id,
		title:  section.title,
		fields: section.fields.map((field): FormField => ({
			id:       field.id,
			type:     field.type as FieldType,
			label:    field.label,
			required: field.required,
			...(field.settings.placeholder    !== undefined && { placeholder:    field.settings.placeholder    as string }),
			...(field.settings.options        !== undefined && { options:        field.settings.options        as string[] }),
			...(field.settings.starScale      !== undefined && { starScale:      field.settings.starScale      as 'star' | 'number' }),
			...(field.settings.starRange      !== undefined && { starRange:      field.settings.starRange      as 5 | 10 }),
			...(field.settings.scaleMin       !== undefined && { scaleMin:       field.settings.scaleMin       as number }),
			...(field.settings.scaleMax       !== undefined && { scaleMax:       field.settings.scaleMax       as number }),
			...(field.settings.scaleLowLabel  !== undefined && { scaleLowLabel:  field.settings.scaleLowLabel  as string }),
			...(field.settings.scaleHighLabel !== undefined && { scaleHighLabel: field.settings.scaleHighLabel as string }),
		})),
	}));
};

const serializeSettings = (s: FormSettings): Record<string, unknown> => ({
	submit_label:        s.submitLabel,
	next_label:          s.nextLabel,
	back_label:          s.backLabel,
	user_state:          s.userState,

	target_pages:        s.targetPages === 'all' ? 'all' : 'specific',

	target_page_ids:     s.targetPages === 'specific_pages'
		? s.targetPageIds.map((p) => p.id)
		: s.targetPages === 'specific_posts'
			? s.targetPostIds.map((p) => p.id)
			: [],
	trigger_type:        s.triggerType,
	delay_value:         s.delayValue,
	delay_unit:          s.delayUnit,
	scroll_depth:        s.scrollDepth,
	display_frequency:   s.displayFrequency,
	max_impressions:     s.maxImpressions,
	dismiss_wait_value:  s.dismissWaitValue,
	dismiss_wait_unit:   s.dismissWaitUnit,

	thankYouEnabled:     s.thankYouEnabled,
	thankYouTitle:       s.thankYouTitle,
	thankYouDescription: s.thankYouDescription,
	targetDevice:        s.targetDevice,
	targetUrls:          s.targetUrls,

	targetPages:         s.targetPages,
	targetPageIds:       s.targetPageIds,
	targetPostIds:       s.targetPostIds,
});

const deserializeSettings = (raw: Record<string, unknown>): Partial<FormSettings> => ({
	...(raw.submit_label       !== undefined && { submitLabel:        raw.submit_label       as string }),
	...(raw.next_label         !== undefined && { nextLabel:          raw.next_label         as string }),
	...(raw.back_label         !== undefined && { backLabel:          raw.back_label         as string }),
	...(raw.user_state         !== undefined && { userState:          raw.user_state         as FormSettings['userState'] }),

	...(raw.targetPages !== undefined
		? { targetPages: raw.targetPages as FormSettings['targetPages'] }
		: raw.target_pages !== undefined && {
			targetPages: raw.target_pages === 'specific'
				? 'specific_pages'
				: raw.target_pages as FormSettings['targetPages'],
		}
	),

	...(raw.targetPageIds !== undefined
		? { targetPageIds: raw.targetPageIds as FormSettings['targetPageIds'] }
		: raw.target_page_ids !== undefined && {
			targetPageIds: (raw.target_page_ids as number[]).map((id) => ({ id, title: `#${id}` })),
		}
	),
	...(raw.targetPostIds !== undefined && { targetPostIds: raw.targetPostIds as FormSettings['targetPostIds'] }),
	...(raw.trigger_type       !== undefined && { triggerType:        raw.trigger_type       as FormSettings['triggerType'] }),
	...(raw.delay_value        !== undefined && { delayValue:         raw.delay_value        as number }),
	...(raw.delay_unit         !== undefined && { delayUnit:          raw.delay_unit         as FormSettings['delayUnit'] }),
	...(raw.scroll_depth       !== undefined && { scrollDepth:        raw.scroll_depth       as number }),
	...(raw.display_frequency  !== undefined && { displayFrequency:   raw.display_frequency  as FormSettings['displayFrequency'] }),
	...(raw.max_impressions    !== undefined && { maxImpressions:     raw.max_impressions    as number }),
	...(raw.dismiss_wait_value !== undefined && { dismissWaitValue:   raw.dismiss_wait_value as number }),
	...(raw.dismiss_wait_unit  !== undefined && { dismissWaitUnit:    raw.dismiss_wait_unit  as FormSettings['dismissWaitUnit'] }),

	...(raw.thankYouEnabled     !== undefined && { thankYouEnabled:     raw.thankYouEnabled     as boolean }),
	...(raw.thankYouTitle       !== undefined && { thankYouTitle:       raw.thankYouTitle       as string }),
	...(raw.thankYouDescription !== undefined && { thankYouDescription: raw.thankYouDescription as string }),
	...(raw.targetDevice        !== undefined && { targetDevice:        raw.targetDevice        as FormSettings['targetDevice'] }),
	...(raw.targetUrls          !== undefined && { targetUrls:          raw.targetUrls          as string }),
});

const serializeFormSchema = (sections: FormSection[]): SurveyFormSchema => ({
	version:  '1.0',
	sections: sections.map((section) => ({
		id:     section.id,
		title:  section.title,
		fields: section.fields.map((field) => ({
			id:       field.id,
			type:     field.type,
			label:    field.label,
			required: field.required,
			settings: {
				...(field.placeholder    !== undefined && { placeholder:    field.placeholder    }),
				...(field.options        !== undefined && { options:        field.options        }),
				...(field.starScale      !== undefined && { starScale:      field.starScale      }),
				...(field.starRange      !== undefined && { starRange:      field.starRange      }),
				...(field.scaleMin       !== undefined && { scaleMin:       field.scaleMin       }),
				...(field.scaleMax       !== undefined && { scaleMax:       field.scaleMax       }),
				...(field.scaleLowLabel  !== undefined && { scaleLowLabel:  field.scaleLowLabel  }),
				...(field.scaleHighLabel !== undefined && { scaleHighLabel: field.scaleHighLabel }),
			},
		})),
	})),
});

const FormBuilder = () => {
	const router      = useRouter();
	const queryClient = useQueryClient();
	const { new: isNewForm, id: formId } = Route.useSearch();

	const [activeTab, setActiveTab] = useState<BuilderTab>('builder');

	const { data: surveyData } = useQuery({
		...surveyQuery(formId!),
		enabled: !!formId,
	});

	const [surveyStatus, setSurveyStatus] = useState<SurveyStatus>('draft');

	const submitActionRef = useRef<'publish' | 'draft' | 'trashed'>('draft');

 	const form = useForm({
		defaultValues: {
			title:    '' as string,
			sections: [] as FormSection[],
			settings: DEFAULT_FORM_SETTINGS as FormSettings,
		},
		onSubmit: async ({ value }) => {
			if (!formId) return;
			const action = submitActionRef.current;
			const data: Parameters<typeof surveysApi.update>[1] = {
				title:       value.title,
				form_schema: serializeFormSchema(value.sections),
				settings:    serializeSettings(value.settings),
			};
			data.status = action === 'publish' ? 'published' : action === 'trashed' ? 'trashed' : 'draft';
			const updated = await surveysApi.update(formId, data);
			setSurveyStatus(updated.status);
			setIsDirty(false);

			queryClient.setQueryData(surveyQuery(formId).queryKey, updated);
			void queryClient.invalidateQueries({ queryKey: ['surveys'] });
			toast.success(
				action === 'publish'
					? __('Form published successfully.', 'all-feedback')
					: action === 'trashed'
						? __('Trashed form saved successfully.', 'all-feedback')
						: __('Draft saved successfully.', 'all-feedback'),
			);
		},
	});

	const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

	const title    = useStore(form.store, (s) => s.values.title);
	const sections = useStore(form.store, (s) => s.values.sections);
	const settings = useStore(form.store, (s) => s.values.settings);

	const [isDirty, setIsDirty] = useState(false);

	const handleSettingsChange = useCallback((next: FormSettings) => {
		form.setFieldValue('settings', next);
		setIsDirty(true);
	}, [form]);

 	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const titleSnapshotRef                    = useRef('');
	const titleInputRef                       = useRef<HTMLInputElement>(null);

	const [canvasScrolled,    setCanvasScrolled]    = useState(false);
	const [canvasProgress,    setCanvasProgress]    = useState(0);
	const [settingsScrolled,  setSettingsScrolled]  = useState(false);
	const [settingsProgress,  setSettingsProgress]  = useState(0);
	const [previewDevice,   setPreviewDevice]   = useState<PreviewDevice>('desktop');
	const [previewWidth,    setPreviewWidth]    = useState(() => Math.round(window.innerWidth * 0.45));
	const [publishMenuOpen,   setPublishMenuOpen]   = useState(false);
	const [shortcutsOpen,     setShortcutsOpen]     = useState(false);

	const historyRef                        = useRef<FormSection[][]>([[]]);
	const [historyIdx, setHistoryIdx]       = useState(0);

	const initializedFormIdRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		initializedFormIdRef.current = undefined;
		setIsDirty(false);
		setActiveTab('builder');
	}, [formId]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!surveyData || surveyData.id === initializedFormIdRef.current) return;
		initializedFormIdRef.current = surveyData.id;
		const loadedSections = deserializeFormSchema(surveyData.form_schema);
		const loadedSettings = surveyData.settings
			? { ...DEFAULT_FORM_SETTINGS, ...deserializeSettings(surveyData.settings as Record<string, unknown>) }
			: DEFAULT_FORM_SETTINGS;
		setSurveyStatus(surveyData.status);
		historyRef.current = [loadedSections];
		setHistoryIdx(0);

		form.reset(
			{ title: surveyData.title, sections: loadedSections, settings: loadedSettings },
			{ keepDefaultValues: true },
		);

		if (isNewForm) {
			titleSnapshotRef.current = surveyData.title;
			setIsEditingTitle(true);
		}
	}, [surveyData]); // eslint-disable-line react-hooks/exhaustive-deps
	const canUndo                           = historyIdx > 0;
	const canRedo                           = historyIdx < historyRef.current.length - 1;

	const handleSectionsChange = useCallback((next: FormSection[]) => {
		const trimmed = historyRef.current.slice(0, historyIdx + 1);
		trimmed.push(next);
		historyRef.current = trimmed;
		setHistoryIdx(trimmed.length - 1);
		form.setFieldValue('sections', next);
		setIsDirty(true);
	}, [form, historyIdx]);

	const undo = useCallback(() => {
		if (!canUndo) return;
		const newIdx = historyIdx - 1;
		setHistoryIdx(newIdx);
		form.setFieldValue('sections', historyRef.current[newIdx]);
		setIsDirty(true);
	}, [canUndo, form, historyIdx]);

	const redo = useCallback(() => {
		if (!canRedo) return;
		const newIdx = historyIdx + 1;
		setHistoryIdx(newIdx);
		form.setFieldValue('sections', historyRef.current[newIdx]);
		setIsDirty(true);
	}, [canRedo, form, historyIdx]);

	const publishMenuRef  = useRef<HTMLDivElement>(null);
	const shortcutsRef    = useRef<HTMLDivElement>(null);

 	useEffect(() => {
		const hidden: { el: HTMLElement; display: string }[] = [];
		WP_ELEMENTS.forEach((selector) => {
			const el = document.querySelector<HTMLElement>(selector);
			if (!el) return;
			hidden.push({ el, display: el.style.display });
			el.style.display = 'none';
		});

		const resets: { el: HTMLElement; prop: string; prev: string }[] = [];
		const resetProp = (selector: string, prop: keyof CSSStyleDeclaration, value: string) => {
			const el = document.querySelector<HTMLElement>(selector);
			if (!el) return;
			resets.push({ el, prop: prop as string, prev: (el.style as Record<string, string>)[prop as string] ?? '' });
			(el.style as Record<string, string>)[prop as string] = value;
		};

		resetProp('html',      'marginTop',   '0');
		resetProp('html',      'overflow',    'hidden');
		resetProp('body',      'overflow',    'hidden');
		resetProp('#wpbody',   'paddingTop',  '0');
		resetProp('#wpcontent','marginLeft',  '0');
		resetProp('#wpwrap',   'paddingTop',  '0');

		return () => {
			hidden.forEach(({ el, display }) => (el.style.display = display));
			resets.forEach(({ el, prop, prev }) => ((el.style as Record<string, string>)[prop] = prev));
		};
	}, []);

 	useEffect(() => {
		if (isEditingTitle) {
			titleInputRef.current?.focus();
			titleInputRef.current?.select();
		}
	}, [isEditingTitle]);

 	useEffect(() => {
		if (!publishMenuOpen) return;
		const handle = (e: MouseEvent) => {
			if (publishMenuRef.current && !publishMenuRef.current.contains(e.target as Node)) {
				setPublishMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [publishMenuOpen]);

	useEffect(() => {
		if (!shortcutsOpen) return;
		const handle = (e: MouseEvent) => {
			if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
				setShortcutsOpen(false);
			}
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [shortcutsOpen]);

 	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!isDirty) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [isDirty]);

 	const startResize = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const startX     = e.clientX;
			const startWidth = previewWidth;

			const onMove = (ev: MouseEvent) => {
				const delta = startX - ev.clientX;
				setPreviewWidth(Math.max(280, Math.min(Math.round(window.innerWidth * 0.72), startWidth + delta)));
			};
			const onUp = () => {
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);
				document.body.style.cursor     = '';
				document.body.style.userSelect = '';
			};

			document.body.style.cursor     = 'col-resize';
			document.body.style.userSelect = 'none';
			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
		},
		[previewWidth],
	);

 	const startEditingTitle = () => {
		titleSnapshotRef.current = title;
		setIsEditingTitle(true);
	};

	const commitTitle = () => {
		if (!form.state.values.title.trim()) {
			form.setFieldValue('title', titleSnapshotRef.current);
		}
		setIsEditingTitle(false);
	};

	const cancelTitle = () => {
		form.setFieldValue('title', titleSnapshotRef.current);
		setIsEditingTitle(false);
	};

 	const handleBack = () => {
		if (isDirty) {
			const confirmed = window.confirm(
				__('You have unsaved changes. Are you sure you want to leave?', 'all-feedback'),
			);
			if (!confirmed) return;
		}
		router.history.back();
	};

	const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

	const handlePublish = () => {
		submitActionRef.current = 'publish';
		form.handleSubmit().catch(() => {
			toast.error(__('Failed to save. Please try again.', 'all-feedback'));
		});
		setPublishMenuOpen(false);
	};

	const handleSaveAsDraft = () => {
		submitActionRef.current = 'draft';
		form.handleSubmit().catch(() => {
			toast.error(__('Failed to save. Please try again.', 'all-feedback'));
		});
		setPublishMenuOpen(false);
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			if (!mod) return;
			if (e.key === 's') { e.preventDefault(); submitActionRef.current = surveyStatus === 'published' ? 'publish' : surveyStatus === 'trashed' ? 'trashed' : 'draft'; form.handleSubmit().catch(() => {}); return; }
			if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
			if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [form, undo, redo, surveyStatus]);

	return (
		<div className="allfb-builder fixed inset-0 z-[99999] flex flex-col bg-background">
 			<header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-white px-6">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleBack}
						aria-label={__('Back', 'all-feedback')}
					>
						<ArrowLeft className="size-4" />
					</Button>

					<span className="h-5 w-px bg-border" />

					{isEditingTitle ? (
						<div
							className="flex items-center gap-1.5"
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) commitTitle();
							}}
						>
							<input
								ref={titleInputRef}
								type="text"
								value={title}
								autoFocus
								onFocus={(e) => e.target.select()}
								onChange={(e) => { form.setFieldValue('title', e.target.value); setIsDirty(true); }}
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitTitle();
									if (e.key === 'Escape') cancelTitle();
								}}
								className="builder-title w-[520px] rounded-lg border border-border/70 bg-transparent text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/10"
							/>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={commitTitle}
								className="text-success hover:bg-success/10 active:bg-success/15"
								aria-label={__('Confirm', 'all-feedback')}
							>
								<Check className="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={cancelTitle}
								aria-label={__('Cancel', 'all-feedback')}
							>
								<X className="size-3.5" />
							</Button>
						</div>
					) : (
						<button
							type="button"
							className="builder-title group flex w-[520px] items-center gap-2 rounded-lg text-foreground transition-colors hover:bg-muted/50"
							onClick={startEditingTitle}
							title={__('Click to edit', 'all-feedback')}
						>
							<span className="min-w-0 flex-1 truncate">{title}</span>
							<Pencil
								className="size-3.5 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
								onClick={(e) => { e.stopPropagation(); startEditingTitle(); }}
							/>
						</button>
					)}
				</div>

				<div className="flex items-center gap-3">
				{surveyStatus === 'draft' && !isDirty && (
					<div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1">
						<span className="text-[12px] font-medium text-muted-foreground">
							{__('Draft', 'all-feedback')}
						</span>
					</div>
				)}
				{isDirty && (
					<div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
						<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
						<span className="text-[12px] font-medium text-amber-600">
							{__('Unsaved changes', 'all-feedback')}
						</span>
					</div>
				)}

				<div className="flex items-center gap-0.5">
					<button
						type="button"
						onClick={undo}
						disabled={!canUndo}
						title={isMac ? '⌘Z' : 'Ctrl+Z'}
						className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
					>
						<Undo2 className="size-4" />
					</button>
					<button
						type="button"
						onClick={redo}
						disabled={!canRedo}
						title={isMac ? '⌘⇧Z' : 'Ctrl+Y'}
						className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
					>
						<Redo2 className="size-4" />
					</button>
				</div>

				<div ref={shortcutsRef} className="relative">
					<button
						type="button"
						onClick={() => setShortcutsOpen((v) => !v)}
						className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
						aria-label={__('Keyboard shortcuts', 'all-feedback')}
					>
						<Info className="size-4" />
					</button>

					{shortcutsOpen && (
						<div className="absolute right-0 top-full z-10 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-white shadow-dropdown">
							<div className="border-b border-border px-4 py-2.5">
								<p className="text-[12px] font-semibold text-foreground">{__('Keyboard shortcuts', 'all-feedback')}</p>
							</div>
							<div className="px-4 py-2">
								{[
									{ label: __('Save / Publish', 'all-feedback'), keys: isMac ? ['⌘', 'S']       : ['Ctrl', 'S'] },
									{ label: __('Undo',           'all-feedback'), keys: isMac ? ['⌘', 'Z']       : ['Ctrl', 'Z'] },
									{ label: __('Redo',           'all-feedback'), keys: isMac ? ['⌘', '⇧', 'Z'] : ['Ctrl', 'Y'] },
								].map(({ label, keys }) => (
									<div key={label} className="flex items-center justify-between py-1.5">
										<span className="text-[12px] text-muted-foreground">{label}</span>
										<div className="flex items-center gap-1">
											{keys.map((k) => (
												<kbd key={k} className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground leading-none">
													{k}
												</kbd>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<div ref={publishMenuRef} className="relative">
					<div className="publish-split flex items-stretch overflow-hidden rounded-lg shadow-sm" title={isMac ? '⌘S' : 'Ctrl+S'}>
						<button
							type="button"
							onClick={handlePublish}
							disabled={isSubmitting}
							className="flex h-10 items-center gap-2 bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-600 active:bg-brand-700 disabled:opacity-70"
						>
							{isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
							{__('Publish', 'all-feedback')}
						</button>
						<button
							type="button"
							onClick={() => setPublishMenuOpen((v) => !v)}
							className="publish-split__arrow flex h-10 items-center bg-primary px-3 text-primary-foreground transition-colors hover:bg-brand-600 active:bg-brand-700"
							aria-label={__('More publish options', 'all-feedback')}
						>
							<ChevronDown className="size-4" />
						</button>
					</div>

					{publishMenuOpen && (
						<div className="absolute right-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-dropdown">
							<button
								type="button"
								onClick={handleSaveAsDraft}
								className="flex w-full items-center px-4 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted/60"
							>
								{__('Save as Draft', 'all-feedback')}
							</button>
						</div>
					)}
				</div>
			</div>
			</header>

 			<div className="flex flex-1 overflow-hidden">
 				<div className="flex flex-1 flex-col overflow-hidden">
 					<div className={cn(
						'relative flex h-[72px] shrink-0 items-center justify-center bg-white px-8 transition-shadow duration-150',
						((canvasScrolled && activeTab === 'builder') || (settingsScrolled && activeTab === 'settings')) && 'shadow-[0_1px_0_0_hsl(var(--border)),0_4px_10px_-2px_rgba(0,0,0,0.06)]',
					)}>
						{TABS.map(({ value, label, Icon, pro }, idx) => {
							const activeIdx = TABS.findIndex((t) => t.value === activeTab);
							const isActive  = activeTab === value;
							const isPast    = idx < activeIdx;
							return (
								<Fragment key={value}>
									{idx > 0 && (
										<div className={cn(
											'mx-4 h-px w-12 shrink-0 transition-colors',
											isPast ? 'bg-primary/35' : 'bg-border/70',
										)} />
									)}
									<button
										type="button"
										onClick={() => setActiveTab(value)}
										className={cn(
											'group flex items-center gap-2.5 text-[13.5px] font-medium transition-colors',
											isActive
												? 'text-primary'
												: 'text-muted-foreground hover:text-foreground',
										)}
									>
 										<span className={cn(
											'flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
											isActive ? 'border-primary bg-primary' : 'border-border bg-white group-hover:border-border/80 group-hover:bg-muted/40',
										)}>
											<Icon className={cn(
												'size-4 transition-colors',
												isActive ? 'text-white' : 'text-muted-foreground/60',
											)} />
										</span>
										{label}
									</button>
								</Fragment>
							);
						})}

					{activeTab === 'builder' && canvasScrolled && (
						<div className="absolute inset-x-0 bottom-0 h-[2px] bg-border/40">
							<div
								className="h-full bg-primary/60 transition-[width] duration-75"
								style={{ width: `${canvasProgress * 100}%` }}
							/>
						</div>
					)}
					{activeTab === 'settings' && settingsScrolled && (
						<div className="absolute inset-x-0 bottom-0 h-[2px] bg-border/40">
							<div
								className="h-full bg-primary/60 transition-[width] duration-75"
								style={{ width: `${settingsProgress * 100}%` }}
							/>
						</div>
					)}
					</div>

					<div className="flex flex-1 overflow-hidden">
						{activeTab === 'builder' && (
							<BuilderCanvas
								sections={sections}
								onSectionsChange={handleSectionsChange}
								onScrollChange={(scrolled, progress) => {
									setCanvasScrolled(scrolled);
									setCanvasProgress(progress);
								}}
							/>
						)}

						{activeTab === 'settings' && (
							<SettingsPanel
								settings={settings}
								onChange={handleSettingsChange}
								onScrollChange={(scrolled, progress) => {
									setSettingsScrolled(scrolled);
									setSettingsProgress(progress);
								}}
							/>
						)}

						{activeTab === 'styling' && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Palette className="mx-auto mb-3 size-8 text-muted-foreground/30" />
									<p className="text-[14px] font-medium text-foreground">
										{__('Form Styling', 'all-feedback')}
									</p>
									<p className="mt-1 text-[13px] text-muted-foreground">
										{__('Available in', 'all-feedback')}{' '}
										<span className="font-semibold text-amber-600">PRO</span>
									</p>
								</div>
							</div>
						)}

					</div>
				</div>

				<div
					className="group relative flex w-3 shrink-0 cursor-col-resize items-center justify-center border-x border-border bg-white transition-colors hover:bg-muted/40"
					onMouseDown={startResize}
				>
					<div className="flex items-center gap-[3px] opacity-20 transition-opacity group-hover:opacity-60">
						<div className="h-6 w-[2px] rounded-full bg-foreground" />
						<div className="h-6 w-[2px] rounded-full bg-foreground" />
					</div>
				</div>

				<div
					className="preview-panel-wrapper shrink-0 overflow-hidden"
					style={{ '--preview-width': `${previewWidth}px` } as React.CSSProperties}
				>
					<PreviewPanel
						sections={sections}
						settings={settings}
						device={previewDevice}
						onDeviceChange={setPreviewDevice}
						surveyId={formId ?? undefined}
						surveyStatus={surveyStatus}
					/>
				</div>
			</div>
		</div>

	);
};

export default FormBuilder;
