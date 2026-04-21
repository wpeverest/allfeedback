import React from 'react';
import { cn } from '@/lib/utils';

interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
	className?: string;
}

const BaseIllustration = ({ children, className, ...props }: IllustrationProps) => (
	<svg
		viewBox="0 0 140 90"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className={cn("w-full h-full", className)}
		{...props}
	>
		{children}
	</svg>
);

const FieldLabel = ({ y, width = 50 }: { y: number; width?: number }) => (
	<rect x={5} y={y} width={width} height={5} rx={1.5} className="fill-muted-foreground/30" />
);

const InputField = ({ y }: { y: number }) => (
	<rect x={5} y={y} width={130} height={12} rx={3} className="fill-white stroke-border" strokeWidth={2} />
);

const TextAreaField = ({ y, height = 22 }: { y: number; height?: number }) => (
	<rect x={5} y={y} width={130} height={height} rx={3} className="fill-white stroke-border" strokeWidth={2} />
);

const SubmitButton = ({ y }: { y: number }) => (
	<rect x={5} y={y} width={50} height={10} rx={3} className="fill-primary" />
);

const NPSScale = ({ y }: { y: number }) => (
	<>
		{[0, 1, 2, 3, 4, 5, 6].map((i) => (
			<rect key={i} x={5 + i * 11} y={y} width="9" height="10" rx="2.5" className="fill-white stroke-border" strokeWidth={1.5} />
		))}
		<rect x={82} y={y} width="9" height="10" rx="2.5" className="fill-primary/15 stroke-primary/50" strokeWidth={1.5} />
		<rect x={93} y={y} width="9" height="10" rx="2.5" className="fill-primary/30 stroke-primary/70" strokeWidth={1.5} />
		<rect x={104} y={y} width="9" height="10" rx="2.5" className="fill-primary/50 stroke-primary/90" strokeWidth={1.5} />
		<rect x={115} y={y} width="20" height="10" rx="2.5" className="fill-primary stroke-primary" strokeWidth={1.5} />
	</>
);

const StarRating = ({ y, activeCount = 3 }: { y: number; activeCount?: number }) => {
	const starPath = "M6 0L7.4 4.2H11.8L8.2 6.8L9.6 11L6 8.4L2.4 11L3.8 6.8L0.2 4.2H4.6L6 0Z";
	return (
		<>
			{[0, 1, 2, 3, 4].map((i) => (
				<g key={i} transform={`translate(${5 + i * 16}, ${y})`}>
					<path d={starPath} className={i < activeCount ? "fill-primary" : "fill-muted-foreground/30"} />
				</g>
			))}
		</>
	);
};

export const ScratchIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<rect x={5} y={10} width={130} height={70} rx={6} className="stroke-border" strokeWidth={2} strokeDasharray="6 4" />
		<path d="M60 45H80M70 35V55" className="stroke-primary" strokeWidth={4} strokeLinecap="round" />
		<rect x={45} y={65} width={50} height={6} rx={2} className="fill-muted-foreground/20" />
	</BaseIllustration>
);

export const NPSIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={6} width={90} />
		<NPSScale y={15} />
		<FieldLabel y={35} width={70} />
		<InputField y={45} />
		<SubmitButton y={65} />
	</BaseIllustration>
);

export const GeneralIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={8} width={100} />
		<StarRating y={18} activeCount={3} />
		<FieldLabel y={40} width={60} />
		<TextAreaField y={50} height={24} />
		<SubmitButton y={82} />
	</BaseIllustration>
);

export const BugIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={5} width={100} />
		<InputField y={13} />
		<FieldLabel y={32} width={80} />
		<TextAreaField y={40} height={18} />
		<FieldLabel y={65} width={60} />
		<TextAreaField y={73} height={14} />
	</BaseIllustration>
);

export const FeatureIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={8} width={110} />
		<InputField y={20} />
		<FieldLabel y="42" width={90} />
		<TextAreaField y={54} height={24} />
		<SubmitButton y={85} />
	</BaseIllustration>
);

export const ProductIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={5} width={80} />
		<StarRating y={15} activeCount={4} />
		<FieldLabel y={35} width={100} />
		<TextAreaField y={43} height={18} />
		<FieldLabel y={68} width={90} />
		<TextAreaField y={76} height={12} />
	</BaseIllustration>
);

export const WebsiteIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<FieldLabel y={8} width={100} />
		<NPSScale y={18} />
		<FieldLabel y={40} width={70} />
		<InputField y={50} />
		<SubmitButton y={72} />
	</BaseIllustration>
);

export const TemplatesOverviewIllustration = (props: IllustrationProps) => (
	<BaseIllustration {...props}>
		<rect x={10} y={15} width={55} height={35} rx={4} className="fill-white stroke-border" strokeWidth={1.5} />
		<rect x={18} y={22} width={30} height={3} rx={1} className="fill-muted-foreground/20" />
		<rect x={18} y={30} width={40} height={10} rx={1.5} className="fill-muted/5 stroke-border/40" strokeWidth={1} />

		<rect x={75} y={15} width={55} height={35} rx={4} className="fill-white stroke-border" strokeWidth={1.5} />
		<rect x={83} y={22} width={30} height={3} rx={1} className="fill-primary/20" />
		<rect x={83} y={30} width={10} height={10} rx={2} className="fill-primary/10 stroke-primary/30" strokeWidth={1} />
		<rect x={95} y={30} width={10} height={10} rx={2} className="fill-primary/10 stroke-primary/30" strokeWidth={1} />

		<rect x={10} y={60} width={55} height={20} rx={4} className="fill-white stroke-border" strokeWidth={1.5} />
		<rect x={75} y={60} width={55} height={20} rx={4} className="fill-white stroke-border" strokeWidth={1.5} />
	</BaseIllustration>
);

export const TemplateIllustration = ({ type, className }: { type: string; className?: string }) => {
	switch (type) {
		case 'overview': return <TemplatesOverviewIllustration className={className} />;
		case 'scratch': return <ScratchIllustration className={className} />;
		case 'nps': return <NPSIllustration className={className} />;
		case 'general_feedback': return <GeneralIllustration className={className} />;
		case 'bug_report': return <BugIllustration className={className} />;
		case 'feature_request': return <FeatureIllustration className={className} />;
		case 'product': return <ProductIllustration className={className} />;
		case 'website': return <WebsiteIllustration className={className} />;
		default: return null;
	}
};
