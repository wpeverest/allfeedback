<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Survey\SurveyAnalyticsService;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseFilter;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;

/**
 * REST controller for form-level analytics summaries.
 *
 * Routes (under `all-feedback/v1`):
 *   `GET /analytics/overview`   — admin; global stats for "all forms" dashboard view.
 *   `GET /analytics/forms`      — admin; summary metrics for every form.
 *   `GET /analytics/forms/{id}` — admin; full analytics for a single form.
 *
 * Both list routes use bulk SQL aggregation — no N+1 queries even with hundreds of forms.
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
			'/' . $this->restBase . '/overview',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'getOverview' ],
				'permission_callback' => [ $this, 'adminPermission' ],
			]
		);

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
	 * Handle `GET /analytics/overview`.
	 *
	 * Returns the "all forms selected" summary view: stat cards with week-over-week
	 * deltas, a 30-day response chart, enriched recent responses (with score, survey
	 * title, and survey type), and a global device breakdown.
	 *
	 * All heavy aggregation runs in SQL — PHP only computes the WoW percentages.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function getOverview( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$today      = ( new \DateTimeImmutable( 'today' ) )->format( 'Y-m-d' );
		$chartStart = ( new \DateTimeImmutable( 'today' ) )->modify( '-29 days' )->format( 'Y-m-d' );

		// 7 queries total. Date windows are computed inside MySQL (CURDATE()) so
		// no PHP date arithmetic is needed here — each bundle method is one query.
		$responseStats   = $this->responseRepository->getOverviewStats();          // 1 — total + WoW counts + score WoW
		$sessionStats    = $this->sessionRepository->getOverviewSessionStats();    // 1 — completion rate + WoW
		$surveyStats     = $this->surveyRepository->countPublishedWithNewCount();  // 1 — active + new this week
		$rawChart        = $this->responseRepository->countByDateGlobal( $chartStart, $today ); // 1
		$recentRaw       = $this->responseRepository->findAll( new ResponseFilter( perPage: 5 ) ); // 1
		$deviceBreakdown = $this->responseRepository->countByDeviceGlobal();       // 1
		$recent          = $this->buildRecentResponses( $recentRaw );              // 1 (findByIds)

		$chartData = $this->buildChart( $rawChart, $chartStart, $today );

		return $this->successResponse( [
			'stats' => [
				'total_feedback' => [
					'value'  => $responseStats['total_feedback'],
					'change' => $this->weekOverWeekChange( $responseStats['this_week_count'], $responseStats['last_week_count'] ),
				],
				'completion_rate' => [
					'value'  => $sessionStats['completion_rate'],
					'change' => $this->weekOverWeekChange( $sessionStats['this_week_completion_rate'], $sessionStats['last_week_completion_rate'] ),
				],
				'abandonment_rate' => [
					'value'  => $sessionStats['abandonment_rate'],
					'change' => $this->weekOverWeekChange( $sessionStats['this_week_abandonment_rate'], $sessionStats['last_week_abandonment_rate'] ),
				],
				'avg_rating' => [
					'value'  => $responseStats['avg_score'],
					'change' => $this->weekOverWeekChange( $responseStats['this_week_avg_score'], $responseStats['last_week_avg_score'] ),
				],
				'active_surveys' => [
					'value'         => $surveyStats['total'],
					'new_this_week' => $surveyStats['new_this_week'],
					'change'        => $surveyStats['total'] > 0
						? round( $surveyStats['new_this_week'] / $surveyStats['total'] * 100, 1 )
						: null,
				],
			],
			'chart'            => $chartData,
			'total_in_period'  => array_sum( array_column( $chartData, 'count' ) ),
			'recent_responses' => $recent,
			'device_breakdown' => $deviceBreakdown,
		] );
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
				'total_forms' => 0,
			] );
		}

		$surveyIds       = array_map( fn( Survey $s ) => $s->getId(), $surveys );
		$sessionMetrics  = $this->sessionRepository->getAnalyticsForAllSurveys( $surveyIds );
		$responseMetrics = $this->responseRepository->aggregateScoreStatsForAllSurveys( $surveyIds );

		$forms = array_map(
			function ( Survey $survey ) use ( $sessionMetrics, $responseMetrics ): array {
				$id = $survey->getId();

				return [
					'id'               => $id,
					'title'            => $survey->getTitle(),
					'status'           => $survey->getStatus()->value,
					'response_count'   => $survey->getResponseCount(),
					'created_at'       => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
					'updated_at'       => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
					'session_metrics'  => $sessionMetrics[ $id ]  ?? $this->emptySessionMetrics(),
					'response_metrics' => $this->buildResponseSummary( $responseMetrics[ $id ] ?? $this->emptyResponseStats() ),
				];
			},
			$surveys
		);

		return $this->successResponse( [
			'forms'       => $forms,
			'pagination'  => $this->buildPagination( $total, $page, $perPage ),
			'total_forms' => $total,
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
	 * Build a complete daily series padded with zeros for days with no responses.
	 *
	 * @param  array<string, int> $countsByDate SQL result keyed by Y-m-d date.
	 * @param  string             $startDate    First date in the series (Y-m-d).
	 * @param  string             $endDate      Last date in the series (Y-m-d).
	 * @return array<int, array{date: string, count: int}>
	 * @since  1.0.0
	 */
	private function buildChart( array $countsByDate, string $startDate, string $endDate ): array {
		$result  = [];
		$current = new \DateTimeImmutable( $startDate );
		$end     = new \DateTimeImmutable( $endDate );

		while ( $current <= $end ) {
			$d        = $current->format( 'Y-m-d' );
			$result[] = [ 'date' => $d, 'count' => $countsByDate[ $d ] ?? 0 ];
			$current  = $current->modify( '+1 day' );
		}

		return $result;
	}

	/**
	 * Enrich recent responses with survey title and survey type.
	 *
	 * Fetches survey data for the unique survey IDs in $responses (at most one
	 * DB query per unique survey), then merges title and type into each item.
	 *
	 * @param  Response[] $responses Up to 5 most recent Response aggregates.
	 * @return array<int, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function buildRecentResponses( array $responses ): array {
		if ( empty( $responses ) ) {
			return [];
		}

		$surveyIds = array_unique( array_map( fn( Response $r ) => $r->getSurveyId(), $responses ) );
		$surveys   = $this->surveyRepository->findByIds( $surveyIds ); // 1 query, keyed by id

		return array_map( function ( Response $response ) use ( $surveys ): array {
			$survey = $surveys[ $response->getSurveyId() ] ?? null;

			return [
				'id'            => $response->getId(),
				'survey_id'     => $response->getSurveyId(),
				'survey_title'  => $survey?->getTitle(),
				'survey_type'   => $survey ? $this->extractSurveyType( $survey->getFormSchema() ) : null,
				'score'         => $response->getScore() !== null ? (int) $response->getScore() : null,
				'response_text' => $this->extractResponseText( $response->getResponseData() ),
				'created_at'    => $response->getCreatedAt()->format( 'Y-m-d H:i:s' ),
			];
		}, $responses );
	}

	/**
	 * Extract the primary survey type (NPS/CSAT/CES) from a form schema.
	 *
	 * Walks `form_schema.sections[*].fields[*].type` and returns the first
	 * primary field type found, uppercased. Returns null when the schema has no
	 * recognised primary field (e.g. a plain text-only survey).
	 *
	 * @param  array<mixed> $formSchema Decoded form_schema array.
	 * @return string|null  'NPS', 'CSAT', 'CES', or null.
	 * @since  1.0.0
	 */
	private function extractSurveyType( array $formSchema ): ?string {
		$primaryTypes = [ 'nps', 'csat', 'ces' ];

		foreach ( (array) ( $formSchema['sections'] ?? [] ) as $section ) {
			foreach ( (array) ( $section['fields'] ?? [] ) as $field ) {
				$type = strtolower( (string) ( $field['type'] ?? '' ) );
				if ( in_array( $type, $primaryTypes, true ) ) {
					return strtoupper( $type );
				}
			}
		}

		return null;
	}

	/**
	 * Extract the first non-empty string value from a response_data payload.
	 *
	 * @param  array<mixed> $responseData Raw key/value response payload.
	 * @return string|null
	 * @since  1.0.0
	 */
	private function extractResponseText( array $responseData ): ?string {
		foreach ( $responseData as $value ) {
			if ( is_string( $value ) && trim( $value ) !== '' ) {
				return $value;
			}
		}

		return null;
	}

	/**
	 * Compute the week-over-week percentage change between two values.
	 *
	 * Returns null when the baseline is zero or either value is null (avoids
	 * division-by-zero and nonsensical infinite-growth figures).
	 *
	 * @param  int|float|null $current  This week's value.
	 * @param  int|float|null $previous Last week's value (the baseline).
	 * @return float|null     Signed percentage change, e.g. 12.4 for +12.4 %.
	 * @since  1.0.0
	 */
	private function weekOverWeekChange( int|float|null $current, int|float|null $previous ): ?float {
		if ( $current === null || $previous === null || $previous == 0 ) {
			return null;
		}

		return round( ( $current - $previous ) / $previous * 100, 1 );
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
				description: __( 'Filter by survey status.', 'allfeedback' ),
				values:      [ 'draft', 'published', 'archived', 'trashed' ],
			),
		];
	}
}
