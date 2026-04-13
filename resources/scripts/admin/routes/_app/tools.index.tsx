import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/')({
	beforeLoad: () => {
		throw redirect({ to: '/tools/system-info' });
	},
});
