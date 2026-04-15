<?php

declare(strict_types=1);

namespace AllFeedback\Frontend;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;

/**
 * Class TargetingEngine
 *
 * Evaluates which published survey — if any — should appear as the floating
 * widget on the current page, based on each survey's targeting JSON rules.
 *
 * ── Targeting JSON structure (stored in wp_af_surveys.targeting) ──────────
 *
 * ```json
 * {
 *   "mode": "all",          // "all" = every page | "specific" = check rules
 *   "rules":      [],       // inclusion rules — any matching rule qualifies
 *   "exclusions": []        // exclusion rules — any matching rule disqualifies
 * }
 * ```
 *
 * Each rule is an object:
 * ```json
 * { "type": "post_type", "value": "page" }
 * { "type": "page_id",   "value": 5 }
 * { "type": "post_id",   "value": 10 }
 * ```
 *
 * ── Algorithm ─────────────────────────────────────────────────────────────
 *
 * 1. Load all published surveys (ordered by date DESC — most-recent wins).
 * 2. For each survey:
 *    a. Evaluate exclusion rules — if any match, skip this survey.
 *    b. If mode === "all", accept the survey.
 *    c. If mode === "specific", accept only if at least one inclusion rule matches.
 * 3. Return the ID of the first accepted survey, or null.
 *
 * Pro add-ons can extend the rule set via `allfeedback_targeting_rule_matches`.
 *
 * @since 1.0.0
 */
class TargetingEngine {

	use Hooks;

	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly Logger $logger,
	) {}

	// ------------------------------------------------------------------
	// Public API
	// ------------------------------------------------------------------

	/**
	 * Return the ID of the first published survey that targets the current
	 * page, or null if no survey matches.
	 *
	 * @return int|null
	 * @since 1.0.0
	 */
	public function resolveForCurrentPage(): ?int {
		try {
			$surveys = $this->surveyRepository->findAll(
				new SurveyFilter(
					status:  SurveyStatus::Published,
					perPage: 100, // practical limit; sites rarely have more than this
					orderBy: 'date',
					order:   'DESC',
				)
			);
		} catch ( \Throwable $e ) {
			$this->logger->error( 'TargetingEngine: failed to load surveys.', [ 'error' => $e->getMessage() ] );
			return null;
		}

		foreach ( $surveys as $survey ) {
			if ( $this->surveyMatchesCurrentPage( $survey ) ) {
				return $survey->getId();
			}
		}

		return null;
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Evaluate whether a survey's targeting rules accept the current page.
	 *
	 * @since 1.0.0
	 */
	private function surveyMatchesCurrentPage( Survey $survey ): bool {
		$targeting  = $survey->getTargeting();
		$mode       = (string) ( $targeting['mode'] ?? 'all' );
		$rules      = (array)  ( $targeting['rules'] ?? [] );
		$exclusions = (array)  ( $targeting['exclusions'] ?? [] );

		// Check exclusions first — any match disqualifies the survey.
		foreach ( $exclusions as $rule ) {
			if ( is_array( $rule ) && $this->evaluateRule( $rule ) ) {
				return false;
			}
		}

		if ( $mode === 'all' ) {
			return true;
		}

		// mode === 'specific' — at least one inclusion rule must match.
		foreach ( $rules as $rule ) {
			if ( is_array( $rule ) && $this->evaluateRule( $rule ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Evaluate a single targeting rule against the current WordPress page.
	 *
	 * Built-in rule types:
	 *   page_id   — is_page( (int) $value )
	 *   post_id   — $GLOBALS['post']->ID === (int) $value
	 *   post_type — is_singular( (string) $value )
	 *
	 * Extend via the `allfeedback_targeting_rule_matches` filter:
	 * ```php
	 * add_filter( 'allfeedback_targeting_rule_matches', function( bool $matched, array $rule ): bool {
	 *     if ( $rule['type'] === 'my_custom_type' ) {
	 *         return my_check( $rule['value'] );
	 *     }
	 *     return $matched;
	 * }, 10, 2 );
	 * ```
	 *
	 * @param array<string, mixed> $rule
	 * @since 1.0.0
	 */
	private function evaluateRule( array $rule ): bool {
		$type  = (string) ( $rule['type']  ?? '' );
		$value = $rule['value'] ?? null;

		$matched = match ( $type ) {
			'page_id'   => is_page( (int) $value ),
			'post_id'   => isset( $GLOBALS['post'] ) && (int) ( $GLOBALS['post']->ID ?? 0 ) === (int) $value,
			'post_type' => is_singular( (string) $value ),
			default     => false,
		};

		/**
		 * Filter: allfeedback_targeting_rule_matches
		 *
		 * Allows pro add-ons to handle custom targeting rule types, or
		 * override built-in logic.
		 *
		 * @param bool  $matched Whether the built-in handler matched.
		 * @param array $rule    The rule array: { type: string, value: mixed }.
		 * @since 1.0.0
		 */
		return (bool) apply_filters( 'allfeedback_targeting_rule_matches', $matched, $rule );
	}
}
