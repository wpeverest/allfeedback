<?php

declare(strict_types=1);

namespace AllFeedback\Tests;

use Brain\Monkey;
use PHPUnit\Framework\TestCase;

abstract class BrainMonkeyTestCase extends TestCase {

	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		// Stub i18n functions to return the first argument unchanged.
		Monkey\Functions\stubTranslationFunctions();
		// Stub escaping functions to return the first argument unchanged.
		Monkey\Functions\stubEscapeFunctions();
	}

	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}
}
