import { __ } from '@wordpress/i18n';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {

		console.error('[RMB]', error, info.componentStack);
	}

	render() {
		const { error } = this.state;

		if (error) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
					<div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
							<AlertTriangle className="size-5 text-red-500" />
						</div>
						<h2 className="mb-1 text-center text-[15px] font-semibold text-gray-900">
							{__('Something went wrong', 'all-feedback')}
						</h2>
						<p className="mb-4 text-center text-[13px] text-gray-400">
							{error.message || __('An unexpected error occurred.', 'all-feedback')}
						</p>
						<div className="flex justify-center">
							<button
								className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
								onClick={() => this.setState({ error: null })}
							>
								<RefreshCw className="size-3.5" />
								{__('Try again', 'all-feedback')}
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
