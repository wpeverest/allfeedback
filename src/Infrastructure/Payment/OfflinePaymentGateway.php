<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Payment;

defined( 'ABSPATH' ) || exit;

/**
 * Offline (manual) payment gateway implementation.
 *
 * Records a payment as pending without contacting any external provider.
 * Useful for invoice-based or bank-transfer workflows where an admin
 * manually confirms receipt before granting access.
 *
 * @since 1.0.0
 */
class OfflinePaymentGateway implements PaymentGateway {

	/**
	 * @since 1.0.0
	 */
	public function getId(): string {
		return 'offline';
	}

	/**
	 * @since 1.0.0
	 */
	public function getName(): string {
		return __( 'Offline Payment', 'all-feedback' );
	}

	/**
	 * @since 1.0.0
	 */
	public function isEnabled(): bool {
		return true;
	}

	/**
	 * Record the payment as pending and return a locally generated reference.
	 *
	 * @param array<string, mixed> $data Payment context data.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function processPayment( array $data ): array {
		$transactionId = sprintf(
			'ALLFB-OFF-%s-%s',
			(int) ( $data['user_id'] ?? 0 ),
			wp_generate_password( 8, false )
		);

		return [
			'success'        => true,
			'transaction_id' => $transactionId,
			'message'        => __( 'Offline payment recorded. Awaiting manual confirmation.', 'all-feedback' ),
		];
	}

	/**
	 * Mark an offline payment as refunded.
	 *
	 * Since there is no external provider to notify this is always a no-op
	 * that returns true; callers are responsible for updating order status.
	 *
	 * @param string $transactionId Locally generated transaction reference.
	 * @since 1.0.0
	 */
	public function refund( string $transactionId ): bool {
		return true;
	}
}
