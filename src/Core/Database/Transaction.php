<?php

declare(strict_types=1);

namespace AllFeedback\Core\Database;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

/**
 * Class Transaction
 *
 * Wraps WordPress $wpdb in database transaction semantics.
 * Any exception thrown inside the callback rolls back the transaction before
 * being re-thrown so no partial writes are committed.
 *
 * @package AllFeedback\Core\Database
 * @since   1.0.0
 */
class Transaction {

	/**
	 * Execute a callback inside a database transaction.
	 *
	 * @template T
	 * @param  callable(): T $callback The work to perform atomically.
	 * @return T              The value returned by $callback.
	 * @throws \Throwable     Re-throws any exception after rolling back.
	 * @since  1.0.0
	 */
	public static function run( callable $callback ): mixed {
		global $wpdb;

		$wpdb->query( 'START TRANSACTION' );

		try {
			$result = $callback();
			$wpdb->query( 'COMMIT' );
			return $result;
		} catch ( \Throwable $e ) {
			$wpdb->query( 'ROLLBACK' );
			throw $e;
		}
	}
}
