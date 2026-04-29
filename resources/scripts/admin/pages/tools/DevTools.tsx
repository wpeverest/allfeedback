import { Button } from '@/components/ui/button';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	RotateCcw,
	ScrollText,
	Settings2,
	Trash2,
	Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';

type Status = 'idle' | 'seeding' | 'clearing' | 'done' | 'error';

const DevTools = () => {
	const [surveys, setSurveys] = useState(5);
	const [perSurvey, setPerSurvey] = useState(500);
	const [status, setStatus] = useState<Status>('idle');
	const [message, setMessage] = useState('');
	const [clearConfirm, setClearConfirm] = useState(false);
	const [quickStatus, setQuickStatus] = useState<Record<string, 'idle' | 'busy' | 'done' | 'error'>>({});

	const setQuick = (key: string, s: 'idle' | 'busy' | 'done' | 'error') =>
		setQuickStatus((p) => ({ ...p, [key]: s }));

	const runQuick = async (key: string, path: string, method = 'POST') => {
		setQuick(key, 'busy');
		try {
			await apiFetch({ path, method });
			setQuick(key, 'done');
			setTimeout(() => setQuick(key, 'idle'), 2000);
		} catch {
			setQuick(key, 'error');
			setTimeout(() => setQuick(key, 'idle'), 3000);
		}
	};

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

			<div className="mt-8 border-t border-border/50 pt-5 space-y-3">
				<p className="text-sm font-semibold tracking-widest uppercase text-foreground/50">{__('Quick Actions', 'allfeedback')}</p>
				<div className="flex flex-wrap gap-2">
					{([
						{ key: 'wizard',   label: __('Reset Wizard',    'allfeedback'), icon: RotateCcw,  path: '/allfeedback/v1/dev-tools/reset-wizard',   method: 'POST'   },
						{ key: 'logs',     label: __('Clear Logs',      'allfeedback'), icon: ScrollText, path: '/allfeedback/v1/dev-tools/logs',            method: 'DELETE' },
						{ key: 'settings', label: __('Reset Settings',  'allfeedback'), icon: Settings2,  path: '/allfeedback/v1/dev-tools/reset-settings',  method: 'POST'   },
					] as const).map(({ key, label, icon: Icon, path, method }) => {
						const s = quickStatus[key] ?? 'idle';
						return (
							<Button key={key} variant="outline" size="sm" disabled={s === 'busy'} onClick={() => runQuick(key, path, method)} className="gap-1.5 text-xs">
								{s === 'busy' ? <Loader2 className="size-3.5 animate-spin" /> : s === 'done' ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : s === 'error' ? <AlertTriangle className="size-3.5 text-destructive" /> : <Icon className="size-3.5" />}
								{label}
							</Button>
						);
					})}
				</div>
				<Link to="/wizard/" className="block text-sm text-primary/70 hover:text-primary transition-colors">
					{__('→ Open Setup Wizard', 'allfeedback')}
				</Link>
			</div>
		</div>
	);
};

export default DevTools;
