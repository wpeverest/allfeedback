<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Events\Event;
use AllFeedback\Domain\Survey\Survey;

/**
 * Raised after a Survey has been successfully created and persisted.
 *
 * @since 1.0.0
 */
class SurveyCreated extends Event {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly Survey $survey,
	) {}
}
