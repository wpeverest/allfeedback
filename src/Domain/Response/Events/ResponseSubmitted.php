<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Response\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Events\Event;
use AllFeedback\Domain\Response\Response;

/**
 * Raised after a Response has been successfully submitted and persisted.
 *
 * @package AllFeedback\Domain\Response\Events
 * @since   1.0.0
 */
class ResponseSubmitted extends Event {

	/**
	 * @param  Response $response The persisted response aggregate.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly Response $response,
	) {}
}
