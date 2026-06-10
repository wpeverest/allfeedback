<?php
/**
 * Submit response service.
 *
 * @package AllFeedback\Application\Response
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Response;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Application\Response\Pipes\ResponseContext;
use AllFeedback\Application\Response\Pipes\ValidateConsentIfRequired;
use AllFeedback\Application\Response\Pipes\ValidateResponseData;
use AllFeedback\Application\Response\Pipes\ValidateSurveyIsActive;
use AllFeedback\Application\Response\Pipes\PipeInterface;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Settings\SettingsManager;
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
	 * Constructor.
	 *
	 * @param  SurveyRepository   $survey_repository   Reads survey aggregates.
	 * @param  ResponseRepository $response_repository Persists response aggregates.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $survey_repository,
		private readonly ResponseRepository $response_repository,
		private readonly SettingsManager $settings_manager,
	) {}

	/**
	 * Run the validation pipeline, create a Response aggregate, and persist it.
	 *
	 * @param  ResponseDTO $dto       Validated response payload.
	 * @param  string      $ip_hash    HMAC-SHA256 hash of the visitor's IP (computed by the controller).
	 * @param  string|null $ip_address Raw IP address, or null when privacy mode is active.
	 * @return Response
	 * @throws NotFoundException When the referenced survey does not exist.
	 * @since  1.0.0
	 */
	public function execute( ResponseDTO $dto, string $ip_hash, ?string $ip_address = null ): Response {
		$survey = $this->survey_repository->findById( $dto->survey_id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $dto->survey_id ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- surveyId is a typed int
		}

		$context = new ResponseContext( dto: $dto, survey: $survey );

		$pipeline = [
			new ValidateSurveyIsActive(),
			new ValidateResponseData(),
			new ValidateConsentIfRequired( $this->settings_manager ),
		];

		$this->runPipeline( $pipeline, $context );

		$response = new Response(
			survey_id: $dto->survey_id,
			response_data: $dto->response_data,
			score: $dto->score,
			page_url: $dto->page_url,
			device_type: $dto->device_type,
			ip_hash: $ip_hash,
			ip_address: $ip_address,
			user_id: $dto->user_id > 0 ? $dto->user_id : null,
			guest_token: $dto->guest_token,
			consent_given: $dto->consent_given,
		);

		$response = $this->response_repository->save( $response );

		$this->survey_repository->incrementResponseCount( $dto->survey_id );

		do_action( 'allfeedback_response_submitted', $response, $survey );

		return $response;
	}

	/**
	 * Execute a sequential pipeline of pipe objects against a shared context.
	 *
	 * @param  array<PipeInterface> $pipes   Ordered list of pipe objects.
	 * @param  ResponseContext      $context Mutable context passed through the pipeline.
	 * @return void
	 * @since  1.0.0
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
