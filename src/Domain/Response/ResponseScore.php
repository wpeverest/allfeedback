<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

/**
 * Value object representing a numeric survey score and its measurement type.
 *
 * Supports NPS (0–10), CSAT (1–5), and CES (1–7) score types.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */
final class ResponseScore {

	/**
	 * @param  float  $score Numeric score value.
	 * @param  string $type  Score type: nps | csat | ces.
	 * @throws \InvalidArgumentException When the type is not one of nps, csat, or ces.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly float $score,
		private readonly string $type,
	) {
		$valid = [ 'nps', 'csat', 'ces' ];

		if ( ! in_array( $type, $valid, true ) ) {
			throw new \InvalidArgumentException(
				sprintf(
					/* translators: %s: the supplied score type */
					esc_html__( 'Invalid score type: %s. Expected one of: nps, csat, ces.', 'allfeedback' ),
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
	 * Return the score type identifier: nps | csat | ces.
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

		return match( true ) {
			$this->score >= 9 => 'promoter',
			$this->score >= 7 => 'passive',
			default           => 'detractor',
		};
	}
}
