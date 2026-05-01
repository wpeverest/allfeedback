<?php
/**
 * Response score.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

/**
 * Value object representing a numeric survey score and its measurement type.
 *
 * Supports NPS (0–10) score type.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */
final class ResponseScore {

	/**
	 * Constructor.
	 *
	 * @param  float  $score Numeric score value.
	 * @param  string $type  Score type: nps.
	 * @throws \InvalidArgumentException When the type is not nps.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly float $score,
		private readonly string $type,
	) {
		if ( 'nps' !== $type ) {
			throw new \InvalidArgumentException(
				sprintf(
					/* translators: %s: the supplied score type */
					esc_html__( 'Invalid score type: %s. Expected: nps.', 'allfeedback' ),
					esc_html( $type )
				)
			);
		}
	}

	/**
	 * Return the numeric score value.
	 *
	 * @return float
	 * @since  1.0.0
	 */
	public function getValue(): float {
		return $this->score;
	}

	/**
	 * Return the score type identifier: nps.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getType(): string {
		return $this->type;
	}

	/**
	 * Return the NPS respondent category for this score.
	 *
	 * Returns null when the type is not nps.
	 *
	 * @return 'promoter'|'passive'|'detractor'|null
	 * @since  1.0.0
	 */
	public function getNpsCategory(): ?string {
		if ( 'nps' !== $this->type ) {
			return null;
		}

		return match ( true ) {
			$this->score >= 9 => 'promoter',
			$this->score >= 7 => 'passive',
			default           => 'detractor',
		};
	}
}
