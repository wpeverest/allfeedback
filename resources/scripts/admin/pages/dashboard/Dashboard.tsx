/**
 * pages/dashboard/Dashboard.tsx
 *
 * Boilerplate welcome dashboard.
 * Replace / extend this page once you start building your plugin.
 */

import { __ } from '@wordpress/i18n';
import {
	Box,
	CheckCircle2,
	Code2,
	Database,
	Github,
	Layers,
	LayoutDashboard,
	PackageCheck,
	Rocket,
	ShieldCheck,
	Zap,
} from 'lucide-react';

// ── Feature cards ──────────────────────────────────────────────────────────
const FEATURES = [
	{
		icon:  Rocket,
		title: __( 'Modern Stack',         'new-plugin' ),
		desc:  __( 'React 18, TypeScript 5, TanStack Router & Query — production-ready out of the box.', 'new-plugin' ),
		badge: 'React 18',
	},
	{
		icon:  Layers,
		title: __( 'Module System',        'new-plugin' ),
		desc:  __( 'Enable or disable feature modules independently with full dependency resolution.', 'new-plugin' ),
		badge: 'PHP-DI',
	},
	{
		icon:  Zap,
		title: __( 'Feature Flags',        'new-plugin' ),
		desc:  __( 'Roll out features to a percentage of users or specific user IDs safely.', 'new-plugin' ),
		badge: 'Built-in',
	},
	{
		icon:  Box,
		title: __( 'REST API Scaffolding', 'new-plugin' ),
		desc:  __( 'Versioned REST endpoints with typed controllers wired up to the DI container.', 'new-plugin' ),
		badge: 'WP REST',
	},
];

// ── Quick-start steps ──────────────────────────────────────────────────────
const STEPS = [
	{
		step:  '01',
		title: __( 'Clone & rename',  'new-plugin' ),
		desc:  __( 'Clone this repo, then run `pnpm rename` to replace all boilerplate identifiers with your plugin\'s name, namespace, and prefix.', 'new-plugin' ),
		icon:  Code2,
	},
	{
		step:  '02',
		title: __( 'Install dependencies', 'new-plugin' ),
		desc:  __( 'Run `composer install` for PHP deps and `pnpm install` for JS deps. Both are fully configured and ready to go.', 'new-plugin' ),
		icon:  PackageCheck,
	},
	{
		step:  '03',
		title: __( 'Build assets',    'new-plugin' ),
		desc:  __( 'Run `pnpm build` for a production build, or `pnpm dev` to start the Webpack dev server with hot reload.', 'new-plugin' ),
		icon:  LayoutDashboard,
	},
	{
		step:  '04',
		title: __( 'Start building',  'new-plugin' ),
		desc:  __( 'Add routes in resources/scripts/admin/routes/, register REST controllers in src/API/, and create modules in src/Modules/.', 'new-plugin' ),
		icon:  Rocket,
	},
];

// ── Tech-stack pills ───────────────────────────────────────────────────────
const STACK = [
	'React 18', 'TypeScript 5', 'Tailwind v4', 'TanStack Router',
	'TanStack Query', 'PHP 8.2', 'PHP-DI', 'WP REST API', 'shadcn/ui', 'Webpack',
];

// ── Component ──────────────────────────────────────────────────────────────
const Dashboard = () => {
	return (
		<div className="min-h-screen space-y-6 p-4 md:p-8">

			{/* ── Hero ─────────────────────────────────────────────────── */}
			<div className="relative overflow-hidden rounded-2xl border border-border bg-white px-8 py-10 shadow-sm md:px-12 md:py-14">
				{/* decorative blobs */}
				<div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-primary/5" />
				<div className="pointer-events-none absolute -bottom-12 -left-12 size-56 rounded-full bg-primary/5" />

				{/* version badge */}
				<span className="absolute top-4 right-4 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
					v{__ALLFB_ADMIN__.version}
				</span>

				<p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-widest text-primary uppercase">
					<ShieldCheck className="size-3.5" />
					{__( 'WordPress Plugin Boilerplate', 'new-plugin' )}
				</p>

				<h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
					{__( 'All Feedback', 'new-plugin' )}
				</h1>

				<p className="mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
					{__( 'A modern, full-stack WordPress plugin starter — packed with a React SPA, module system, feature flags, REST API scaffolding, and a PHP-DI container. Clone it, rename it, ship it.', 'new-plugin' )}
				</p>

				{/* tech-stack pills */}
				<div className="mb-8 flex flex-wrap gap-2">
					{STACK.map( pill => (
						<span
							key={pill}
							className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
						>
							{pill}
						</span>
					) )}
				</div>

				{/* CTAs */}
				<div className="flex flex-wrap items-center gap-3">
					<a
						href="https://github.com/wpeverest/themegrill-boilerplate"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
					>
						<Github className="size-4" />
						{__( 'View on GitHub', 'new-plugin' )}
					</a>
				</div>
			</div>

			{/* ── Quick Start ───────────────────────────────────────────── */}
			<div>
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
					{__( 'Quick Start', 'new-plugin' )}
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{STEPS.map( ( { step, title, desc, icon: Icon } ) => (
						<div key={step} className="relative rounded-xl border border-border bg-white p-5 shadow-sm">
							<div className="mb-4 flex items-center justify-between">
								<div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Icon className="size-4" />
								</div>
								<span className="text-2xl font-extrabold text-border">{step}</span>
							</div>
							<h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
							<p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
						</div>
					) )}
				</div>
			</div>

			{/* ── Feature cards ─────────────────────────────────────────── */}
			<div>
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
					{__( "What's Included", 'new-plugin' )}
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{FEATURES.map( ( { icon: Icon, title, desc, badge } ) => (
						<div
							key={title}
							className="group rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="mb-3 flex items-start justify-between">
								<div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Icon className="size-5" />
								</div>
								<span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
									{badge}
								</span>
							</div>
							<h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
							<p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
						</div>
					) )}
				</div>
			</div>

			{/* ── Bottom info bar ───────────────────────────────────────── */}
			<div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-sm text-xs text-muted-foreground">
				<div className="flex items-center gap-4">
					<span className="flex items-center gap-1.5">
						<CheckCircle2 className="size-3.5 text-primary" />
						{__( 'PHP 8.2+ required', 'new-plugin' )}
					</span>
					<span className="flex items-center gap-1.5">
						<CheckCircle2 className="size-3.5 text-primary" />
						{__( 'WordPress 6.5+ required', 'new-plugin' )}
					</span>
					<span className="flex items-center gap-1.5">
						<Database className="size-3.5 text-primary" />
						{__( 'Auto migrations', 'new-plugin' )}
					</span>
				</div>
				<span className="font-medium text-foreground">
					All Feedback &mdash; v{__ALLFB_ADMIN__.version}
				</span>
			</div>

		</div>
	);
};

export default Dashboard;
