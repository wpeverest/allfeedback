<?php

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
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $repository,
	) {}

	/**
	 * Apply a partial update to a survey identified by $id.
	 *
	 * Only keys present in $rawData are applied; absent keys leave the
	 * existing field value unchanged.
	 *
	 * @param int   $id      ID of the survey to update.
	 * @param array $rawData Partial field map from the request.
	 * @return Survey
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since 1.0.0
	 */
	public function execute( int $id, array $rawData ): Survey {
		$survey = $this->repository->findById( $id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'all-feedback' ), $id );
		}

		if ( array_key_exists( 'title', $rawData ) ) {
			$survey->setTitle( (string) $rawData['title'] );
		}

		if ( array_key_exists( 'description', $rawData ) ) {
			$survey->setDescription( (string) $rawData['description'] );
		}

		if ( array_key_exists( 'form_schema', $rawData ) ) {
			$survey->setFormSchema( (array) $rawData['form_schema'] );
		}

		if ( array_key_exists( 'settings', $rawData ) ) {
			$survey->setSettings( (array) $rawData['settings'] );
		}

		if ( array_key_exists( 'targeting', $rawData ) ) {
			$survey->setTargeting( (array) $rawData['targeting'] );
		}

		if ( array_key_exists( 'status', $rawData ) ) {
			$survey->setStatus( (string) $rawData['status'] );
		}

		$survey = $this->repository->save( $survey );

		do_action( 'allfeedback:survey:updated', $survey );

		return $survey;
	}
}
