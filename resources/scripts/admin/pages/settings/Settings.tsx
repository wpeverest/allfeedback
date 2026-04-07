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
];

void [Bell, Key, Palette, Sliders];

const Settings = () => {
	return (
		<div className="p-5 md:p-6">
			<div className="mx-auto max-w-6xl">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start">

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

					<div className="min-w-0 flex-1 rounded-xl border border-border bg-card">
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Settings;
