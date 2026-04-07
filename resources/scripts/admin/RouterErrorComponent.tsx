/**
 * admin/RouterErrorComponent.tsx
 *
 * Displayed by TanStack Router when a route loader throws or a component
 * crashes. Provides a "Go back" action and shows the error detail.
 */

import { __ } from '@wordpress/i18n';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

type Props = { error: Error; reset: () => void };

export function RouterErrorComponent({ error }: Props) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
				<div className="mb-4 text-center">
					<span className="inline-flex items-center gap-2">
						<AlertTriangle className="size-4 shrink-0 text-red-500" />
						<span className="text-[15px] font-semibold text-gray-900">
							{__('Something went wrong', 'all-feedback')}
						</span>
					</span>
				</div>

				<p className="mb-4 text-center text-[13px] text-red-400">
					{error.message || __('An unexpected error occurred.', 'all-feedback')}
				</p>

				{error.stack && (
					<pre className="mb-6 max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-[11px] break-all whitespace-pre-wrap text-gray-400">
						{error.stack}
					</pre>
				)}

				<div className="flex justify-center">
					<button
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
						onClick={() => window.history.back()}
					>
						<ArrowLeft className="size-3.5" />
						{__('Go back', 'all-feedback')}
					</button>
				</div>
			</div>
		</div>
	);
}
