<?php

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
	 * @param  SurveyRepository   $surveyRepository   Reads survey aggregates.
	 * @param  ResponseRepository $responseRepository Provides aggregated response statistics.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
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
	 * @param  int $surveyId ID of the survey to analyse.
	 * @return array<string, mixed>
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since  1.0.0
	 */
	public function getAnalytics( int $surveyId ): array {
		$survey = $this->surveyRepository->findById( $surveyId );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $surveyId );
		}

		$stats    = $this->responseRepository->aggregateScoreStats( $surveyId );
		$byDevice = $this->responseRepository->countByDevice( $surveyId );
		$overTime = $this->responseRepository->countByDate( $surveyId );

		$total      = $stats['total'];
		$scoreCount = $stats['score_count'];

		$averageScore = $scoreCount > 0
			? round( $stats['score_sum'] / $scoreCount, 2 )
			: null;

		$npsScore = $total > 0
			? round( ( ( $stats['promoters'] - $stats['detractors'] ) / $total ) * 100, 2 )
			: 0.0;

		return [
			'total_responses'         => $total,
			'average_score'           => $averageScore,
			'nps_score'               => [
				'score'      => $npsScore,
				'promoters'  => $stats['promoters'],
				'passives'   => $stats['passives'],
				'detractors' => $stats['detractors'],
			],
			'response_rate_by_device' => $byDevice,
			'responses_over_time'     => $overTime,
		];
	}
}
