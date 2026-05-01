<?php
/**
 * Template loader.
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */

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
 *   1. Child theme:  child-theme/allfeedback/{template-name}
 *   2. Parent theme: theme/allfeedback/{template-name}
 *   3. Plugin:       plugin/templates/{template-name}
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */
class TemplateLoader {

	use Hooks;

	/**
	 * Absolute path to the plugin's templates directory.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $plugin_path;

	/**
	 * Sub-directory name used when searching active themes.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $template_path = 'allfeedback';

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->plugin_path = Constants::path( 'templates/' );
	}

	/**
	 * Locate the absolute path of a template file.
	 *
	 * Applies the filter `allfeedback:template:locate` so third-party code can
	 * override the resolved path.
	 *
	 * @param  string $template_name Template file name relative to the template root, e.g. 'survey/widget.php'.
	 * @return string               Absolute path to the located template, or empty string when not found.
	 * @since  1.0.0
	 */
	public function locateTemplate( string $template_name ): string {
		$template = locate_template(
			[
				trailingslashit( $this->template_path ) . $template_name,
			]
		);

		if ( ! $template ) {
			$plugin_template = $this->plugin_path . $template_name;
			if ( file_exists( $plugin_template ) ) {
				$template = $plugin_template;
			}
		}

		return $this->applyFilters( 'allfeedback:template:locate', $template, $template_name );
	}

	/**
	 * Locate and include a template file, extracting $args into the local scope.
	 *
	 * @param  string               $template_name Template file name relative to the template root.
	 * @param  array<string, mixed> $args         Variables to extract into the template scope.
	 * @return void
	 * @since  1.0.0
	 */
	public function loadTemplate( string $template_name, array $args = [] ): void {
		$template = $this->locateTemplate( $template_name );

		if ( ! $template ) {
			return;
		}

		$args = $this->applyFilters( 'allfeedback:template:args', $args, $template_name );

		$this->doAction( 'allfeedback:template:before', $template_name, $template, $args );
		$this->doAction( "allfeedback:template:before:{$template_name}", $template, $args );

		$this->includeTemplate( $template, $args );

		$this->doAction( 'allfeedback:template:after', $template_name, $template, $args );
		$this->doAction( "allfeedback:template:after:{$template_name}", $template, $args );
	}

	/**
	 * Load the first matching template from a slug/name pair (WordPress-style get_template_part).
	 *
	 * Tries "{$slug}-{$name}.php" first, then falls back to "{$slug}.php".
	 *
	 * @param  string               $slug Base slug, e.g. 'survey'.
	 * @param  string               $name Optional variant name, e.g. 'nps'.
	 * @param  array<string, mixed> $args Variables to extract into the template scope.
	 * @return void
	 * @since  1.0.0
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
	 * @param  string               $template_name Template file name relative to the template root.
	 * @param  array<string, mixed> $args         Variables to extract into the template scope.
	 * @return string                             Rendered HTML output.
	 * @since  1.0.0
	 */
	public function getTemplateContent( string $template_name, array $args = [] ): string {
		ob_start();
		$this->loadTemplate( $template_name, $args );
		return ob_get_clean();
	}

	/**
	 * Return true when a template file can be located for the given name.
	 *
	 * @param  string $template_name Template file name relative to the template root.
	 * @return bool
	 * @since  1.0.0
	 */
	public function templateExists( string $template_name ): bool {
		return ! empty( $this->locateTemplate( $template_name ) );
	}

	/**
	 * Override the theme sub-directory used during template location.
	 *
	 * @param  string $path Sub-directory name, e.g. 'my-child-dir'.
	 * @return void
	 * @since  1.0.0
	 */
	public function setTemplatePath( string $path ): void {
		$this->template_path = $path;
	}

	/**
	 * Return the active theme sub-directory name used during template location.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getTemplatePath(): string {
		return $this->template_path;
	}

	/**
	 * Iterate over a list of template names and include the first one found.
	 *
	 * @param  string[]             $templates Ordered list of template file names.
	 * @param  array<string, mixed> $args      Variables to extract into the template scope.
	 * @return void
	 * @since  1.0.0
	 */
	private function loadFirstTemplate( array $templates, array $args = [] ): void {
		foreach ( $templates as $template_name ) {
			$template = $this->locateTemplate( $template_name );

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
	 * @param  string               $template Absolute path to the template file.
	 * @param  array<string, mixed> $args     Variables to extract.
	 * @return void
	 * @since  1.0.0
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
