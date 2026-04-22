<?php

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Use-case service: create a new survey aggregate and persist it.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class CreateSurveyService {

	/**
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
	 * @param  int       $userId WordPress user ID of the creator.
	 * @return Survey
	 * @throws ValidationException When required fields are missing.
	 * @since  1.0.0
	 */
	public function execute( SurveyDTO $dto, int $userId ): Survey {
		if ( trim( $dto->title ) === '' ) {
			throw ValidationException::withErrors(
				[ 'title' => esc_html__( 'Survey title is required.', 'all-feedback' ) ]
			);
		}

		$survey = new Survey(
			title: $dto->title,
			description: $dto->description,
			formSchema: $dto->formSchema,
			settings: $dto->settings,
			targeting: $dto->targeting,
			status: $dto->status,
			userId: $userId,
		);

		$survey = $this->repository->save( $survey );

		do_action( 'allfeedback:survey:created', $survey );

		return $survey;
	}
}
