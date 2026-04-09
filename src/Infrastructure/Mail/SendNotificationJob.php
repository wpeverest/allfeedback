<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJob;
use AllFeedback\Core\Jobs\AbstractJobPayload;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Infrastructure\Mail\Notifications\NewResponseAdminNotification;
use AllFeedback\Infrastructure\Mail\Notifications\SurveyPublishedNotification;
use AllFeedback\Infrastructure\Mail\Notifications\ThankYouRespondentNotification;
use AllFeedback\Support\Logger;

/**
 * Background job that dispatches a single notification email.
 *
 * Notification type routing:
 *   - `new_response_alert`      → admin email on new response submission
 *   - `survey_published`        → admin email when a survey is activated
 *   - `thank_you_respondent`    → respondent email after survey submission
 *
 * @since 1.0.0
 */
class SendNotificationJob extends AbstractJob {

	/** @since 1.0.0 */
	private const VALID_TYPES = [
		'new_response_alert',
		'survey_published',
		'thank_you_respondent',
	];

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly NewResponseAdminNotification $newResponseAdmin,
		private readonly SurveyPublishedNotification $surveyPublished,
		private readonly ThankYouRespondentNotification $thankYouRespondent,
		private readonly Logger $logger,
	) {}

	/**
	 * Execute the notification job for the given payload.
	 *
	 * @since 1.0.0
	 */
	public function handle( AbstractJobPayload $payload ): void {
		assert( $payload instanceof SendNotificationJobPayload );

		$type = $payload->notificationType;

		if ( ! in_array( $type, self::VALID_TYPES, true ) ) {
			$this->logger->error( 'Unknown notification type', [ 'type' => $type ] );
			return;
		}

		if ( $type === 'survey_published' ) {
			$this->handleSurveyPublished( $payload->surveyId );
			return;
		}

		$this->handleResponseNotification( $type, $payload->surveyId, $payload->responseId );
	}

	/**
	 * Reconstruct a typed payload from a serialised array.
	 *
	 * @param array<string, mixed> $data Serialised payload data.
	 * @since 1.0.0
	 */
	public static function payloadFromArray( array $data ): SendNotificationJobPayload {
		return SendNotificationJobPayload::fromArray( $data );
	}

	/**
	 * Handle the survey_published notification type.
	 *
	 * @since 1.0.0
	 */
	private function handleSurveyPublished( int $surveyId ): void {
		$survey = $this->surveyRepository->findById( $surveyId );
		if ( ! $survey ) {
			$this->logger->error( 'Survey not found for notification', [ 'survey_id' => $surveyId ] );
			return;
		}

		$context = new NotificationContext( survey: $survey );
		$this->surveyPublished->send( $context );

		$this->logger->info( 'Survey published notification sent', [ 'survey_id' => $surveyId ] );
	}

	/**
	 * Handle response-scoped notification types (new_response_alert, thank_you_respondent).
	 *
	 * @since 1.0.0
	 */
	private function handleResponseNotification( string $type, int $surveyId, int $responseId ): void {
		$survey = $this->surveyRepository->findById( $surveyId );
		if ( ! $survey ) {
			$this->logger->error( 'Survey not found for notification', [ 'survey_id' => $surveyId ] );
			return;
		}

		$response = $this->responseRepository->findById( $responseId );
		if ( ! $response ) {
			$this->logger->error( 'Response not found for notification', [ 'response_id' => $responseId ] );
			return;
		}

		$context = new NotificationContext( survey: $survey, response: $response );

		match ( $type ) {
			'new_response_alert'   => $this->newResponseAdmin->send( $context ),
			'thank_you_respondent' => $this->thankYouRespondent->send( $context ),
			default                => null,
		};

		$this->logger->info(
			'Notification sent',
			[
				'type'        => $type,
				'survey_id'   => $surveyId,
				'response_id' => $responseId,
			]
		);
	}
}
