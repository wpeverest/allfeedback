=== All Feedback ===
Contributors:      themegrill
Tags:              feedback, surveys, nps, csat, ces
Requires at least: 6.5
Tested up to:      6.9
Requires PHP:      8.2
Stable tag:        1.0.0
License:           GPLv3 or later
License URI:       https://www.gnu.org/licenses/gpl-3.0.html

WordPress-native feedback survey plugin. Collect customer feedback without sending data to an external service.

== Description ==

Build beautiful feedback surveys with various question types, collect NPS scores, and better understand your audience — no external services required.

Features include:

* WordPress-native feedback survey management.
* Beautiful feedback widget.
* Custom trigger & targeting settings.
* Feedback email notifications.
* Detailed analytics.
* 7+ question types.
* NPS survey.
* CES survey. _(coming soon)_
* CSAT survey. _(coming soon)_


== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Run `composer install` inside the plugin folder.
3. Run `pnpm install && pnpm build` to compile assets.
4. Activate the plugin through **Plugins → Installed Plugins**.

== Source Code ==

This plugin's JavaScript and CSS assets are compiled from source. The unminified source code is publicly available at:

https://github.com/wpeverest/allfeedback

**Build requirements:** Node.js >= 20, pnpm 10.x

**Build steps:**

1. Clone the repository: `git clone https://github.com/wpeverest/allfeedback.git`
2. Install dependencies: `pnpm install`
3. Build assets: `pnpm build`
4. Install PHP dependencies: `composer install`

The `resources/scripts/` directory contains all uncompiled TypeScript/JavaScript source files. The `resources/styles/` directory contains all uncompiled CSS (PostCSS/Tailwind) source files.

== Frequently Asked Questions ==

= Is the data collected within the website? =

Yes, all the feedback data you collect, remains safe within your own website.

= Where can I contribute to the plugin? =

The plugin is open source and the unminified source code is available at: https://github.com/wpeverest/allfeedback. Feel free to contribute :)

= Where do I report bugs? =

You may reach out to us within the Forums here or can reach out to us via the live chat at: https://themegrill.com/support

== Changelog ==

= 1.0.0 =
* Initial release.
