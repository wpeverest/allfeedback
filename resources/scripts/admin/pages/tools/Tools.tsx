import { Link, Outlet } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Info, ScrollText } from 'lucide-react';

type NavItem = {
	label: string;
	icon:  React.ComponentType<{ className?: string }>;
	to:    '/tools/system-info' | '/tools/logs';
};

const NAV_ITEMS: NavItem[] = [
	{
		label: __('System Info', 'all-feedback'),
		icon:  Info,
		to:    '/tools/system-info',
	},
	{
		label: __('Logs', 'all-feedback'),
		icon:  ScrollText,
		to:    '/tools/logs',
	},
];

const Tools = () => (
	<div className="p-6 md:p-8">
		<div className="mx-auto max-w-[1340px]">
			<div className="flex flex-col gap-6 lg:flex-row lg:items-start">

				<nav
					aria-label={__('Tools navigation', 'all-feedback')}
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
);

export default Tools;
