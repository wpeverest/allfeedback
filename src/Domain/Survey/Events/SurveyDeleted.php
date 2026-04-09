<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Events\Event;

/**
 * Raised after a Survey has been permanently deleted.
 *
 * @since 1.0.0
 */
class SurveyDeleted extends Event {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly int $surveyId,
	) {}
}
