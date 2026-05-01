<?php
/**
 * Update survey service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Use-case service: partially update an existing survey aggregate.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class UpdateSurveyService {

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
	 * Apply a partial update to a survey identified by $id.
	 *
	 * Only keys present in $raw_data are applied; absent keys leave the
	 * existing field value unchanged.
	 *
	 * @param  int                  $id      ID of the survey to update.
	 * @param  array<string, mixed> $raw_data Partial field map from the request.
	 * @return Survey
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since  1.0.0
	 */
	public function execute( int $id, array $raw_data ): Survey {
		$survey = $this->repository->findById( $id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $id ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- $id is a typed int
		}

		$previous_status = $survey->getStatus();

		if ( array_key_exists( 'title', $raw_data ) ) {
			$survey->setTitle( (string) $raw_data['title'] );
		}

		if ( array_key_exists( 'description', $raw_data ) ) {
			$survey->setDescription( (string) $raw_data['description'] );
		}

		if ( array_key_exists( 'form_schema', $raw_data ) ) {
			$survey->setFormSchema( (array) $raw_data['form_schema'] );
		}

		if ( array_key_exists( 'settings', $raw_data ) ) {
			$survey->setSettings( (array) $raw_data['settings'] );
		}

		if ( array_key_exists( 'targeting', $raw_data ) ) {
			$survey->setTargeting( (array) $raw_data['targeting'] );
		}

		if ( array_key_exists( 'status', $raw_data ) ) {
			$survey->setStatus( (string) $raw_data['status'] );
		}

		$survey = $this->repository->save( $survey );

		do_action( 'allfeedback_survey_updated', $survey );

		if ( $survey->getStatus()->isPublished() && ! $previous_status->isPublished() ) {
			do_action( 'allfeedback_survey_activated', $survey );
		}

		return $survey;
	}
}
