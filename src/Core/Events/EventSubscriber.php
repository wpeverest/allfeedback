<?php
/**
 * Event subscriber.
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Events;

defined( 'ABSPATH' ) || exit;

/**
 * Interface EventSubscriber
 *
 * Implemented by classes that wish to subscribe to multiple domain events in
 * a single registration call via EventDispatcher::subscribe().
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */
interface EventSubscriber {

	/**
	 * Return a map of event class names to handler methods on this subscriber.
	 *
	 * Each entry may be either a plain method name string or a two-element
	 * array of [methodName, priority].
	 *
	 * @return array<string, string|array> Event class => method name or [method name, priority]
	 * @since  1.0.0
	 */
	public function getSubscribedEvents(): array;
}
