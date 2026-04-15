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
 * @since 1.0.0
 */
class Response extends Entity {

	/** @since 1.0.0 */
	private DateTimeImmutable $createdAt;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private int $surveyId,
		private array $responseData,
		private ?float $score = null,
		private ?string $pageUrl = null,
		private ?string $deviceType = null,
		private ?string $ipHash = null,
		private ?int $userId = null,
		private bool $consentGiven = false,
		private bool $isRead = false,
	) {
		$this->createdAt = new DateTimeImmutable();
	}

	/**
	 * Reconstitute a Response from a persistence row.
	 *
	 * @since 1.0.0
	 */
	public static function reconstitute(
		int $id,
		int $surveyId,
		array $responseData,
		?float $score,
		?string $pageUrl,
		?string $deviceType,
		?string $ipHash,
		?int $userId,
		bool $consentGiven,
		DateTimeImmutable $createdAt,
		bool $isRead = false,
	): self {
		$response            = new self( $surveyId, $responseData, $score, $pageUrl, $deviceType, $ipHash, $userId, $consentGiven, $isRead );
		$response->id        = $id;
		$response->createdAt = $createdAt;
		return $response;
	}

	/**
	 * Return the id of the Survey this response belongs to.
	 *
	 * @since 1.0.0
	 */
	public function getSurveyId(): int {
		return $this->surveyId;
	}

	/**
	 * Return the raw key/value response payload submitted by the respondent.
	 *
	 * @since 1.0.0
	 */
	public function getResponseData(): array {
		return $this->responseData;
	}

	/**
	 * Return the numeric score extracted from the response, or null if absent.
	 *
	 * @since 1.0.0
	 */
	public function getScore(): ?float {
		return $this->score;
	}

	/**
	 * Return the URL of the page from which the survey was submitted.
	 *
	 * @since 1.0.0
	 */
	public function getPageUrl(): ?string {
		return $this->pageUrl;
	}

	/**
	 * Return the device type string (e.g. "desktop", "mobile", "tablet").
	 *
	 * @since 1.0.0
	 */
	public function getDeviceType(): ?string {
		return $this->deviceType;
	}

	/**
	 * Return the one-way hashed IP address for analytics without PII retention.
	 *
	 * @since 1.0.0
	 */
	public function getIpHash(): ?string {
		return $this->ipHash;
	}

	/**
	 * Return the WordPress user id of the respondent, or null for anonymous submissions.
	 *
	 * @since 1.0.0
	 */
	public function getUserId(): ?int {
		return $this->userId;
	}

	/**
	 * Return true when the respondent explicitly granted data-processing consent.
	 *
	 * @since 1.0.0
	 */
	public function isConsentGiven(): bool {
		return $this->consentGiven;
	}

	/**
	 * Return true when an admin has marked this response as read.
	 *
	 * @since 1.0.0
	 */
	public function isRead(): bool {
		return $this->isRead;
	}

	/**
	 * Return the UTC timestamp at which the response was submitted.
	 *
	 * @since 1.0.0
	 */
	public function getCreatedAt(): DateTimeImmutable {
		return $this->createdAt;
	}

	/**
	 * Serialise the aggregate to a plain associative array for persistence.
	 *
	 * @since 1.0.0
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
			'user_id'       => $this->userId,
			'consent_given' => $this->consentGiven,
			'is_read'       => $this->isRead,
			'created_at'    => $this->createdAt->format( 'Y-m-d H:i:s' ),
		];
	}
}
