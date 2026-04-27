import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

type Props = { error: Error };

export function RouterErrorComponent({ error }: Props) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
				<div className="mb-4 text-center">
					<span className="inline-flex items-center gap-2">
						<AlertTriangle className="size-4 shrink-0 text-red-500" />
						<span className="text-md text-foreground font-semibold">
							{__('Something went wrong', 'allfeedback')}
						</span>
					</span>
				</div>

				<p className="mb-4 text-center text-sm text-red-400">
					{error.message || __('An unexpected error occurred.', 'allfeedback')}
				</p>

				{error.stack && (
					<pre className="text-2xs mb-6 max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono break-all whitespace-pre-wrap text-gray-400">
						{error.stack}
					</pre>
				)}

				<div className="flex justify-center">
					<Button size="sm" onClick={() => window.history.back()}>
						<ArrowLeft className="size-3.5" />
						{__('Go back', 'allfeedback')}
					</Button>
				</div>
			</div>
		</div>
	);
}
