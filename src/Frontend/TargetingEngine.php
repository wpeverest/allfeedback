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
	 * Return the IDs of ALL published surveys that target the current page,
	 * ordered by date DESC (most-recently-published first).
	 *
	 * The JS orchestrator iterates this list and mounts the first survey that
	 * passes the client-side audience / frequency gates.
	 *
	 * @return int[]
	 * @since 1.0.0
	 */
	public function resolveAllForCurrentPage(): array {
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
			return [];
		}

		$ids = [];
		foreach ( $surveys as $survey ) {
			if ( $this->surveyMatchesCurrentPage( $survey ) ) {
				$ids[] = $survey->getId();
			}
		}

		return $ids;
	}

	/**
	 * Return the ID of the first published survey that targets the current
	 * page, or null if no survey matches.
	 *
	 * @return int|null
	 * @since 1.0.0
	 */
	public function resolveForCurrentPage(): ?int {
		$ids = $this->resolveAllForCurrentPage();
		return $ids[0] ?? null;
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Evaluate whether a survey's targeting rules accept the current page.
	 *
	 * Priority:
	 *  1. If the survey has explicit low-level targeting JSON (`targeting` column),
	 *     use that (mode / rules / exclusions).
	 *  2. Otherwise fall back to the form builder's UI-level page targeting stored
	 *     in the `settings` column (target_pages / target_page_ids / targetPages).
	 *
	 * @since 1.0.0
	 */
	private function surveyMatchesCurrentPage( Survey $survey ): bool {
		$settings  = $survey->getSettings();
		$targeting = (array) ( $settings['targeting'] ?? [] );

		// If no advanced targeting is configured, fall back to the form builder's
		// UI-level page targeting stored directly in settings.
		if ( empty( $targeting ) ) {
			return $this->matchesSettingsTargeting( $settings );
		}

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
	 * Evaluate the form builder's UI-level page targeting stored in survey settings.
	 *
	 * The form serialises targeting as:
	 *   targetPages      — 'all' | 'specific_pages' | 'specific_posts'
	 *   target_page_ids  — int[] of WordPress page or post IDs
	 *
	 * @param  array<string, mixed> $settings Survey::getSettings() decoded array.
	 * @return bool
	 * @since 1.0.0
	 */
	private function matchesSettingsTargeting( array $settings ): bool {
		// Prefer the full targetPages value; fall back to simplified target_pages.
		$targetPages = (string) ( $settings['targetPages'] ?? $settings['target_pages'] ?? 'all' );

		if ( $targetPages === 'all' ) {
			return true;
		}

		// Collect IDs saved by the form builder (always a flat array of ints).
		$ids = array_values( array_filter(
			array_map( 'intval', (array) ( $settings['target_page_ids'] ?? [] ) ),
			fn( int $id ) => $id > 0
		) );

		// Specific mode with no IDs configured → match nothing (avoid unintended exposure).
		if ( $ids === [] ) {
			return false;
		}

		if ( $targetPages === 'specific_pages' || $targetPages === 'specific' ) {
			foreach ( $ids as $id ) {
				if ( is_page( $id ) ) {
					return true;
				}
			}
			return false;
		}

		if ( $targetPages === 'specific_posts' ) {
			$currentId = isset( $GLOBALS['post'] ) ? (int) ( $GLOBALS['post']->ID ?? 0 ) : 0;
			return $currentId > 0 && in_array( $currentId, $ids, true );
		}

		return true;
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
