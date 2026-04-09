import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useRouter } from '@tanstack/react-router';
import { Route } from '@/admin/routes/builder.index';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, Check, ChevronDown, Info, LayoutGrid, Palette, Pencil, Redo2, Settings2, Undo2, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import BuilderCanvas from './builder/BuilderCanvas';
import PreviewPanel from './builder/PreviewPanel';
import type { BuilderTab, FormSection, PreviewDevice } from './builder/types';

const WP_ELEMENTS = ['#wpadminbar', '#adminmenuwrap', '#adminmenuback'] as const;

const TABS: { value: BuilderTab; label: string; Icon: typeof LayoutGrid; pro?: boolean }[] = [
	{ value: 'builder', label: __('Builder', 'all-feedback'), Icon: LayoutGrid },
	{ value: 'settings', label: __('Settings', 'all-feedback'), Icon: Settings2 },
	{ value: 'styling', label: __('Styling', 'all-feedback'), Icon: Palette, pro: true },
];

const FormBuilder = () => {
	const router    = useRouter();
	const { new: isNewForm } = Route.useSearch();

 	const form = useForm({
		defaultValues: {
			title:    __('My Feedback Form', 'all-feedback') as string,
			sections: [] as FormSection[],
		},
		onSubmit: async ({ value }) => {
			// TODO: persist via WP REST API
			console.log('Saving form:', value);
			form.reset(value); // clear dirty state after successful save
		},
	});

	const title    = useStore(form.store, (s) => s.values.title);
	const sections = useStore(form.store, (s) => s.values.sections);
	const isDirty  = useStore(form.store, (s) => s.isDirty);

 	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const titleSnapshotRef                    = useRef('');
	const titleInputRef                       = useRef<HTMLInputElement>(null);

	const [activeTab,       setActiveTab]       = useState<BuilderTab>('builder');
	const [previewDevice,   setPreviewDevice]   = useState<PreviewDevice>('desktop');
	const [previewWidth,    setPreviewWidth]    = useState(() => Math.round(window.innerWidth * 0.45));
	const [publishMenuOpen,   setPublishMenuOpen]   = useState(false);
	const [shortcutsOpen,     setShortcutsOpen]     = useState(false);

	/* ── Undo / Redo history ────────────────────────────────────────── */
	const historyRef                        = useRef<FormSection[][]>([[]]);
	const [historyIdx, setHistoryIdx]       = useState(0);
	const canUndo                           = historyIdx > 0;
	const canRedo                           = historyIdx < historyRef.current.length - 1;

	const handleSectionsChange = useCallback((next: FormSection[]) => {
		const trimmed = historyRef.current.slice(0, historyIdx + 1);
		trimmed.push(next);
		historyRef.current = trimmed;
		setHistoryIdx(trimmed.length - 1);
		form.setFieldValue('sections', next);
	}, [form, historyIdx]);

	const undo = useCallback(() => {
		if (!canUndo) return;
		const newIdx = historyIdx - 1;
		setHistoryIdx(newIdx);
		form.setFieldValue('sections', historyRef.current[newIdx]);
	}, [canUndo, form, historyIdx]);

	const redo = useCallback(() => {
		if (!canRedo) return;
		const newIdx = historyIdx + 1;
		setHistoryIdx(newIdx);
		form.setFieldValue('sections', historyRef.current[newIdx]);
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
		if (isNewForm) startEditingTitle();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		void form.handleSubmit();
		setPublishMenuOpen(false);
	};

	/* ── Keyboard shortcuts ─────────────────────────────────────── */
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			if (!mod) return;
			if (e.key === 's') { e.preventDefault(); void form.handleSubmit(); return; }
			if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
			if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [form, undo, redo]);

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
								onChange={(e) => form.setFieldValue('title', e.target.value)}
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
				{isDirty && (
					<div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
						<span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
						<span className="text-[12px] font-medium text-amber-600">
							{__('Unsaved changes', 'all-feedback')}
						</span>
					</div>
				)}

 				{/* Undo / Redo */}
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

				{/* Keyboard shortcuts info */}
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
							className="h-10 bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-600 active:bg-brand-700"
						>
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
								onClick={() => {
									// TODO: save as draft API call
									setPublishMenuOpen(false);
								}}
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
 					{/* Stepper nav */}
					<div className="flex h-[72px] shrink-0 items-center justify-center bg-white px-8">
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
										{/* Circle with icon inside */}
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
										{pro && (
											<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-amber-600">
												PRO
											</span>
										)}
									</button>
								</Fragment>
							);
						})}
					</div>

					<div className="flex flex-1 overflow-hidden">
						{activeTab === 'builder' && (
							<BuilderCanvas
								sections={sections}
								onSectionsChange={handleSectionsChange}
							/>
						)}

						{activeTab === 'settings' && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Settings2 className="mx-auto mb-3 size-8 text-muted-foreground/30" />
									<p className="text-[14px] font-medium text-foreground">
										{__('Form Settings', 'all-feedback')}
									</p>
									<p className="mt-1 text-[13px] text-muted-foreground">
										{__('Coming soon', 'all-feedback')}
									</p>
								</div>
							</div>
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
						device={previewDevice}
						onDeviceChange={setPreviewDevice}
					/>
				</div>
			</div>
		</div>
	);
};

export default FormBuilder;
