<?php
/**
 * Survey analytics service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Use-case service: compute aggregated analytics for a survey.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class SurveyAnalyticsService {

	/**
	 * Constructor.
	 *
	 * @param  SurveyRepository   $survey_repository   Reads survey aggregates.
	 * @param  ResponseRepository $response_repository Provides aggregated response statistics.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $survey_repository,
		private readonly ResponseRepository $response_repository,
	) {}

	/**
	 * Build a full analytics report for the given survey.
	 *
	 * All aggregation is performed in SQL — no response objects are loaded into
	 * PHP memory, so this scales to millions of rows without issue.
	 *
	 * Returns:
	 *  - total_responses (int)
	 *  - average_score   (float|null)
	 *  - nps_score       (array{score: float, promoters: int, passives: int, detractors: int})
	 *  - response_rate_by_device (array<string, int>)
	 *  - responses_over_time     (array<string, int>  keyed by date Y-m-d)
	 *
	 * @param  int $survey_id ID of the survey to analyse.
	 * @return array<string, mixed>
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since  1.0.0
	 */
	/**
	 * Extract the primary survey type (NPS) from a form schema.
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

	public function getAnalytics( int $survey_id ): array {
		$survey = $this->survey_repository->findById( $survey_id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $survey_id ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- $survey_id is a typed int
		}

		$stats          = $this->response_repository->aggregateScoreStats( $survey_id );
		$by_device       = $this->response_repository->countByDevice( $survey_id );
		$over_time       = $this->response_repository->countByDate( $survey_id );
		$score_distrib   = $this->response_repository->countByScore( $survey_id );

		$total      = $stats['total'];
		$score_count = $stats['score_count'];

		$average_score = $score_count > 0
			? round( $stats['score_sum'] / $score_count, 2 )
			: null;

		$nps_score = $total > 0
			? round( ( ( $stats['promoters'] - $stats['detractors'] ) / $total ) * 100, 2 )
			: 0.0;

		$survey_type = $this->extractSurveyType( $survey->getFormSchema() );

		return [
			'total_responses'         => $total,
			'average_score'           => $average_score,
			'nps_score'               => [
				'score'      => $nps_score,
				'promoters'  => $stats['promoters'],
				'passives'   => $stats['passives'],
				'detractors' => $stats['detractors'],
			],
			'score_distribution'      => $score_distrib,
			'survey_type'             => $survey_type,
			'response_rate_by_device' => $by_device,
			'responses_over_time'     => $over_time,
		];
	}
}
