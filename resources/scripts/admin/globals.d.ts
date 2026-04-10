/**
 * globals.d.ts
 *
 * Type declarations for data injected by AdminServiceProvider::enqueueAssets()
 * as an inline script before admin.js loads.
 *
 * In PHP (AdminServiceProvider):
 *   wp_add_inline_script( 'allfb-admin', "var __ALLFB_ADMIN__ = " . wp_json_encode( $data ), 'before' );
 */

declare const __ALLFB_ADMIN__: {
	/** WordPress admin URL, e.g. "https://site.test/wp-admin/admin.php" */
	adminUrl: string;

	/** Plugin root URL, e.g. "https://site.test/wp-content/plugins/all-feedback/" */
	pluginUrl: string;

	/** WP user ID of the currently logged-in user. */
	currentUserId: number;

	/** Whether the current user has manage_options capability. */
	isAdmin: boolean;

	/** WP REST API nonce — passed to every API request via wp_create_nonce('wp_rest'). */
	nonce: string;

	/** Public submission nonce — wp_create_nonce('allfeedback_submit'). */
	submitNonce: string;

	/** Plugin version string, e.g. "1.0.0". */
	version: string;
};
