<?php

declare(strict_types=1);

namespace AllFeedback\Support;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;
use AllFeedback\Traits\Hooks;

/**
 * Class TemplateLoader
 *
 * Resolves and renders template files with theme-override support.
 *
 * Search order for each template name:
 *   1. Child theme:  child-theme/all-feedback/{template-name}
 *   2. Parent theme: theme/all-feedback/{template-name}
 *   3. Plugin:       plugin/templates/{template-name}
 *
 * @since 1.0.0
 */
class TemplateLoader {

	use Hooks;

	/**
	 * Absolute path to the plugin's templates directory.
	 *
	 * @since 1.0.0
	 */
	private string $pluginPath;

	/**
	 * Sub-directory name used when searching active themes.
	 *
	 * @since 1.0.0
	 */
	private string $templatePath = 'all-feedback';

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->pluginPath = Constants::path( 'templates/' );
	}

	/**
	 * Locate the absolute path of a template file.
	 *
	 * Applies the filter `allfeedback:template:locate` so third-party code can
	 * override the resolved path.
	 *
	 * @param  string $templateName Template file name relative to the template root, e.g. 'survey/widget.php'.
	 * @return string               Absolute path to the located template, or empty string when not found.
	 * @since  1.0.0
	 */
	public function locateTemplate( string $templateName ): string {
		$template = locate_template(
			[
				trailingslashit( $this->templatePath ) . $templateName,
			]
		);

		if ( ! $template ) {
			$pluginTemplate = $this->pluginPath . $templateName;
			if ( file_exists( $pluginTemplate ) ) {
				$template = $pluginTemplate;
			}
		}

		return $this->applyFilters( 'allfeedback:template:locate', $template, $templateName );
	}

	/**
	 * Locate and include a template file, extracting $args into the local scope.
	 *
	 * @param string               $templateName Template file name relative to the template root.
	 * @param array<string, mixed> $args         Variables to extract into the template scope.
	 * @since 1.0.0
	 */
	public function loadTemplate( string $templateName, array $args = [] ): void {
		$template = $this->locateTemplate( $templateName );

		if ( ! $template ) {
			return;
		}

		$args = $this->applyFilters( 'allfeedback:template:args', $args, $templateName );

		$this->doAction( 'allfeedback:template:before', $templateName, $template, $args );
		$this->doAction( "allfeedback:template:before:{$templateName}", $template, $args );

		$this->includeTemplate( $template, $args );

		$this->doAction( 'allfeedback:template:after', $templateName, $template, $args );
		$this->doAction( "allfeedback:template:after:{$templateName}", $template, $args );
	}

	/**
	 * Load the first matching template from a slug/name pair (WordPress-style get_template_part).
	 *
	 * Tries "{$slug}-{$name}.php" first, then falls back to "{$slug}.php".
	 *
	 * @param string               $slug Base slug, e.g. 'survey'.
	 * @param string               $name Optional variant name, e.g. 'nps'.
	 * @param array<string, mixed> $args Variables to extract into the template scope.
	 * @since 1.0.0
	 */
	public function getTemplatePart( string $slug, string $name = '', array $args = [] ): void {
		$templates = [];
		if ( $name ) {
			$templates[] = "{$slug}-{$name}.php";
		}
		$templates[] = "{$slug}.php";
		$this->loadFirstTemplate( $templates, $args );
	}

	/**
	 * Capture and return the output of a template as a string.
	 *
	 * @param  string               $templateName Template file name relative to the template root.
	 * @param  array<string, mixed> $args         Variables to extract into the template scope.
	 * @return string                             Rendered HTML output.
	 * @since  1.0.0
	 */
	public function getTemplateContent( string $templateName, array $args = [] ): string {
		ob_start();
		$this->loadTemplate( $templateName, $args );
		return ob_get_clean();
	}

	/**
	 * Return true when a template file can be located for the given name.
	 *
	 * @param  string $templateName Template file name relative to the template root.
	 * @return bool
	 * @since  1.0.0
	 */
	public function templateExists( string $templateName ): bool {
		return ! empty( $this->locateTemplate( $templateName ) );
	}

	/**
	 * Override the theme sub-directory used during template location.
	 *
	 * @param string $path Sub-directory name, e.g. 'my-child-dir'.
	 * @since 1.0.0
	 */
	public function setTemplatePath( string $path ): void {
		$this->templatePath = $path;
	}

	/**
	 * Return the active theme sub-directory name used during template location.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getTemplatePath(): string {
		return $this->templatePath;
	}

	/**
	 * Iterate over a list of template names and include the first one found.
	 *
	 * @param string[]             $templates    Ordered list of template file names.
	 * @param array<string, mixed> $args         Variables to extract into the template scope.
	 * @since 1.0.0
	 */
	private function loadFirstTemplate( array $templates, array $args = [] ): void {
		foreach ( $templates as $templateName ) {
			$template = $this->locateTemplate( $templateName );

			if ( $template ) {
				$this->includeTemplate( $template, $args );
				return;
			}
		}
	}

	/**
	 * Include a template file with variables extracted into its local scope.
	 *
	 * The closure isolates the extraction so that variables from this class do
	 * not leak into template scope.
	 *
	 * @param string               $template Absolute path to the template file.
	 * @param array<string, mixed> $args     Variables to extract.
	 * @since 1.0.0
	 */
	private function includeTemplate( string $template, array $args = [] ): void {
		$render = static function ( string $template, array $args ): void {
			foreach ( $args as $key => $value ) {
				$$key = $value;
			}
			include $template;
		};
		$render( $template, $args );
	}
}
