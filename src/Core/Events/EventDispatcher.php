<?php

declare(strict_types=1);

namespace AllFeedback\Core\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Hooks;

/**
 * Class EventDispatcher
 *
 * Dispatches domain events to registered listeners and also fires a
 * WordPress action hook so external code can react to every event.
 *
 * @package AllFeedback\Core\Events
 * @since   1.0.0
 */
class EventDispatcher {

	use Hooks;

	/**
	 * Registered listeners grouped by event class and then by priority.
	 *
	 * @var array<string, array<int, callable[]>>
	 * @since 1.0.0
	 */
	private array $listeners = [];

	/**
	 * Dispatch an event to all registered listeners in priority order and
	 * then fire a corresponding WordPress action hook.
	 *
	 * @param  Event $event The event instance to dispatch.
	 * @return Event        The same event instance, potentially mutated by listeners.
	 * @since  1.0.0
	 */
	public function dispatch( Event $event ): Event {
		$eventName = $event::class;

		if ( isset( $this->listeners[ $eventName ] ) ) {
			foreach ( $this->listeners[ $eventName ] as $listenersAtPriority ) {
				foreach ( $listenersAtPriority as $listener ) {
					$listener( $event );

					if ( $event->isPropagationStopped() ) {
						break 2;
					}
				}
			}
		}

		$this->doAction( "allfeedback:event:{$eventName}", $event );

		return $event;
	}

	/**
	 * Register a callable listener for a specific event class.
	 *
	 * @param  string   $eventClass Fully-qualified event class name.
	 * @param  callable $listener   Callable that accepts the event instance.
	 * @param  int      $priority   Lower numbers run first. Default 10.
	 * @return void
	 * @since  1.0.0
	 */
	public function listen( string $eventClass, callable $listener, int $priority = 10 ): void {
		if ( ! isset( $this->listeners[ $eventClass ] ) ) {
			$this->listeners[ $eventClass ] = [];
		}

		$this->listeners[ $eventClass ][ $priority ][] = $listener;
		ksort( $this->listeners[ $eventClass ] );
	}

	/**
	 * Register all event-to-method mappings declared by an EventSubscriber.
	 *
	 * @param  EventSubscriber $subscriber The subscriber to register.
	 * @return void
	 * @since  1.0.0
	 */
	public function subscribe( EventSubscriber $subscriber ): void {
		foreach ( $subscriber->getSubscribedEvents() as $eventClass => $params ) {
			if ( is_string( $params ) ) {
				$this->listen( $eventClass, [ $subscriber, $params ] );
			} elseif ( is_array( $params ) ) {
				$this->listen(
					$eventClass,
					[ $subscriber, $params[0] ],
					$params[1] ?? 10
				);
			}
		}
	}
}
