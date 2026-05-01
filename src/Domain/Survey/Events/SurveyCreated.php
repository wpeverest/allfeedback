<?php
/**
 * Survey created.
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
 * Raised after a Survey has been successfully created and persisted.
 *
 * @package AllFeedback\Domain\Survey\Events
 * @since   1.0.0
 */
class SurveyCreated extends Event {

	/**
	 * Constructor.
	 *
	 * @param  Survey $survey The newly created survey aggregate.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly Survey $survey,
	) {}
}
