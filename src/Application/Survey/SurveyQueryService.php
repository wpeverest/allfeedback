<?php
/**
 * Survey query service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Read-side service for querying survey aggregates.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class SurveyQueryService {

	/**
	 * Constructor.
	 *
	 * @param  SurveyRepository $repository Persistence layer for survey aggregates.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $repository,
	) {}

	/**
	 * Retrieve a single survey by its ID.
	 *
	 * @param  int $id Survey ID.
	 * @return Survey
	 * @throws NotFoundException When no survey exists for the given ID.
	 * @since  1.0.0
	 */
	public function getById( int $id ): Survey {
		$survey = $this->repository->findById( $id );

		if ( $survey === null ) {
			throw NotFoundException::forResource( esc_html__( 'Survey', 'allfeedback' ), $id ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- $id is a typed int
		}

		return $survey;
	}

	/**
	 * Retrieve a paginated list of surveys matching the given parameters.
	 *
	 * @param  array<string, mixed> $params Filter / pagination parameters (page, per_page, status, search, etc.).
	 * @return Survey[]
	 * @since  1.0.0
	 */
	public function getAll( array $params = [] ): array {
		return $this->repository->findAll( $params );
	}

	/**
	 * Count surveys matching the given parameters.
	 *
	 * @param  array<string, mixed> $params Filter parameters (status, search, etc.).
	 * @return int
	 * @since  1.0.0
	 */
	public function count( array $params = [] ): int {
		return $this->repository->count( $params );
	}
}
