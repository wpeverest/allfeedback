<?php
/**
 * Delete survey service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Use-case service: delete a survey aggregate from the persistence layer.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class DeleteSurveyService {

	/**
	 * Constructor.
	 *
	 * @param  SurveyRepository $repository Persistence layer for survey aggregates.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $repository,
	) {}

	/**
	 * Delete a survey by ID.
	 *
	 * @param  int $id Survey ID to delete.
	 * @return void
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since  1.0.0
	 */
	public function execute( int $id ): void {
		$survey = $this->repository->findById( $id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $id ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- $id is a typed int
		}

		$this->repository->delete( $id );

		do_action( 'allfeedback_survey_deleted', $id, $survey );
	}
}
