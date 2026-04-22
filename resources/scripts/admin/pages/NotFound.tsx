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
			'flex flex-col items-center justify-center px-6 py-16 text-center',
			className,
		) }>
			<div className="relative mb-6">
				<div className="flex size-[76px] items-center justify-center rounded-[24px] bg-primary/[0.07] ring-[10px] ring-primary/[0.04]">
					<FileX2 className="size-9 text-primary/60" strokeWidth={ 1.5 } />
				</div>
				<span className="absolute -right-2 -top-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 shadow-sm ring-[1.5px] ring-border text-[9.5px] font-bold tracking-wider text-muted-foreground leading-none select-none">
					404
				</span>
			</div>

			<h1 className="text-lg font-bold tracking-tight text-foreground">
				{ title ?? __( 'Form not found', 'all-feedback' ) }
			</h1>
			<p className="mt-2 max-w-[272px] text-sm leading-relaxed text-muted-foreground">
				{ description ?? __(
					'This form may have been deleted or the link is no longer valid.',
					'all-feedback',
				) }
			</p>

			<div className="mt-8 flex w-full max-w-[220px] flex-col gap-2.5">
				<Button asChild className="w-full !text-white">
					<Link to="/dashboard/">{ __( 'Go to Dashboard', 'all-feedback' ) }</Link>
				</Button>
				{ showFormsLink && (
					<Button variant="outline" asChild className="w-full">
						<Link to="/forms/">{ __( 'View All Forms', 'all-feedback' ) }</Link>
					</Button>
				) }
			</div>
		</div>
	);
};

export default NotFound;
