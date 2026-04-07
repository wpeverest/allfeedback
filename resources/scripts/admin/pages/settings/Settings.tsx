/**
 * pages/settings/Settings.tsx — Settings page layout
 *
 * Renders a sidebar navigation and an <Outlet /> for nested setting
 * tab routes (/_app/settings/general, etc.).
 */

import type { FileRoutesByFullPath } from '@/admin/routeTree.gen';
import { Link, Outlet } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Settings2 } from 'lucide-react';

type SettingsPath = Exclude<
	Extract<keyof FileRoutesByFullPath, `/settings/${string}`>,
	'/settings/'
>;

type NavItem = {
	label: string;
	icon:  React.ComponentType<{ className?: string }>;
	to:    SettingsPath;
};

const NAV_ITEMS: NavItem[] = [
	{
		label: __('General', 'all-feedback'),
		icon:  Settings2,
		to:    '/settings/general',
	},
];

const Settings = () => {
	return (
		<div className="min-h-screen p-4 md:p-6">
			<div className="mx-auto max-w-7xl">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">

					{/* Sidebar */}
					<div className="rounded-xl bg-white lg:w-[280px] lg:shrink-0 lg:py-5">
						<p className="mb-3 hidden px-5 text-[11px] font-semibold tracking-widest text-gray-400 uppercase lg:block">
							{__('Settings', 'all-feedback')}
						</p>

						<nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:gap-1.5 lg:py-0">
							{NAV_ITEMS.map(({ label, icon: Icon, to }) => (
								<Link
									key={to}
									to={to}
									type="button"
									className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 data-[status=active]:bg-primary/10 data-[status=active]:text-primary lg:w-full lg:text-start"
								>
									<Icon className="size-4 shrink-0 text-gray-400 group-data-[status=active]:text-primary" />
									<span className="whitespace-nowrap">{label}</span>
								</Link>
							))}
						</nav>
					</div>

					{/* Content panel */}
					<div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-white">
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Settings;
