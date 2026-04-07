/**
 * admin/components/GlobalHeader.tsx
 *
 * Sticky top navigation bar for the admin SPA.
 * Tracks the current hash route and highlights the active nav item.
 *
 * To add a nav link: append an entry to NAV_ITEMS.
 * To add a disabled (coming-soon) entry: use { label, disabled: true }.
 */

import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ActiveNavItem   = { label: string; to: string };
type DisabledNavItem = { label: string; disabled: true };
type NavItem         = ActiveNavItem | DisabledNavItem;

// ── Navigation items — edit these to match your routes ───────────────
const NAV_ITEMS: NavItem[] = [
	{ label: __('Dashboard', 'all-feedback'), to: '/dashboard/' },
	// Add more items here as you create new routes.
	// { label: __('Settings', 'all-feedback'), to: '/settings/' },
	// { label: __('Reports',  'all-feedback'), to: '/reports/'  },
];

// ── Helpers ───────────────────────────────────────────────────────────

const getCurrentPath = (): string => {
	const hash = window.location.hash.slice(1); // strip leading #
	return hash.split('?')[0] || '/';           // strip search params
};

// ── Component ─────────────────────────────────────────────────────────

const GlobalHeader = () => {
	const [pathname, setPathname] = useState(getCurrentPath);
	const [menuOpen, setMenuOpen] = useState(false);

	// Sync pathname whenever TanStack Router navigates (hash changes).
	useEffect(() => {
		const handler = () => {
			setPathname(getCurrentPath());
			setMenuOpen(false);
		};
		window.addEventListener('rmb:navigate', handler);
		return () => window.removeEventListener('rmb:navigate', handler);
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
		<header className="sticky top-[var(--wp-admin--admin-bar--height,32px)] z-50 border-b border-gray-200 bg-white">
			<div className="flex h-[54px] items-center justify-between px-4 md:px-5">
				{/* Logo / brand */}
				<div className="flex shrink-0 items-center">
					<span className="text-[15px] font-bold text-primary">
						{__('All Feedback', 'all-feedback')}
					</span>
				</div>

				{/* Desktop nav — absolutely centred */}
				<nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 max-md:hidden">
					{NAV_ITEMS.map((item) => {
						if ('disabled' in item) {
							return (
								<span
									key={item.label}
									className="cursor-default rounded-full px-4 py-1.5 text-[13px] font-medium text-gray-400"
								>
									{item.label}
								</span>
							);
						}
						return (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
									isActive(item.to)
										? 'border border-primary/30 bg-primary/10 text-primary'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* Right side — version badge + hamburger */}
				<div className="flex shrink-0 items-center gap-2">
					<span className="rounded-full border border-primary/20 px-3 py-1 text-[12px] font-medium text-primary max-sm:hidden">
						v{__ALLFB_ADMIN__.version}
					</span>
					<button
						type="button"
						onClick={() => setMenuOpen((o) => !o)}
						className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 md:hidden"
					>
						{menuOpen ? <X className="size-[15px]" /> : <Menu className="size-[15px]" />}
					</button>
				</div>
			</div>

			{/* Mobile dropdown */}
			{menuOpen && (
				<nav className="border-t border-gray-100 px-3 py-2 md:hidden">
					{NAV_ITEMS.map((item) => {
						if ('disabled' in item) {
							return (
								<span
									key={item.label}
									className="flex cursor-default items-center rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-300"
								>
									{item.label}
								</span>
							);
						}
						return (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									'flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
									isActive(item.to)
										? 'bg-primary/10 text-primary'
										: 'text-gray-700 hover:bg-gray-100',
								)}
							>
								{item.label}
							</Link>
						);
					})}
					<div className="mt-2 border-t border-gray-100 pt-2">
						<span className="px-3 py-1 text-[12px] text-gray-400">
							v{__ALLFB_ADMIN__.version}
						</span>
					</div>
				</nav>
			)}
		</header>
	);
};

export default GlobalHeader;
