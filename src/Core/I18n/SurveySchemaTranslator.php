<?php

declare(strict_types=1);

namespace AllFeedback\Core\I18n;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Survey\SurveyField;
use AllFeedback\Domain\Survey\SurveySchema;

/**
 * Class SurveySchemaTranslator
 *
 * Integrates AllFeedback survey schema field labels with WPML and Polylang
 * so that survey question labels can be translated through the standard
 * WordPress multilingual workflows.
 *
 * String registration should be called whenever a survey schema is saved.
 * Translation is applied at render time by calling translate().
 *
 * @package AllFeedback\Core\I18n
 * @since   1.0.0
 */
class SurveySchemaTranslator {

	/**
	 * Context string used when registering strings with WPML.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const WPML_CONTEXT = 'AllFeedback Survey Schema';

	/**
	 * Group name used when registering strings with Polylang.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const PLL_GROUP = 'AllFeedback';

	/**
	 * Register every field label in the given schema with WPML and Polylang
	 * so they appear in the translation interface.
	 *
	 * @param  int          $surveyId The primary key of the survey being registered.
	 * @param  SurveySchema $schema   The schema whose field labels should be registered.
	 * @return void
	 * @since  1.0.0
	 */
	public function registerStrings( int $surveyId, SurveySchema $schema ): void {
		foreach ( $schema->getFields() as $index => $field ) {
			$label = $field->getLabelRaw();

			if ( ! is_string( $label ) || $label === '' ) {
				continue;
			}

			$name = $this->stringName( $surveyId, $index );

			if ( function_exists( 'icl_register_string' ) ) {
				call_user_func( 'icl_register_string', self::WPML_CONTEXT, $name, $label );
			}

			if ( function_exists( 'pll_register_string' ) ) {
				call_user_func( 'pll_register_string', $name, $label, self::PLL_GROUP, true );
			}
		}
	}

	/**
	 * Return a copy of $schema with all field labels translated into the
	 * current locale via WPML or Polylang.
	 *
	 * When neither multilingual plugin is active, the original schema is
	 * returned unchanged.
	 *
	 * @param  int          $surveyId The primary key of the survey being translated.
	 * @param  SurveySchema $schema   The schema to translate.
	 * @return SurveySchema
	 * @since  1.0.0
	 */
	public function translate( int $surveyId, SurveySchema $schema ): SurveySchema {
		if ( $schema->isEmpty() ) {
			return $schema;
		}

		$locale = get_locale();
		$fields = [];

		foreach ( $schema->getFields() as $index => $field ) {
			$fields[] = $this->translateField( $surveyId, $index, $field, $locale );
		}

		return new SurveySchema( $fields, $schema->getVersion() );
	}

	/**
	 * Translate a single field label and return a (possibly new) field instance.
	 *
	 * @param  int         $surveyId The survey primary key.
	 * @param  int         $index    Zero-based field index within the schema.
	 * @param  SurveyField $field    The field whose label should be translated.
	 * @param  string      $locale   The current WordPress locale string.
	 * @return SurveyField
	 * @since  1.0.0
	 */
	private function translateField(
		int $surveyId,
		int $index,
		SurveyField $field,
		string $locale
	): SurveyField {
		$label = $field->getLabelRaw();

		if ( is_array( $label ) ) {
			return $field->withLabel( $this->resolveInlineLabel( $label, $locale ) );
		}

		if ( is_string( $label ) && $label !== '' ) {
			$name = $this->stringName( $surveyId, $index );

			if ( function_exists( 'icl_t' ) ) {
				$translated = call_user_func( 'icl_t', self::WPML_CONTEXT, $name, $label );
				if ( $translated !== $label ) {
					return $field->withLabel( $translated );
				}
			}

			if ( function_exists( 'pll__' ) ) {
				$translated = call_user_func( 'pll__', $label );
				if ( $translated !== $label ) {
					return $field->withLabel( $translated );
				}
			}
		}

		return $field;
	}

	/**
	 * Resolve a translated label from an inline locale-keyed map.
	 *
	 * Falls back from full locale (e.g. 'en_US') to two-letter language code
	 * ('en') and finally to the 'en' entry or the first available value.
	 *
	 * @param  array<string, string> $map    Locale or language code => label.
	 * @param  string                $locale Current WordPress locale.
	 * @return string
	 * @since  1.0.0
	 */
	private function resolveInlineLabel( array $map, string $locale ): string {
		if ( isset( $map[ $locale ] ) ) {
			return $map[ $locale ];
		}

		$lang = substr( $locale, 0, 2 );
		if ( isset( $map[ $lang ] ) ) {
			return $map[ $lang ];
		}

		return $map['en'] ?? ( ! empty( $map ) ? (string) array_values( $map )[0] : '' );
	}

	/**
	 * Build the unique string name used when registering and retrieving a
	 * field label translation with WPML or Polylang.
	 *
	 * @param  int $surveyId   Survey primary key.
	 * @param  int $fieldIndex Zero-based field index within the schema.
	 * @return string
	 * @since  1.0.0
	 */
	private function stringName( int $surveyId, int $fieldIndex ): string {
		return "allfeedback_survey_{$surveyId}_field_{$fieldIndex}_label";
	}
}
