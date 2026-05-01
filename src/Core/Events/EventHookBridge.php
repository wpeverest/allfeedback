<?php
/**
 * Event hook bridge.
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Hooks;

/**
 * Class EventHookBridge
 *
 * Translates internal domain events into WordPress action hooks so that
 * external plugins and themes can react to AllFeedback events without
 * coupling directly to the domain event classes.
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */
class EventHookBridge implements EventSubscriber {

	use Hooks;

	/**
	 * Return the list of domain events this bridge subscribes to.
	 *
	 * Populated with concrete event classes as they are added to the Survey
	 * domain. Each entry maps an event class to the handler method on this
	 * class that fires the corresponding WordPress action.
	 *
	 * @return array<string, string|array{string, int}>
	 * @since  1.0.0
	 */
	public function getSubscribedEvents(): array {
		return [];
	}
}
