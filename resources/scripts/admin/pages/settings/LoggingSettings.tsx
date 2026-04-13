import { settingsApi } from '@/admin/api/settings';
import type { Settings } from '@/admin/api/settings';
import { settingsQuery } from '@/admin/queries/settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Loader2, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const labelCls = 'text-[13.5px] font-normal text-foreground/80';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-center gap-4">
		<label className={cn(labelCls, 'w-[38%] shrink-0')}>{label}</label>
		<div className="min-w-0 flex-1">{children}</div>
	</div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={onChange}
		className={cn(
			'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
			checked ? 'bg-primary' : 'bg-muted-foreground/25',
		)}
	>
		<span className={cn(
			'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
			checked ? 'translate-x-4' : 'translate-x-0',
		)} />
	</button>
);

const LoggingSettings = () => {
	const queryClient = useQueryClient();
	const { data, isPending } = useQuery(settingsQuery());

	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		if (!data) return;
		setEnabled(data.logging_enabled ?? false);
	}, [data]);

	const { mutate, isPending: isSaving } = useMutation({
		mutationFn: (payload: Partial<Settings>) => settingsApi.update(payload),
		onSuccess: (updated) => {
			queryClient.setQueryData(settingsQuery().queryKey, updated);
			toast.success(__('Settings saved successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to save settings. Please try again.', 'all-feedback'));
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		mutate({ logging_enabled: enabled });
	};

	if (isPending) {
		return (
			<div>
				<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
					<Skeleton className="size-9 rounded-xl" />
					<Skeleton className="h-5 w-20" />
				</div>
				<div className="space-y-4 p-5">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-[38%]" />
						<Skeleton className="h-5 w-9 rounded-full" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<ScrollText className="size-[18px] text-primary" />
				</div>
				<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
					{__('Logging', 'all-feedback')}
				</h3>
			</div>

			<div className="space-y-4 p-5">
				<Row label={__('Enable logging', 'all-feedback')}>
					<Toggle checked={enabled} onChange={() => setEnabled((v) => !v)} />
				</Row>
			</div>

			<div className="flex justify-end border-t border-border/50 px-5 py-3.5">
				<Button type="submit" disabled={isSaving}>
					{isSaving && <Loader2 className="animate-spin" />}
					{isSaving ? __('Saving…', 'all-feedback') : __('Save Changes', 'all-feedback')}
				</Button>
			</div>
		</form>
	);
};

export default LoggingSettings;
