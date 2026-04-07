import { Button } from '@/components/ui/button';
import { useRouter } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';

const WP_ELEMENTS = [
	'#wpadminbar',
	'#adminmenuwrap',
	'#adminmenuback',
] as const;

const FormBuilder = () => {
	const router = useRouter();

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
			resets.push({ el, prop: prop as string, prev: el.style[prop as string] ?? '' });
			(el.style as Record<string, string>)[prop as string] = value;
		};

		reset('html',        'marginTop',   '0');
		reset('#wpbody',     'paddingTop',  '0');
		reset('#wpcontent',  'marginLeft',  '0');
		reset('#wpwrap',     'paddingTop',  '0');

		return () => {
			hidden.forEach(({ el, display }) => (el.style.display = display));
			resets.forEach(({ el, prop, prev }) => ((el.style as Record<string, string>)[prop] = prev));
		};
	}, []);

	return (
		<div className="fixed inset-0 z-[99999] flex flex-col bg-background">

			<header className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-white px-5">
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.history.back()}
					>
						<ArrowLeft />
						{__('Back', 'all-feedback')}
					</Button>

					<div className="h-4 w-px bg-border" />

					<div className="flex items-center gap-2">
						<div className="flex size-[26px] items-center justify-center rounded-md bg-primary">
							<MessageSquare className="size-[13px] text-white" />
						</div>
						<span className="text-[14px] tracking-tight text-foreground">
							<strong className="font-bold">All</strong>
							<span className="font-normal">Feedback</span>
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						{__('Preview', 'all-feedback')}
					</Button>
					<Button size="sm">
						{__('Save Form', 'all-feedback')}
					</Button>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">

				<aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
					<div className="border-b border-border px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{__('Form Fields', 'all-feedback')}
						</p>
					</div>
					<div className="flex-1 overflow-y-auto p-3">
						<div className="space-y-1">
							{[
								__('Star Rating',    'all-feedback'),
								__('Text Input',     'all-feedback'),
								__('Textarea',       'all-feedback'),
								__('Multiple Choice','all-feedback'),
								__('Checkbox',       'all-feedback'),
								__('Dropdown',       'all-feedback'),
								__('NPS Score',      'all-feedback'),
								__('Email',          'all-feedback'),
							].map((field) => (
								<button
									key={field}
									type="button"
									className="flex w-full items-center rounded-lg border border-border bg-white px-3 py-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:border-brand-400 hover:bg-primary/[0.04]"
								>
									{field}
								</button>
							))}
						</div>
					</div>
				</aside>

				<main className="flex flex-1 flex-col items-center overflow-y-auto bg-muted/40 p-8">
					<div className="w-full max-w-lg">
						<div className="mb-4">
							<input
								type="text"
								defaultValue={__('Untitled Form', 'all-feedback')}
								className="w-full border-0 bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
							/>
							<input
								type="text"
								placeholder={__('Form description (optional)', 'all-feedback')}
								className="mt-1 w-full border-0 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
							/>
						</div>

						<div className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-white p-8 text-center">
							<div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
								<MessageSquare className="size-5 text-muted-foreground" />
							</div>
							<p className="text-sm font-medium text-foreground">
								{__('Add fields to your form', 'all-feedback')}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{__('Click a field type from the left panel to add it here.', 'all-feedback')}
							</p>
						</div>
					</div>
				</main>

				<aside className="flex w-60 shrink-0 flex-col border-l border-border bg-white">
					<div className="border-b border-border px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{__('Field Settings', 'all-feedback')}
						</p>
					</div>
					<div className="flex flex-1 items-center justify-center p-4 text-center">
						<p className="text-xs text-muted-foreground">
							{__('Select a field to edit its settings.', 'all-feedback')}
						</p>
					</div>
				</aside>
			</div>
		</div>
	);
};

export default FormBuilder;
