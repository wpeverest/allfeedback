<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Response\ResponseDTO;
use AllFeedback\Application\Response\SubmitResponseService;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Support\Logger;

/**
 * Class SubmitController
 *
 * Handles the public-facing survey submission endpoint.
 *
 * Route registered (under all-feedback/v1):
 *   POST /surveys/{id}/submit → handle() : public widget submission
 *
 * Intentionally separate from ResponsesController (admin read/delete) to
 * enforce a clear security boundary: this controller is public-permission
 * (nonce-gated), all others require manage_options.
 *
 * Submission flow:
 *   1. Nonce verification.
 *   2. Survey existence + published-status guard.
 *   3. Duplicate IP detection (HMAC-SHA256, no raw IP stored).
 *   4. `allfeedback_allow_response_submission` filter — pro blocking hooks.
 *   5. `allfeedback_response_data_before_save` filter — data transformation.
 *   6. Delegate to SubmitResponseService, which runs the validation pipeline,
 *      persists the response, and fires `allfeedback:response:submitted` to
 *      trigger the async notification pipeline (admin alert + respondent email).
 *   7. `allfeedback_response_submitted` action — third-party side-effects.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SubmitController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * Nonce action used to authenticate public widget submissions.
	 *
	 * @since 1.0.0
	 */
	public const NONCE_ACTION = 'allfeedback_submit';

	/**
	 * @param  SurveyRepository        $surveyRepository   Survey repository for existence and status checks.
	 * @param  ResponseRepository      $responseRepository Response repository for duplicate detection.
	 * @param  SubmitResponseService   $submitService      Use-case service for response submission.
	 * @param  SettingsManager         $settingsManager    Settings for privacy flags.
	 * @param  Logger                  $logger             Structured logger.
	 * @param  SurveySessionRepository $sessionRepository  Session repository for analytics.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly SubmitResponseService $submitService,
		private readonly SettingsManager $settingsManager,
		private readonly Logger $logger,
		private readonly SurveySessionRepository $sessionRepository,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/submit',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'handle' ],
				'permission_callback' => [ $this, 'publicPermission' ],
				'args'                => array_merge( $this->idArg(), $this->submitArgs() ),
			]
		);
	}

	/**
	 * POST /all-feedback/v1/surveys/{id}/submit
	 *
	 * Accept and persist a public widget submission.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function handle( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$nonce = sanitize_text_field( (string) ( $request->get_param( 'nonce' ) ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			$this->logger->warning(
				'Submission rejected: invalid nonce.',
				[ 'survey_id' => (int) $request->get_param( 'id' ) ]
			);
			return $this->errorResponse( __( 'Invalid or expired nonce.', 'all-feedback' ), 403 );
		}

		[ $ipHash, $rawIp ] = $this->resolveIp();

		if ( ! $this->checkRateLimit( $ipHash ) ) {
			$this->logger->warning( 'Submission rejected: rate limit exceeded.', [ 'survey_id' => (int) $request->get_param( 'id' ) ] );
			return $this->errorResponse( __( 'Too many submissions. Please wait before trying again.', 'all-feedback' ), 429 );
		}

		$surveyId = (int) $request->get_param( 'id' );
		$survey   = $this->surveyRepository->findById( $surveyId );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$isDraft        = $survey->getStatus()->value === 'draft';
		$isAdminPreview = $isDraft && current_user_can( 'manage_options' );

		if ( ! $survey->getStatus()->isPublished() && ! $isAdminPreview ) {
			$this->logger->warning(
				'Submission rejected: survey not published.',
				[ 'survey_id' => $surveyId, 'status' => $survey->getStatus()->value ]
			);
			return $this->errorResponse( __( 'This survey is not currently accepting responses.', 'all-feedback' ), 403 );
		}

		if ( ! (bool) apply_filters( 'allfeedback_allow_response_submission', true, $surveyId, $survey, $request ) ) {
			$this->logger->warning( 'Submission blocked by filter.', [ 'survey_id' => $surveyId ] );
			return $this->errorResponse( __( 'Response submission is not allowed.', 'all-feedback' ), 403 );
		}

		$disableUserDetails = (bool) $this->settingsManager->get( 'advanced.privacy.disable_user_details' );

		if ( ! $disableUserDetails && ! current_user_can( 'manage_options' ) ) {
			$duplicateWindowHours = max( 0, (int) apply_filters( 'allfeedback_duplicate_window_hours', 0, $surveyId ) );
			$userId               = get_current_user_id();

			if ( $userId > 0 ) {
				if ( $this->responseRepository->existsByUserId( $surveyId, $userId, $duplicateWindowHours ) ) {
					$this->logger->debug( 'Duplicate submission blocked (user_id).', [ 'survey_id' => $surveyId, 'user_id' => $userId ] );
					return $this->errorResponse( __( 'A response from this user has already been recorded.', 'all-feedback' ), 409 );
				}
			} else {
				$visitorToken = sanitize_text_field( (string) ( $request->get_param( 'visitor_token' ) ?? '' ) );

				if ( $visitorToken !== '' ) {
					if ( $this->responseRepository->existsByGuestToken( $surveyId, $visitorToken, $duplicateWindowHours ) ) {
						$this->logger->debug( 'Duplicate submission blocked (guest_token).', [ 'survey_id' => $surveyId ] );
						return $this->errorResponse( __( 'A response from this visitor has already been recorded.', 'all-feedback' ), 409 );
					}
				} elseif ( $ipHash !== '' ) {
					if ( $this->responseRepository->existsByIpHash( $surveyId, $ipHash, $duplicateWindowHours ) ) {
						$this->logger->debug( 'Duplicate submission blocked (ip_hash).', [ 'survey_id' => $surveyId ] );
						return $this->errorResponse( __( 'A response from this visitor has already been recorded.', 'all-feedback' ), 409 );
					}
				}
			}
		}

		$responseData = $this->sanitizeResponseData(
			(array) apply_filters(
				'allfeedback_response_data_before_save',
				(array) ( $request->get_param( 'response_data' ) ?? [] ),
				$surveyId,
				$survey
			)
		);

		$dto = ResponseDTO::fromArray(
			$surveyId,
			array_merge( $request->get_params(), [ 'response_data' => $responseData ] )
		);

		try {
			$domainResponse = $this->submitService->execute( $dto, $ipHash, $disableUserDetails ? null : $rawIp );
		} catch ( ValidationException $e ) {
			return $this->exceptionToResponse( $e );
		} catch ( NotFoundException $e ) {
			return $this->exceptionToResponse( $e );
		}

		$responseId = (int) $domainResponse->getId();

		$sessionId = sanitize_text_field( (string) ( $request->get_param( 'session_id' ) ?? '' ) );
		if ( $sessionId !== '' ) {
			$session = $this->sessionRepository->findBySessionId( $sessionId );
			if ( $session !== null && ! $session->isSubmitted() ) {
				$session->markSubmitted( new \DateTimeImmutable() );
				$this->sessionRepository->save( $session );
			}
		}

		do_action( 'allfeedback_response_submitted', $responseId, $surveyId, $survey );

		$this->logger->info(
			'Survey response submitted.',
			[
				'response_id' => $responseId,
				'survey_id'   => $surveyId,
				'score'       => $request->get_param( 'score' ),
				'anonymous'   => ! is_user_logged_in(),
			]
		);

		return $this->successResponse( [ 'id' => $responseId ], 201 );
	}

	/**
	 * Resolve the visitor's IP address and return both the HMAC-SHA256 hash
	 * and the raw sanitised IP string.
	 *
	 * Uses REMOTE_ADDR (the real connection IP, not spoofable) by default.
	 * HTTP_X_FORWARDED_FOR is only trusted when the connection originates from
	 * an IP listed in the `allfeedback_trusted_proxies` filter (e.g. a load
	 * balancer or CDN whose IP is known and fixed).
	 *
	 * @return array{0: string, 1: string} [ $hash, $rawIp ]
	 * @since  1.0.0
	 */
	private function resolveIp(): array {
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$remoteAddr = sanitize_text_field( (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ) );
		$ip         = $remoteAddr;

		$trustedProxies = (array) apply_filters( 'allfeedback_trusted_proxies', [] );

		if ( $trustedProxies !== [] && in_array( $remoteAddr, $trustedProxies, true ) ) {
			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			$forwarded = sanitize_text_field( trim( explode( ',', (string) ( $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '' ) )[0] ) );
			if ( $forwarded !== '' && filter_var( $forwarded, FILTER_VALIDATE_IP ) ) {
				$ip = $forwarded;
			}
		}

		$secret = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'allfeedback';

		return [ hash_hmac( 'sha256', $ip, $secret ), $ip ];
	}

	/**
	 * Rate-limit submissions by IP hash using a transient counter.
	 *
	 * Allows a maximum of `allfeedback_submit_rate_limit` submissions (default 10)
	 * per IP within a 5-minute window.
	 *
	 * @param  string $ipHash HMAC hash of the visitor IP.
	 * @return bool True when under the limit; false when exceeded.
	 * @since  1.0.0
	 */
	private function checkRateLimit( string $ipHash ): bool {
		$limit = max( 1, (int) apply_filters( 'allfeedback_submit_rate_limit', 10 ) );
		$key   = 'allfb_rl_' . substr( $ipHash, 0, 16 );
		$count = (int) get_transient( $key );

		if ( $count >= $limit ) {
			return false;
		}

		set_transient( $key, $count + 1, 5 * MINUTE_IN_SECONDS );
		return true;
	}

	/**
	 * Recursively sanitise the response_data array.
	 *
	 * Strips HTML from all string values so that arbitrary markup submitted by
	 * a visitor is never stored in the database. Numeric and boolean values are
	 * left as-is; nested arrays are processed recursively. Unknown types are
	 * dropped silently.
	 *
	 * @param  array<mixed> $data Raw response_data payload.
	 * @return array<mixed> Sanitised payload.
	 * @since  1.0.0
	 */
	private function sanitizeResponseData( array $data ): array {
		$clean = [];
		foreach ( $data as $key => $value ) {
			$key = is_string( $key ) ? sanitize_text_field( $key ) : (int) $key;
			if ( is_array( $value ) ) {
				$clean[ $key ] = $this->sanitizeResponseData( $value );
			} elseif ( is_string( $value ) ) {
				$clean[ $key ] = sanitize_text_field( $value );
			} elseif ( is_int( $value ) || is_float( $value ) || is_bool( $value ) || $value === null ) {
				$clean[ $key ] = $value;
			}
		}
		return $clean;
	}

	/**
	 * Body arguments for the public submission endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function submitArgs(): array {
		return [
			'nonce'         => $this->argString(
				description: __( 'WordPress nonce for submission authentication (action: allfeedback_submit).', 'all-feedback' ),
				required:    true,
			),
			'response_data' => [
				'description'       => __( 'Field answers keyed by field ID.', 'all-feedback' ),
				'type'              => 'object',
				'required'          => true,
				'validate_callback' => 'rest_validate_request_arg',
			],
			'score'         => $this->argInteger(
				description: __( 'Numeric score for NPS, CSAT, CES, or star-rating fields.', 'all-feedback' ),
				min:         0,
				max:         100,
			),
			'page_url'      => $this->argString(
				description: __( 'URL of the page where the survey was displayed.', 'all-feedback' ),
				maxLength:   2083,
			),
			'device_type'   => $this->argEnum(
				description: __( 'Visitor device type at submission time.', 'all-feedback' ),
				values:      [ 'desktop', 'tablet', 'mobile' ],
			),
			'consent_given' => $this->argBoolean(
				description: __( 'Whether the visitor gave GDPR data-processing consent.', 'all-feedback' ),
				default:     false,
			),
			'visitor_token' => $this->argString(
				description: __( 'Persistent guest visitor UUID (v4) for duplicate detection.', 'all-feedback' ),
				maxLength:   36,
			),
			'session_id'    => $this->argString(
				description: __( 'Analytics session UUID (v4) generated on widget open.', 'all-feedback' ),
				maxLength:   36,
			),
		];
	}
}
