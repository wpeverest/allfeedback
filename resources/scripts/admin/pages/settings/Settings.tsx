/**
 * pages/settings/Settings.tsx — Settings page layout
 *
 * Renders a sidebar navigation and an <Outlet /> for nested settings tabs.
 * Add new settings sections by appending to NAV_ITEMS and creating
 * corresponding route files under routes/_app/settings.*.tsx.
 */

import type { FileRoutesByFullPath } from '@/admin/routeTree.gen';
import { Link, Outlet } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Bell, Key, Palette, Settings2, Sliders } from 'lucide-react';

type SettingsPath = Exclude<
	Extract<keyof FileRoutesByFullPath, `/settings/${string}`>,
	'/settings/'
>;

type NavItem = {
	label:       string;
	description: string;
	icon:        React.ComponentType<{ className?: string }>;
	to:          SettingsPath;
};

const NAV_ITEMS: NavItem[] = [
	{
		label:       __('General',       'all-feedback'),
		description: __('Plugin name, defaults', 'all-feedback'),
		icon:        Settings2,
		to:          '/settings/general',
	},
	// Uncomment as you add more settings routes:
	// {
	// 	label:       __('Appearance',   'all-feedback'),
	// 	description: __('Colors, typography', 'all-feedback'),
	// 	icon:        Palette,
	// 	to:          '/settings/appearance',
	// },
	// {
	// 	label:       __('Notifications', 'all-feedback'),
	// 	description: __('Email alerts', 'all-feedback'),
	// 	icon:        Bell,
	// 	to:          '/settings/notifications',
	// },
	// {
	// 	label:       __('Integrations',  'all-feedback'),
	// 	description: __('Third-party services', 'all-feedback'),
	// 	icon:        Sliders,
	// 	to:          '/settings/integrations',
	// },
	// {
	// 	label:       __('API Keys',      'all-feedback'),
	// 	description: __('Access & security', 'all-feedback'),
	// 	icon:        Key,
	// 	to:          '/settings/api',
	// },
];

// Suppress unused import warnings until the nav items are uncommented.
void [Bell, Key, Palette, Sliders];

const Settings = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="mx-auto max-w-6xl">
				{/* Page title */}
				<div className="mb-5">
					<h1 className="text-lg font-semibold text-foreground">
						{__('Settings', 'all-feedback')}
					</h1>
					<p className="text-sm text-muted-foreground">
						{__('Configure AllFeedback to fit your workflow.', 'all-feedback')}
					</p>
				</div>

				<div className="flex flex-col gap-5 lg:flex-row lg:items-start">

					{/* ── Sidebar ─────────────────────────────────────────── */}
					<nav
						aria-label={__('Settings navigation', 'all-feedback')}
						className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:shrink-0 lg:gap-0.5"
					>
						{NAV_ITEMS.map(({ label, description, icon: Icon, to }) => (
							<Link
								key={to}
								to={to}
								className="group flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted data-[status=active]:bg-primary/10 lg:w-full"
							>
								<Icon className="size-4 shrink-0 text-muted-foreground group-data-[status=active]:text-primary" />
								<div className="min-w-0">
									<p className="truncate font-medium text-foreground group-data-[status=active]:text-primary">
										{label}
									</p>
									<p className="hidden truncate text-xs text-muted-foreground lg:block">
										{description}
									</p>
								</div>
							</Link>
						))}
					</nav>

					{/* ── Content panel ───────────────────────────────────── */}
					<div className="min-w-0 flex-1 rounded-xl border border-border bg-card">
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Settings;
