# All Feedback

A modern, full-stack WordPress plugin starter by [Themegrill](https://themergill.com) — packed with a React 18 SPA, module system, feature flags, REST API scaffolding, and a PHP-DI container.

[![GitHub](https://img.shields.io/badge/GitHub-wpeverest%2Fthemegrill--boilerplate-181717?logo=github)](https://github.com/wpeverest/themegrill-boilerplate)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?logo=php)](https://php.net)
[![WordPress](https://img.shields.io/badge/WordPress-6.5+-21759B?logo=wordpress)](https://wordpress.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

---

## Requirements

| Requirement | Minimum |
|---|---|
| PHP | 8.2+ |
| WordPress | 6.5+ |
| Node.js | 20+ |
| pnpm | 10+ |
| Composer | 2+ |

---

## What's Included

| Layer | Technology |
|---|---|
| Admin SPA | React 18, TypeScript 5, TanStack Router, TanStack Query |
| Styling | Tailwind CSS v4, shadcn/ui |
| PHP DI | PHP-DI (autowired, compiled in production) |
| REST API | Versioned controllers, typed, DI-wired |
| Module system | Enable/disable features with dependency resolution |
| Feature flags | % rollout or user-ID targeting |
| Database | Migration runner with automatic execution |
| Build tool | Webpack via `@wordpress/scripts` + WebpackBar |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/wpeverest/themegrill-boilerplate.git my-plugin
cd my-plugin
```

### 2. Rename — replace all boilerplate identifiers

Run the interactive setup wizard. It replaces every identifier (PHP namespace, slug, prefix, display name, author, NPM package) across all source files in one step:

```bash
node bin/rename.js
# or
pnpm rename
```

The wizard will ask for:

| Prompt | Example |
|---|---|
| Plugin display name | `My Awesome Plugin` |
| Short WP menu name | `My Plugin` |
| Plugin slug (kebab-case) | `my-awesome-plugin` |
| PHP namespace (PascalCase) | `MyAwesomePlugin` |
| Author name | `My Company` |
| Author URL | `https://mycompany.com` |
| NPM scope | `my-vendor` |

> **Important:** The PHP namespace must be PascalCase with no hyphens (e.g. `MyPlugin`, not `my-plugin`). If you leave it blank the wizard derives it automatically from your slug.

After renaming, the wizard will also rename:
- `new-plugin.php` → `your-slug.php`
- `languages/new-plugin.pot` → `languages/your-slug.pot`

### 3. Install PHP dependencies

```bash
composer install
```

### 4. Install JS dependencies

```bash
pnpm install
```

### 5. Build assets

```bash
pnpm build
```

### 6. Activate the plugin

Place the plugin folder in `wp-content/plugins/` and activate it from the WordPress admin panel.

---

## Development

### Dev mode with HMR (Hot Module Replacement)

Starts the Webpack dev server with full HMR — React components update instantly in the browser without a page reload.

```bash
pnpm dev
```

- Webpack dev server runs at `http://localhost:8887` (default `@wordpress/scripts` port)
- CSS changes are injected without reload
- React state is preserved across JS updates
- Cross-origin headers are set automatically so WordPress admin can load assets from the dev server

> **Tip:** All Feedback enters development mode only when `ALLFEEDBACK_ENV` is explicitly set to `development` in `wp-config.php`.

### Dev mode without HMR (watch mode)

Rebuilds assets to `resources/build/` on every file change but does **not** start a dev server. WordPress serves the files directly from disk. The page refreshes manually.

```bash
pnpm watch
```

Use this when:
- You prefer a full page reload over HMR
- You are working on PHP and want to see both PHP and JS changes together
- You are debugging styles that behave differently from the dev server

### Production build

Compiles and minifies all assets into `resources/build/`. Always run this before committing or deploying.

```bash
pnpm build
```

Output files:

```
resources/build/
├── admin.js          # Admin SPA bundle
├── admin.css         # Admin styles (Tailwind + shadcn/ui)
├── admin-rtl.css     # RTL variant
├── admin.asset.php   # WP script dependencies + content hash
├── frontend.js       # Frontend bundle
├── frontend.css      # Frontend styles
└── frontend-rtl.css  # RTL variant
```

> The `resources/build/` directory is excluded from git. Run `pnpm build` after cloning before activating the plugin.

---

## Project Structure

```
themegrill-boilerplate/
├── bin/
│   └── rename.js                  # Setup wizard — run once after cloning
├── config/
│   ├── app.php                    # Plugin config (name, slug, prefix)
│   └── services.php               # PHP-DI service definitions
├── database/
│   └── migrations/                # SQL migration files (auto-run on admin_init)
├── languages/                     # Translation .pot file
├── resources/
│   ├── build/                     # Compiled assets (git-ignored)
│   ├── scripts/
│   │   ├── admin/                 # Admin SPA (React + TanStack)
│   │   │   ├── components/        # Shared UI components
│   │   │   ├── pages/             # Page components (one per route)
│   │   │   ├── queries/           # TanStack Query definitions
│   │   │   └── routes/            # TanStack Router route files
│   │   ├── components/            # Cross-context components
│   │   ├── frontend/              # Frontend entry point (vanilla TS)
│   │   └── styles/                # Global CSS / Tailwind tokens
│   └── styles/
│       ├── app.pcss               # Tailwind base + design tokens
│       ├── admin.pcss             # Admin-specific overrides
│       └── frontend.pcss          # Frontend-specific styles
├── src/
│   ├── Admin/                     # AdminServiceProvider (menus, assets)
│   ├── API/                       # REST API controllers + service provider
│   ├── Core/                      # Container, Constants, AppServiceProvider
│   ├── Frontend/                  # FrontendServiceProvider
│   ├── Infrastructure/Database/   # Migration runner
│   ├── Modules/                   # Module loader, registry, abstract module
│   ├── Support/                   # AssetManager, Config, Logger
│   └── Traits/                    # Hooks, Singleton
├── composer.json
├── package.json
├── webpack.config.js
└── new-plugin.php                 # Main plugin file (renamed by setup wizard)
```

---

## Adding an Admin Page

1. Create a route file in `resources/scripts/admin/routes/_app/`:

```tsx
// resources/scripts/admin/routes/_app/my-page.index.tsx
import { createFileRoute } from '@tanstack/react-router';
import MyPage from '@/admin/pages/my-page/MyPage';

export const Route = createFileRoute('/_app/my-page/')({
    component: MyPage,
});
```

2. Add a submenu entry in `src/Admin/AdminServiceProvider.php`:

```php
add_submenu_page(
    parent_slug: self::MENU_SLUG,
    page_title:  __( 'My Page', 'new-plugin' ),
    menu_title:  __( 'My Page', 'new-plugin' ),
    capability:  'manage_options',
    menu_slug:   self::MENU_SLUG . '#/my-page',
    callback:    $mountPoint,
);
```

3. Add a nav item in `resources/scripts/admin/components/GlobalHeader.tsx`.

---

## Adding a REST Endpoint

1. Create a controller in `src/API/Controllers/V1/`:

```php
namespace NewPlugin\API\Controllers\V1;

use WP_REST_Request;
use WP_REST_Response;

class MyController {
    public function register(): void {
        register_rest_route( 'new-plugin/v1', '/my-endpoint', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'index' ],
            'permission_callback' => fn() => current_user_can( 'manage_options' ),
        ] );
    }

    public function index( WP_REST_Request $request ): WP_REST_Response {
        return new WP_REST_Response( [ 'message' => 'Hello!' ] );
    }
}
```

2. Register it in `config/services.php` and wire it in `src/API/ApiServiceProvider.php`.

---

## Renaming Reference

All identifiers the setup wizard replaces:

| Identifier | Where used |
|---|---|
| `NewPlugin` | PHP namespace across all `src/` files |
| `new-plugin` | Text domain, menu slug, REST namespace, CSS classes, option keys |
| `new-plugin_` / `new-plugin-` | Option/transient prefix, asset handles |
| `NEW-PLUGIN-Admin-Root` | React DOM mount-point ID |
| `__NEW_PLUGIN_ADMIN__` | Injected JS global (nonce, version, etc.) |
| `New Plugin` | WP admin menu title, dashboard heading |
| `@my-vendor/new-plugin` | NPM package name |
| `Themegrill` / `themegrill.com` | Author name and URL in plugin header |

---

## Scripts Reference

| Command | Description |
|---|---|
| `pnpm rename` | Interactive setup wizard — run once after cloning |
| `pnpm dev` | Webpack dev server with HMR |
| `pnpm watch` | Watch mode — rebuilds on change, no dev server |
| `pnpm build` | Production build (minified) |
| `pnpm lint` | ESLint on all TypeScript files |
| `pnpm format` | Prettier format all TS/TSX files |
| `pnpm make-pot` | Generate translation `.pot` file |
| `pnpm release` | Gulp task — zips the plugin for distribution |

---

## License

GNU General Public License v3.0 — see [LICENSE](http://www.gnu.org/licenses/gpl-3.0.html).

---

Built with care by [Themegrill](https://themergill.com) · [GitHub](https://github.com/wpeverest/themegrill-boilerplate)
# allfeedback
