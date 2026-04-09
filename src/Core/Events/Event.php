<?php

declare(strict_types=1);

namespace AllFeedback\Core\Events;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base class for all domain events.
 *
 * @since 1.0.0
 */
abstract class Event {

	/** @since 1.0.0 */
	private bool $propagationStopped = false;

	/**
	 * Stop the event from propagating to subsequent listeners.
	 *
	 * @since 1.0.0
	 */
	public function stopPropagation(): void {
		$this->propagationStopped = true;
	}

	/**
	 * Whether propagation has been stopped.
	 *
	 * @since 1.0.0
	 */
	public function isPropagationStopped(): bool {
		return $this->propagationStopped;
	}

	/**
	 * Return the fully-qualified class name of this event.
	 *
	 * @since 1.0.0
	 */
	public function getName(): string {
		return static::class;
	}
}
