<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Payment;

defined( 'ABSPATH' ) || exit;

/**
 * Interface for payment gateway implementations.
 *
 * Provides a uniform contract for processing payments and issuing refunds
 * regardless of the underlying payment provider.  Implementations are
 * registered in the DI container and used by the checkout flow.
 *
 * @since 1.0.0
 */
interface PaymentGateway {

	/**
	 * Return the gateway's unique slug identifier.
	 *
	 * @since 1.0.0
	 */
	public function getId(): string;

	/**
	 * Return the human-readable gateway name for display in the UI.
	 *
	 * @since 1.0.0
	 */
	public function getName(): string;

	/**
	 * Return true when this gateway is currently available for use.
	 *
	 * @since 1.0.0
	 */
	public function isEnabled(): bool;

	/**
	 * Attempt to process a payment for the supplied data.
	 *
	 * Returns an associative array containing at minimum:
	 *   - `success`        (bool)   Whether the payment succeeded.
	 *   - `transaction_id` (string) Provider-assigned transaction reference.
	 *   - `message`        (string) Human-readable result message.
	 *
	 * @param array<string, mixed> $data Payment data (amount, currency, user, etc.).
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function processPayment( array $data ): array;

	/**
	 * Attempt to refund a previously processed transaction.
	 *
	 * @param string $transactionId Provider-assigned transaction reference.
	 * @since 1.0.0
	 */
	public function refund( string $transactionId ): bool;
}
