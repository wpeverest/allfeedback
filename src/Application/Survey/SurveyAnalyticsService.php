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
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
	) {}

	/**
	 * Build a full analytics report for the given survey.
	 *
	 * Returns:
	 *  - total_responses (int)
	 *  - average_score   (float|null)
	 *  - nps_score       (array{score: float, promoters: int, passives: int, detractors: int})
	 *  - response_rate_by_device (array<string, int>)
	 *  - responses_over_time     (array<string, int>  keyed by date Y-m-d)
	 *
	 * @param int $surveyId ID of the survey to analyse.
	 * @return array
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since 1.0.0
	 */
	public function getAnalytics( int $surveyId ): array {
		$survey = $this->surveyRepository->findById( $surveyId );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'all-feedback' ), $surveyId );
		}

		$responses = $this->responseRepository->findBySurveyId( $surveyId );
		$total     = count( $responses );

		$scoreSum    = 0.0;
		$scoreCount  = 0;
		$promoters   = 0;
		$passives    = 0;
		$detractors  = 0;
		$byDevice    = [];
		$overTime    = [];

		foreach ( $responses as $response ) {
			$score = $response->getScore();

			if ( $score !== null ) {
				$scoreSum += $score;
				++$scoreCount;

				if ( $score >= 9 ) {
					++$promoters;
				} elseif ( $score >= 7 ) {
					++$passives;
				} else {
					++$detractors;
				}
			}

			$device              = $response->getDeviceType() ?? 'unknown';
			$byDevice[ $device ] = ( $byDevice[ $device ] ?? 0 ) + 1;

			$date               = $response->getCreatedAt()->format( 'Y-m-d' );
			$overTime[ $date ]  = ( $overTime[ $date ] ?? 0 ) + 1;
		}

		$averageScore = $scoreCount > 0 ? round( $scoreSum / $scoreCount, 2 ) : null;
		$npsScore     = $total > 0
			? round( ( ( $promoters - $detractors ) / $total ) * 100, 2 )
			: 0.0;

		ksort( $overTime );

		return [
			'total_responses'        => $total,
			'average_score'          => $averageScore,
			'nps_score'              => [
				'score'      => $npsScore,
				'promoters'  => $promoters,
				'passives'   => $passives,
				'detractors' => $detractors,
			],
			'response_rate_by_device' => $byDevice,
			'responses_over_time'     => $overTime,
		];
	}
}
