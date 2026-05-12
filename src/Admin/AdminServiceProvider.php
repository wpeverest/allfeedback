<?php
/**
 * Admin service provider.
 *
 * @package AllFeedback\Admin
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Admin;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Support\AssetManager;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Boots all WP-admin functionality for the All Feedback plugin.
 *
 * Responsibilities:
 *  - Top-level admin menu and hash-routed sub-menu pages.
 *  - Admin script/style enqueueing.
 *  - Inline JS that keeps the WP sidebar highlight in sync with the hash route.
 *
 * All page content is rendered by the React SPA mounted on `#ALLFB-Admin-Root`.
 * PHP callbacks output only the mount-point `<div>`; no server-side UI is
 * generated here.
 *
 * @package AllFeedback\Admin
 * @since   1.0.0
 */
class AdminServiceProvider implements ServiceProvider {

	use Hooks;

	/**
	 * The mount-point element ID that React attaches to.
	 *
	 * @since 1.0.0
	 */
	private const MOUNT_ID = 'ALLFB-Admin-Root';

	/**
	 * WordPress menu slug for the top-level admin page.
	 *
	 * @since 1.0.0
	 */
	private const MENU_SLUG = 'allfeedback';

	/**
	 * Constructor.
	 *
	 * @param  Container          $container          DI container.
	 * @param  AssetManager       $asset_manager       Asset enqueueing helper.
	 * @param  ResponseRepository $response_repository Response repository for unread count badge.
	 * @param  SettingsManager    $settings_manager    Plugin settings.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $asset_manager,
		private readonly ResponseRepository $response_repository,
		private readonly SettingsManager $settings_manager,
	) {}

	/**
	 * {@inheritDoc}
	 *
	 * @param  ContainerBuilder $builder PHP-DI builder instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the admin context.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'admin_menu', [ $this, 'registerMenus' ] );
		$this->addAction( 'allfeedback:enqueue-assets:admin', [ $this, 'enqueueAssets' ] );
		$this->addAction( 'in_admin_header', [ $this, 'suppressAdminNotices' ] );
		$this->addAction( 'admin_init', [ $this, 'maybeRedirectToWizard' ] );
	}

	/**
	 * Register the top-level menu and hash-routed sub-menu pages.
	 *
	 * Each sub-menu slug contains the hash fragment for its React route
	 * (e.g. `'allfeedback#/settings'`). WordPress puts the fragment in the
	 * sidebar link `href` so clicking it navigates the SPA directly. All
	 * callbacks output only the React mount point.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerMenus(): void {
		$mount_point = static function (): void {
			echo '<div id="' . esc_attr( self::MOUNT_ID ) . '"></div>';
		};

		$menu_icon = 'data:image/svg+xml;base64,' . base64_encode( // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- encoding an SVG data URI, not obfuscating code
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
			. '<path fill="white" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
			. '</svg>'
		);

		add_menu_page(
			page_title: __( 'All Feedback', 'allfeedback' ),
			menu_title: __( 'AllFeedback', 'allfeedback' ),
			capability: 'manage_options',
			menu_slug:  self::MENU_SLUG,
			callback:   $mount_point,
			icon_url:   $menu_icon,
			position:   30,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Analytics', 'allfeedback' ),
			menu_title:  __( 'Analytics', 'allfeedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/analytics',
			callback:    $mount_point,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'All Forms', 'allfeedback' ),
			menu_title:  __( 'All Forms', 'allfeedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/forms',
			callback:    $mount_point,
		);

		$unread_count    = $this->response_repository->countUnread();
		$responses_title = __( 'Responses', 'allfeedback' );

		if ( $unread_count > 0 ) {
			$responses_title .= sprintf(
				' <span class="awaiting-mod count-%1$d"><span class="pending-count">%1$d</span></span>',
				$unread_count
			);
		}

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Responses', 'allfeedback' ),
			menu_title:  $responses_title,
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/responses',
			callback:    $mount_point,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Settings', 'allfeedback' ),
			menu_title:  __( 'Settings', 'allfeedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/settings',
			callback:    $mount_point,
		);

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Tools', 'allfeedback' ),
			menu_title:  __( 'Tools', 'allfeedback' ),
			capability:  'manage_options',
			menu_slug:   self::MENU_SLUG . '#/tools',
			callback:    $mount_point,
		);

		remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG );
	}

	/**
	 * Automatically redirect to the Setup Wizard after activation.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function maybeRedirectToWizard(): void {
		if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$status = get_option( 'allfeedback_wizard_status', 'not_started' );
		if ( $status === 'pending_redirect' || $status === 'not_started' ) {
			update_option( 'allfeedback_wizard_status', 'initiated' );
			wp_safe_redirect( admin_url( 'admin.php?page=allfeedback#/wizard' ) );
			exit;
		}
	}


	/**
	 * Remove all third-party and WP core admin notices on AllFeedback pages.
	 *
	 * Fires on `'in_admin_header'` — after other plugins register their notices
	 * but before WordPress renders them — so notices can be stripped without
	 * affecting the rest of the admin.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function suppressAdminNotices(): void {
		$screen = get_current_screen();
		if ( ! $screen || ! str_contains( $screen->id, 'allfeedback' ) ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
	}

	/**
	 * Enqueue admin-only scripts and styles.
	 *
	 * @param  string $hook Current admin page hook suffix.
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueAssets( string $hook ): void {
		if ( ! str_contains( $hook, 'allfeedback' ) ) {
			return;
		}

		global $wpdb;

		$is_admin = current_user_can( 'manage_options' );
		$widget   = (array) $this->settings_manager->get( 'general.widget' );

		// Diagnostic system info is only resolved and exposed for administrators.
		$curl_str = null;
		if ( $is_admin && function_exists( 'curl_version' ) ) {
			$cv       = curl_version();
			$curl_str = $cv['version'] . ( ! empty( $cv['ssl_version'] ) ? ', ' . $cv['ssl_version'] : '' );
		}

		$admin_data = $this->applyFilters(
			'allfeedback:admin:script_data',
			[
				'adminUrl'        => admin_url( 'admin.php' ),
				'adminEmail'      => $is_admin ? sanitize_email( (string) get_option( 'admin_email', '' ) ) : null,
				'widgetColor'     => $widget['color'] ?? '#6366f1',
				'widgetPosition'  => $widget['position'] ?? 'bottom-right',
				'pluginUrl'       => Constants::url(),
				'buildUrl'        => Constants::url( 'resources/build/' ),
				'currentUserId'   => get_current_user_id(),
				'isAdmin'         => $is_admin,
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'submitNonce'     => wp_create_nonce( 'allfeedback_submit' ),
				'version'         => Constants::VERSION,
				'homeUrl'         => get_home_url(),
				'siteUrl'         => get_site_url(),
				'wpVersion'       => get_bloginfo( 'version' ),
				'isMultisite'     => is_multisite(),
				'wpMemoryLimit'   => $is_admin ? ( defined( 'WP_MEMORY_LIMIT' ) ? WP_MEMORY_LIMIT : 'N/A' ) : null,
				'debug'           => $is_admin ? ( defined( 'WP_DEBUG' ) && WP_DEBUG ) : null,
				'wpCron'          => $is_admin ? ! ( defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON ) : null,
				'language'        => get_locale(),
				'extObjectCache'  => $is_admin ? wp_using_ext_object_cache() : null,
				'serverInfo'      => $is_admin ? ( isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : 'N/A' ) : null,
				'mysqlVersion'    => $is_admin ? $wpdb->db_version() : null,
				'phpVersion'      => $is_admin ? PHP_VERSION : null,
				'defaultTimezone' => $is_admin ? date_default_timezone_get() : null,
				'phpPostMaxSize'  => $is_admin ? ( ini_get( 'post_max_size' ) !== false ? ini_get( 'post_max_size' ) : 'N/A' ) : null,
				'phpTimeLimit'    => $is_admin ? ( ini_get( 'max_execution_time' ) !== false ? ini_get( 'max_execution_time' ) : 'N/A' ) : null,
				'curlVersion'     => $curl_str,
				'hasFsockopen'    => $is_admin ? ( function_exists( 'fsockopen' ) || function_exists( 'curl_init' ) ) : null,
				'hasGzip'         => $is_admin ? function_exists( 'gzopen' ) : null,
				'hasDomDocument'  => $is_admin ? class_exists( 'DOMDocument' ) : null,
				'hasMultibyte'    => $is_admin ? function_exists( 'mb_strtolower' ) : null,
				'wizardStatus'    => get_option( 'allfeedback_wizard_status', 'not_started' ),
			]
		);

		$this->asset_manager->enqueueScript(
			handle:   'admin',
			src:      'admin.js',
			localize: [
				'object_name' => '__ALLFB_ADMIN__',
				'data'        => $admin_data,
			]
		);

		$this->asset_manager->enqueueStyle(
			handle: 'admin',
			src:    'admin.css'
		);

		if ( is_rtl() ) {
			$this->asset_manager->enqueueStyle(
				handle: 'admin-rtl',
				src:    'admin.rtl.css'
			);
		}

		$this->doAction( 'allfeedback:admin:enqueue_assets', $hook );

		wp_add_inline_script(
			'allfb-admin',
			'(function () {
				var MENU_ROOT = "#toplevel_page_allfeedback";
				function syncHighlight() {
					var rawHash  = window.location.hash || "#/analytics";
					var hashPath = rawHash.split("?")[0];
					var current  = hashPath.replace(/\/$/, "");
					var submenu = document.querySelector(MENU_ROOT + " .wp-submenu");
					if ( ! submenu ) return;
					submenu.querySelectorAll("li").forEach(function (li) {
						var a = li.querySelector("a");
						if ( ! a ) return;
						var href         = a.getAttribute("href") || "";
						var linkHash     = href.includes("#") ? "#" + href.split("#")[1] : "";
						var linkNormised = linkHash.replace(/\/$/, "");
						if ( linkNormised && current.startsWith(linkNormised) ) {
							li.classList.add("current");
						} else {
							li.classList.remove("current");
						}
					});
				}
				syncHighlight();
				window.addEventListener("allfeedback:navigate", syncHighlight);
			})();'
		);
	}

}
