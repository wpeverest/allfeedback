import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { surveysApi } from '@/admin/api/surveys';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { __ } from '@wordpress/i18n';
import {
	Check,
	CheckSquare,
	Globe,
	Laptop,
	Loader2,
	Monitor,
	Pencil,
	Shield,
	Smartphone,
	Star,
	Tablet,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Survey, SurveyFormSchemaField, SurveyResponse } from '@/admin/api/surveys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResponseDetailDrawerProps {
	open:           boolean;
	onOpenChange:   (open: boolean) => void;
	response:       SurveyResponse | null;
	survey:         Survey | null;
	/** When true, the drawer opens directly in edit mode. */
	initialEditing?: boolean;
}

// Flatten all fields from all sections in the form schema.
const flattenFields = (survey: Survey | null): SurveyFormSchemaField[] => {
	if (!survey?.form_schema?.sections) return [];
	return survey.form_schema.sections.flatMap((s) => s.fields);
};

// ---------------------------------------------------------------------------
// Field-level view renderer
// ---------------------------------------------------------------------------

const ViewField = ({
	field,
	value,
}: {
	field: SurveyFormSchemaField | null;
	value: unknown;
}) => {
	const type = field?.type ?? 'short_text';

	if (value === null || value === undefined || value === '') {
		return <span className="text-base italic text-muted-foreground">{__('No answer', 'all-feedback')}</span>;
	}

	if (type === 'checkboxes') {
		const arr = Array.isArray(value) ? value : [value];
		return (
			<div className="flex flex-wrap gap-1.5">
				{(arr as string[]).map((opt) => (
					<span
						key={opt}
						className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-sm text-foreground"
					>
						<CheckSquare className="size-3 text-primary" />
						{opt}
					</span>
				))}
			</div>
		);
	}

	if (type === 'radio') {
		return (
			<span className="inline-flex items-center gap-1.5 text-base text-foreground">
				<span className="size-2 rounded-full bg-primary" />
				{String(value)}
			</span>
		);
	}

	if (type === 'nps') {
		const score = Number(value);
		const cls =
			score >= 9 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
			: score >= 7 ? 'text-amber-600 bg-amber-50 border-amber-200'
			: 'text-rose-600 bg-rose-50 border-rose-200';
		const label =
			score >= 9 ? __('Promoter', 'all-feedback')
			: score >= 7 ? __('Passive', 'all-feedback')
			: __('Detractor', 'all-feedback');
		return (
			<span className="flex items-center gap-2">
				<span className={cn('rounded-md border px-2.5 py-0.5 text-base font-semibold tabular-nums', cls)}>
					{score}
				</span>
				<span className={cn('text-sm font-medium', cls.split(' ')[0])}>{label}</span>
			</span>
		);
	}

	if (type === 'star_rating') {
		const stars  = Number(value);
		const max    = (field?.settings?.starRange as number | undefined) ?? 5;
		return (
			<span className="flex items-center gap-1.5">
				<span className="flex items-center gap-0.5">
					{Array.from({ length: max }, (_, i) => (
						<Star
							key={i}
							className={cn(
								'size-4',
								i < stars ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted',
							)}
						/>
					))}
				</span>
				<span className="text-sm text-muted-foreground">
					{stars}/{max}
				</span>
			</span>
		);
	}

	if (type === 'scale') {
		const scaleMin = (field?.settings?.scaleMin as number | undefined) ?? 1;
		const scaleMax = (field?.settings?.scaleMax as number | undefined) ?? 10;
		const lowLabel  = (field?.settings?.scaleLowLabel  as string | undefined) ?? '';
		const highLabel = (field?.settings?.scaleHighLabel as string | undefined) ?? '';
		return (
			<span className="flex items-center gap-2 text-base">
				<span className="tabular-nums font-semibold text-foreground">{String(value)}</span>
				<span className="text-muted-foreground">/ {scaleMax}</span>
				{(lowLabel || highLabel) && (
					<span className="text-xs text-muted-foreground">
						({lowLabel && `${scaleMin} = ${lowLabel}`}{lowLabel && highLabel && ', '}{highLabel && `${scaleMax} = ${highLabel}`})
					</span>
				)}
			</span>
		);
	}

	if (type === 'long_text') {
		return (
			<p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
				{String(value)}
			</p>
		);
	}

	return <span className="text-base text-foreground">{String(value)}</span>;
};

// ---------------------------------------------------------------------------
// Field-level edit renderer
// ---------------------------------------------------------------------------

const EditField = ({
	field,
	value,
	onChange,
}: {
	field: SurveyFormSchemaField | null;
	value: unknown;
	onChange: (v: unknown) => void;
}) => {
	const type = field?.type ?? 'short_text';

	const inputCls = cn(
		'flex w-full rounded-lg bg-muted/60 border border-transparent px-3 py-2 text-base text-foreground',
		'placeholder:text-muted-foreground',
		'transition-colors focus:border-border focus:bg-white focus:outline-none focus:ring-0',
		'disabled:cursor-not-allowed disabled:opacity-50',
	);

	if (type === 'long_text') {
		return (
			<textarea
				className={cn(inputCls, 'min-h-[100px] resize-y')}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}

	if (type === 'radio') {
		const options = (field?.settings?.options as string[] | undefined) ?? [];
		const current = String(value ?? '');
		return (
			<div className="flex flex-col gap-2">
				{options.map((opt) => (
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-base">
						<input
							type="radio"
							className="accent-primary"
							checked={current === opt}
							onChange={() => onChange(opt)}
						/>
						{opt}
					</label>
				))}
				{!options.length && (
					<Input value={current} onChange={(e) => onChange(e.target.value)} />
				)}
			</div>
		);
	}

	if (type === 'checkboxes') {
		const options  = (field?.settings?.options as string[] | undefined) ?? [];
		const selected = Array.isArray(value) ? (value as string[]) : [];
		const toggle   = (opt: string) => {
			const next = selected.includes(opt)
				? selected.filter((s) => s !== opt)
				: [...selected, opt];
			onChange(next);
		};
		return (
			<div className="flex flex-col gap-2">
				{options.map((opt) => (
					<label key={opt} className="flex cursor-pointer items-center gap-2.5 text-base">
						<Checkbox
							checked={selected.includes(opt)}
							onCheckedChange={() => toggle(opt)}
						/>
						{opt}
					</label>
				))}
				{!options.length && (
					<Input
						value={selected.join(', ')}
						onChange={(e) =>
							onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
						}
						placeholder={__('Comma-separated values', 'all-feedback')}
					/>
				)}
			</div>
		);
	}

	if (type === 'star_rating') {
		const max = (field?.settings?.starRange as number | undefined) ?? 5;
		return (
			<Input
				type="number"
				min={1}
				max={max}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-24"
			/>
		);
	}

	if (type === 'scale') {
		const scaleMin = (field?.settings?.scaleMin as number | undefined) ?? 1;
		const scaleMax = (field?.settings?.scaleMax as number | undefined) ?? 10;
		return (
			<Input
				type="number"
				min={scaleMin}
				max={scaleMax}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-24"
			/>
		);
	}

	if (type === 'nps') {
		return (
			<Input
				type="number"
				min={0}
				max={10}
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
				className="w-24"
			/>
		);
	}

	// short_text default
	return (
		<Input
			value={String(value ?? '')}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
};

// ---------------------------------------------------------------------------
// Metadata row
// ---------------------------------------------------------------------------

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-start gap-3 py-3">
		<span className="w-28 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			{label}
		</span>
		<div className="min-w-0 flex-1 text-base text-foreground">{children}</div>
	</div>
);

// ---------------------------------------------------------------------------
// Device icon helper
// ---------------------------------------------------------------------------

const DeviceIcon = ({ device }: { device: string | null }) => {
	if (device === 'mobile')  return <Smartphone className="size-3.5 text-muted-foreground" />;
	if (device === 'tablet')  return <Tablet      className="size-3.5 text-muted-foreground" />;
	if (device === 'desktop') return <Monitor     className="size-3.5 text-muted-foreground" />;
	return <Laptop className="size-3.5 text-muted-foreground" />;
};

// ---------------------------------------------------------------------------
// Field row wrapper (label + answer)
// ---------------------------------------------------------------------------

const FieldRow = ({
	label,
	required,
	isEditing,
	viewContent,
	editContent,
}: {
	label:       string;
	required?:   boolean;
	isEditing:   boolean;
	viewContent: React.ReactNode;
	editContent: React.ReactNode;
}) => (
	<div className="border-b border-border py-4 last:border-0">
		<p className="mb-1.5 text-xs font-semibold text-muted-foreground">
			{label}
			{required && <span className="ml-0.5 text-destructive">*</span>}
		</p>
		{isEditing ? editContent : viewContent}
	</div>
);

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

const ResponseDetailDrawer = ({
	open,
	onOpenChange,
	response,
	survey,
	initialEditing = false,
}: ResponseDetailDrawerProps) => {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(initialEditing);

	// ----- Form (TanStack Form) -----
	const form = useForm({
		defaultValues: {
			response_data: (response?.response_data ?? {}) as Record<string, unknown>,
		},
		onSubmit: ({ value }) => {
			if (!response) return;
			saveMutation.mutate(value.response_data);
		},
	});

	// Reset editing state and form values when the drawer opens a new response.
	useEffect(() => {
		setIsEditing(initialEditing);
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
	}, [response?.id, initialEditing]); // eslint-disable-line react-hooks/exhaustive-deps

	// ----- Mutation -----
	const saveMutation = useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			surveysApi.updateResponse(response!.survey_id, response!.id, { response_data: data }),
		onSuccess: (updated) => {
			// Optimistically update cached list entries.
			void queryClient.invalidateQueries({ queryKey: ['responses'] });
			setIsEditing(false);
			// Reset form to the freshly-saved values.
			form.reset({ response_data: (updated.response_data ?? {}) as Record<string, unknown> });
			toast.success(__('Response updated.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to update response. Please try again.', 'all-feedback'));
		},
	});

	// ----- Data helpers -----
	const schemaFields  = flattenFields(survey);
	const schemaFieldMap = Object.fromEntries(schemaFields.map((f) => [f.id, f]));
	const responseData   = response?.response_data ?? {};

	// Keys in response_data that have no matching schema field (orphaned answers).
	const orphanedKeys = Object.keys(responseData).filter((k) => !(k in schemaFieldMap));

	const cancelEdit = () => {
		form.reset({ response_data: (response?.response_data ?? {}) as Record<string, unknown> });
		setIsEditing(false);
	};

	const handleClose = (nextOpen: boolean) => {
		if (saveMutation.isPending) return;
		if (isEditing) cancelEdit();
		onOpenChange(nextOpen);
	};

	return (
		<Dialog.Root open={open} onOpenChange={handleClose}>
			<Dialog.Portal>
				{/* Overlay */}
				<Dialog.Overlay
					className={cn(
						'fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]',
						'data-[state=open]:animate-in data-[state=open]:fade-in-0',
						'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
						'duration-200',
					)}
				/>

				{/* Drawer panel */}
				<Dialog.Content
					className={cn(
						'fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col',
						'border-l border-border bg-card',
						'shadow-[var(--shadow-dropdown)]',
						'focus:outline-none',
						'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
						'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
						'duration-250',
					)}
				>
					{/* ----- Header ----- */}
					<div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
						<div>
							<Dialog.Title className="text-md font-semibold text-foreground">
								{__('Response', 'all-feedback')}
								<span className="ml-1.5 text-base font-normal text-muted-foreground">
									#{response?.id}
								</span>
							</Dialog.Title>
							{response && (
								<p className="mt-0.5 text-xs text-muted-foreground">
									{format(new Date(response.created_at), 'MMM d, yyyy · h:mm a')}
								</p>
							)}
						</div>

						<div className="flex items-center gap-2">
							{!isEditing ? (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setIsEditing(true)}
								>
									<Pencil className="size-3.5" />
									{__('Edit', 'all-feedback')}
								</Button>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={cancelEdit}
									disabled={saveMutation.isPending}
								>
									{__('Cancel', 'all-feedback')}
								</Button>
							)}
							<Dialog.Close asChild>
								<button
									type="button"
									className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
									aria-label={__('Close', 'all-feedback')}
								>
									<X className="size-4" />
								</button>
							</Dialog.Close>
						</div>
					</div>

					{/* ----- Body (scrollable) ----- */}
					<div className="flex-1 overflow-y-auto">
						{response ? (
							<form
								onSubmit={(e) => {
									e.preventDefault();
									void form.handleSubmit();
								}}
							>
								{/* Response fields section */}
								<div className="px-5">
									<p className="py-4 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
										{__('Fields', 'all-feedback')}
									</p>

									{/* Schema-defined fields */}
									{schemaFields.map((schField) => {
										const rawValue = responseData[schField.id];
										return (
											<form.Field key={schField.id} name="response_data">
												{(field) => (
													<FieldRow
														label={schField.label}
														required={schField.required}
														isEditing={isEditing}
														viewContent={
															<ViewField
																field={schField}
																value={rawValue}
															/>
														}
														editContent={
															<EditField
																field={schField}
																value={field.state.value[schField.id] ?? rawValue}
																onChange={(v) =>
																	field.handleChange({
																		...field.state.value,
																		[schField.id]: v,
																	})
																}
															/>
														}
													/>
												)}
											</form.Field>
										);
									})}

									{/* Orphaned answers not in schema */}
									{orphanedKeys.map((key) => (
										<form.Field key={key} name="response_data">
											{(field) => (
												<FieldRow
													label={`${__('Unknown field', 'all-feedback')} (${key})`}
													isEditing={isEditing}
													viewContent={
														<ViewField field={null} value={responseData[key]} />
													}
													editContent={
														<EditField
															field={null}
															value={field.state.value[key] ?? responseData[key]}
															onChange={(v) =>
																field.handleChange({
																	...field.state.value,
																	[key]: v,
																})
															}
													/>
													}
												/>
											)}
										</form.Field>
									))}

									{schemaFields.length === 0 && Object.keys(responseData).length === 0 && (
										<p className="py-8 text-center text-base text-muted-foreground">
											{__('No response data available.', 'all-feedback')}
										</p>
									)}
								</div>

								{/* Metadata section */}
								<div className="border-t border-border px-5">
									<p className="py-4 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
										{__('Details', 'all-feedback')}
									</p>

									<div className="divide-y divide-border">
										{response.score !== null && (
											<MetaRow label={__('Score', 'all-feedback')}>
												<span className="font-semibold tabular-nums">{response.score}</span>
											</MetaRow>
										)}

										<MetaRow label={__('Device', 'all-feedback')}>
											{response.device_type ? (
												<span className="flex items-center gap-1.5 capitalize">
													<DeviceIcon device={response.device_type} />
													{response.device_type}
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</MetaRow>

										<MetaRow label={__('Page URL', 'all-feedback')}>
											{response.page_url ? (
												<a
													href={response.page_url}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 break-all text-primary underline-offset-2 hover:underline"
												>
													<Globe className="size-3.5 shrink-0" />
													{response.page_url}
												</a>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</MetaRow>

										<MetaRow label={__('Consent', 'all-feedback')}>
											{response.consent_given ? (
												<span className="inline-flex items-center gap-1 text-emerald-600">
													<Shield className="size-3.5" />
													{__('Given', 'all-feedback')}
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</MetaRow>

										<MetaRow label={__('Submitted', 'all-feedback')}>
											{format(new Date(response.created_at), 'PPpp')}
										</MetaRow>
									</div>
								</div>
							</form>
						) : (
							<div className="flex h-full items-center justify-center">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
							</div>
						)}
					</div>

					{/* ----- Footer (edit mode only) ----- */}
					{isEditing && (
						<div className="shrink-0 border-t border-border bg-card px-5 py-4">
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={cancelEdit}
									disabled={saveMutation.isPending}
								>
									{__('Cancel', 'all-feedback')}
								</Button>
								<Button
									type="button"
									disabled={saveMutation.isPending}
									onClick={() => void form.handleSubmit()}
								>
									{saveMutation.isPending ? (
										<Loader2 className="size-3.5 animate-spin" />
									) : (
										<Check className="size-3.5" />
									)}
									{__('Save changes', 'all-feedback')}
								</Button>
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default ResponseDetailDrawer;
