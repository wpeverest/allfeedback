<?php
/**
 * About controller.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Support\Logger;

/**
 * REST controller backing the admin About page.
 *
 * Exposes the intro video. The video URL is published on the AllFeedback
 * website rather than hard-coded in the plugin, so the team can swap it in
 * later without shipping a plugin update. This controller fetches that page
 * server-side (avoiding browser CORS limits), extracts a YouTube video ID,
 * and caches the result so the remote page is not hit on every page load.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class AboutController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $rest_base = 'about';

	/**
	 * Remote page that holds the intro video link. Empty until the team
	 * publishes a YouTube URL there — until then the UI shows "coming soon".
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const VIDEO_SOURCE_URL = 'https://allfeedback.net/about-video/';

	/**
	 * Transient key caching the resolved video lookup.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const VIDEO_TRANSIENT = 'allfeedback_about_video';

	/**
	 * Constructor.
	 *
	 * @param  Logger $logger Structured event logger.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Logger $logger,
	) {}

	/**
	 * Register all REST routes for this controller.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/video',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'getVideo' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => [],
				],
			]
		);
	}

	/**
	 * Handle `GET /about/video`.
	 *
	 * Returns the resolved YouTube video for the About page, or nulls when no
	 * video has been published yet (the UI then shows a "coming soon" state).
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function getVideo( \WP_REST_Request $request ): \WP_REST_Response {
		$cached = get_transient( self::VIDEO_TRANSIENT );
		if ( is_array( $cached ) ) {
			return $this->successResponse( $cached );
		}

		$video_id = $this->resolveVideoId();
		$payload  = [
			'youtube_id' => $video_id,
			'embed_url'  => $video_id !== null
				? 'https://www.youtube.com/embed/' . $video_id
				: null,
		];

		// Cache hits longer than misses: once the video is live it rarely
		// changes, but while it is still pending we want to pick it up soon.
		$ttl = $video_id !== null ? DAY_IN_SECONDS : HOUR_IN_SECONDS;
		set_transient( self::VIDEO_TRANSIENT, $payload, $ttl );

		return $this->successResponse( $payload );
	}

	/**
	 * Fetch the remote source page and extract the first YouTube video ID.
	 *
	 * @return string|null 11-character YouTube ID, or null when none is found
	 *                     or the page cannot be fetched.
	 * @since  1.0.0
	 */
	private function resolveVideoId(): ?string {
		$response = wp_remote_get(
			self::VIDEO_SOURCE_URL,
			[
				'timeout'    => 5,
				'user-agent' => 'AllFeedback/' . ( defined( 'ALLFEEDBACK_VERSION' ) ? ALLFEEDBACK_VERSION : '1.0.0' ),
			]
		);

		if ( is_wp_error( $response ) ) {
			$this->logger->warning(
				'About: failed to fetch intro video source.',
				[ 'error' => $response->get_error_message() ]
			);
			return null;
		}

		if ( (int) wp_remote_retrieve_response_code( $response ) !== 200 ) {
			return null;
		}

		$body = (string) wp_remote_retrieve_body( $response );
		if ( $body === '' ) {
			return null;
		}

		// Match watch, embed, short, shorts and youtu.be forms; a YouTube ID is
		// always exactly 11 URL-safe characters, so only that is captured.
		$pattern = '~(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:[^"\'\s]*&)?v=|embed/|shorts/|v/)|youtu\.be/)([A-Za-z0-9_-]{11})~i';

		if ( preg_match( $pattern, $body, $matches ) === 1 ) {
			return $matches[1];
		}

		return null;
	}
}
