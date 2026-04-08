# All Feedback — Claude Reference

## Project Overview

WordPress plugin for NPS, CSAT, and CES feedback surveys. All data is stored locally in the WordPress database — no external accounts or third-party services required. Self-contained feedback management with a React admin SPA and a public-facing widget.

Main entry: `all-feedback.php`
Plugin bootstrap: `src/Plugin.php`

---

## Tech Stack

**PHP (Backend)**
- PHP 8.2+ strict mode, WordPress 6.5+
- Dependency injection: PHP-DI 7.0 (`config/services.php`)
- Database: WordPress `wpdb`; survey tables prefixed `wp_af_`

**JavaScript (Frontend)**
- React 18 + TypeScript (strict)
- State/data: TanStack Query v5, TanStack Form v1
- Routing: TanStack Router v1 (hash-based SPA)
- Styling: Tailwind CSS v4 + Radix UI / shadcn
- Build: `@wordpress/scripts` (Webpack), pnpm 10

---

## Key Directories

| Path | Purpose |
|------|---------|
| `src/` | PHP backend (PSR-4: `AllFeedback\`) |
| `src/Core/` | Plugin bootstrap, DI container, service providers |
| `src/API/Controllers/V1/` | REST controllers (`/all-feedback/v1/`) |
| `src/Survey/` | Survey table gateway (`Manager.php`) |
| `src/Application/` | Use-case services for the legacy Form domain |
| `src/Domain/` | Aggregate roots and repository interfaces (Form domain) |
| `src/Infrastructure/` | DB migrator and migration base class |
| `src/Modules/` | Plugin extension/add-on system |
| `config/` | `app.php` (identity/paths), `services.php` (DI bindings) |
| `database/migrations/` | Numbered migrations (`0001_*.php`) |
| `resources/scripts/admin/` | React admin SPA entry (`index.tsx`) |
| `resources/scripts/frontend/` | Public widget entry (`index.ts`) |
| `resources/build/` | Webpack output — do not edit |

---

## Database Tables (live as of session 2)

| Table | Purpose |
|-------|---------|
| `wp_af_surveys` | Survey definitions — title, form_schema JSON, settings JSON, targeting JSON, status, response_count |
| `wp_af_responses` | Individual submissions — response_data JSON, score, ip_hash, consent_given |

Managed by: `src/Survey/Manager.php` (table gateway)
Created by: `database/migrations/0001_CreateInitialTables.php`

---

## REST API (live as of session 2)

Base: `/wp-json/all-feedback/v1/`  
All write endpoints require `manage_options`. Submission endpoint requires a nonce only.  
Response envelope: `{ success: bool, data: mixed }`  
Full endpoint list with request/response shapes: **[`.claude/docs/api_reference.md`](.claude/docs/api_reference.md)**

---

## Build & Dev Commands

```bash
# Frontend
pnpm dev          # webpack watch + HMR
pnpm build        # production build
pnpm lint         # ESLint
pnpm make-pot     # regenerate translation POT

# PHP
composer install          # install deps
composer lint             # phpcs
composer lint:fix         # phpcbf auto-fix

# Release
pnpm release      # clean → build → POT → composer --no-dev → zip
```

> No test framework is configured yet.

---

## WordPress Integration Notes

- Admin SPA uses hash-based routing (`#/dashboard`, `#/forms`, etc.) for WP admin compatibility.
- Uses `@wordpress/api-fetch` for nonce-authenticated requests.
- Migrations run automatically on `admin_init` if pending; tracked in `wp_options` under `_allfb_migrations`.
- Activation/deactivation hooks wired in `src/Core/CoreServiceProvider.php`.
- Nonce for frontend widget submissions: action `allfeedback_submit`, passed via `wp_localize_script` (Assets class — not yet built).

---

## Running Migrations

Migrations run **automatically** on `admin_init` — visiting any WP admin page is enough.

To run manually via WP-CLI:
```bash
wp eval 'AllFeedback\Plugin::getInstance()->getContainer()->get(AllFeedback\Infrastructure\Database\Migrator::class)->run();' \
  --path="/home/wpeverest/Local Sites/user-registration/app/public"
```

To verify tables exist:
```bash
wp db query "SHOW TABLES LIKE 'wp_af%';" \
  --path="/home/wpeverest/Local Sites/user-registration/app/public"
```

**Always clear the PHP-DI compiled container cache after changing `config/services.php`:**
```bash
rm -rf /home/wpeverest/Local\ Sites/user-registration/app/public/wp-content/cache/allfeedback
```

---

## Known Bugs Fixed (session 2)

| Bug | Fix |
|-----|-----|
| `FormsController` crashes on boot — `FormRepository` interface not instantiable | Removed legacy controllers from `ApiServiceProvider`; they need a DB impl before re-adding |
| `adminPermission()` not callable — was `protected` | Changed permission helpers to `public` in `RestController.php` |
| `form_schema` type rejection — WP decodes JSON bodies as stdClass, not array | Widened arg types to `['object','array','string','null']`; added `normaliseJsonParam()` helper |

---

## What Still Needs Building (next sessions)

| Priority | Item | File(s) | Notes |
|----------|------|---------|-------|
| Next | Targeting engine | `src/Survey/Targeting.php` | MVP: all, omit_page, page, post, post_type rule types |
| Next | Frontend assets | `src/Survey/Assets.php` | Performance-gated enqueue — skip pages where no survey targets |
| Later | Cron / data retention | `src/Cron.php` | Scheduled cleanup of old response data |
| Later | Widget HTML | `src/Survey/Renderer.php` | Public-facing survey widget markup |
| Later | FormRepository impl | `src/Infrastructure/Form/WpdbFormRepository.php` | DDD Form domain has no DB implementation; add back FormsController once done |

---

## Additional Documentation

- **[Architectural Patterns](.claude/docs/architectural_patterns.md)** — DI, service providers, survey Manager pattern, REST conventions, React Query, module system
- **[API Reference](.claude/docs/api_reference.md)** — Every endpoint with method, URL, params, and example responses (Postman-ready)
