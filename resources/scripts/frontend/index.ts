/**
 * frontend/index.ts — Public-facing script entry point
 *
 * Loaded on any page where the [all_feedback] shortcode is
 * rendered. Add interactive widget logic here as needed.
 *
 * The stylesheet (resources/styles/frontend.pcss) is imported so that
 * webpack / @wordpress/scripts bundles it as frontend.css.
 */

import '../../styles/frontend.pcss';

// ── Widget initialisation ─────────────────────────────────────────────

function initWidgets(): void {
	const widgets = document.querySelectorAll<HTMLElement>('.allfb-sample-widget');

	widgets.forEach((widget) => {
		// Example: add an active class after mount so CSS transitions work.
		widget.classList.add('is-ready');

		// Example: handle any click interactions within the widget.
		widget.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[data-allfb-action]')) {
				const action = (target.closest('[data-allfb-action]') as HTMLElement)
					.dataset.rmbAction;
				// Dispatch a custom event so external code can hook in.
				widget.dispatchEvent(
					new CustomEvent('rmb:widget:action', {
						bubbles: true,
						detail:  { action },
					}),
				);
			}
		});
	});
}

// Run after the DOM is ready.
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initWidgets);
} else {
	initWidgets();
}
