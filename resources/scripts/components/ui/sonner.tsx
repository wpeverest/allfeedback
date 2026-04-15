import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
	return (
		<SonnerToaster
			position="bottom-right"
			className="toaster group"
			icons={{
				success: <CircleCheckIcon  color="green"  className="size-4" />,
				info:    <InfoIcon         color="blue"   className="size-4" />,
				warning: <TriangleAlertIcon color="orange" className="size-4" />,
				error:   <OctagonXIcon    color="red"    className="size-4" />,
				loading: <Loader2Icon      className="size-4 animate-spin" />,
			}}
			style={{
				'--normal-bg':     'var(--popover)',
				'--normal-text':   'var(--popover-foreground)',
				'--normal-border': 'var(--border)',
				'--border-radius': 'var(--radius)',
			} as React.CSSProperties}
			toastOptions={{
				classNames: {
					toast:       'group toast font-sans text-sm',
					description: 'text-muted-foreground',
					actionButton:'bg-primary text-primary-foreground',
					cancelButton:'bg-muted text-muted-foreground',
				},
			}}
			{...props}
		/>
	);
}
