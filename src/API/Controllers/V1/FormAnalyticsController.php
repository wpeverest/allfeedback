<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Survey\SurveyAnalyticsService;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;

/**
 * REST controller for form-level analytics summaries.
 *
 * Routes (under `all-feedback/v1`):
 *   `GET /analytics/forms`      — admin; summary metrics for every form.
 *   `GET /analytics/forms/{id}` — admin; full analytics for a single form.
 *
 * Both routes use bulk SQL aggregation — no N+1 queries even with hundreds of forms.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class FormAnalyticsController extends RestController {

	/**
	 * Route base for analytics resources.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = 'analytics';

	/**
	 * @param  SurveyRepository      $surveyRepository   Reads survey aggregates.
	 * @param  SurveySessionRepository $sessionRepository  Session metrics repository.
	 * @param  ResponseRepository    $responseRepository Response score aggregation.
	 * @param  SurveyAnalyticsService $analyticsService   Full per-survey analytics service.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly SurveySessionRepository $sessionRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly SurveyAnalyticsService $analyticsService,
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
			'/' . $this->restBase . '/forms',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'listForms' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => array_merge(
					$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
					$this->listFormsArgs()
				),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/forms/(?P<id>\d+)',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'getFormAnalytics' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);
	}

	/**
	 * Handle `GET /analytics/forms`.
	 *
	 * Returns a paginated list of forms with per-form session and response metrics.
	 * Metrics are fetched in two bulk SQL queries regardless of how many forms are
	 * on the current page.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function listForms( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$status  = $request->get_param( 'status' );
		$page    = (int) $request->get_param( 'page' );
		$perPage = (int) $request->get_param( 'per_page' );

		$filter = new SurveyFilter(
			status:  $status !== null ? SurveyStatus::from( $status ) : null,
			page:    $page,
			perPage: $perPage,
		);

		$surveys = $this->surveyRepository->findAll( $filter );
		$total   = $this->surveyRepository->count( $filter );

		if ( empty( $surveys ) ) {
			return $this->successResponse( [
				'forms'      => [],
				'pagination' => $this->buildPagination( $total, $page, $perPage ),
				'totals'     => [ 'total_forms' => 0, 'total_responses' => 0, 'total_views' => 0 ],
			] );
		}

		$surveyIds       = array_map( fn( Survey $s ) => $s->getId(), $surveys );
		$sessionMetrics  = $this->sessionRepository->getAnalyticsForAllSurveys( $surveyIds );
		$responseMetrics = $this->responseRepository->aggregateScoreStatsForAllSurveys( $surveyIds );

		$totalViews     = 0;
		$totalResponses = 0;

		$forms = array_map(
			function ( Survey $survey ) use ( $sessionMetrics, $responseMetrics, &$totalViews, &$totalResponses ): array {
				$id      = $survey->getId();
				$session = $sessionMetrics[ $id ]  ?? $this->emptySessionMetrics();
				$resp    = $responseMetrics[ $id ] ?? $this->emptyResponseStats();

				$totalViews     += $session['total_views'];
				$totalResponses += $resp['total'];

				return [
					'id'             => $id,
					'title'          => $survey->getTitle(),
					'status'         => $survey->getStatus()->value,
					'response_count' => $survey->getResponseCount(),
					'created_at'     => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
					'updated_at'     => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
					'session_metrics'  => $session,
					'response_metrics' => $this->buildResponseSummary( $resp ),
				];
			},
			$surveys
		);

		return $this->successResponse( [
			'forms'      => $forms,
			'pagination' => $this->buildPagination( $total, $page, $perPage ),
			'totals'     => [
				'total_forms'     => $total,
				'total_responses' => $totalResponses,
				'total_views'     => $totalViews,
			],
		] );
	}

	/**
	 * Handle `GET /analytics/forms/{id}`.
	 *
	 * Returns full analytics for a single form: survey metadata + session metrics
	 * (views, completion, abandonment) + response metrics (scores, NPS, by device,
	 * over time).
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function getFormAnalytics( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );

		try {
			$responseMetrics = $this->analyticsService->getAnalytics( $surveyId );
		} catch ( NotFoundException $e ) {
			return $this->exceptionToResponse( $e );
		}

		$survey         = $this->surveyRepository->findById( $surveyId );
		$sessionMetrics = $this->sessionRepository->getAnalytics( $surveyId );

		return $this->successResponse( [
			'survey'           => [
				'id'             => $survey->getId(),
				'title'          => $survey->getTitle(),
				'description'    => $survey->getDescription(),
				'status'         => $survey->getStatus()->value,
				'response_count' => $survey->getResponseCount(),
				'created_at'     => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
				'updated_at'     => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
			],
			'session_metrics'  => $sessionMetrics,
			'response_metrics' => $responseMetrics,
		] );
	}

	/**
	 * Build the standard pagination envelope.
	 *
	 * @param  int $total   Total matching records (across all pages).
	 * @param  int $page    Current 1-based page number.
	 * @param  int $perPage Items per page.
	 * @return array<string, int>
	 * @since  1.0.0
	 */
	private function buildPagination( int $total, int $page, int $perPage ): array {
		return [
			'total'       => $total,
			'total_pages' => (int) ceil( $total / max( 1, $perPage ) ),
			'page'        => $page,
			'per_page'    => $perPage,
		];
	}

	/**
	 * Derive NPS score and summary from raw aggregated response stats.
	 *
	 * @param  array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int} $stats
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	private function buildResponseSummary( array $stats ): array {
		$total      = $stats['total'];
		$scoreCount = $stats['score_count'];

		$averageScore = $scoreCount > 0
			? round( $stats['score_sum'] / $scoreCount, 2 )
			: null;

		$npsScore = $total > 0
			? round( ( ( $stats['promoters'] - $stats['detractors'] ) / $total ) * 100, 2 )
			: 0.0;

		return [
			'total_responses' => $total,
			'average_score'   => $averageScore,
			'nps_score'       => [
				'score'      => $npsScore,
				'promoters'  => $stats['promoters'],
				'passives'   => $stats['passives'],
				'detractors' => $stats['detractors'],
			],
		];
	}

	/**
	 * Zero-value session metrics for forms with no session data yet.
	 *
	 * @return array<string, int|null>
	 * @since  1.0.0
	 */
	private function emptySessionMetrics(): array {
		return [
			'total_views'         => 0,
			'total_starts'        => 0,
			'total_submissions'   => 0,
			'completion_rate'     => null,
			'abandonment_rate'    => null,
			'avg_completion_time' => null,
		];
	}

	/**
	 * Zero-value response stats for forms with no responses yet.
	 *
	 * @return array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int}
	 * @since  1.0.0
	 */
	private function emptyResponseStats(): array {
		return [
			'total'       => 0,
			'score_count' => 0,
			'score_sum'   => 0.0,
			'promoters'   => 0,
			'passives'    => 0,
			'detractors'  => 0,
		];
	}

	/**
	 * Build the argument schema for the forms list endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function listFormsArgs(): array {
		return [
			'status' => $this->argEnum(
				description: __( 'Filter by survey status.', 'all-feedback' ),
				values:      [ 'draft', 'published', 'archived', 'trashed' ],
			),
		];
	}
}
