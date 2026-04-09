<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Cart;

defined( 'ABSPATH' ) || exit;

/**
 * Session-based cart manager for future premium survey features.
 *
 * Manages a lightweight in-memory + PHP session cart suitable for
 * one-click premium survey plan purchases.  Each cart item is a simple
 * associative array carrying an id, name, price, and quantity.
 *
 * Items are identified by a string `id` key so that the same SKU cannot be
 * added twice — calling addItem() with an existing id replaces the item.
 *
 * @since 1.0.0
 */
class CartManager {

	/** @since 1.0.0 */
	private const SESSION_KEY = '_allfb_cart';

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->startSession();
	}

	/**
	 * Add or replace an item in the cart.
	 *
	 * @param string $id       Unique item identifier (e.g. plan slug or product ID).
	 * @param string $name     Human-readable item name.
	 * @param float  $price    Unit price (excluding tax).
	 * @param int    $quantity Number of units. Defaults to 1.
	 * @since 1.0.0
	 */
	public function addItem( string $id, string $name, float $price, int $quantity = 1 ): void {
		$items        = $this->getItems();
		$items[ $id ] = [
			'id'       => $id,
			'name'     => $name,
			'price'    => $price,
			'quantity' => max( 1, $quantity ),
		];

		$this->persist( $items );
	}

	/**
	 * Remove the item with the given id from the cart.
	 *
	 * Silently does nothing when the id is not present.
	 *
	 * @param string $id Item identifier.
	 * @since 1.0.0
	 */
	public function removeItem( string $id ): void {
		$items = $this->getItems();
		unset( $items[ $id ] );
		$this->persist( $items );
	}

	/**
	 * Return all current cart items as an associative array keyed by item id.
	 *
	 * @return array<string, array{id: string, name: string, price: float, quantity: int}>
	 * @since 1.0.0
	 */
	public function getItems(): array {
		if ( ! isset( $_SESSION[ self::SESSION_KEY ] ) || ! is_array( $_SESSION[ self::SESSION_KEY ] ) ) {
			return [];
		}

		return $_SESSION[ self::SESSION_KEY ]; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	}

	/**
	 * Empty the cart.
	 *
	 * @since 1.0.0
	 */
	public function clear(): void {
		$this->persist( [] );
	}

	/**
	 * Return the cart total (sum of price × quantity for each item).
	 *
	 * @since 1.0.0
	 */
	public function getTotal(): float {
		$total = 0.0;
		foreach ( $this->getItems() as $item ) {
			$total += (float) $item['price'] * (int) $item['quantity'];
		}
		return $total;
	}

	/**
	 * Return the number of distinct items in the cart.
	 *
	 * @since 1.0.0
	 */
	public function count(): int {
		return count( $this->getItems() );
	}

	/**
	 * Persist the items array to the PHP session.
	 *
	 * @param array<string, array{id: string, name: string, price: float, quantity: int}> $items
	 * @since 1.0.0
	 */
	private function persist( array $items ): void {
		$_SESSION[ self::SESSION_KEY ] = $items;
	}

	/**
	 * Start a PHP session if one is not already active.
	 *
	 * @since 1.0.0
	 */
	private function startSession(): void {
		if ( ! session_id() && ! headers_sent() ) {
			session_start();
		}
	}
}
