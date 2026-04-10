import { cn } from '@/lib/utils';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { __ } from '@wordpress/i18n';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export interface PaginationProps {
	page:             number;
	totalPages:       number;
	total:            number;
	perPage:          number;
	perPageOptions?:  number[];
	isLoading?:       boolean;
	onPageChange:     (page: number) => void;
	onPerPageChange?: (perPage: number) => void;
	className?:       string;
}

function getPageSlots(current: number, total: number): (number | 'ellipsis')[] {
	if (total <= 1) return [1];

	const delta  = 2; 
	const range: number[] = [];

	for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
		range.push(i);
	}

	const slots: (number | 'ellipsis')[] = [];

	slots.push(1);

	if (range.length > 0 && range[0] > 2) {
		slots.push('ellipsis');
	}

	slots.push(...range);

	if (range.length > 0 && range[range.length - 1] < total - 1) {
		slots.push('ellipsis');
	}

	if (total > 1) slots.push(total);

	return slots;
}

interface PageBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	active?: boolean;
	variant?: 'nav' | 'page';
}
const PageBtn = ({ children, active, disabled, variant = 'page', className, ...rest }: PageBtnProps) => (
	<button
		type="button"
		disabled={disabled}
		className={cn(
			'flex size-10 items-center justify-center rounded-md border text-[14px] font-medium transition-colors',
			active
				? 'border-primary bg-primary text-primary-foreground'
				: 'border-border bg-white text-foreground/60 hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary',
			disabled && 'pointer-events-none opacity-40',
			className,
		)}
		{...rest}
	>
		{children}
	</button>
);

export const Pagination = ({
	page,
	totalPages,
	total,
	perPage,
	perPageOptions = [10, 25, 50],
	isLoading,
	onPageChange,
	onPerPageChange,
	className,
}: PaginationProps) => {
	const start = total === 0 ? 0 : (page - 1) * perPage + 1;
	const end   = Math.min(page * perPage, total);
	const slots = getPageSlots(page, Math.max(1, totalPages));

	return (
		<div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>

			{}
			<span className="text-[13px] text-muted-foreground">
				{isLoading ? (
					<span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
				) : (
					<>
						{__('Showing', 'all-feedback')}{' '}
						<span className="font-medium text-foreground">{start} - {end}</span>
						{' '}{__('of', 'all-feedback')}{' '}
						<span className="font-medium text-foreground">{total}</span>
					</>
				)}
			</span>

			{}
			<div className="flex items-center gap-3">

				{}
				{onPerPageChange && (
					<div className="flex items-center gap-2">
						<span className="whitespace-nowrap text-[14px] text-muted-foreground">
							{__('Rows per page', 'all-feedback')}
						</span>
						<Select
							value={String(perPage)}
							onValueChange={(v) => { onPerPageChange(Number(v)); }}
						>
							<SelectTrigger className="h-10 w-[72px] text-[14px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{perPageOptions.map((n) => (
									<SelectItem key={n} value={String(n)}>{n}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{}
				<div className="flex items-center gap-2">

					{}
					<PageBtn
						onClick={() => onPageChange(page - 1)}
						disabled={page <= 1 || isLoading}
						aria-label={__('Previous page', 'all-feedback')}
					>
						<ChevronLeft className="size-[18px]" />
					</PageBtn>

					{}
					{slots.map((slot, i) =>
						slot === 'ellipsis' ? (
							<span
								key={`ellipsis-${i}`}
								className="flex size-10 items-center justify-center text-[14px] text-muted-foreground/50 select-none"
							>
								<MoreHorizontal className="size-[18px]" />
							</span>
						) : (
							<PageBtn
								key={slot}
								active={slot === page}
								disabled={isLoading}
								onClick={() => onPageChange(slot)}
								aria-label={`Page ${slot}`}
								aria-current={slot === page ? 'page' : undefined}
							>
								{slot}
							</PageBtn>
						),
					)}

					{}
					<PageBtn
						onClick={() => onPageChange(page + 1)}
						disabled={page >= totalPages || isLoading}
						aria-label={__('Next page', 'all-feedback')}
					>
						<ChevronRight className="size-[18px]" />
					</PageBtn>
				</div>
			</div>
		</div>
	);
};
