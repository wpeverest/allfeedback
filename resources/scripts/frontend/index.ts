import '../../styles/frontend.pcss';

function initWidgets(): void {
	const widgets = document.querySelectorAll<HTMLElement>('.allfb-sample-widget');

	widgets.forEach((widget) => {

		widget.classList.add('is-ready');

		widget.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[data-allfb-action]')) {
				const action = (target.closest('[data-allfb-action]') as HTMLElement)
					.dataset.rmbAction;

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

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initWidgets);
} else {
	initWidgets();
}
