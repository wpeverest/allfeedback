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
use AllFeedback\Support\Logger;

/**
 * Background job that dispatches a single notification email.
 *
 * Notification type routing:
 *   - `new_response_alert`  → admin email on new response submission
 *   - `survey_published`    → admin email when a survey is activated
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class SendNotificationJob extends AbstractJob {

	/**
	 * Notification type identifiers handled by this job.
	 *
	 * @var string[]
	 * @since 1.0.0
	 */
	private const VALID_TYPES = [
		'new_response_alert',
		'survey_published',
	];

	/**
	 * @param  SurveyRepository              $surveyRepository   Repository for loading survey aggregates.
	 * @param  ResponseRepository            $responseRepository Repository for loading response aggregates.
	 * @param  NewResponseAdminNotification  $newResponseAdmin   Admin alert notification handler.
	 * @param  SurveyPublishedNotification   $surveyPublished    Survey-published notification handler.
	 * @param  Logger                        $logger             Logger for recording errors and info.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly NewResponseAdminNotification $newResponseAdmin,
		private readonly SurveyPublishedNotification $surveyPublished,
		private readonly Logger $logger,
	) {}

	/**
	 * Execute the notification job for the given payload.
	 *
	 * @param  AbstractJobPayload $payload Typed payload containing the notification type and entity IDs.
	 * @return void
	 * @since  1.0.0
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
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return SendNotificationJobPayload
	 * @since  1.0.0
	 */
	public static function payloadFromArray( array $data ): SendNotificationJobPayload {
		return SendNotificationJobPayload::fromArray( $data );
	}

	/**
	 * Handle the survey_published notification type.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return void
	 * @since  1.0.0
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
	 * Handle the new_response_alert notification type.
	 *
	 * @param  string $type       Notification type identifier.
	 * @param  int    $surveyId   Survey primary key.
	 * @param  int    $responseId Response primary key.
	 * @return void
	 * @since  1.0.0
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
		$this->newResponseAdmin->send( $context );

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
