<?php

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
	private DateTimeImmutable $createdAt;

	/**
	 * @param  int         $surveyId     Primary key of the parent survey.
	 * @param  array<mixed> $responseData Raw key/value payload from the respondent.
	 * @param  float|null   $score        Optional numeric score.
	 * @param  string|null  $pageUrl      URL of the page on which the survey was shown.
	 * @param  string|null  $deviceType   Device category: desktop | mobile | tablet.
	 * @param  string|null  $ipHash       HMAC hash of the visitor IP for analytics.
	 * @param  string|null  $ipAddress    Raw IP address, null when privacy mode is active.
	 * @param  int|null     $userId       WordPress user ID, null for anonymous submissions.
	 * @param  string|null  $guestToken   Persistent guest UUID for duplicate detection.
	 * @param  bool         $consentGiven Whether the respondent gave explicit consent.
	 * @param  bool         $isRead       Whether an admin has marked this response as read.
	 * @since  1.0.0
	 */
	public function __construct(
		private int $surveyId,
		private array $responseData,
		private ?float $score = null,
		private ?string $pageUrl = null,
		private ?string $deviceType = null,
		private ?string $ipHash = null,
		private ?string $ipAddress = null,
		private ?int $userId = null,
		private ?string $guestToken = null,
		private bool $consentGiven = false,
		private bool $isRead = false,
	) {
		$this->createdAt = new DateTimeImmutable();
	}

	/**
	 * Reconstitute a Response from a persistence row.
	 *
	 * @param  int               $id           Primary key.
	 * @param  int               $surveyId     Parent survey ID.
	 * @param  array<mixed>      $responseData Decoded response payload.
	 * @param  float|null        $score        Numeric score, or null.
	 * @param  string|null       $pageUrl      Page URL at submission time.
	 * @param  string|null       $deviceType   Device category.
	 * @param  string|null       $ipHash       Hashed IP.
	 * @param  string|null       $ipAddress    Raw IP address.
	 * @param  int|null          $userId       WordPress user ID.
	 * @param  string|null       $guestToken   Guest UUID.
	 * @param  bool              $consentGiven Consent flag.
	 * @param  DateTimeImmutable $createdAt    Submission timestamp.
	 * @param  bool              $isRead       Read flag.
	 * @return self
	 * @since  1.0.0
	 */
	public static function reconstitute(
		int $id,
		int $surveyId,
		array $responseData,
		?float $score,
		?string $pageUrl,
		?string $deviceType,
		?string $ipHash,
		?string $ipAddress,
		?int $userId,
		?string $guestToken,
		bool $consentGiven,
		DateTimeImmutable $createdAt,
		bool $isRead = false,
	): self {
		$response            = new self( $surveyId, $responseData, $score, $pageUrl, $deviceType, $ipHash, $ipAddress, $userId, $guestToken, $consentGiven, $isRead );
		$response->id        = $id;
		$response->createdAt = $createdAt;
		return $response;
	}

	/**
	 * Return the primary key of the parent survey.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function getSurveyId(): int {
		return $this->surveyId;
	}

	/**
	 * Return the raw key/value response payload submitted by the respondent.
	 *
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	public function getResponseData(): array {
		return $this->responseData;
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
		return $this->pageUrl;
	}

	/**
	 * Return the device type string (e.g. "desktop", "mobile", "tablet").
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getDeviceType(): ?string {
		return $this->deviceType;
	}

	/**
	 * Return the one-way hashed IP address for analytics without PII retention.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getIpHash(): ?string {
		return $this->ipHash;
	}

	/**
	 * Return the raw IP address of the respondent, or null if privacy mode was active.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getIpAddress(): ?string {
		return $this->ipAddress;
	}

	/**
	 * Return the WordPress user ID of the respondent, or null for anonymous submissions.
	 *
	 * @return int|null
	 * @since  1.0.0
	 */
	public function getUserId(): ?int {
		return $this->userId;
	}

	/**
	 * Return the persistent guest UUID used for duplicate detection, or null for logged-in users.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getGuestToken(): ?string {
		return $this->guestToken;
	}

	/**
	 * Return true when the respondent explicitly granted data-processing consent.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isConsentGiven(): bool {
		return $this->consentGiven;
	}

	/**
	 * Return true when an admin has marked this response as read.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isRead(): bool {
		return $this->isRead;
	}

	/**
	 * Return the UTC timestamp at which the response was submitted.
	 *
	 * @return DateTimeImmutable
	 * @since  1.0.0
	 */
	public function getCreatedAt(): DateTimeImmutable {
		return $this->createdAt;
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
			'survey_id'     => $this->surveyId,
			'response_data' => $this->responseData,
			'score'         => $this->score,
			'page_url'      => $this->pageUrl,
			'device_type'   => $this->deviceType,
			'ip_hash'       => $this->ipHash,
			'ip_address'    => $this->ipAddress,
			'user_id'       => $this->userId,
			'guest_token'   => $this->guestToken,
			'consent_given' => $this->consentGiven,
			'is_read'       => $this->isRead,
			'created_at'    => $this->createdAt->format( 'Y-m-d H:i:s' ),
		];
	}
}
