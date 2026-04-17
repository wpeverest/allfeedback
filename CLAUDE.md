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
| `src/CLI/` | WP-CLI command classes |
| `src/Survey/` | Survey table gateway (`Manager.php`) |
| `src/Application/` | Use-case services for the legacy Form domain |
| `src/Domain/` | Aggregate roots and repository interfaces (Form domain) |
| `src/Infrastructure/` | DB migrator and migration base class |
| `src/Modules/` | Plugin extension/add-on system |
| `config/` | `app.php` (identity/paths), `services.php` (DI bindings) |
| `database/migrations/` | Numbered migrations (`0001_*.php`) |
| `resources/scripts/admin/` | React admin SPA entry (`index.tsx`) |
| `resources/scripts/frontend/` | Public widget entry (`index.tsx`) |
| `resources/scripts/blocks/` | Gutenberg blocks — each block is a self-contained folder with `block.json`, `Edit.tsx`, `index.ts` |
| `resources/build/` | Webpack output — do not edit |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `wp_af_surveys` | Survey definitions — title, form_schema JSON, settings JSON, targeting JSON, status, response_count |
| `wp_af_responses` | Individual submissions — response_data JSON, score, ip_hash, ip_address, is_read, consent_given |
| `wp_af_migrations` | Migration tracking — name, batch number, ran_at (authoritative; replaces old wp_options approach) |

Managed by: `src/Survey/Manager.php` (table gateway)
Created by: `database/migrations/0001_CreateInitialTables.php`

**Response table indexes** (as of migration 0005):

| Index | Columns | Purpose |
|-------|---------|---------|
| `survey_id` | `(survey_id)` | Base survey filter |
| `idx_survey_created` | `(survey_id, created_at)` | Analytics, response listing |
| `idx_survey_unread` | `(survey_id, is_read)` | Unread badge count |
| `idx_ip_survey_created` | `(ip_hash, survey_id, created_at)` | Duplicate IP detection with time window |

---

## REST API (live as of session 3)

Base: `/wp-json/all-feedback/v1/`  
All write endpoints require `manage_options`. Submission endpoint requires a nonce only.  
Response envelope: `{ success: bool, data: mixed }`  
Full endpoint list with request/response shapes: **[`.claude/docs/api_reference.md`](.claude/docs/api_reference.md)**

Form builder endpoints (all fully implemented):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/surveys` | Create new survey (always `draft`) |
| `GET` | `/surveys/{id}` | Load survey for editing |
| `PUT` | `/surveys/{id}` | Autosave / save as draft |
| `POST` | `/surveys/{id}/publish` | Transition to `published` |

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
- Migrations run automatically on `admin_init` if pending; tracked in `wp_af_migrations` DB table (batch + ran_at).
- Activation/deactivation hooks wired in `src/Core/CoreServiceProvider.php`.
- Nonce for frontend widget submissions: action `allfeedback_submit`, passed via `wp_localize_script` (Assets class — not yet built).

---

## Running Migrations

Migrations run **automatically** on `admin_init` — visiting any WP admin page is enough.

### WP-CLI commands (preferred in development)

Open the LocalWP site shell ("Open Site Shell") and use:

```bash
# Run all pending migrations
wp allfeedback migrate

# Show status of every migration (name, ran, batch, ran_at)
wp allfeedback migrate status

# Roll back the last batch
wp allfeedback migrate rollback

# Roll back last 2 batches
wp allfeedback migrate rollback --step=2

# Roll back ALL migrations (drops all plugin tables)
wp allfeedback migrate reset

# Reset then re-run all migrations (fresh start)
wp allfeedback migrate refresh
```

CLI commands are registered in `src/CLI/MigrateCommand.php` and wired up in `src/Plugin.php::registerCliCommands()`.

### Tables not created? (common in development)

**Option 1 — WP-CLI (fastest)**
```bash
wp allfeedback migrate
```

**Option 2 — Reactivate the plugin**
WP Admin → Plugins → Deactivate "All Feedback" → Activate.
This fires the activation hook which calls `onActivation()` → `migrator->run()` directly.

**Option 3 — Adminer / phpMyAdmin (raw SQL fallback)**
Open LocalWP → Database → Adminer and run the CREATE TABLE statements from `database/migrations/`.

### Verify tables exist
```bash
wp db query "SHOW TABLES LIKE 'wp_af%';"
```
Expected: `wp_af_migrations`, `wp_af_responses`, `wp_af_surveys`.

**Always clear the PHP-DI compiled container cache after changing `config/services.php`:**
```bash
rm -rf /home/wpeverest/Local\ Sites/user-registration/app/public/wp-content/cache/allfeedback
```

### Migration system internals

- Migration files: `database/migrations/NNNN_ClassName.php` (numeric prefix sets run order)
- Tracking table: `wp_af_migrations` — columns: `id`, `name`, `batch`, `ran_at`
- Batch numbers group migrations run together, enabling targeted rollback with `--step`
- On first boot after upgrade from the old system, any names in the legacy `_allfb_migrations` wp_options entry are automatically imported and the option is deleted
- Migrator class: `src/Infrastructure/Database/Migrator.php`
- Migration base class: `src/Infrastructure/Database/Migration.php`

---

## Known Bugs Fixed

**Session 2**

| Bug | Fix |
|-----|-----|
| `FormsController` crashes on boot — `FormRepository` interface not instantiable | Removed legacy controllers from `ApiServiceProvider`; they need a DB impl before re-adding |
| `adminPermission()` not callable — was `protected` | Changed permission helpers to `public` in `RestController.php` |
| `form_schema` type rejection — WP decodes JSON bodies as stdClass, not array | Widened arg types to `['object','array','string','null']`; added `normaliseJsonParam()` helper |

**Session 3**

| Bug | Fix |
|-----|-----|
| `Manager::FIELD_TYPES` used old names (`text`, `textarea`, `checkbox`) — every form builder save was rejected with 422 | Updated to match React builder names: `short_text`, `long_text`, `checkboxes`; added `scale` which was missing entirely |
| `SurveysController::update()` called `prepareSurvey()` on potentially-null re-fetch result | Added null guard; returns 500 if row unexpectedly missing after update |
| `SurveysController::duplicate()` same null gap on post-insert re-fetch | Added null guard with 500 error response |
| `SurveysController::transitionStatus()` (used by `publish()`) same null gap | Added null guard with 500 error response |

---

## What Still Needs Building (next sessions)

| Priority | Item | File(s) | Notes |
|----------|------|---------|-------|
| Next | Targeting engine | `src/Survey/Targeting.php` | MVP: all, omit_page, page, post, post_type rule types |
| Next | Frontend assets | `src/Survey/Assets.php` | Performance-gated enqueue — skip pages where no survey targets |
| Later | Cron / data retention | `src/Cron.php` | Scheduled cleanup of old response data |
| Later | Widget HTML | `src/Survey/Renderer.php` | Public-facing survey widget markup |
| Later | FormRepository impl | `src/Infrastructure/Form/WpdbFormRepository.php` | DDD Form domain has no DB implementation; add back FormsController once done |

**Form builder API** — ✅ Complete as of session 3. All four endpoints (create, load, autosave, publish) are implemented and validated.

---

## Additional Documentation

- **[Architectural Patterns](.claude/docs/architectural_patterns.md)** — DI, service providers, survey Manager pattern, REST conventions, React Query, module system
- **[API Reference](.claude/docs/api_reference.md)** — Every endpoint with method, URL, params, and example responses (Postman-ready)
