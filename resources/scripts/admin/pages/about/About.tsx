import { __ } from '@wordpress/i18n';
import { ArrowUpRight, Book, LifeBuoy, Users } from 'lucide-react';

const ResourceGroup = ({
	icon: Icon,
	title,
	links,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	links: { label: string; href: string }[];
}) => (
	<div className="rounded-2xl border border-border/60 bg-white">
		<div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
			<div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
				<Icon className="size-[13px] text-primary" />
			</div>
			<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
				{title}
			</span>
		</div>
		<div className="p-1.5">
			{links.map(({ label, href }) => (
				<a
					key={label}
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="group flex items-center justify-between rounded-xl px-2.5 py-2.5 text-base text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:!text-foreground"
				>
					<span className="font-medium">{label}</span>
					<ArrowUpRight className="size-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:text-primary" />
				</a>
			))}
		</div>
	</div>
);

const DOCS_LINKS = [
	{ label: __('Getting Started Guide', 'all-feedback'), href: 'https://themegrill.com/docs/all-feedback/' },
	{ label: __('Developer Reference', 'all-feedback'), href: 'https://themegrill.com/docs/all-feedback/api/' },
	{ label: __('Field Reference', 'all-feedback'), href: 'https://themegrill.com/docs/all-feedback/' },
	{ label: __('REST API', 'all-feedback'), href: 'https://themegrill.com/docs/all-feedback/api/' },
];

const SUPPORT_LINKS = [
	{ label: __('Open a Ticket', 'all-feedback'), href: 'https://themegrill.com/support/' },
	{ label: __('WordPress.org Forum', 'all-feedback'), href: 'https://wordpress.org/support/plugin/all-feedback/' },
	{ label: __('Report a Bug', 'all-feedback'), href: 'https://github.com/themegrill/all-feedback/issues' },
	{ label: __('ThemeGrill Website', 'all-feedback'), href: 'https://themegrill.com/' },
];

const COMMUNITY_LINKS = [
	{ label: __('Facebook', 'all-feedback'), href: 'https://www.facebook.com/themegrill/' },
	{ label: __('YouTube', 'all-feedback'), href: 'https://www.youtube.com/@themegrill' },
	{ label: __('X / Twitter', 'all-feedback'), href: 'https://x.com/themegrill' },
	{ label: __('Changelog', 'all-feedback'), href: 'https://themegrill.com/' },
];

const About = () => {
	return (
		<div className="h-full overflow-y-auto p-6 md:p-8">
			<div className="mx-auto flex w-full max-w-[1340px] items-start gap-6">

				<div className="min-w-0 flex-[7] overflow-hidden rounded-2xl border border-border/60 bg-black">
					<div className="relative aspect-video">
						<iframe
							src="https://www.youtube.com/embed/dQw4w9WgXcQ"
							title={__('All Feedback â€” Quick Tour', 'all-feedback')}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="absolute inset-0 h-full w-full"
						/>
					</div>
				</div>

				<div className="flex flex-[3] flex-col gap-4">
					<ResourceGroup
						icon={Book}
						title={__('Documentation', 'all-feedback')}
						links={DOCS_LINKS}
					/>
					<ResourceGroup
						icon={LifeBuoy}
						title={__('Support', 'all-feedback')}
						links={SUPPORT_LINKS}
					/>
					<ResourceGroup
						icon={Users}
						title={__('Community', 'all-feedback')}
						links={COMMUNITY_LINKS}
					/>
				</div>

			</div>
		</div>
	);
};

export default About;
