<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Traits\Hooks;

/**
 * Composes and sends the weekly response-stats digest to the admin email address.
 *
 * The digest is site-wide (not per-survey) and summarises:
 *   - Total responses this week vs last week (with trend)
 *   - Average NPS score this week vs last week
 *   - Completion rate this week vs last week
 *   - Per-survey breakdown (top 5 published surveys by response count)
 *   - "View Analytics →" CTA button
 *
 * The email is sent every Monday at 08:00 (site timezone) via Action Scheduler.
 * No settings toggle is exposed — the digest is always on when admin notifications
 * are enabled.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class WeeklyDigestNotification {

	use Hooks;

	/**
	 * @param  Mailer                  $mailer            Mailer for dispatching the email.
	 * @param  SettingsManager         $settings          Plugin settings.
	 * @param  ResponseRepository      $responses         Response repository for stats queries.
	 * @param  SurveySessionRepository $sessions          Session repository for completion stats.
	 * @param  SurveyRepository        $surveys           Survey repository for published surveys.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Mailer $mailer,
		private readonly SettingsManager $settings,
		private readonly ResponseRepository $responses,
		private readonly SurveySessionRepository $sessions,
		private readonly SurveyRepository $surveys,
	) {}

	/**
	 * Compose and send the weekly digest to the configured admin address.
	 *
	 * Silently returns false and skips sending when admin notifications are
	 * disabled in plugin settings.
	 *
	 * @return bool True when the email was dispatched successfully.
	 * @since  1.0.0
	 */
	public function send(): bool {
		if ( ! $this->settings->get( 'email.notifications.admin_enabled' ) ) {
			return false;
		}

		$to = (string) ( $this->settings->get( 'email.delivery.to_email' ) ?: get_option( 'admin_email' ) );

		$responseStats = $this->responses->getOverviewStats();
		$sessionStats  = $this->sessions->getOverviewSessionStats();
		$publishedSurveys = $this->surveys->findAll(
			new SurveyFilter( status: SurveyStatus::Published, perPage: 5 )
		);

		$dateFrom  = date( 'M j', strtotime( '-6 days' ) );
		$dateTo    = date( 'M j' );
		$dateRange = $dateFrom . '–' . $dateTo;

		$subject = (string) $this->applyFilters(
			'allfeedback:mail:digest_subject',
			sprintf(
				/* translators: %s: date range e.g. "Apr 22–28" */
				__( 'Your weekly survey report | %s', 'allfeedback' ),
				$dateRange
			)
		);

		$body = $this->buildBody( $responseStats, $sessionStats, $publishedSurveys, $dateRange );
		$body = (string) $this->applyFilters( 'allfeedback:mail:digest_body', $body );

		return $this->mailer->send( $to, $subject, $body );
	}

	/**
	 * Build the HTML body for the weekly digest.
	 *
	 * The body is constructed without newlines so that Mailer::wrapInLayout()'s
	 * nl2br() pass does not insert spurious <br> tags inside table elements.
	 *
	 * @param  array<string, mixed> $responseStats   From ResponseRepository::getOverviewStats().
	 * @param  array<string, mixed> $sessionStats    From SurveySessionRepository::getOverviewSessionStats().
	 * @param  Survey[]             $surveys         Up to 5 published surveys.
	 * @param  string               $dateRange       Human-readable date range string.
	 * @return string HTML body content.
	 * @since  1.0.0
	 */
	private function buildBody( array $responseStats, array $sessionStats, array $surveys, string $dateRange ): string {
		$thisWeek     = (int) ( $responseStats['this_week_count']     ?? 0 );
		$lastWeek     = (int) ( $responseStats['last_week_count']     ?? 0 );
		$thisAvgScore = $responseStats['this_week_avg_score'] ?? null;
		$lastAvgScore = $responseStats['last_week_avg_score'] ?? null;
		$thisCompletion = $sessionStats['this_week_completion_rate'] ?? null;
		$lastCompletion = $sessionStats['last_week_completion_rate'] ?? null;

		$analyticsUrl = esc_url( admin_url( 'admin.php' ) . '?page=allfeedback#/analytics' );

		// ── Header ────────────────────────────────────────────────────────────
		$html  = '<p style="margin:0 0 2px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">' . esc_html__( 'Weekly Report', 'allfeedback' ) . '</p>';
		$html .= '<p style="margin:0 0 24px 0;font-size:12px;color:#9ca3af;">' . esc_html( $dateRange ) . '</p>';

		// ── Big response count ─────────────────────────────────────────────────
		$trendBadge = $this->buildCountTrend( $thisWeek, $lastWeek );
		$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>';
		$html .= '<td style="vertical-align:middle;">';
		$html .= '<span style="display:block;font-size:36px;font-weight:700;color:#111827;line-height:1;">' . $thisWeek . '</span>';
		$html .= '<span style="display:block;margin-top:4px;font-size:13px;color:#6b7280;">' . esc_html__( 'responses this week', 'allfeedback' ) . '</span>';
		$html .= '</td>';
		if ( $trendBadge !== '' ) {
			$html .= '<td style="vertical-align:middle;text-align:right;">' . $trendBadge . '</td>';
		}
		$html .= '</tr></table>';

		// ── Stats rows ────────────────────────────────────────────────────────
		$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;margin-bottom:24px;">';

		if ( $thisAvgScore !== null ) {
			$scoreTrend = $lastAvgScore !== null ? $this->buildScoreTrend( (float) $thisAvgScore, (float) $lastAvgScore ) : '';
			$html .= '<tr>';
			$html .= '<td style="padding:11px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">' . esc_html__( 'Avg score this week', 'allfeedback' ) . '</td>';
			$html .= '<td style="padding:11px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">' . number_format( (float) $thisAvgScore, 1 ) . '/10 ' . $scoreTrend . '</td>';
			$html .= '</tr>';
		}

		if ( $thisCompletion !== null ) {
			$crTrend = $lastCompletion !== null ? $this->buildRateTrend( (float) $thisCompletion, (float) $lastCompletion ) : '';
			$html .= '<tr>';
			$html .= '<td style="padding:11px 0;font-size:13px;color:#374151;">' . esc_html__( 'Completion rate this week', 'allfeedback' ) . '</td>';
			$html .= '<td style="padding:11px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;">' . number_format( (float) $thisCompletion, 0 ) . '% ' . $crTrend . '</td>';
			$html .= '</tr>';
		}

		$html .= '</table>';

		// ── Per-survey breakdown ───────────────────────────────────────────────
		if ( ! empty( $surveys ) ) {
			$html .= '<p style="margin:0 0 10px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">' . esc_html__( 'Survey Breakdown', 'allfeedback' ) . '</p>';
			$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">';
			foreach ( $surveys as $survey ) {
				$html .= '<tr>';
				$html .= '<td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">' . esc_html( $survey->getTitle() ) . '</td>';
				$html .= '<td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">' . (int) $survey->getResponseCount() . ' ' . esc_html__( 'responses', 'allfeedback' ) . '</td>';
				$html .= '</tr>';
			}
			$html .= '</table>';
		}

		// ── CTA ───────────────────────────────────────────────────────────────
		$html .= '<a href="' . $analyticsUrl . '" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">' . esc_html__( 'View Analytics →', 'allfeedback' ) . '</a>';

		return $html;
	}

	/**
	 * Build a response-count trend badge (pill with % change).
	 *
	 * @param  int $thisWeek This week's count.
	 * @param  int $lastWeek Last week's count.
	 * @return string HTML span badge, or empty string when last week is 0.
	 * @since  1.0.0
	 */
	private function buildCountTrend( int $thisWeek, int $lastWeek ): string {
		if ( $lastWeek === 0 ) {
			return '';
		}

		$pct = (int) round( ( $thisWeek - $lastWeek ) / $lastWeek * 100 );
		$up  = $pct >= 0;

		return sprintf(
			'<span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;background:%s;color:%s;">%s%d%% %s</span>',
			$up ? '#dcfce7' : '#fee2e2',
			$up ? '#16a34a' : '#dc2626',
			$up ? '+' : '',
			$pct,
			esc_html__( 'vs last week', 'allfeedback' )
		);
	}

	/**
	 * Build an inline score trend indicator (e.g. "↑ vs 7.9").
	 *
	 * @param  float $thisWeek This week's average score.
	 * @param  float $lastWeek Last week's average score.
	 * @return string HTML span.
	 * @since  1.0.0
	 */
	private function buildScoreTrend( float $thisWeek, float $lastWeek ): string {
		$up = $thisWeek >= $lastWeek;

		return sprintf(
			'<span style="font-size:11px;font-weight:500;color:%s;">%s %s %.1f</span>',
			$up ? '#16a34a' : '#dc2626',
			$up ? '↑' : '↓',
			esc_html__( 'vs', 'allfeedback' ),
			$lastWeek
		);
	}

	/**
	 * Build an inline completion/abandonment rate trend indicator.
	 *
	 * @param  float $thisWeek This week's rate (0–100).
	 * @param  float $lastWeek Last week's rate (0–100).
	 * @return string HTML span.
	 * @since  1.0.0
	 */
	private function buildRateTrend( float $thisWeek, float $lastWeek ): string {
		$diff = $thisWeek - $lastWeek;
		$up   = $diff >= 0;

		return sprintf(
			'<span style="font-size:11px;font-weight:500;color:%s;">%s %s %.0f%%</span>',
			$up ? '#16a34a' : '#dc2626',
			$up ? '↑' : '↓',
			esc_html__( 'vs', 'allfeedback' ),
			$lastWeek
		);
	}
}
