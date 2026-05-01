import type { WizardCompletePayload } from '@/admin/api/wizard';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Box, Bug, Check, Gauge, Lightbulb, MessageSquare, Users } from 'lucide-react';

const TEMPLATES = [
	{
		id: 'nps' as const,
		title: __('NPS Survey', 'allfeedback'),
		desc: __('Measure how likely customers are to recommend you to others.', 'allfeedback'),
		Icon: Gauge,
	},
	{
		id: 'general-feedback' as const,
		title: __('General Feedback', 'allfeedback'),
		desc: __('Collect open-ended thoughts, ratings, and suggestions from your audience.', 'allfeedback'),
		Icon: MessageSquare,
	},
	{
		id: 'bug-report' as const,
		title: __('Bug Report', 'allfeedback'),
		desc: __('Let users flag technical issues quickly with structured, actionable reports.', 'allfeedback'),
		Icon: Bug,
	},
	{
		id: 'feature-request' as const,
		title: __('Feature Request', 'allfeedback'),
		desc: __('Capture ideas for new features and improvements directly from your users.', 'allfeedback'),
		Icon: Lightbulb,
	},
	{
		id: 'product-feedback' as const,
		title: __('Product Feedback', 'allfeedback'),
		desc: __('Uncover what users love and what to build next with targeted product questions.', 'allfeedback'),
		Icon: Box,
	},
	{
		id: 'customer-research' as const,
		title: __('Customer Research', 'allfeedback'),
		desc: __('Learn more about your audience, their goals, and how they discovered you.', 'allfeedback'),
		Icon: Users,
	},
];

export function StepTemplate({
	state,
	set,
}: {
	state: WizardCompletePayload;
	set: (u: Partial<WizardCompletePayload>) => void;
}) {
	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
			{TEMPLATES.map((t) => {
				const isSelected = state.template === t.id;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => set({ template: t.id })}
						className={cn(
							'group bg-card relative flex flex-col gap-5 rounded-2xl border-2 p-6 text-left transition-all duration-300',
							isSelected
								? '!border-primary shadow-card'
								: 'hover:border-border/60 hover:shadow-card border-transparent shadow-sm',
						)}
					>
						<div
							className={cn(
								'flex size-12 items-center justify-center rounded-xl transition-all duration-300',
								isSelected
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'bg-muted/50 text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary',
							)}
						>
							<t.Icon className="size-6" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-foreground text-[15px] font-semibold tracking-tight">
									{t.title}
								</span>
								<div
									className={cn(
										'bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-300',
										isSelected
											? 'scale-100 opacity-100'
											: 'pointer-events-none scale-75 opacity-0',
									)}
								>
									<Check className="size-3" strokeWidth={3} />
								</div>
							</div>
							<p
								className={cn(
									'line-clamp-2 text-[13px] leading-relaxed',
									isSelected ? 'text-muted-foreground' : 'text-muted-foreground/60',
								)}
							>
								{t.desc}
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}
