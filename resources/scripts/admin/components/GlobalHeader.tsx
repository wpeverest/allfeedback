import { unreadCountQuery } from '@/admin/queries/surveys';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AllFeedbackLogo from '@/admin/components/AllFeedbackLogo';

type ActiveNavItem = { label: string; to: string };
type DisabledNavItem = { label: string; disabled: true };
type NavItem = ActiveNavItem | DisabledNavItem;

const NAV_ITEMS: NavItem[] = [
	{ label: __('Analytics', 'allfeedback'), to: '/analytics/' },
	{ label: __('All Forms', 'allfeedback'), to: '/forms/' },
	{ label: __('Responses', 'allfeedback'), to: '/responses/' },
	{ label: __('Settings', 'allfeedback'), to: '/settings/' },
	{ label: __('Tools', 'allfeedback'), to: '/tools/' },
	{ label: __('About', 'allfeedback'), to: '/about/' },
];

const getCurrentPath = (): string => {
	const hash = window.location.hash.slice(1);
	return hash.split('?')[0] || '/';
};

const GlobalHeader = () => {
	const navigate = useNavigate();
	const [pathname, setPathname] = useState(getCurrentPath);
	const [menuOpen, setMenuOpen] = useState(false);

	const { data: unreadData } = useQuery(unreadCountQuery());
	const unreadCount = unreadData?.count ?? 0;

	useEffect(() => {
		const link = document.querySelector<HTMLElement>(
			'#adminmenu a[href*="allfeedback%23%2Fresponses"], #adminmenu a[href*="allfeedback#/responses"]',
		);
		if (!link) return;

		let badge = link.querySelector<HTMLElement>('.awaiting-mod');

		if (unreadCount > 0) {
			if (!badge) {
				badge = document.createElement('span');
				badge.innerHTML = '<span class="pending-count"></span>';
				link.appendChild(badge);
			}
			badge.className = `awaiting-mod count-${unreadCount}`;
			const pending = badge.querySelector('.pending-count');
			if (pending) pending.textContent = String(unreadCount);
		} else if (badge) {
			badge.remove();
		}
	}, [unreadCount]);

	useEffect(() => {
		const handler = () => {
			setPathname(getCurrentPath());
			setMenuOpen(false);
		};
		window.addEventListener('allfeedback:navigate', handler);
		window.addEventListener('hashchange', handler);
		return () => {
			window.removeEventListener('allfeedback:navigate', handler);
			window.removeEventListener('hashchange', handler);
		};
	}, []);

	const isActive = (to: string): boolean => {
		const base = to.replace(/\/$/, '');
		return (
			pathname === base ||
			pathname === base + '/' ||
			pathname.startsWith(base + '/')
		);
	};

	return (
		<header className="border-border z-50 border-b bg-white">
			<div className="flex h-[60px] items-center px-5">
				<div className="flex shrink-0 items-center gap-2">
					<AllFeedbackLogo className="size-[30px]" />
					<span className="text-md text-foreground tracking-tight">
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
									className="text-muted-foreground/50 cursor-default px-3.5 py-1.5 text-base font-medium"
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
									'rounded-full border-[1.5px] px-3.5 py-1.5 text-base font-medium transition-colors',
									'outline-none focus:!rounded-full focus:shadow-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
									active
										? 'border-brand-400 bg-primary/[0.06] text-primary border-[1.5px]'
										: 'text-muted-foreground hover:text-foreground border-transparent',
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-2">
					<Badge
						variant="secondary"
						className="border-brand-400 border-[1.5px] bg-white px-2.5 py-1 text-base font-medium"
					>
						v{__ALLFB_ADMIN__.version}
					</Badge>
					<button
						type="button"
						aria-label={
							menuOpen
								? __('Close menu', 'allfeedback')
								: __('Open menu', 'allfeedback')
						}
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen((o) => !o)}
						className="border-border text-muted-foreground hover:border-brand-400 hover:text-foreground flex size-8 items-center justify-center rounded-full border-[1.5px] transition-colors md:hidden"
					>
						{menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
					</button>
				</div>
			</div>

			{menuOpen && (
				<nav className="border-border border-t bg-white py-1 md:hidden">
					{NAV_ITEMS.map((item) => {
						if ('disabled' in item) {
							return (
								<span
									key={item.label}
									className="text-muted-foreground/40 flex cursor-default items-center px-5 py-3 text-base font-medium"
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
									'flex w-full items-center px-5 py-3 text-base transition-colors',
									active
										? 'bg-primary/[0.06] text-foreground font-semibold'
										: 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium',
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
