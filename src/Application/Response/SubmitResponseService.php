<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Application\Response\Pipes\ResponseContext;
use AllFeedback\Application\Response\Pipes\ValidateConsentIfRequired;
use AllFeedback\Application\Response\Pipes\ValidateResponseData;
use AllFeedback\Application\Response\Pipes\ValidateSurveyIsActive;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Use-case service: validate and persist a survey response submission.
 *
 * @package AllFeedback\Application\Response
 * @since   1.0.0
 */
class SubmitResponseService {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
	) {}

	/**
	 * Run the validation pipeline, create a Response aggregate, and persist it.
	 *
	 * @param ResponseDTO $dto Validated response payload.
	 * @return Response
	 * @throws NotFoundException   When the referenced survey does not exist.
	 * @since 1.0.0
	 */
	public function execute( ResponseDTO $dto ): Response {
		$survey = $this->surveyRepository->findById( $dto->surveyId );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'all-feedback' ), $dto->surveyId );
		}

		$context = new ResponseContext( dto: $dto, survey: $survey );

		$pipeline = [
			new ValidateSurveyIsActive(),
			new ValidateResponseData(),
			new ValidateConsentIfRequired(),
		];

		$this->runPipeline( $pipeline, $context );

		$ipHash = hash( 'sha256', $_SERVER['REMOTE_ADDR'] ?? '' );

		$response = new Response(
			surveyId: $dto->surveyId,
			userId: $dto->userId,
			responseData: $dto->responseData,
			score: $dto->score,
			pageUrl: $dto->pageUrl,
			deviceType: $dto->deviceType,
			consentGiven: $dto->consentGiven,
			ipHash: $ipHash,
		);

		$response = $this->responseRepository->save( $response );

		do_action( 'allfeedback:response:submitted', $response, $survey );

		return $response;
	}

	/**
	 * Execute a sequential pipeline of pipe objects against a shared context.
	 *
	 * @param array           $pipes   Ordered list of pipe objects exposing execute().
	 * @param ResponseContext $context Mutable context passed through the pipeline.
	 * @return void
	 * @since 1.0.0
	 */
	private function runPipeline( array $pipes, ResponseContext $context ): void {
		$stack = static fn() => null;

		foreach ( array_reverse( $pipes ) as $pipe ) {
			$next  = $stack;
			$stack = static fn( ResponseContext $ctx ) => $pipe->execute( $ctx, $next );
		}

		$stack( $context );
	}
}
