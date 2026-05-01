<?php
/**
 * Send notification job.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJob;
use AllFeedback\Core\Jobs\AbstractJobPayload;
use AllFeedback\Domain\Survey\SurveyRepository;
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
		'survey_published',
	];

	/**
	 * Constructor.
	 *
	 * @param  SurveyRepository            $survey_repository Repository for loading survey aggregates.
	 * @param  SurveyPublishedNotification $survey_published  Survey-published notification handler.
	 * @param  Logger                      $logger           Logger for recording errors and info.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $survey_repository,
		private readonly SurveyPublishedNotification $survey_published,
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

		$type = $payload->notification_type;

		if ( ! in_array( $type, self::VALID_TYPES, true ) ) {
			$this->logger->error( 'Unknown notification type', [ 'type' => $type ] );
			return;
		}

		$this->handleSurveyPublished( $payload->survey_id );
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
	 * @param  int $survey_id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	private function handleSurveyPublished( int $survey_id ): void {
		$survey = $this->survey_repository->findById( $survey_id );
		if ( ! $survey ) {
			$this->logger->error( 'Survey not found for notification', [ 'survey_id' => $survey_id ] );
			return;
		}

		$context = new NotificationContext( survey: $survey );
		$this->survey_published->send( $context );

		$this->logger->info( 'Survey published notification sent', [ 'survey_id' => $survey_id ] );
	}
}
