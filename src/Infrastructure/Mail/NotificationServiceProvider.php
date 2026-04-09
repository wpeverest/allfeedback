<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Core\Jobs\Contracts\JobDispatcher;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Traits\Hooks;

/**
 * Registers WordPress action hooks that queue notification jobs.
 *
 * Listens to:
 *   - `allfeedback:response:submitted`  → queues new_response_alert + thank_you_respondent
 *   - `allfeedback:survey:created`      → (no-op; notification only fires on activation)
 *   - `allfeedback:survey:activated`    → queues survey_published
 *
 * All emails are dispatched asynchronously via Action Scheduler so that the
 * critical path (e.g. public widget submission) is never delayed by SMTP.
 *
 * @since 1.0.0
 */
class NotificationServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly JobDispatcher $dispatcher,
	) {}

	/**
	 * Wire up WordPress hooks for notification triggers.
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'allfeedback:response:submitted', [ $this, 'onResponseSubmitted' ] );
		$this->addAction( 'allfeedback:survey:activated', [ $this, 'onSurveyActivated' ] );
	}

	/**
	 * Queue admin alert and optional respondent thank-you on a new response.
	 *
	 * @since 1.0.0
	 */
	public function onResponseSubmitted( Response $response ): void {
		$surveyId   = $response->getSurveyId();
		$responseId = (int) $response->getId();

		$this->dispatcher->dispatch(
			SendNotificationJob::class,
			new SendNotificationJobPayload(
				notificationType: 'new_response_alert',
				surveyId: $surveyId,
				responseId: $responseId,
			)
		);

		$this->dispatcher->dispatch(
			SendNotificationJob::class,
			new SendNotificationJobPayload(
				notificationType: 'thank_you_respondent',
				surveyId: $surveyId,
				responseId: $responseId,
			)
		);
	}

	/**
	 * Queue a survey-published notification when a survey is activated.
	 *
	 * @since 1.0.0
	 */
	public function onSurveyActivated( Survey $survey ): void {
		$surveyId = (int) $survey->getId();
		if ( $surveyId <= 0 ) {
			return;
		}

		$this->dispatcher->dispatch(
			SendNotificationJob::class,
			new SendNotificationJobPayload(
				notificationType: 'survey_published',
				surveyId: $surveyId,
			)
		);
	}
}
