<?php
/**
 * Create survey service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;

/**
 * Use-case service: create a new survey aggregate and persist it.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class CreateSurveyService {

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
	 * Validate, create, and persist a new Survey.
	 *
	 * @param  SurveyDTO $dto    Validated survey payload.
	 * @param  int       $user_id WordPress user ID of the creator.
	 * @return Survey
	 * @throws ValidationException When required fields are missing.
	 * @since  1.0.0
	 */
	public function execute( SurveyDTO $dto, int $user_id ): Survey {
		if ( trim( $dto->title ) === '' ) {
			throw ValidationException::withErrors(
				[ 'title' => esc_html__( 'Survey title is required.', 'allfeedback' ) ]
			);
		}

		$survey = new Survey(
			title: $dto->title,
			description: $dto->description,
			form_schema: $dto->form_schema,
			settings: $dto->settings,
			targeting: $dto->targeting,
			created_by: $user_id,
			status: SurveyStatus::tryFrom( $dto->status ) ?? SurveyStatus::Draft,
		);

		$survey = $this->repository->save( $survey );

		do_action( 'allfeedback_survey_created', $survey );

		return $survey;
	}
}
