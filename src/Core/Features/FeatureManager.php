<?php

declare(strict_types=1);

namespace AllFeedback\Core\Features;

use AllFeedback\Traits\Hooks;

/**
 * A lightweight feature-flag system.
 *
 * Flags are persisted in `wp_options` and support three rollout strategies:
 *
 *   Simple on/off:      `[ 'enabled' => true ]`
 *   User allow-list:    `[ 'users'   => [ 1, 42 ] ]`
 *   Percentage rollout: `[ 'percentage' => 20 ]`
 *
 * Runtime overrides (useful in tests or CI):
 *   `define( 'RMB_FEATURE_OVERRIDES', [ 'new-dashboard' => true ] );`
 *
 * @package AllFeedback\Core\Features
 * @since   1.0.0
 */
class FeatureManager {

	use Hooks;

	/**
	 * WordPress option key used to store the persisted feature configuration.
	 *
	 * @since 1.0.0
	 */
	private const OPTION_KEY = '_allfb_features';

	/**
	 * Persisted feature configuration array.
	 *
	 * @var array<string, mixed>
	 * @since 1.0.0
	 */
	private array $features = [];

	/**
	 * In-memory overrides — never written to the database.
	 *
	 * @var array<string, bool>
	 * @since 1.0.0
	 */
	private array $overrides = [];

	/**
	 * Load persisted features and any constant-based overrides.
	 *
	 * @since  1.0.0
	 */
	public function __construct() {
		$this->loadFeatures();
		$this->loadOverrides();
	}

	/**
	 * Check whether a feature is currently enabled for the current user/context.
	 *
	 * Precedence: in-memory override → stored config → `allfeedback:feature:{name}` filter → `false`.
	 *
	 * @param  string $feature Feature slug, e.g. `'new-dashboard'`.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isEnabled( string $feature ): bool {
		if ( isset( $this->overrides[ $feature ] ) ) {
			return $this->overrides[ $feature ];
		}

		if ( isset( $this->features[ $feature ] ) ) {
			$config = $this->features[ $feature ];

			if ( isset( $config['percentage'] ) ) {
				return $this->isInPercentageRollout( $feature, (int) $config['percentage'] );
			}

			if ( isset( $config['users'] ) && is_user_logged_in() ) {
				return in_array( get_current_user_id(), (array) $config['users'], true );
			}

			return (bool) ( $config['enabled'] ?? false );
		}

		return (bool) $this->applyFilters( "allfeedback:feature:{$feature}", false );
	}

	/**
	 * Enable a feature and persist the change to `wp_options`.
	 *
	 * @param  string $feature Feature slug.
	 * @return void
	 * @since  1.0.0
	 */
	public function enable( string $feature ): void {
		$this->features[ $feature ] = [ 'enabled' => true ];
		$this->persist();
	}

	/**
	 * Disable a feature and persist the change to `wp_options`.
	 *
	 * @param  string $feature Feature slug.
	 * @return void
	 * @since  1.0.0
	 */
	public function disable( string $feature ): void {
		$this->features[ $feature ] = [ 'enabled' => false ];
		$this->persist();
	}

	/**
	 * Set an in-memory override that is NOT persisted to the database.
	 *
	 * Useful for tests and CI environments.
	 *
	 * @param  string $feature Feature slug.
	 * @param  bool   $enabled Desired state.
	 * @return void
	 * @since  1.0.0
	 */
	public function override( string $feature, bool $enabled ): void {
		$this->overrides[ $feature ] = $enabled;
	}

	/**
	 * Remove all in-memory overrides.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function clearOverrides(): void {
		$this->overrides = [];
	}

	/**
	 * Return all persisted features and their configuration arrays.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function all(): array {
		return $this->features;
	}

	/**
	 * Load the persisted feature configuration from `wp_options`.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function loadFeatures(): void {
		$this->features = get_option(
			self::OPTION_KEY,
			[
				'logging' => [ 'enabled' => true ],
			]
		);
	}

	/**
	 * Load runtime overrides from the `RMB_FEATURE_OVERRIDES` constant if defined.
	 *
	 * In `wp-config.php`:
	 * `define( 'RMB_FEATURE_OVERRIDES', [ 'new-dashboard' => true ] );`
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function loadOverrides(): void {
		if ( defined( 'RMB_FEATURE_OVERRIDES' ) ) {
			$this->overrides = (array) constant( 'RMB_FEATURE_OVERRIDES' );
		}
	}

	/**
	 * Write the current feature configuration back to `wp_options`.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function persist(): void {
		update_option( self::OPTION_KEY, $this->features );
	}

	/**
	 * Determine whether the current user falls within a percentage rollout.
	 *
	 * The result is deterministic for the same user–feature pair so the
	 * experience does not change between page loads.
	 *
	 * @param  string $feature    Feature slug.
	 * @param  int    $percentage Integer 0–100 representing the rollout percentage.
	 * @return bool
	 * @since  1.0.0
	 */
	private function isInPercentageRollout( string $feature, int $percentage ): bool {
		$hash = crc32( $feature . (string) get_current_user_id() );
		return ( abs( $hash ) % 100 ) < $percentage;
	}
}
