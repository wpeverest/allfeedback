=== All Feedback ===
Contributors:      themegrill
Tags:              feedback, surveys, nps, csat, ces
Requires at least: 6.5
Tested up to:      6.7
Requires PHP:      8.2
Stable tag:        1.0.0
License:           GPLv3 or later
License URI:       https://www.gnu.org/licenses/gpl-3.0.html

WordPress-native NPS, CSAT, and CES feedback surveys stored in your own database.

== Description ==

All Feedback helps you collect customer feedback without sending data to an external SaaS.

Features include:

* WordPress-native survey management
* NPS, CSAT, and CES workflows
* React-based admin experience
* REST API controllers for admin and frontend flows
* Database migrations for plugin data
* Frontend assets for survey rendering

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Run `composer install` inside the plugin folder.
3. Run `pnpm install && pnpm build` to compile assets.
4. Activate the plugin through **Plugins → Installed Plugins**.

== Frequently Asked Questions ==

= How do I add a new REST API endpoint? =

Create a controller in `src/API/Controllers/V1/`, add it to the controller list
in `ApiServiceProvider::registerRoutes()`, and bind it in `config/services.php`.

= How do I register a module? =

Extend `AbstractModule`, set `$id`, `$name`, and `$description`, then register
it via the `allfeedback:modules:register` filter.

= How do I enable development mode? =

Define `ALLFEEDBACK_ENV` as `development` in `wp-config.php`.

== Changelog ==

= 1.0.0 =
* Initial release.
