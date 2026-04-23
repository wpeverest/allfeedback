<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Response\ResponseFilter;

class DashboardController extends RestController {

	protected string $restBase = 'dashboard';

	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
	) {}

	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/stats',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'getStats' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
			]
		);
	}

	public function getStats(): \WP_REST_Response {
		$surveyCount   = $this->surveyRepository->count( new SurveyFilter() );
		$responseCount = $this->responseRepository->countAll( new ResponseFilter() );
		
		$dateFrom = ( new \DateTimeImmutable( '-30 days' ) )->format( 'Y-m-d' );
		$recentResponses = $this->responseRepository->findAll( new ResponseFilter( dateFrom: $dateFrom, perPage: 1000 ) );
		
		$dailyStats = [];
		foreach ( $recentResponses as $resp ) {
			$date = $resp->getCreatedAt()->format( 'Y-m-d' );
			$dailyStats[ $date ] = ( $dailyStats[ $date ] ?? 0 ) + 1;
		}
		
		$chartData = [];
		for ( $i = 29; $i >= 0; $i-- ) {
			$d = ( new \DateTimeImmutable( "-$i days" ) )->format( 'Y-m-d' );
			$chartData[] = [
				'date'  => $d,
				'count' => $dailyStats[ $d ] ?? 0,
			];
		}

		$latestResponses = $this->responseRepository->findAll( new ResponseFilter( perPage: 5 ) );

		return $this->successResponse( [
			'stats' => [
				'surveys'   => $surveyCount,
				'responses' => $responseCount,
				'unread'    => $this->responseRepository->countUnread(),
			],
			'chart'  => $chartData,
			'recent' => array_map( function( $r ) {
				return [
					'id'         => $r->getId(),
					'survey_id'  => $r->getSurveyId(),
					'created_at' => $r->getCreatedAt()->format( 'Y-m-d H:i:s' ),
					'summary'    => $this->getResponseSummary( $r->getResponseData() ),
				];
			}, $latestResponses ),
		] );
	}

	private function getResponseSummary( array $data ): string {
		$vals = array_filter( array_values( $data ), fn( $v ) => $v !== null && $v !== '' );
		if ( empty( $vals ) ) return '—';
		$first = reset( $vals );
		if ( is_array( $first ) ) return implode( ', ', $first );
		return (string) $first;
	}
}
