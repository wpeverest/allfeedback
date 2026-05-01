<?php
/**
 * Response.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\Entity;
use DateTimeImmutable;

/**
 * Response aggregate root.
 *
 * Represents a single end-user submission for a Survey, carrying the raw
 * response payload, an optional numeric score, contextual metadata
 * (page URL, device type, anonymised IP), and GDPR consent state.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */
class Response extends Entity {

	/**
	 * UTC timestamp of when the response was submitted.
	 *
	 * @var DateTimeImmutable
	 * @since 1.0.0
	 */
	private DateTimeImmutable $created_at;

	/**
	 * Constructor.
	 *
	 * @param  int          $survey_id     Primary key of the parent survey.
	 * @param  array<mixed> $response_data Raw key/value payload from the respondent.
	 * @param  float|null   $score        Optional numeric score.
	 * @param  string|null  $page_url      URL of the page on which the survey was shown.
	 * @param  string|null  $device_type   Device category: desktop | mobile | tablet.
	 * @param  string|null  $ip_hash       HMAC hash of the visitor IP for analytics.
	 * @param  string|null  $ip_address    Raw IP address, null when privacy mode is active.
	 * @param  int|null     $user_id       WordPress user ID, null for anonymous submissions.
	 * @param  string|null  $guest_token   Persistent guest UUID for duplicate detection.
	 * @param  bool         $consent_given Whether the respondent gave explicit consent.
	 * @param  bool         $is_read       Whether an admin has marked this response as read.
	 * @since  1.0.0
	 */
	public function __construct(
		private int $survey_id,
		private array $response_data,
		private ?float $score = null,
		private ?string $page_url = null,
		private ?string $device_type = null,
		private ?string $ip_hash = null,
		private ?string $ip_address = null,
		private ?int $user_id = null,
		private ?string $guest_token = null,
		private bool $consent_given = false,
		private bool $is_read = false,
	) {
		$this->created_at = new DateTimeImmutable();
	}

	/**
	 * Reconstitute a Response from a persistence row.
	 *
	 * @param  int               $id           Primary key.
	 * @param  int               $survey_id     Parent survey ID.
	 * @param  array<mixed>      $response_data Decoded response payload.
	 * @param  float|null        $score        Numeric score, or null.
	 * @param  string|null       $page_url      Page URL at submission time.
	 * @param  string|null       $device_type   Device category.
	 * @param  string|null       $ip_hash       Hashed IP.
	 * @param  string|null       $ip_address    Raw IP address.
	 * @param  int|null          $user_id       WordPress user ID.
	 * @param  string|null       $guest_token   Guest UUID.
	 * @param  bool              $consent_given Consent flag.
	 * @param  DateTimeImmutable $created_at    Submission timestamp.
	 * @param  bool              $is_read       Read flag.
	 * @return self
	 * @since  1.0.0
	 */
	public static function reconstitute(
		int $id,
		int $survey_id,
		array $response_data,
		?float $score,
		?string $page_url,
		?string $device_type,
		?string $ip_hash,
		?string $ip_address,
		?int $user_id,
		?string $guest_token,
		bool $consent_given,
		DateTimeImmutable $created_at,
		bool $is_read = false,
	): self {
		$response             = new self( $survey_id, $response_data, $score, $page_url, $device_type, $ip_hash, $ip_address, $user_id, $guest_token, $consent_given, $is_read );
		$response->id         = $id;
		$response->created_at = $created_at;
		return $response;
	}

	/**
	 * Return the primary key of the parent survey.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function getSurveyId(): int {
		return $this->survey_id;
	}

	/**
	 * Return the raw key/value response payload submitted by the respondent.
	 *
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	public function getResponseData(): array {
		return $this->response_data;
	}

	/**
	 * Return the numeric score extracted from the response, or null if absent.
	 *
	 * @return float|null
	 * @since  1.0.0
	 */
	public function getScore(): ?float {
		return $this->score;
	}

	/**
	 * Return the URL of the page from which the survey was submitted.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getPageUrl(): ?string {
		return $this->page_url;
	}

	/**
	 * Return the device type string (e.g. "desktop", "mobile", "tablet").
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getDeviceType(): ?string {
		return $this->device_type;
	}

	/**
	 * Return the one-way hashed IP address for analytics without PII retention.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getIpHash(): ?string {
		return $this->ip_hash;
	}

	/**
	 * Return the raw IP address of the respondent, or null if privacy mode was active.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getIpAddress(): ?string {
		return $this->ip_address;
	}

	/**
	 * Return the WordPress user ID of the respondent, or null for anonymous submissions.
	 *
	 * @return int|null
	 * @since  1.0.0
	 */
	public function getUserId(): ?int {
		return $this->user_id;
	}

	/**
	 * Return the persistent guest UUID used for duplicate detection, or null for logged-in users.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getGuestToken(): ?string {
		return $this->guest_token;
	}

	/**
	 * Return true when the respondent explicitly granted data-processing consent.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isConsentGiven(): bool {
		return $this->consent_given;
	}

	/**
	 * Return true when an admin has marked this response as read.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isRead(): bool {
		return $this->is_read;
	}

	/**
	 * Return the UTC timestamp at which the response was submitted.
	 *
	 * @return DateTimeImmutable
	 * @since  1.0.0
	 */
	public function getCreatedAt(): DateTimeImmutable {
		return $this->created_at;
	}

	/**
	 * Serialise the aggregate to a plain associative array for persistence.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function toArray(): array {
		return [
			'id'            => $this->id,
			'survey_id'     => $this->survey_id,
			'response_data' => $this->response_data,
			'score'         => $this->score,
			'page_url'      => $this->page_url,
			'device_type'   => $this->device_type,
			'ip_hash'       => $this->ip_hash,
			'ip_address'    => $this->ip_address,
			'user_id'       => $this->user_id,
			'guest_token'   => $this->guest_token,
			'consent_given' => $this->consent_given,
			'is_read'       => $this->is_read,
			'created_at'    => $this->created_at->format( 'Y-m-d H:i:s' ),
		];
	}
}
