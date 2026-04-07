=== All Feedback ===
Contributors:      yourname
Tags:              boilerplate, plugin, starter
Requires at least: 6.5
Tested up to:      6.7
Requires PHP:      8.2
Stable tag:        1.0.0
License:           GPLv3 or later
License URI:       https://www.gnu.org/licenses/gpl-3.0.html

A ready-made WordPress plugin boilerplate by Themegrill.

== Description ==

A modern, full-stack WordPress plugin boilerplate built with:

* PHP 8.2+ with PSR-4 autoloading via Composer
* PHP-DI dependency injection container
* React 18 + TypeScript 5 admin SPA
* TanStack Router (hash-history SPA routing)
* TanStack Query (server-state management)
* TailwindCSS 4 + shadcn/ui components
* @wordpress/scripts webpack build pipeline
* Module system with dependency resolution
* Feature-flag system
* Settings manager
* Database migration runner
* REST API v1 scaffolding

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Run `composer install` inside the plugin folder.
3. Run `pnpm install && pnpm build` to compile assets.
4. Activate the plugin through **Plugins → Installed Plugins**.

== Frequently Asked Questions ==

= How do I add a new admin page? =

Register a submenu page in `AdminServiceProvider::registerMenus()` and add the
corresponding route file under `resources/scripts/admin/routes/`.

= How do I add a REST API endpoint? =

Create a controller in `src/API/Controllers/V1/`, then add it to the
`$controllers` array in `ApiServiceProvider::registerRoutes()` and bind it in
`config/services.php`.

= How do I add a module? =

Extend `AbstractModule`, set `$id`, `$name`, and `$description`, then register
it via the `rmb:modules:register` filter.

== Changelog ==

= 1.0.0 =
* Initial release.
