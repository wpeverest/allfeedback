import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { FileX2 } from 'lucide-react';

interface NotFoundProps {
	title?:         string;
	description?:   string;
	showFormsLink?: boolean;
	className?:     string;
}

const NotFound = ( {
	title,
	description,
	showFormsLink = true,
	className,
}: NotFoundProps ) => {
	return (
		<div className={ cn(
			'relative flex flex-col items-center justify-center overflow-hidden px-8 py-16 text-center',
			className,
		) }>
			<div
				className="pointer-events-none absolute inset-0 select-none"
				style={ { background: 'radial-gradient(ellipse 80% 55% at 50% 45%, oklch(0.580 0.238 277 / 0.07), transparent)' } }
				aria-hidden
			/>

			<div className="relative z-10 flex flex-col items-center">
				<span
					className="block select-none text-[96px] font-black leading-none tracking-tight"
					style={ {
						background:             'linear-gradient(135deg, var(--brand-400), var(--brand-700))',
						WebkitBackgroundClip:   'text',
						WebkitTextFillColor:    'transparent',
						backgroundClip:         'text',
					} }
					aria-hidden
				>
					404
				</span>

				<div className="my-6 flex items-center gap-3">
					<div className="h-px w-14 bg-gradient-to-r from-transparent to-border" />
					<div className="flex size-10 items-center justify-center rounded-xl bg-muted">
						<FileX2 className="size-[18px] text-muted-foreground/70" strokeWidth={ 1.5 } />
					</div>
					<div className="h-px w-14 bg-gradient-to-l from-transparent to-border" />
				</div>

				<h1 className="text-xl font-bold tracking-tight text-foreground">
					{ title ?? __( 'Form not found', 'all-feedback' ) }
				</h1>
				<p className="mt-2.5 max-w-[268px] text-sm leading-relaxed text-muted-foreground">
					{ description ?? __(
						'This form may have been deleted or the link is no longer valid.',
						'all-feedback',
					) }
				</p>

				<div className="mt-8 flex w-full max-w-[200px] flex-col gap-2.5">
					<Button asChild className="w-full !text-white">
						<Link to="/about/">{ __( 'Go to About', 'all-feedback' ) }</Link>
					</Button>
					{ showFormsLink && (
						<Button variant="outline" asChild className="w-full">
							<Link to="/forms/">{ __( 'View All Forms', 'all-feedback' ) }</Link>
						</Button>
					) }
				</div>
			</div>
		</div>
	);
};

export default NotFound;
