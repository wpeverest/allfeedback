<?php

declare(strict_types=1);

namespace AllFeedback\Admin;

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
	private const MENU_SLUG = 'all-feedback';

	/**
	 * @param  Container          $container          DI container.
	 * @param  AssetManager       $assetManager       Asset enqueueing helper.
	 * @param  ResponseRepository $responseRepository Response repository for unread count badge.
	 * @param  SettingsManager    $settingsManager    Plugin settings.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $assetManager,
		private readonly ResponseRepository $responseRepository,
		private readonly SettingsManager $settingsManager,
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
		$this->addAction( 'admin_menu',                           [ $this, 'registerMenus'         ] );
		$this->addAction( 'allfeedback:enqueue-assets:admin',     [ $this, 'enqueueAssets'         ] );
		$this->addAction( 'admin_footer',                         [ $this, 'inlineMenuHighlight'   ] );
		$this->addAction( 'in_admin_header',                      [ $this, 'suppressAdminNotices'  ] );
		$this->addAction( 'admin_init',                           [ $this, 'maybeRedirectToWizard' ] );
	}

	/**
	 * Register the top-level menu and hash-routed sub-menu pages.
	 *
	 * Each sub-menu slug contains the hash fragment for its React route
	 * (e.g. `'all-feedback#/settings'`). WordPress puts the fragment in the
	 * sidebar link `href` so clicking it navigates the SPA directly. All
	 * callbacks output only the React mount point.
	 *
	 * @return void
	 * @since  1.0.0
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

		$unreadCount    = $this->responseRepository->countUnread();
		$responsesTitle = __( 'Responses', 'all-feedback' );

		if ( $unreadCount > 0 ) {
			$responsesTitle .= sprintf(
				' <span class="awaiting-mod count-%1$d"><span class="pending-count">%1$d</span></span>',
				$unreadCount
			);
		}

		add_submenu_page(
			parent_slug: self::MENU_SLUG,
			page_title:  __( 'Responses', 'all-feedback' ),
			menu_title:  $responsesTitle,
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

		remove_submenu_page( self::MENU_SLUG, self::MENU_SLUG );
	}

	/**
	 * Automatically redirect to the Setup Wizard after activation.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function maybeRedirectToWizard(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$status = get_option( 'allfeedback_wizard_status', 'not_started' );
		if ( $status === 'pending_redirect' || $status === 'not_started' ) {
			update_option( 'allfeedback_wizard_status', 'initiated' );
			wp_safe_redirect( admin_url( 'admin.php?page=all-feedback#/wizard' ) );
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
		if ( ! $screen || ! str_contains( $screen->id, 'all-feedback' ) ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
	}

	/**
	 * Output a small inline script that keeps the WP admin sidebar active
	 * class in sync with the current hash route.
	 *
	 * WordPress sets the active class on page load based on the query-string
	 * slug, but since all SPA pages share the same `?page=` slug the sidebar
	 * would always highlight the same item. This script reads the hash and
	 * compares it against each submenu link's `href`.
	 *
	 * @return void
	 * @since  1.0.0
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

	/**
	 * Enqueue admin-only scripts and styles.
	 *
	 * @param  string $hook Current admin page hook suffix.
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueAssets( string $hook ): void {
		if ( ! str_contains( $hook, 'all-feedback' ) ) {
			return;
		}

		global $wpdb;

		$isAdmin = current_user_can( 'manage_options' );
		$widget  = (array) $this->settingsManager->get( 'general.widget' );

		// Diagnostic system info is only resolved and exposed for administrators.
		$curlStr = null;
		if ( $isAdmin && function_exists( 'curl_version' ) ) {
			$cv      = curl_version();
			$curlStr = $cv['version'] . ( ! empty( $cv['ssl_version'] ) ? ', ' . $cv['ssl_version'] : '' );
		}

		$adminData = $this->applyFilters(
			'allfeedback:admin:script_data',
			[
				'adminUrl'        => admin_url( 'admin.php' ),
				'adminEmail'      => $isAdmin ? sanitize_email( (string) get_option( 'admin_email', '' ) ) : null,
				'widgetColor'     => $widget['color']    ?? '#6366f1',
				'widgetPosition'  => $widget['position'] ?? 'bottom-right',
				'pluginUrl'       => Constants::url(),
				'buildUrl'        => Constants::url( 'resources/build/' ),
				'currentUserId'   => get_current_user_id(),
				'isAdmin'         => $isAdmin,
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'submitNonce'     => wp_create_nonce( 'allfeedback_submit' ),
				'version'         => Constants::VERSION,
				'homeUrl'         => get_home_url(),
				'siteUrl'         => get_site_url(),
				'wpVersion'       => get_bloginfo( 'version' ),
				'isMultisite'     => is_multisite(),
				'wpMemoryLimit'   => $isAdmin ? ( defined( 'WP_MEMORY_LIMIT' ) ? WP_MEMORY_LIMIT : 'N/A' ) : null,
				'debug'           => $isAdmin ? ( defined( 'WP_DEBUG' ) && WP_DEBUG ) : null,
				'wpCron'          => $isAdmin ? ! ( defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON ) : null,
				'language'        => get_locale(),
				'extObjectCache'  => $isAdmin ? wp_using_ext_object_cache() : null,
				'serverInfo'      => $isAdmin ? ( isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : 'N/A' ) : null,
				'mysqlVersion'    => $isAdmin ? $wpdb->db_version() : null,
				'phpVersion'      => $isAdmin ? PHP_VERSION : null,
				'defaultTimezone' => $isAdmin ? date_default_timezone_get() : null,
				'phpPostMaxSize'  => $isAdmin ? ( ini_get( 'post_max_size' ) ?: 'N/A' ) : null,
				'phpTimeLimit'    => $isAdmin ? ( ini_get( 'max_execution_time' ) ?: 'N/A' ) : null,
				'curlVersion'     => $curlStr,
				'hasFsockopen'    => $isAdmin ? ( function_exists( 'fsockopen' ) || function_exists( 'curl_init' ) ) : null,
				'hasGzip'         => $isAdmin ? function_exists( 'gzopen' ) : null,
				'hasDomDocument'  => $isAdmin ? class_exists( 'DOMDocument' ) : null,
				'hasMultibyte'    => $isAdmin ? function_exists( 'mb_strtolower' ) : null,
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
