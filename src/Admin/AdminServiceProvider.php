<?php

declare(strict_types=1);

namespace AllFeedback\Admin;

use AllFeedback\Core\Constants;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Support\AssetManager;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Class AdminServiceProvider
 *
 * Boots all WP-admin functionality:
 *  - Top-level admin menu + hash-routed sub-menu pages
 *  - Admin script / style enqueueing
 *  - Inline JS that keeps the WP sidebar highlight in sync with the hash route
 *
 * All page content is rendered by the React SPA mounted on #ALLFB-Admin-Root.
 * PHP callbacks output only the mount-point <div>; no server-side UI here.
 *
 * To add a new admin page:
 *  1. Add a new add_submenu_page() entry with slug 'all-feedback#/your-route'.
 *  2. Add a matching route file under resources/scripts/admin/routes/_app/.
 *  3. Add a nav item in GlobalHeader.tsx.
 */
class AdminServiceProvider implements ServiceProvider {

	use Hooks;

	/** The mount-point ID React attaches to. */
	private const MOUNT_ID = 'ALLFB-Admin-Root';

	/** WP menu slug for the top-level page. */
	private const MENU_SLUG = 'all-feedback';

	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $assetManager,
	) {}

	// ServiceProvider::register() — nothing to add to the DI container here.
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the admin context.
	 */
	public function boot(): void {
		$this->addAction( 'admin_menu',                        [ $this, 'registerMenus' ] );
		$this->addAction( 'allfeedback:enqueue-assets:admin',          [ $this, 'enqueueAssets' ] );
		$this->addAction( 'admin_footer',                      [ $this, 'inlineMenuHighlight' ] );
	}

	// ------------------------------------------------------------------
	// Menus
	// ------------------------------------------------------------------

	/**
	 * Register the top-level menu and hash-routed sub-menu pages.
	 *
	 * Each sub-menu slug contains the hash fragment for its React route
	 * (e.g. 'all-feedback#/settings').  WordPress puts the fragment
	 * in the sidebar link href so clicking it navigates the SPA directly.
	 * All callbacks output only the React mount point.
	 */
	public function registerMenus(): void {
		$mountPoint = static function (): void {
			echo '<div id="' . esc_attr( self::MOUNT_ID ) . '"></div>';
		};

		$menu_icon = 'data:image/svg+xml;base64,' . base64_encode(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
			. '<path fill="white" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
			. '</svg>'
		);

		add_menu_page(
			page_title: __( 'All Feedback', 'all-feedback' ),
			menu_title: __( 'AllFeedback', 'all-feedback' ),
			capability: 'manage_options',
			menu_slug:  self::MENU_SLUG,
			callback:   $mountPoint,
			icon_url:   $menu_icon,
			position:   30,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Dashboard', 'all-feedback' ),
			menu_title:  __( 'Dashboard', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/dashboard',
			callback:    $mountPoint,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Analytics', 'all-feedback' ),
			menu_title:  __( 'Analytics', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/analytics',
			callback:    $mountPoint,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'All Forms', 'all-feedback' ),
			menu_title:  __( 'All Forms', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/forms',
			callback:    $mountPoint,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Responses', 'all-feedback' ),
			menu_title:  __( 'Responses', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/responses',
			callback:    $mountPoint,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Settings', 'all-feedback' ),
			menu_title:  __( 'Settings', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/settings',
			callback:    $mountPoint,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Tools', 'all-feedback' ),
			menu_title:  __( 'Tools', 'all-feedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/tools',
			callback:    $mountPoint,
		);

		// Remove the auto-generated duplicate of the top-level entry.
		remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG );
	}

	// ------------------------------------------------------------------
	// Sidebar highlight sync
	// ------------------------------------------------------------------

	/**
	 * Output a small inline script that keeps the WP admin sidebar active
	 * class in sync with the current hash route.
	 *
	 * WordPress sets the active class on page load based on the query-string
	 * slug, but since all SPA pages share the same ?page= slug the sidebar
	 * would always highlight the same item.  This script reads the hash and
	 * compares it against each submenu link's href.
	 */
	public function inlineMenuHighlight(): void {
		$screen = get_current_screen();
		if ( ! $screen || ! str_contains( $screen->id, 'all-feedback' ) ) {
			return;
		}
		?>
		<script>
		(function () {
			var MENU_ROOT = '#toplevel_page_all-feedback';

			function syncHighlight() {
				var rawHash  = window.location.hash || '#/dashboard';
				var hashPath = rawHash.split('?')[0];
				var current  = hashPath.replace(/\/$/, '');

				var submenu = document.querySelector(MENU_ROOT + ' .wp-submenu');
				if ( ! submenu ) return;

				submenu.querySelectorAll('li').forEach(function (li) {
					var a = li.querySelector('a');
					if ( ! a ) return;
					var href         = a.getAttribute('href') || '';
					var linkHash     = href.includes('#') ? '#' + href.split('#')[1] : '';
					var linkNormised = linkHash.replace(/\/$/, '');

					if ( linkNormised && current.startsWith(linkNormised) ) {
						li.classList.add('current');
					} else {
						li.classList.remove('current');
					}
				});
			}

			syncHighlight();
			window.addEventListener('rmb:navigate', syncHighlight);
		})();
		</script>
		<?php
	}

	// ------------------------------------------------------------------
	// Assets
	// ------------------------------------------------------------------

	/**
	 * Enqueue admin-only scripts and styles.
	 *
	 * @param string $hook Current admin page hook suffix.
	 */
	public function enqueueAssets( string $hook ): void {
		// Guard: only load on plugin pages.
		if ( ! str_contains( $hook, 'all-feedback' ) ) {
			return;
		}

		global $wpdb;

		$curlVersion = function_exists( 'curl_version' ) ? curl_version() : null;
		$curlStr      = $curlVersion
			? $curlVersion['version'] . ( ! empty( $curlVersion['ssl_version'] ) ? ', ' . $curlVersion['ssl_version'] : '' )
			: null;

		$adminData = $this->applyFilters(
			'allfeedback:admin:script_data',
			[
				'adminUrl'      => admin_url( 'admin.php' ),
				'pluginUrl'     => Constants::url(),
				'buildUrl'      => Constants::url( 'resources/build/' ),
				'currentUserId' => get_current_user_id(),
				'isAdmin'       => current_user_can( 'manage_options' ),
				'nonce'         => wp_create_nonce( 'wp_rest' ),
				'submitNonce'   => wp_create_nonce( 'allfeedback_submit' ),
				// Plugin
				'version'       => Constants::VERSION,
				// WordPress Environment
				'homeUrl'       => get_home_url(),
				'siteUrl'       => get_site_url(),
				'wpVersion'     => get_bloginfo( 'version' ),
				'isMultisite'   => is_multisite(),
				'wpMemoryLimit' => defined( 'WP_MEMORY_LIMIT' ) ? WP_MEMORY_LIMIT : 'N/A',
				'debug'         => defined( 'WP_DEBUG' ) && WP_DEBUG,
				'wpCron'        => ! ( defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON ),
				'language'      => get_locale(),
				'extObjectCache' => wp_using_ext_object_cache(),
				// Server Environment
				'serverInfo'    => isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : 'N/A',
				'mysqlVersion'  => $wpdb->db_version(),
				'phpVersion'    => PHP_VERSION,
				'defaultTimezone' => date_default_timezone_get(),
				'phpPostMaxSize'  => ini_get( 'post_max_size' ) ?: 'N/A',
				'phpTimeLimit'    => ini_get( 'max_execution_time' ) ?: 'N/A',
				'curlVersion'    => $curlStr,
				'hasFsockopen'   => function_exists( 'fsockopen' ) || function_exists( 'curl_init' ),
				'hasGzip'        => function_exists( 'gzopen' ),
				'hasDomDocument' => class_exists( 'DOMDocument' ),
				'hasMultibyte'   => function_exists( 'mb_strtolower' ),
			]
		);

		$this->assetManager->enqueueScript(
			handle:   'admin',
			src:      'admin.js',
			localize: [
				'object_name' => '__ALLFB_ADMIN__',
				'data'        => $adminData,
			]
		);

		$this->assetManager->enqueueStyle(
			handle: 'admin',
			src:    'admin.css'
		);

		if ( is_rtl() ) {
			$this->assetManager->enqueueStyle(
				handle: 'admin-rtl',
				src:    'admin.rtl.css'
			);
		}

		$this->doAction( 'allfeedback:admin:enqueue_assets', $hook );
	}
}
