<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseRepository;

/**
 * Read-side service for querying response aggregates.
 *
 * @package AllFeedback\Application\Response
 * @since   1.0.0
 */
class ResponseQueryService {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly ResponseRepository $repository,
	) {}

	/**
	 * Retrieve a single response by its ID.
	 *
	 * @param int $id Response ID.
	 * @return Response
	 * @throws NotFoundException When no response exists for the given ID.
	 * @since 1.0.0
	 */
	public function getById( int $id ): Response {
		$response = $this->repository->findById( $id );

		if ( $response === null ) {
			throw NotFoundException::forResource( esc_html__( 'Response', 'all-feedback' ), $id );
		}

		return $response;
	}

	/**
	 * Retrieve a paginated list of responses for a given survey.
	 *
	 * @param int   $surveyId ID of the parent survey.
	 * @param array $params   Filter / pagination parameters (page, per_page, etc.).
	 * @return Response[]
	 * @since 1.0.0
	 */
	public function getBySurveyId( int $surveyId, array $params = [] ): array {
		return $this->repository->findBySurveyId( $surveyId, $params );
	}

	/**
	 * Count responses belonging to a survey.
	 *
	 * @param int $surveyId ID of the parent survey.
	 * @return int
	 * @since 1.0.0
	 */
	public function countBySurveyId( int $surveyId ): int {
		return $this->repository->countBySurveyId( $surveyId );
	}
}
