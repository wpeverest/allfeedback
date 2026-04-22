<?php

declare(strict_types=1);

namespace AllFeedback\Core\Events;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base class for all domain events.
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */
abstract class Event {

	/**
	 * Whether propagation has been stopped by a listener.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	private bool $propagationStopped = false;

	/**
	 * Stop the event from propagating to subsequent listeners.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function stopPropagation(): void {
		$this->propagationStopped = true;
	}

	/**
	 * Whether propagation has been stopped.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPropagationStopped(): bool {
		return $this->propagationStopped;
	}

	/**
	 * Return the fully-qualified class name of this event.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getName(): string {
		return static::class;
	}
}
