import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
	return (
		<SonnerToaster
			position="bottom-right"
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
