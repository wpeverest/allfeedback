<?php

declare(strict_types=1);

namespace AllFeedback\Core\Features;

use AllFeedback\Traits\Hooks;

/**
 * Class FeatureManager
 *
 * A lightweight feature-flag system.
 * Flags are persisted in wp_options and support three rollout strategies:
 *
 *   Simple on/off:      [ 'enabled' => true ]
 *   User allow-list:    [ 'users'   => [ 1, 42 ] ]
 *   Percentage rollout: [ 'percentage' => 20 ]
 *
 * Runtime overrides (useful in tests or CI):
 *   define( 'RMB_FEATURE_OVERRIDES', [ 'new-dashboard' => true ] );
 *
 * Usage:
 *   $fm = $container->get( FeatureManager::class );
 *   if ( $fm->isEnabled( 'new-dashboard' ) ) { ... }
 */
class FeatureManager {

	use Hooks;

	private const OPTION_KEY = '_allfb_features';

	/** Persisted feature config. */
	private array $features = [];

	/** In-memory overrides — never written to the database. */
	private array $overrides = [];

	public function __construct() {
		$this->loadFeatures();
		$this->loadOverrides();
	}

	// ------------------------------------------------------------------
	// Public API
	// ------------------------------------------------------------------

	/**
	 * Check whether a feature is currently enabled for the current user/context.
	 *
	 * Precedence: override → stored config → 'allfeedback:feature:{name}' filter → false.
	 *
	 * @param string $feature Feature slug, e.g. 'new-dashboard'.
	 */
	public function isEnabled( string $feature ): bool {
		// In-memory overrides always win.
		if ( isset( $this->overrides[ $feature ] ) ) {
			return $this->overrides[ $feature ];
		}

		if ( isset( $this->features[ $feature ] ) ) {
			$config = $this->features[ $feature ];

			// Percentage rollout — deterministic per user+feature combination.
			if ( isset( $config['percentage'] ) ) {
				return $this->isInPercentageRollout( $feature, (int) $config['percentage'] );
			}

			// User allow-list.
			if ( isset( $config['users'] ) && is_user_logged_in() ) {
				return in_array( get_current_user_id(), (array) $config['users'], true );
			}

			return (bool) ( $config['enabled'] ?? false );
		}

		/**
		 * Filter: allfeedback:feature:{$feature}
		 *
		 * Allows code to declare a feature enabled without storing it in
		 * wp_options. Useful for add-ons that always enable a feature.
		 *
		 * @param bool $enabled Default: false.
		 */
		return (bool) $this->applyFilters( "allfeedback:feature:{$feature}", false );
	}

	/**
	 * Enable a feature and persist it.
	 *
	 * @param string $feature Feature slug.
	 */
	public function enable( string $feature ): void {
		$this->features[ $feature ] = [ 'enabled' => true ];
		$this->persist();
	}

	/**
	 * Disable a feature and persist it.
	 *
	 * @param string $feature Feature slug.
	 */
	public function disable( string $feature ): void {
		$this->features[ $feature ] = [ 'enabled' => false ];
		$this->persist();
	}

	/**
	 * Set an in-memory override — NOT persisted to the database.
	 * Useful for tests and CI environments.
	 *
	 * @param string $feature Feature slug.
	 * @param bool   $enabled Desired state.
	 */
	public function override( string $feature, bool $enabled ): void {
		$this->overrides[ $feature ] = $enabled;
	}

	/** Remove all in-memory overrides. */
	public function clearOverrides(): void {
		$this->overrides = [];
	}

	/** Return all persisted features and their config. */
	public function all(): array {
		return $this->features;
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	private function loadFeatures(): void {
		$this->features = get_option(
			self::OPTION_KEY,
			[
				// Default enabled features — adjust as needed.
				'logging' => [ 'enabled' => true ],
			]
		);
	}

	/**
	 * Load overrides from the RMB_FEATURE_OVERRIDES constant if defined.
	 *
	 * In wp-config.php:
	 *   define( 'RMB_FEATURE_OVERRIDES', [ 'new-dashboard' => true ] );
	 */
	private function loadOverrides(): void {
		if ( defined( 'RMB_FEATURE_OVERRIDES' ) ) {
			$this->overrides = (array) constant( 'RMB_FEATURE_OVERRIDES' );
		}
	}

	private function persist(): void {
		update_option( self::OPTION_KEY, $this->features );
	}

	/**
	 * Deterministic percentage rollout — same result for the same user+feature.
	 *
	 * @param string $feature    Feature slug.
	 * @param int    $percentage Integer 0–100.
	 */
	private function isInPercentageRollout( string $feature, int $percentage ): bool {
		$hash = crc32( $feature . (string) get_current_user_id() );
		return ( abs( $hash ) % 100 ) < $percentage;
	}
}
