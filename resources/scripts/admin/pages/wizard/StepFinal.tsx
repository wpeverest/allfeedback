import { Button } from '@/components/ui/button';
import { __ } from '@wordpress/i18n';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Edit2, LayoutGrid, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function StepFinal({
	onFinish,
	submitting,
}: {
	onFinish: (target: 'editor' | 'forms') => void;
	submitting: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvasRef.current) return;
		const myConfetti = confetti.create(canvasRef.current, {
			resize: true,
			useWorker: true,
		});

		const t = setTimeout(() => {
			myConfetti({
				particleCount: 60,
				spread: 70,
				startVelocity: 38,
				origin: { y: 0.55 },
				colors: ['#6366f1', '#818cf8', '#a5b4fc', '#34d399'],
			});
		}, 250);

		return () => {
			clearTimeout(t);
			myConfetti.reset();
		};
	}, []);

	return (
		<div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 size-full"
			/>

			<style>{`
				@keyframes allfb-wizard-check-in {
					0%   { opacity: 0; transform: scale(0.5); }
					60%  { transform: scale(1.08); }
					100% { opacity: 1; transform: scale(1); }
				}
				@keyframes allfb-wizard-check-ring {
					0%, 100% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-success) 14%, transparent); }
					50%      { box-shadow: 0 0 0 11px color-mix(in srgb, var(--color-success) 4%, transparent); }
				}
			`}</style>

			<div className="relative z-10 flex max-w-[460px] flex-col items-center text-center">
				<div
					className="bg-success/10 text-success mb-7 flex size-16 items-center justify-center rounded-full"
					style={{
						animation:
							'allfb-wizard-check-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both, allfb-wizard-check-ring 2.4s ease-in-out 0.5s infinite',
					}}
				>
					<Check className="size-8" strokeWidth={3} />
				</div>

				<h1
					className="text-foreground tracking-tight"
					style={{
						fontSize: '1.875rem',
						fontWeight: 800,
						lineHeight: 1.15,
						margin: '0 0 0.75rem',
					}}
				>
					{__("You're all set!", 'allfeedback')}
				</h1>

				<p
					className="text-muted-foreground leading-relaxed"
					style={{ margin: '0 0 2rem', fontSize: '1.0625rem', fontWeight: 400 }}
				>
					{__(
						'Your feedback widget is configured and ready to go. Open the editor to fine-tune your questions, or head to all your forms.',
						'allfeedback',
					)}
				</p>

				<div className="flex flex-col items-center gap-3 sm:flex-row">
					<Button
						size="lg"
						className="h-11 px-6 font-semibold !text-white"
						onClick={() => onFinish('editor')}
						disabled={submitting}
					>
						{submitting ? (
							<Loader2 className="size-5 animate-spin" />
						) : (
							<Edit2 className="size-5" />
						)}
						{__('Open Editor', 'allfeedback')}
						<ArrowRight className="size-4" />
					</Button>
					<Button
						variant="secondary"
						size="lg"
						onClick={() => onFinish('forms')}
						disabled={submitting}
						style={{
							border:
								'1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)',
						}}
					>
						<LayoutGrid className="size-4" />
						{__('All Forms', 'allfeedback')}
					</Button>
				</div>
			</div>
		</div>
	);
}
