<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;

/**
 * Class DevToolsController
 *
 * Development-only REST controller for seeding and clearing fake data.
 * Routes are only registered when WP_DEBUG is enabled.
 *
 * Routes (under allfeedback/v1):
 *   POST   /dev-tools/seed   → seed()   : insert fake surveys + responses
 *   DELETE /dev-tools/seed   → clear()  : delete all seeded data
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class DevToolsController extends RestController {

	protected string $restBase = 'dev-tools';

	private const SEEDED_META_KEY = '_allfb_seeded';

	private const COMMENTS = [
		'Great product, really love it!',
		'Could be better in some areas.',
		'Very satisfied with the service.',
		'The support team was very helpful.',
		'Easy to use and intuitive.',
		'Some features are missing.',
		'Excellent experience overall.',
		'Needs improvement in performance.',
		'Would definitely recommend to others.',
		'Not what I expected.',
		'Fantastic! Exceeded my expectations.',
		'Average experience, nothing special.',
		'The interface is very clean and modern.',
		'Had a few issues but they were resolved quickly.',
		'Outstanding customer service!',
		'Good value for money.',
		'A bit expensive but definitely worth it.',
		'Could use more detailed documentation.',
		'Seamless experience from start to finish.',
		'Still learning how to use all the features.',
		'Best tool I have used this year.',
		'Takes some getting used to but great once you do.',
		'Very responsive support team.',
		'Wish there were more third-party integrations.',
		'Loved the onboarding process.',
		'Setup was a bit confusing at first.',
		'Works exactly as advertised.',
		'Would love to see a dark mode option.',
		'Solid product with great potential.',
		'Looking forward to future updates.',
	];

	private const FORM_TEMPLATES = [
		[ 'NPS Customer Satisfaction',  'How likely are you to recommend us to a friend?'    ],
		[ 'Product Feedback',           'Tell us about your experience with our product.'     ],
		[ 'Support Experience',         'Rate your recent support interaction.'               ],
		[ 'Website Usability',          'Help us improve our website.'                       ],
		[ 'Onboarding Feedback',        'Tell us about your onboarding experience.'           ],
		[ 'Checkout Experience',        'Rate your checkout experience.'                      ],
		[ 'Feature Request Pulse',      'What features should we build next?'                 ],
		[ 'Post-Purchase Survey',       'How was your purchase experience?'                   ],
		[ 'Event Feedback',             'Rate our most recent event.'                         ],
		[ 'Annual Brand Survey',        'Your annual brand perception check-in.'              ],
		[ 'Mobile App Review',          'Tell us how our mobile app feels to use.'            ],
		[ 'Beta Feature Feedback',      'You tried our beta — what did you think?'            ],
		[ 'Cancellation Survey',        'Help us understand why you are leaving.'             ],
		[ 'Renewal Satisfaction',       'How do you feel about renewing with us?'             ],
		[ 'Partner Portal Feedback',    'Rate your partner portal experience.'                ],
		[ 'Documentation Quality',      'How helpful is our documentation?'                  ],
		[ 'Pricing Perception',         'Do you feel our pricing is fair?'                   ],
		[ 'Sales Call Experience',      'How did your sales conversation go?'                 ],
		[ 'Employee Engagement',        'Rate your experience working with our team.'         ],
		[ 'Community Feedback',         'How do you find our community forums?'               ],
	];

	private const DEVICES = [ 'desktop', 'mobile', 'tablet' ];

	/**
	 * {@inheritDoc}
	 */
	public function registerRoutes(): void {
		if ( ! ( defined( 'WP_DEBUG' ) && WP_DEBUG ) ) {
			return;
		}

		\register_rest_route(
			$this->namespace,
			"/{$this->restBase}/seed",
			[
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'seed' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => [
						'surveys'              => [
							'type'    => 'integer',
							'default' => 5,
							'minimum' => 1,
							'maximum' => 20,
						],
						'responses_per_survey' => [
							'type'    => 'integer',
							'default' => 500,
							'minimum' => 10,
							'maximum' => 5000,
						],
					],
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'clear' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
			]
		);
	}

	/**
	 * Seed fake surveys and responses.
	 */
	public function seed( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;

		$num_surveys  = (int) $request->get_param( 'surveys' );
		$per_survey   = (int) $request->get_param( 'responses_per_survey' );
		$admin_id     = get_current_user_id();
		$templates    = self::FORM_TEMPLATES;

		$schema = wp_json_encode( [[
			'id'     => 's1',
			'title'  => 'Page 1',
			'fields' => [
				[ 'id' => 'f1', 'type' => 'nps',      'label' => 'How likely are you to recommend us?', 'required' => true  ],
				[ 'id' => 'f2', 'type' => 'textarea',  'label' => 'What is the main reason for your score?', 'required' => false ],
			],
		]] );

		$settings = wp_json_encode( [
			'submitLabel'    => 'Submit',
			'nextLabel'      => 'Next',
			'backLabel'      => 'Back',
			'widgetLabel'    => 'Feedback',
			'triggerIcon'    => 'message',
			'widgetPosition' => 'bottom-right',
		] );

		$styling = wp_json_encode( [
			'color'    => '#6366F1',
			'position' => 'bottom-right',
			'trigger'  => 'auto',
			'delay'    => 0,
		] );

		$survey_ids     = [];
		$total_responses = 0;

		for ( $i = 0; $i < $num_surveys; $i++ ) {
			[ $title, $desc ] = $templates[ $i % count( $templates ) ];

			// Append a number if we wrap around the template list
			if ( $i >= count( $templates ) ) {
				$title .= ' ' . ( (int) floor( $i / count( $templates ) ) + 1 );
			}

			$wpdb->insert(
				$wpdb->prefix . 'af_surveys',
				[
					'title'        => $title,
					'description'  => $desc,
					'form_schema'  => $schema,
					'settings'     => $settings,
					'styling'      => $styling,
					'status'       => 'published',
					'conflict_reason' => self::SEEDED_META_KEY, // reuse column as seeded flag
					'created_by'   => $admin_id,
					'created_at'   => current_time( 'mysql' ),
					'updated_at'   => current_time( 'mysql' ),
				],
				[ '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s' ]
			);

			$survey_id    = (int) $wpdb->insert_id;
			$survey_ids[] = $survey_id;

			// Batch-insert responses
			$batch = 500;
			for ( $start = 0; $start < $per_survey; $start += $batch ) {
				$count = min( $batch, $per_survey - $start );
				$rows  = [];

				for ( $j = 0; $j < $count; $j++ ) {
					$score    = rand( 0, 10 );
					$comment  = self::COMMENTS[ array_rand( self::COMMENTS ) ];
					$device   = self::DEVICES[ array_rand( self::DEVICES ) ];
					$is_read  = rand( 0, 1 );
					$days_ago = rand( 0, 730 );
					$created  = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days_ago} days" ) );
					$ip       = rand( 1, 255 ) . '.' . rand( 0, 255 ) . '.' . rand( 0, 255 ) . '.' . rand( 0, 255 );
					$ip_hash  = hash( 'sha256', $ip );
					$data     = wp_json_encode( [ 'f1' => $score, 'f2' => $comment ] );

					$rows[] = $wpdb->prepare(
						'(%d, %s, %d, %s, %s, %s, %d, %s)',
						$survey_id, $data, $score, $device, $ip_hash, $ip, $is_read, $created
					);
				}

				// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$wpdb->query(
					"INSERT INTO {$wpdb->prefix}af_responses
						(survey_id, response_data, score, device_type, ip_hash, ip_address, is_read, created_at)
					 VALUES " . implode( ',', $rows )
				);

				$total_responses += $count;
			}

			// Sync response_count cache
			$actual_count = (int) $wpdb->get_var( $wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->prefix}af_responses WHERE survey_id = %d",
				$survey_id
			) );
			$wpdb->update(
				$wpdb->prefix . 'af_surveys',
				[ 'response_count' => $actual_count ],
				[ 'id' => $survey_id ],
				[ '%d' ], [ '%d' ]
			);
		}

		return $this->successResponse( [
			'surveys'   => count( $survey_ids ),
			'responses' => $total_responses,
			'survey_ids' => $survey_ids,
		] );
	}

	/**
	 * Delete all seeded surveys and their responses.
	 */
	public function clear(): \WP_REST_Response {
		global $wpdb;

		// Find all seeded surveys (flagged via conflict_reason)
		$ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM {$wpdb->prefix}af_surveys WHERE conflict_reason = %s",
				self::SEEDED_META_KEY
			)
		);

		if ( empty( $ids ) ) {
			return $this->successResponse( [ 'deleted_surveys' => 0, 'deleted_responses' => 0 ] );
		}

		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$deleted_responses = (int) $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->prefix}af_responses WHERE survey_id IN ($placeholders)",  // phpcs:ignore
				...$ids
			)
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$deleted_surveys = (int) $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->prefix}af_surveys WHERE id IN ($placeholders)",  // phpcs:ignore
				...$ids
			)
		);

		return $this->successResponse( [
			'deleted_surveys'   => $deleted_surveys,
			'deleted_responses' => $deleted_responses,
		] );
	}

}
