<?php
/**
 * Survey deleted.
 *
 * @package AllFeedback\Domain\Survey\Events
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Survey\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Events\Event;

/**
 * Raised after a Survey has been permanently deleted.
 *
 * @package AllFeedback\Domain\Survey\Events
 * @since   1.0.0
 */
class SurveyDeleted extends Event {

	/**
	 * Constructor.
	 *
	 * @param  int $survey_id Primary key of the deleted survey.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly int $survey_id,
	) {}
}
