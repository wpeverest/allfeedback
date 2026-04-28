import { Button } from '@/components/ui/button';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	Trash2,
	Wand2,
} from 'lucide-react';
import { useState } from 'react';

type Status = 'idle' | 'seeding' | 'clearing' | 'done' | 'error';

const DevTools = () => {
	const [surveys, setSurveys] = useState(5);
	const [perSurvey, setPerSurvey] = useState(500);
	const [status, setStatus] = useState<Status>('idle');
	const [message, setMessage] = useState('');
	const [clearConfirm, setClearConfirm] = useState(false);

	const seed = async () => {
		setStatus('seeding');
		setMessage('');
		try {
			const res = await apiFetch<{ data: { surveys: number; responses: number; sessions: number } }>({
				path:   '/allfeedback/v1/dev-tools/seed',
				method: 'POST',
				data: { surveys, responses_per_survey: perSurvey },
			});
			setStatus('done');
			setMessage(
				sprintf(
					__('Created %1$d surveys · %2$d responses · %3$d sessions.', 'allfeedback'),
					res.data.surveys,
					res.data.responses,
					res.data.sessions,
				),
			);
		} catch (e: unknown) {
			setStatus('error');
			setMessage(
				e instanceof Error ? e.message : __('Seeding failed.', 'allfeedback'),
			);
		}
	};

	const clear = async () => {
		setStatus('clearing');
		setMessage('');
		setClearConfirm(false);
		try {
			const res = await apiFetch<{ data: { deleted_surveys: number; deleted_responses: number; deleted_sessions: number } }>({
				path:   '/allfeedback/v1/dev-tools/seed',
				method: 'DELETE',
			});
			setStatus('done');
			setMessage(
				sprintf(
					__('Deleted %1$d surveys · %2$d responses · %3$d sessions.', 'allfeedback'),
					res.data.deleted_surveys,
					res.data.deleted_responses,
					res.data.deleted_sessions,
				),
			);
		} catch (e: unknown) {
			setStatus('error');
			setMessage(
				e instanceof Error ? e.message : __('Clear failed.', 'allfeedback'),
			);
		}
	};

	const busy = status === 'seeding' || status === 'clearing';

	return (
		<div className="p-6 md:p-8">
			{/* Header */}
			<div className="mb-6 flex items-center gap-3">
				<div className="bg-warning/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<AlertTriangle className="text-warning size-5" />
				</div>
				<div>
					<h2 className="text-foreground !mb-2 text-lg font-semibold">
						{__('Dev Tools — Fake Data Generator', 'allfeedback')}
					</h2>
					<p className="text-muted-foreground !my-0 mt-0.5 text-sm">
						{__(
							'Only visible when WP_DEBUG is enabled. Seeded data is tracked and can be cleared in bulk.',
							'allfeedback',
						)}
					</p>
				</div>
			</div>

			{/* Controls */}
			<div className="border-border bg-muted/30 mb-6 rounded-xl border p-5">
				<div className="grid gap-5 sm:grid-cols-2">
					{/* Survey count */}
					<div className="flex flex-col gap-1.5">
						<label className="text-foreground text-sm font-medium">
							{__('Number of forms', 'allfeedback')}
							<span className="text-muted-foreground ml-1 font-normal">
								(1 – 20)
							</span>
						</label>
						<input
							type="number"
							min={1}
							max={20}
							value={surveys}
							onChange={(e) =>
								setSurveys(Math.min(20, Math.max(1, Number(e.target.value))))
							}
							disabled={busy}
							className="border-input bg-background focus:ring-primary h-9 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
						/>
					</div>

					{/* Responses per survey */}
					<div className="flex flex-col gap-1.5">
						<label className="text-foreground text-sm font-medium">
							{__('Responses per form', 'allfeedback')}
							<span className="text-muted-foreground ml-1 font-normal">
								(10 – 5 000)
							</span>
						</label>
						<input
							type="number"
							min={10}
							max={5000}
							step={10}
							value={perSurvey}
							onChange={(e) =>
								setPerSurvey(
									Math.min(5000, Math.max(10, Number(e.target.value))),
								)
							}
							disabled={busy}
							className="border-input bg-background focus:ring-primary h-9 w-full rounded-lg border px-3 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
						/>
					</div>
				</div>

				{/* Total estimate */}
				<p className="text-muted-foreground mt-3 text-xs">
					{sprintf(
						__(
							'Will insert %d forms × %d responses = %d total records.',
							'allfeedback',
						),
						surveys,
						perSurvey,
						surveys * perSurvey,
					)}
				</p>
			</div>

			{/* Actions */}
			<div className="flex flex-wrap items-center gap-3">
				<Button onClick={seed} disabled={busy} className="gap-2">
					{status === 'seeding' ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Wand2 className="size-4" />
					)}
					{status === 'seeding'
						? __('Generating…', 'allfeedback')
						: __('Generate fake data', 'allfeedback')}
				</Button>

				{!clearConfirm ? (
					<Button
						variant="outline"
						onClick={() => setClearConfirm(true)}
						disabled={busy}
						className="gap-2"
					>
						<Trash2 className="size-4" />
						{__('Clear seeded data', 'allfeedback')}
					</Button>
				) : (
					<div className="flex items-center gap-2">
						<span className="text-destructive text-sm font-medium">
							{__('Are you sure?', 'allfeedback')}
						</span>
						<Button
							variant="destructive"
							onClick={clear}
							disabled={busy}
							className="gap-2"
						>
							{status === 'clearing' ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Trash2 className="size-4" />
							)}
							{status === 'clearing'
								? __('Clearing…', 'allfeedback')
								: __('Yes, delete all', 'allfeedback')}
						</Button>
						<Button
							variant="ghost"
							onClick={() => setClearConfirm(false)}
							disabled={busy}
						>
							{__('Cancel', 'allfeedback')}
						</Button>
					</div>
				)}
			</div>

			{/* Status message */}
			{message && (
				<div
					className={`mt-5 flex items-start gap-2.5 rounded-lg border p-4 text-sm ${
						status === 'error'
							? 'border-destructive/30 bg-destructive/5 text-destructive'
							: 'border-emerald-200 bg-emerald-50 text-emerald-800'
					}`}
				>
					{status === 'error' ? (
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
					) : (
						<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
					)}
					{message}
				</div>
			)}
		</div>
	);
};

export default DevTools;
