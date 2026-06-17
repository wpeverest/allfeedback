import { aboutVideoQuery } from '@/admin/queries/about';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { ArrowUpRight, Book, LifeBuoy, Loader2, PlayCircle, Users } from 'lucide-react';

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

const VideoPanel = () => {
	const { data, isLoading } = useQuery(aboutVideoQuery());

	return (
		<div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-black lg:min-w-0 lg:flex-[7]">
			<div className="relative aspect-video">
				{isLoading ? (
					<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-black">
						<Loader2 className="size-6 animate-spin text-white/40" />
					</div>
				) : data?.embed_url ? (
					<iframe
						src={data.embed_url}
						title={__('All Feedback — Quick Tour', 'allfeedback')}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						className="absolute inset-0 h-full w-full"
					/>
				) : (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 bg-gradient-to-b from-[#1a1a2e] to-black px-6 text-center">
						<div className="flex size-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
							<PlayCircle className="size-7 text-white/70" />
						</div>
						<div>
							<p className="text-base font-semibold text-white">
								{__('Video coming soon', 'allfeedback')}
							</p>
							<p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
								{__(
									'We are putting together a quick product tour. Check back shortly.',
									'allfeedback',
								)}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const DOCS_LINKS = [
	{ label: __('Getting Started Guide', 'allfeedback'), href: 'https://docs.allfeedback.net/getting-started/' },
	{ label: __('Developer Reference', 'allfeedback'), href: 'https://docs.allfeedback.net/developers/' },
	{ label: __('Field Reference', 'allfeedback'), href: 'https://docs.allfeedback.net/fields/' },
	{ label: __('REST API', 'allfeedback'), href: 'https://docs.allfeedback.net/rest-api/' },
];

const SUPPORT_LINKS = [
	{ label: __('WordPress.org Forum', 'allfeedback'), href: 'https://wordpress.org/support/plugin/allfeedback/' },
	{ label: __('AllFeedback Website', 'allfeedback'), href: 'https://allfeedback.net/' },
];

const COMMUNITY_LINKS = [
	{ label: __('Facebook', 'allfeedback'), href: 'https://www.facebook.com/themegrill/' },
	{ label: __('YouTube', 'allfeedback'), href: 'https://www.youtube.com/@themegrill' },
	{ label: __('X / Twitter', 'allfeedback'), href: 'https://x.com/themegrill' },
	{ label: __('Changelog', 'allfeedback'), href: 'https://allfeedback.net/' },
];

const About = () => {
	return (
		<div className="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
			<div className="mx-auto flex w-full max-w-[1340px] flex-col gap-6 lg:flex-row lg:items-start">

				<VideoPanel />

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:flex-[3] lg:grid-cols-1">
					<ResourceGroup
						icon={Book}
						title={__('Documentation', 'allfeedback')}
						links={DOCS_LINKS}
					/>
					<ResourceGroup
						icon={LifeBuoy}
						title={__('Support', 'allfeedback')}
						links={SUPPORT_LINKS}
					/>
					<ResourceGroup
						icon={Users}
						title={__('Community', 'allfeedback')}
						links={COMMUNITY_LINKS}
					/>
				</div>

			</div>
		</div>
	);
};

export default About;
