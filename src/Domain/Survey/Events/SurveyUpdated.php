<?php
/**
 * Survey updated.
 *
 * @package AllFeedback\Domain\Survey\Events
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Survey\Events;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Events\Event;
use AllFeedback\Domain\Survey\Survey;

/**
 * Raised after a Survey has been successfully updated and persisted.
 *
 * @package AllFeedback\Domain\Survey\Events
 * @since   1.0.0
 */
class SurveyUpdated extends Event {

	/**
	 * Constructor.
	 *
	 * @param  Survey $survey The updated survey aggregate.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly Survey $survey,
	) {}
}
