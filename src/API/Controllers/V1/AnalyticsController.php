<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Analytics\TrackSessionEventService;
use AllFeedback\Domain\Analytics\SurveySessionRepository;

/**
 * REST controller for survey session analytics.
 *
 * Routes (under `all-feedback/v1`):
 *   `POST /surveys/{id}/analytics/event` — public; track a single session event.
 *   `GET  /surveys/{id}/analytics`       — admin; return aggregate metrics.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class AnalyticsController extends RestController {

	/**
	 * Route base for survey resources.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param  TrackSessionEventService  $trackService       Use-case service for recording events.
	 * @param  SurveySessionRepository   $sessionRepository  Session repository for aggregate queries.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly TrackSessionEventService $trackService,
		private readonly SurveySessionRepository $sessionRepository,
	) {}

	/**
	 * Register all REST routes for this controller.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/analytics/event',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'trackEvent' ],
				'permission_callback' => [ $this, 'publicPermission' ],
				'args'                => array_merge( $this->idArg(), $this->eventArgs() ),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/analytics',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'getAnalytics' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);
	}

	/**
	 * Handle `POST /surveys/{id}/analytics/event`.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function trackEvent( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId  = (int) $request->get_param( 'id' );
		$event     = sanitize_key( (string) $request->get_param( 'event' ) );
		$sessionId = sanitize_text_field( (string) ( $request->get_param( 'session_id' ) ?? '' ) );
		$guestId   = sanitize_text_field( (string) ( $request->get_param( 'guest_id' ) ?? '' ) ) ?: null;
		$userId    = get_current_user_id() ?: null;

		if ( $sessionId === '' ) {
			return $this->errorResponse( __( 'session_id is required.', 'all-feedback' ), 400 );
		}

		$this->trackService->execute( $surveyId, $event, $sessionId, $userId, $guestId );

		return $this->successResponse( null );
	}

	/**
	 * Handle `GET /surveys/{id}/analytics`.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function getAnalytics( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );
		$metrics  = $this->sessionRepository->getAnalytics( $surveyId );

		return $this->successResponse( $metrics );
	}

	/**
	 * Build the argument schema for the event-tracking endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function eventArgs(): array {
		return [
			'event'      => $this->argEnum(
				description: __( 'Analytics event type.', 'all-feedback' ),
				values:      [ 'viewed', 'started', 'abandoned', 'heartbeat' ],
				required:    true,
			),
			'session_id' => $this->argString(
				description: __( 'Client-generated session UUID (v4).', 'all-feedback' ),
				required:    true,
				maxLength:   36,
			),
			'guest_id'   => $this->argString(
				description: __( 'Persistent guest visitor token from localStorage.', 'all-feedback' ),
				maxLength:   36,
			),
		];
	}
}
