import type { FileRoutesByFullPath } from '@/admin/routeTree.gen';
import { Link, Outlet, useBlocker } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Settings2, SlidersHorizontal } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

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
	{
		label: __('Advanced', 'all-feedback'),
		icon:  SlidersHorizontal,
		to:    '/settings/advanced',
	},
];

type SettingsDirtyCtx = {
	isDirty: boolean;
	setDirty: (key: string, dirty: boolean) => void;
};

export const SettingsDirtyContext = createContext<SettingsDirtyCtx>({
	isDirty: false,
	setDirty: () => {},
});

export const useSettingsDirty = () => useContext(SettingsDirtyContext);

const Settings = () => {
	const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
	const anyDirty = Object.values(dirtyMap).some(Boolean);

	const setDirty = useCallback((key: string, dirty: boolean) => {
		setDirtyMap((prev) => ({ ...prev, [key]: dirty }));
	}, []);

	useBlocker({
		shouldBlockFn: ({ next }) => {
			if (!anyDirty) return false;
			if (next.pathname.startsWith('/settings')) return false;
			return !window.confirm(
				__('You have unsaved changes. Are you sure you want to leave?', 'all-feedback'),
			);
		},
		enableBeforeUnload: () => anyDirty,
	});

	return (
		<SettingsDirtyContext.Provider value={{ isDirty: anyDirty, setDirty }}>
			<div className="p-6 md:p-8">
				<div className="mx-auto max-w-[1340px]">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-start">

						<nav
							aria-label={__('Settings navigation', 'all-feedback')}
							className="flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-white p-3 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1"
						>
							{NAV_ITEMS.map(({ label, icon: Icon, to }) => (
								<Link
									key={to}
									to={to}
									className="group flex shrink-0 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-[500] text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary lg:w-full"
								>
									<Icon className="size-[18px] shrink-0 text-muted-foreground/50 transition-colors group-data-[status=active]:text-primary" />
									{label}
								</Link>
							))}
						</nav>

						<div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-white">
							<Outlet />
						</div>
					</div>
				</div>
			</div>

		</SettingsDirtyContext.Provider>
	);
};

export default Settings;
