<?php

declare(strict_types=1);

namespace AllFeedback\Core\Pipeline;

defined( 'ABSPATH' ) || exit;

/**
 * Class Pipeline
 *
 * Passes a subject through a sequence of pipes (callables or objects with a
 * handle() method) using a middleware-style chain. Each pipe receives the
 * current subject and a $next callable that advances to the following pipe.
 *
 * @since 1.0.0
 */
class Pipeline {

	/**
	 * The value being passed through the pipeline.
	 *
	 * @since 1.0.0
	 */
	private mixed $passable;

	/**
	 * The ordered list of pipe callables or objects.
	 *
	 * @var array<int, callable|object>
	 * @since 1.0.0
	 */
	private array $pipes = [];

	/**
	 * Set the subject that will travel through the pipeline.
	 *
	 * @param mixed $passable The subject to pass through each pipe.
	 * @return static
	 * @since 1.0.0
	 */
	public function send( mixed $passable ): self {
		$this->passable = $passable;
		return $this;
	}

	/**
	 * Define the complete list of pipes to run.
	 *
	 * @param array<int, callable|object> $pipes
	 * @return static
	 * @since 1.0.0
	 */
	public function through( array $pipes ): self {
		$this->pipes = $pipes;
		return $this;
	}

	/**
	 * Append a single pipe to the pipeline.
	 *
	 * @param callable $pipe
	 * @return static
	 * @since 1.0.0
	 */
	public function pipe( callable $pipe ): self {
		$this->pipes[] = $pipe;
		return $this;
	}

	/**
	 * Run the pipeline and pass the final result to $destination.
	 *
	 * @param callable $destination The terminal callable that receives the passable.
	 * @return mixed The value returned by $destination.
	 * @since 1.0.0
	 */
	public function then( callable $destination ): mixed {
		$pipeline = array_reduce(
			array_reverse( $this->pipes ),
			$this->carry(),
			$destination
		);

		return $pipeline( $this->passable );
	}

	/**
	 * Run the pipeline and return the passable as-is after all pipes have run.
	 *
	 * @return mixed
	 * @since 1.0.0
	 */
	public function thenReturn(): mixed {
		return $this->then( fn( $passable ) => $passable );
	}

	/**
	 * Build the reducer closure that nests each pipe around the next.
	 *
	 * @return \Closure
	 * @since 1.0.0
	 */
	protected function carry(): \Closure {
		return function ( $stack, $pipe ) {
			return function ( $passable ) use ( $stack, $pipe ) {
				if ( is_callable( $pipe ) ) {
					return $pipe( $passable, $stack );
				}

				if ( is_object( $pipe ) && method_exists( $pipe, 'handle' ) ) {
					return $pipe->handle( $passable, $stack );
				}

				throw new \RuntimeException( 'Invalid pipe: ' . esc_html( gettype( $pipe ) ) );
			};
		};
	}

	/**
	 * Create a new pipeline instance.
	 *
	 * @return static
	 * @since 1.0.0
	 */
	public static function make(): self {
		return new self();
	}
}
