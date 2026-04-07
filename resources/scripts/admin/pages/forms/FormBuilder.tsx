import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, Check, ChevronDown, LayoutGrid, Palette, Pencil, Settings2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import BuilderCanvas from './builder/BuilderCanvas';
import PreviewPanel from './builder/PreviewPanel';
import type { BuilderTab, FormSection, PreviewDevice } from './builder/types';

const WP_ELEMENTS = ['#wpadminbar', '#adminmenuwrap', '#adminmenuback'] as const;

const TABS: { value: BuilderTab; label: string; Icon: typeof LayoutGrid; pro?: boolean }[] = [
	{ value: 'builder', label: 'Builder', Icon: LayoutGrid },
	{ value: 'settings', label: 'Settings', Icon: Settings2 },
	{ value: 'styling', label: 'Styling', Icon: Palette, pro: true },
];

const FormBuilder = () => {
	const router = useRouter();
	const [formTitle, setFormTitle] = useState('Untitled Feedback Form');
	const [titleDraft, setTitleDraft] = useState('Untitled Feedback Form');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [activeTab, setActiveTab] = useState<BuilderTab>('builder');
	const [sections, setSections] = useState<FormSection[]>([]);
	const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
	const [previewWidth, setPreviewWidth] = useState(() => Math.round(window.innerWidth * 0.4));
	const [publishMenuOpen, setPublishMenuOpen] = useState(false);

	const titleInputRef = useRef<HTMLInputElement>(null);
	const publishMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const hidden: { el: HTMLElement; display: string }[] = [];
		WP_ELEMENTS.forEach((selector) => {
			const el = document.querySelector<HTMLElement>(selector);
			if (!el) return;
			hidden.push({ el, display: el.style.display });
			el.style.display = 'none';
		});

		const resets: { el: HTMLElement; prop: string; prev: string }[] = [];
		const reset = (selector: string, prop: keyof CSSStyleDeclaration, value: string) => {
			const el = document.querySelector<HTMLElement>(selector);
			if (!el) return;
			resets.push({
				el,
				prop: prop as string,
				prev: (el.style as Record<string, string>)[prop as string] ?? '',
			});
			(el.style as Record<string, string>)[prop as string] = value;
		};

		reset('html', 'marginTop', '0');
		reset('#wpbody', 'paddingTop', '0');
		reset('#wpcontent', 'marginLeft', '0');
		reset('#wpwrap', 'paddingTop', '0');

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

	const startResize = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const startX = e.clientX;
			const startWidth = previewWidth;

			const onMove = (ev: MouseEvent) => {
				const delta = startX - ev.clientX;
				setPreviewWidth(Math.max(320, Math.min(720, startWidth + delta)));
			};
			const onUp = () => {
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};

			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
		},
		[previewWidth],
	);

	const startEditingTitle = () => {
		setTitleDraft(formTitle);
		setIsEditingTitle(true);
	};

	const commitTitle = () => {
		setFormTitle(titleDraft.trim() || formTitle);
		setIsEditingTitle(false);
	};

	const cancelTitle = () => {
		setTitleDraft(formTitle);
		setIsEditingTitle(false);
	};

	return (
		<div className="fixed inset-0 z-[99999] flex flex-col bg-background">
			<header className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-white px-5">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => router.history.back()}
						aria-label={__('Back', 'all-feedback')}
					>
						<ArrowLeft className="size-4" />
					</Button>

					<span className="h-5 w-px bg-border" />

					{isEditingTitle ? (
						<div className="flex items-center gap-1.5">
							<input
								ref={titleInputRef}
								type="text"
								value={titleDraft}
								onChange={(e) => setTitleDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitTitle();
									if (e.key === 'Escape') cancelTitle();
								}}
								style={{ fontSize: '18px', fontWeight: 700 }}
								className="w-[300px] rounded-lg border border-border/70 bg-transparent px-3.5 py-2 text-foreground outline-none focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/10"
							/>
							<button
								type="button"
								onClick={commitTitle}
								className="flex size-7 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10"
							>
								<Check className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={cancelTitle}
								className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							>
								<X className="size-3.5" />
							</button>
						</div>
					) : (
						<button
							type="button"
							style={{ fontSize: '18px', fontWeight: 700 }}
							className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-foreground transition-colors hover:bg-muted/50"
							onDoubleClick={startEditingTitle}
							title={__('Double-click to edit', 'all-feedback')}
						>
							{formTitle}
							<Pencil className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
						</button>
					)}
				</div>

				<div ref={publishMenuRef} className="relative">
					<div className="flex items-stretch overflow-hidden rounded-lg shadow-sm" style={{ gap: 0 }}>
						<button
							type="button"
							style={{ margin: 0, border: 'none' }}
							className="h-10 bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-600 active:bg-brand-700"
						>
							{__('Publish', 'all-feedback')}
						</button>
						<button
							type="button"
							style={{ margin: 0, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
							onClick={() => setPublishMenuOpen((v) => !v)}
							className="flex h-10 items-center bg-primary px-3 text-primary-foreground transition-colors hover:bg-brand-600 active:bg-brand-700"
							aria-label={__('More publish options', 'all-feedback')}
						>
							<ChevronDown className="size-4" />
						</button>
					</div>

					{publishMenuOpen && (
						<div className="absolute right-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-[0_4px_16px_oklch(0_0_0/0.10),0_1px_4px_oklch(0_0_0/0.06)]">
							<button
								type="button"
								onClick={() => setPublishMenuOpen(false)}
								className="flex w-full items-center px-4 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted/60"
							>
								{__('Save as Draft', 'all-feedback')}
							</button>
						</div>
					)}
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="flex shrink-0 border-b border-border bg-white">
						{TABS.map(({ value, label, Icon, pro }) => (
							<button
								key={value}
								type="button"
								onClick={() => setActiveTab(value)}
								className={cn(
									'relative flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors cursor-pointer',
									activeTab === value
										? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
										: 'text-muted-foreground hover:text-foreground',
								)}
							>
								<Icon className="size-4" />
								{label}
								{pro && (
									<span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none bg-amber-100 text-amber-600">
										PRO
									</span>
								)}
							</button>
						))}
					</div>

					<div className="flex flex-1 overflow-hidden">
						{activeTab === 'builder' && (
							<BuilderCanvas sections={sections} onSectionsChange={setSections} />
						)}

						{activeTab === 'settings' && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Settings2 className="mx-auto mb-3 size-8 text-muted-foreground/30" />
									<p className="text-[14px] font-medium text-foreground">Form Settings</p>
									<p className="mt-1 text-[13px] text-muted-foreground">Coming soon</p>
								</div>
							</div>
						)}

						{activeTab === 'styling' && (
							<div className="flex flex-1 items-center justify-center">
								<div className="text-center">
									<Palette className="mx-auto mb-3 size-8 text-muted-foreground/30" />
									<p className="text-[14px] font-medium text-foreground">Form Styling</p>
									<p className="mt-1 text-[13px] text-muted-foreground">
										Available in{' '}
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

				<div style={{ width: previewWidth }} className="shrink-0 overflow-hidden">
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
