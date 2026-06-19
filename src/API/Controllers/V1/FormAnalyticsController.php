<?php
/**
 * Form analytics controller.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */

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
 * Routes (under `allfeedback/v1`):
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
	protected string $rest_base = 'analytics';

	/**
	 * Constructor.
	 *
	 * @param  SurveyRepository        $survey_repository   Reads survey aggregates.
	 * @param  SurveySessionRepository $session_repository  Session metrics repository.
	 * @param  ResponseRepository      $response_repository Response score aggregation.
	 * @param  SurveyAnalyticsService  $analytics_service   Full per-survey analytics service.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $survey_repository,
		private readonly SurveySessionRepository $session_repository,
		private readonly ResponseRepository $response_repository,
		private readonly SurveyAnalyticsService $analytics_service,
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
			'/' . $this->rest_base . '/overview',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'getOverview' ],
				'permission_callback' => [ $this, 'adminPermission' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/forms',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'listForms' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => array_merge(
					$this->paginationArgs( default_per_page: 20, max_per_page: 100 ),
					$this->listFormsArgs()
				),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/forms/(?P<id>\d+)',
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
		$today       = ( new \DateTimeImmutable( 'today' ) )->format( 'Y-m-d' );
		$chart_start = ( new \DateTimeImmutable( 'today' ) )->modify( '-29 days' )->format( 'Y-m-d' );

		// 7 queries total. Date windows are computed inside MySQL (CURDATE()) so
		// no PHP date arithmetic is needed here — each bundle method is one query.
		$response_stats   = $this->response_repository->getOverviewStats();          // 1 — total + WoW counts + score WoW
		$session_stats    = $this->session_repository->getOverviewSessionStats();    // 1 — completion rate + WoW
		$survey_stats     = $this->survey_repository->countPublishedWithNewCount();  // 1 — active + new this week
		$raw_chart        = $this->response_repository->countByDateGlobal( $chart_start, $today ); // 1
		$recent_raw       = $this->response_repository->findAll( new ResponseFilter( per_page: 5 ) ); // 1
		$device_breakdown = $this->response_repository->countByDeviceGlobal();       // 1
		$recent           = $this->buildRecentResponses( $recent_raw );

		$chart_data = $this->buildChart( $raw_chart, $chart_start, $today );

		return $this->successResponse(
			[
				'stats' => [
					'total_feedback' => [
						'value'  => $response_stats['total_feedback'],
						'change' => $this->weekOverWeekChange( $response_stats['this_week_count'], $response_stats['last_week_count'] ),
					],
					'completion_rate' => [
						'value'  => $session_stats['completion_rate'],
						'change' => $this->weekOverWeekChange( $session_stats['this_week_completion_rate'], $session_stats['last_week_completion_rate'] ),
					],
					'abandonment_rate' => [
						'value'  => $session_stats['abandonment_rate'],
						'change' => $this->weekOverWeekChange( $session_stats['this_week_abandonment_rate'], $session_stats['last_week_abandonment_rate'] ),
					],
					'avg_rating' => [
						'value'  => $response_stats['avg_score'],
						'change' => $this->weekOverWeekChange( $response_stats['this_week_avg_score'], $response_stats['last_week_avg_score'] ),
					],
					'active_surveys' => [
						'value'         => $survey_stats['total'],
						'new_this_week' => $survey_stats['new_this_week'],
						'change'        => $survey_stats['total'] > 0
							? round( $survey_stats['new_this_week'] / $survey_stats['total'] * 100, 1 )
							: null,
					],
				],
				'chart'            => $chart_data,
				'total_in_period'  => array_sum( array_column( $chart_data, 'count' ) ),
				'recent_responses' => $recent,
				'device_breakdown' => $device_breakdown,
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
		$status   = $request->get_param( 'status' );
		$page     = (int) $request->get_param( 'page' );
		$per_page = (int) $request->get_param( 'per_page' );

		$filter = new SurveyFilter(
			status:  $status !== null ? SurveyStatus::from( $status ) : null,
			page:    $page,
			per_page: $per_page,
		);

		$surveys = $this->survey_repository->findAll( $filter );
		$total   = $this->survey_repository->count( $filter );

		if ( empty( $surveys ) ) {
			return $this->successResponse(
				[
					'forms'      => [],
					'pagination' => $this->buildPagination( $total, $page, $per_page ),
					'totals'     => [
						'total_forms' => 0,
						'total_responses' => 0,
						'total_views' => 0,
					],
				]
			);
		}

		$survey_ids       = array_map( fn( Survey $s ) => $s->getId(), $surveys );
		$session_metrics  = $this->session_repository->getAnalyticsForAllSurveys( $survey_ids );
		$response_metrics = $this->response_repository->aggregateScoreStatsForAllSurveys( $survey_ids );

		$forms = array_map(
			function ( Survey $survey ) use ( $session_metrics, $response_metrics ): array {
				$id = $survey->getId();

				return [
					'id'               => $id,
					'title'            => $survey->getTitle(),
					'status'           => $survey->getStatus()->value,
					'response_count'   => $survey->getResponseCount(),
					'created_at'       => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
					'updated_at'       => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
					'session_metrics'  => $session_metrics[ $id ] ?? $this->emptySessionMetrics(),
					'response_metrics' => $this->buildResponseSummary( $response_metrics[ $id ] ?? $this->emptyResponseStats() ),
				];
			},
			$surveys
		);

		$total_responses = (int) array_sum( array_column( $response_metrics, 'total' ) );
		$total_views     = (int) array_sum( array_column( $session_metrics, 'total_views' ) );

		return $this->successResponse(
			[
				'forms'      => $forms,
				'pagination' => $this->buildPagination( $total, $page, $per_page ),
				'totals'     => [
					'total_forms'     => $total,
					'total_responses' => $total_responses,
					'total_views'     => $total_views,
				],
			]
		);
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
		$survey_id = (int) $request->get_param( 'id' );

		try {
			$response_metrics = $this->analytics_service->getAnalytics( $survey_id );
		} catch ( NotFoundException $e ) {
			return $this->exceptionToResponse( $e );
		}

		$survey  = $this->survey_repository->findById( $survey_id );
		$session = $this->session_repository->getFormSessionStatsWithWoW( $survey_id );

		return $this->successResponse(
			[
				'survey'          => [
					'id'             => $survey->getId(),
					'title'          => $survey->getTitle(),
					'description'    => $survey->getDescription(),
					'status'         => $survey->getStatus()->value,
					'response_count' => $survey->getResponseCount(),
					'created_at'     => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
					'updated_at'     => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
				],
				'session_metrics' => [
					'total_views'              => $session['total_views'],
					'total_starts'             => $session['total_starts'],
					'total_submissions'        => $session['total_submissions'],
					'completion_rate'          => $session['completion_rate'],
					'completion_rate_change'   => $this->weekOverWeekChange( $session['this_week_completion_rate'], $session['last_week_completion_rate'] ),
					'abandonment_rate'         => $session['abandonment_rate'],
					'abandonment_rate_change'  => $this->weekOverWeekChange( $session['this_week_abandonment_rate'], $session['last_week_abandonment_rate'] ),
					'avg_completion_time'      => $session['avg_completion_time'],
				],
				'response_metrics' => $response_metrics,
			]
		);
	}

	/**
	 * Build the standard pagination envelope.
	 *
	 * @param  int $total   Total matching records (across all pages).
	 * @param  int $page    Current 1-based page number.
	 * @param  int $per_page Items per page.
	 * @return array<string, int>
	 * @since  1.0.0
	 */
	private function buildPagination( int $total, int $page, int $per_page ): array {
		return [
			'total'       => $total,
			'total_pages' => (int) ceil( $total / max( 1, $per_page ) ),
			'page'        => $page,
			'per_page'    => $per_page,
		];
	}

	/**
	 * Derive NPS score and summary from raw aggregated response stats.
	 *
	 * @param  array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int} $stats Raw response stats aggregate.
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	private function buildResponseSummary( array $stats ): array {
		$total       = $stats['total'];
		$score_count = $stats['score_count'];

		$average_score = $score_count > 0
			? round( $stats['score_sum'] / $score_count, 2 )
			: null;

		$nps_score = $total > 0
			? round( ( ( $stats['promoters'] - $stats['detractors'] ) / $total ) * 100, 2 )
			: 0.0;

		return [
			'total_responses' => $total,
			'average_score'   => $average_score,
			'nps_score'       => [
				'score'      => $nps_score,
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
	 * @param  array<string, int> $counts_by_date SQL result keyed by Y-m-d date.
	 * @param  string             $start_date    First date in the series (Y-m-d).
	 * @param  string             $end_date      Last date in the series (Y-m-d).
	 * @return array<int, array{date: string, count: int}>
	 * @since  1.0.0
	 */
	private function buildChart( array $counts_by_date, string $start_date, string $end_date ): array {
		$result  = [];
		$current = new \DateTimeImmutable( $start_date );
		$end     = new \DateTimeImmutable( $end_date );

		while ( $current <= $end ) {
			$d        = $current->format( 'Y-m-d' );
			$result[] = [
				'date' => $d,
				'count' => $counts_by_date[ $d ] ?? 0,
			];
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

		$survey_ids = array_unique( array_map( fn( Response $r ) => $r->getSurveyId(), $responses ) );
		$surveys    = $this->survey_repository->findByIds( $survey_ids ); // 1 query, keyed by id

		return array_map(
			function ( Response $response ) use ( $surveys ): array {
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
			},
			$responses
		);
	}

	/**
	 * Extract the primary survey type (NPS) from a form schema.
	 *
	 * Walks `form_schema.sections[*].fields[*].type` and returns the first
	 * primary field type found, uppercased. Returns null when the schema has no
	 * recognised primary field (e.g. a plain text-only survey).
	 *
	 * @param  array<mixed> $form_schema Decoded form_schema array.
	 * @return string|null  'NPS' or null.
	 * @since  1.0.0
	 */
	private function extractSurveyType( array $form_schema ): ?string {
		$primary_types = [ 'nps' ];

		foreach ( (array) ( $form_schema['sections'] ?? [] ) as $section ) {
			foreach ( (array) ( $section['fields'] ?? [] ) as $field ) {
				$type = strtolower( (string) ( $field['type'] ?? '' ) );
				if ( in_array( $type, $primary_types, true ) ) {
					return strtoupper( $type );
				}
			}
		}

		return null;
	}

	/**
	 * Extract the first non-empty string value from a response_data payload.
	 *
	 * @param  array<mixed> $response_data Raw key/value response payload.
	 * @return string|null
	 * @since  1.0.0
	 */
	private function extractResponseText( array $response_data ): ?string {
		foreach ( $response_data as $value ) {
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
		if ( $current === null || $previous === null || (float) $previous === 0.0 ) {
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
