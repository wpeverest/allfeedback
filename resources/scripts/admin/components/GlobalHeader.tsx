import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Menu, MessageSquare, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ActiveNavItem   = { label: string; to: string };
type DisabledNavItem = { label: string; disabled: true };
type NavItem         = ActiveNavItem | DisabledNavItem;

const NAV_ITEMS: NavItem[] = [
	{ label: __('Dashboard',  'all-feedback'), to: '/dashboard/'  },
	{ label: __('Analytics',  'all-feedback'), to: '/analytics/'  },
	{ label: __('All Forms',  'all-feedback'), to: '/forms/'      },
	{ label: __('Responses',  'all-feedback'), to: '/responses/'  },
	{ label: __('Settings',   'all-feedback'), to: '/settings/'   },
];

const getCurrentPath = (): string => {
	const hash = window.location.hash.slice(1);
	return hash.split('?')[0] || '/';
};

const GlobalHeader = () => {
	const navigate  = useNavigate();
	const [pathname, setPathname] = useState(getCurrentPath);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		const handler = () => {
			setPathname(getCurrentPath());
			setMenuOpen(false);
		};
		window.addEventListener('rmb:navigate', handler);
		window.addEventListener('hashchange', handler);
		return () => {
			window.removeEventListener('rmb:navigate', handler);
			window.removeEventListener('hashchange', handler);
		};
	}, []);

	const isActive = (to: string): boolean => {
		const base = to.replace(/\/$/, '');
		return pathname === base || pathname === base + '/' || pathname.startsWith(base + '/');
	};

	return (
		<header className="sticky top-[var(--wp-admin--admin-bar--height,32px)] z-50 border-b border-border bg-white">
			<div className="flex h-[54px] items-center px-5">

				<div className="flex shrink-0 items-center gap-2">
					<div className="flex size-[30px] items-center justify-center rounded-md bg-primary">
						<MessageSquare className="size-[15px] text-white" />
					</div>
					<span className="text-[15px] tracking-tight text-foreground">
						<strong className="font-bold">All</strong>
						<span className="font-normal">Feedback</span>
					</span>
				</div>

				<nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 max-md:hidden">
					{NAV_ITEMS.map((item) => {
						if ('disabled' in item) {
							return (
								<span
									key={item.label}
									className="cursor-default px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground/50"
								>
									{item.label}
								</span>
							);
						}
						const active = isActive(item.to);
						return (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									'rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium transition-colors',
									active
										? 'border-[1.5px] border-brand-400 bg-primary/[0.06] text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground',
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-2">
					<Badge variant="secondary" className="border-[1.5px] border-brand-400 bg-white px-2.5 py-1 text-[13px] font-medium">
						v{__ALLFB_ADMIN__.version}
					</Badge>
					<button
						type="button"
						aria-label={menuOpen ? __('Close menu', 'all-feedback') : __('Open menu', 'all-feedback')}
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen((o) => !o)}
						className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-border text-muted-foreground transition-colors hover:border-brand-400 hover:text-foreground md:hidden"
					>
						{menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
					</button>
				</div>
			</div>

			{menuOpen && (
				<nav className="border-t border-border bg-white py-1 md:hidden">
					{NAV_ITEMS.map((item) => {
						if ('disabled' in item) {
							return (
								<span
									key={item.label}
									className="flex cursor-default items-center px-5 py-3 text-[13px] font-medium text-muted-foreground/40"
								>
									{item.label}
								</span>
							);
						}
						const active = isActive(item.to);
						return (
							<button
								key={item.to}
								type="button"
								onClick={() => {
									setMenuOpen(false);
									void navigate({ to: item.to });
								}}
								className={cn(
									'flex w-full items-center px-5 py-3 text-[13px] transition-colors',
									active
										? 'bg-primary/[0.06] font-semibold text-foreground'
										: 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
								)}
							>
								{item.label}
							</button>
						);
					})}
				</nav>
			)}
		</header>
	);
};

export default GlobalHeader;
