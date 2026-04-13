# API Reference

Base URL: `https://your-site.local/wp-json/all-feedback/v1`

All admin endpoints require a WordPress nonce. Pass it as the `X-WP-Nonce` header:
```
X-WP-Nonce: <value of wp_create_nonce('wp_rest')>
```
The admin SPA passes this automatically via `@wordpress/api-fetch`. For Postman, log in as admin first, then grab the nonce from `__ALLFB_ADMIN__.nonce` in the browser console.

Response envelope (all endpoints):
```json
{ "success": true, "data": { ... } }
```
Errors follow the WP_Error shape: `{ "code": "...", "message": "...", "data": { "status": 4xx } }`

---

## Surveys

### GET /surveys

Returns a paginated list of surveys.

**Permission:** `manage_options`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-based) |
| `per_page` | int | 20 | Items per page (max 100) |
| `search` | string | — | Title keyword filter |
| `status` | string | `any` | `draft` \| `published` \| `paused` \| `archived` \| `trashed` \| `any` |
| `orderby` | string | `created_at` | `id` \| `title` \| `status` \| `response_count` \| `created_at` \| `updated_at` |
| `order` | string | `DESC` | `ASC` \| `DESC` |

**Example response:**
```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "id": 1,
        "title": "Post-purchase NPS",
        "description": "",
        "form_schema": null,
        "settings": null,
        "status": "draft",
        "response_count": 0,
        "created_by": 1,
        "created_at": "2026-04-08 10:00:00",
        "updated_at": null
      }
    ],
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}
```

---

### POST /surveys

Create a new survey (always starts as `draft`).

**Permission:** `manage_options`

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Survey title (max 255 chars) |
| `description` | string | No | HTML description |
| `form_schema` | object | No | Builder structure (see Allowed Field Types) |
| `settings` | object | No | All survey configuration — see Settings Schema |
| `status` | string | No | `draft` (default) \| `published` \| `paused` \| `archived` |

**Minimal body:**
```json
{ "title": "My First Survey" }
```

**Full body example:**
```json
{
  "title": "Post-purchase NPS",
  "description": "Help us improve.",
  "form_schema": {
    "version": "1.0",
    "sections": [
      {
        "id": "sec_1",
        "title": "Section 1",
        "fields": [
          {
            "id": "fld_1",
            "type": "nps",
            "label": "How likely are you to recommend us?",
            "required": true,
            "settings": {}
          },
          {
            "id": "fld_2",
            "type": "short_text",
            "label": "Any comments?",
            "required": false,
            "settings": { "placeholder": "Tell us more…" }
          },
          {
            "id": "fld_3",
            "type": "radio",
            "label": "How did you hear about us?",
            "required": false,
            "settings": { "options": ["Search engine", "Friend", "Ad"] }
          }
        ]
      }
    ]
  },
  "settings": {
    "submit_label": "Submit",
    "next_label": "Next",
    "back_label": "Back",
    "user_state": "all",
    "target_pages": "all",
    "target_page_ids": [],
    "trigger_type": "time_delay",
    "delay_value": 3,
    "delay_unit": "seconds",
    "scroll_depth": 50,
    "display_frequency": "until_submit",
    "max_impressions": 3,
    "dismiss_wait_value": 3,
    "dismiss_wait_unit": "days"
  }
}
```

**Response:** `201 Created` with the new survey object.

---

### GET /surveys/{id}

Return a single survey including full `form_schema` and `settings`.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Response:** `200 OK` with the survey object.

---

### PUT /surveys/{id}

Update a survey. All fields optional — only send what changed (autosave-friendly).

**Permission:** `manage_options`

**Body (JSON) — all optional:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Survey title |
| `description` | string | HTML description |
| `form_schema` | object | Full builder structure |
| `settings` | object | Full settings object (see Settings Schema) |
| `status` | string | `draft` \| `published` \| `paused` \| `archived` \| `trashed` |

**Response:** `200 OK` with the updated survey object.

---

### DELETE /surveys/{id}/trash

Move a survey to the trash (`status → trashed`). The row is preserved in the database — responses remain intact.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Notes:**
- Returns `409 Conflict` if the survey is already trashed.
- To permanently remove a trashed survey, call `DELETE /surveys/{id}/delete`.

**Response:**
```json
{ "success": true, "data": { "trashed": true, "id": 1 } }
```

---

### DELETE /surveys/{id}/delete

Permanently delete a survey from the database. **Irreversible — all responses are also removed.**

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Notes:**
- Returns `409 Conflict` if the survey is **not** trashed. You must call `DELETE /surveys/{id}/trash` first.
- This two-step model prevents accidental permanent deletion of active surveys.

**Response:**
```json
{ "success": true, "data": { "deleted": true, "id": 1 } }
```

---

### POST /surveys/{id}/duplicate

Copy a survey. The copy gets "Copy of " prepended to its title and starts as `draft`.

**Permission:** `manage_options`

**Response:** `201 Created` with the new survey object.

---

### POST /surveys/{id}/publish

Transition status → `published`.

**Permission:** `manage_options`

**Response:** `200 OK` with the updated survey object.

---

### POST /surveys/{id}/pause

Transition status → `paused`.

**Permission:** `manage_options`

**Response:** `200 OK` with the updated survey object.

---

### DELETE /surveys/trash

Bulk-move multiple surveys to the trash. Surveys that are already trashed are silently skipped and reported in `skipped`.

**Permission:** `manage_options`

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | int[] | Yes | Array of survey IDs to trash (min 1 item) |

**Example body:**
```json
{ "ids": [2, 3, 5] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trashed": 2,
    "skipped": [3],
    "failed":  []
  }
}
```

| Key | Type | Description |
|-----|------|-------------|
| `trashed` | int | Number of surveys successfully moved to trash |
| `skipped` | int[] | IDs that were already trashed — no action taken |
| `failed` | int[] | IDs that could not be trashed (not found, or DB error) |

**Notes:**
- Returns `422` if `ids` is empty or missing.
- Always returns `200 OK` even when some IDs fail — inspect `failed` to detect partial errors.

---

### DELETE /surveys/delete

Bulk permanently delete multiple surveys. **Irreversible — all responses are also removed.**
Only surveys with status `trashed` are deleted — non-trashed surveys are silently skipped.

**Permission:** `manage_options`

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | int[] | Yes | Array of survey IDs to permanently delete (min 1 item) |

**Example body:**
```json
{ "ids": [2, 3, 5] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 2,
    "skipped": [5],
    "failed":  []
  }
}
```

| Key | Type | Description |
|-----|------|-------------|
| `deleted` | int | Number of surveys permanently removed |
| `skipped` | int[] | IDs that were **not** trashed — no action taken (use `DELETE /surveys/trash` first) |
| `failed` | int[] | IDs that could not be deleted (not found, or DB error) |

**Notes:**
- Returns `422` if `ids` is empty or missing.
- Always returns `200 OK` even when some IDs fail — inspect `failed` to detect partial errors.

---

## Responses

### GET /surveys/{id}/responses

Return a paginated list of responses for a survey.

**Permission:** `manage_options`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `date_from` | string | — | Lower bound `Y-m-d` |
| `date_to` | string | — | Upper bound `Y-m-d` |

**Example response:**
```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": 1,
        "survey_id": 1,
        "response_data": { "fld_1": 9 },
        "score": 9,
        "page_url": "https://example.com/shop",
        "device_type": "desktop",
        "user_id": null,
        "consent_given": false,
        "created_at": "2026-04-08 14:22:00"
      }
    ],
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}
```

---

### DELETE /surveys/{id}/responses/{rid}

Permanently delete a single response record.

**Permission:** `manage_options`

**URL params:**
- `id` — Survey ID
- `rid` — Response ID

**Notes:**
- Returns `404` if the response does not exist or does not belong to the given survey.
- Deletion is immediate and irreversible. The survey's `response_count` is **not** decremented (it is a cached approximate; recalculate via `GET /surveys/{id}/responses` `total` if an exact count is needed).

**Response:**
```json
{ "success": true, "data": { "deleted": true, "id": 42 } }
```

---

## Submission

### POST /surveys/{id}/submit

Submit a response from the public widget. No authentication required — a valid nonce is used instead.

**Controller:** `SubmitController` — intentionally separate from the admin `ResponsesController` to enforce a clear security boundary.

**Permission:** Public (nonce-gated)

**URL param:** `id` (integer) — survey being answered

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nonce` | string | Yes | `wp_create_nonce('allfeedback_submit')` — generated server-side, passed to the widget via `wp_localize_script` |
| `response_data` | object | Yes | Field answers keyed by field ID |
| `score` | integer | No | Numeric score 0–100 for NPS / CSAT / CES / star-rating fields |
| `page_url` | string | No | Full URL of the page where the survey was displayed (max 2083 chars) |
| `device_type` | string | No | `desktop` \| `tablet` \| `mobile` |
| `consent_given` | boolean | No | GDPR data-processing consent flag (default `false`) |

**Example body:**
```json
{
  "nonce": "abc123xyz",
  "response_data": {
    "fld_1": 9,
    "fld_2": "Really happy with the product.",
    "fld_3": "Search engine"
  },
  "score": 9,
  "page_url": "https://example.com/checkout/thank-you",
  "device_type": "desktop",
  "consent_given": true
}
```

**Success response** `201 Created`:
```json
{ "success": true, "data": { "id": 42 } }
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `403` | Invalid or expired nonce |
| `403` | Survey is not `published` (draft, paused, archived, trashed) |
| `403` | Submission blocked by `allfeedback_allow_response_submission` filter |
| `404` | Survey ID does not exist |
| `409` | A submission from this visitor's IP has already been recorded |
| `422` | `response_data` is empty or fails field validation |

**Duplicate detection:**
Each submission is keyed by an HMAC-SHA256 hash of the visitor's IP address (secret: WordPress `AUTH_KEY`). The raw IP is never stored. The same visitor cannot submit the same survey twice.

**What happens after `201`:**

1. `SubmitResponseService` fires `do_action('allfeedback:response:submitted', $response, $survey)`.
2. `NotificationServiceProvider` picks this up and dispatches two async email jobs via Action Scheduler:
   - **`new_response_alert`** → admin email to `notification_email` setting (falls back to `admin_email`).
   - **`thank_you_respondent`** → respondent email, only sent when `response_data` contains a field whose value is a valid email address.
3. `do_action('allfeedback_response_submitted', $responseId, $surveyId, $survey)` fires for third-party extensions.

Both email jobs only run when **Settings → Email Notifications** is enabled.

**Extensibility hooks:** see [Response Submission Hooks](#response-submission-hooks).

---

## Content Search

### GET /content-search

Search published pages and posts. Powers the "Select specific pages & posts" picker in the form builder's Settings tab.

**Permission:** `manage_options`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | `""` | Keyword to filter by title |
| `post_type` | string | `""` (all allowed) | Comma-separated post type slugs, e.g. `page,post` |
| `page` | int | 1 | Page number (search mode only) |
| `per_page` | int | 20 | Items per page (max 50, search mode only) |

**Two operating modes:**

**Initial load** (`search` is empty, `page = 1`) — runs one query per post type and returns the 5 most recently published items for each type. This gives the picker an immediately useful list when it first opens. Default: 5 pages + 5 posts = up to 10 items. Controlled by the `allfeedback_content_search_initial_per_type` filter.

**Search mode** (`search` has a value) — single query across all resolved post types, ordered alphabetically by title, fully paginated.

**Initial load example:** `GET /content-search`
```json
{
  "success": true,
  "data": {
    "items": [
      { "id": 5,  "title": "Shop",     "type": "page", "url": "https://example.com/shop/" },
      { "id": 2,  "title": "About Us", "type": "page", "url": "https://example.com/about/" },
      { "id": 12, "title": "Hello world", "type": "post", "url": "https://example.com/hello-world/" }
    ],
    "total": 3,
    "page": 1,
    "per_page": 5
  }
}
```

**Search example:** `GET /content-search?search=about&post_type=page`
```json
{
  "success": true,
  "data": {
    "items": [
      { "id": 2,  "title": "About Us",         "type": "page", "url": "https://example.com/about/" },
      { "id": 14, "title": "About Our Mission", "type": "page", "url": "https://example.com/mission/" }
    ],
    "total": 2,
    "page": 1,
    "per_page": 20
  }
}
```

**Notes:**
- Default allowed post types are `page` and `post`. Pro add-ons extend this via the `allfeedback_content_search_post_types` filter.
- Use the returned `id` values as `settings.target_page_ids` when saving a survey with `target_pages = "specific"`.
- Initial load uses `no_found_rows = true` — the `total` reflects items actually returned, not the full database count.

---

## Plugin Settings

Plugin-wide settings are stored in a single `wp_options` row (`_allfb_settings`) managed by `SettingsManager`.
Per-survey settings (trigger, targeting, GDPR, etc.) are separate — see [Survey Settings Schema](#survey-settings-schema) below.

### GET /settings

Return the current plugin-wide settings as a **flat key → value object**.

**Permission:** `manage_options`

**Response:**
```json
{
  "success": true,
  "data": {
    "widget_color":         "#6366F1",
    "widget_position":      "bottom-right",
    "widget_trigger":       "auto",
    "widget_delay":         0,
    "scroll_threshold":     50,
    "show_on_mobile":       true,
    "disable_user_details": false,
    "logging_enabled":      false,
    "log_level":            "error",
    "log_retention_days":   30,
    "delete_on_uninstall":  false,
    "allow_usage_tracking": true
  }
}
```

Every key is always present — missing stored values fall back to the defaults shown above.

---

### PATCH /settings

Persist one or more settings in a single atomic write. **Partial updates are fully supported** — send only the keys that changed.

**Permission:** `manage_options`

**Body (JSON) — all keys optional:**

#### Widget Appearance

| Key | Type | Default | Allowed values | Description |
|-----|------|---------|----------------|-------------|
| `widget_color` | string | `#6366F1` | Any hex string | Primary accent colour for the survey widget |
| `widget_position` | string | `bottom-right` | `bottom-right` · `bottom-left` · `side-tab` | Trigger button placement on the page |
| `widget_trigger` | string | `auto` | `auto` · `scroll` · `exit-intent` · `manual` | How the widget surfaces to visitors |
| `widget_delay` | integer | `0` | 0–3600 | Seconds before auto-showing the widget (`widget_trigger = auto` only) |
| `scroll_threshold` | integer | `50` | 0–100 | Page percentage scrolled before showing (`widget_trigger = scroll` only) |
| `show_on_mobile` | boolean | `true` | — | Show the widget on mobile viewports |

#### User Privacy

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `disable_user_details` | boolean | `false` | Disable storing the visitor's IP address and User-Agent on all surveys. Also disables duplicate submission detection. |

#### Logging

| Key | Type | Default | Allowed values | Description |
|-----|------|---------|----------------|-------------|
| `logging_enabled` | boolean | `false` | — | Master switch for plugin event logging |
| `log_level` | string | `error` | `error` · `warning` · `info` · `debug` | Minimum severity to record (`debug` is most verbose) |
| `log_retention_days` | integer | `30` | 1–365 | Days before log entries are auto-pruned |

#### Plugin Management

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `delete_on_uninstall` | boolean | `false` | Permanently delete all surveys, responses, and settings when the plugin is uninstalled. **Irreversible.** |
| `allow_usage_tracking` | boolean | `true` | Share anonymised usage statistics with AllFeedback HQ. No personal data is transmitted. |

**Minimal example — update widget color and position only:**
```json
{
  "widget_color":    "#10B981",
  "widget_position": "bottom-left"
}
```

**Full example:**
```json
{
  "widget_color":         "#10B981",
  "widget_position":      "bottom-left",
  "widget_trigger":       "scroll",
  "widget_delay":         0,
  "scroll_threshold":     60,
  "show_on_mobile":       true,
  "disable_user_details": false,
  "logging_enabled":      true,
  "log_level":            "warning",
  "log_retention_days":   14,
  "delete_on_uninstall":  false,
  "allow_usage_tracking": true
}
```

**Response:** `200 OK` — same flat settings object as GET /settings, reflecting the state **after** the update.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Empty body (no keys sent) |
| `422` | Invalid enum value (e.g. `widget_position: "top"`) |
| `422` | Integer out of range (e.g. `log_retention_days: 999`) |

**Notes:**
- Unknown keys are silently ignored — forward-compatible for pro add-ons.
- Invalid enum values are rejected by WP REST arg validation before reaching the service layer.
- The response always reflects the full merged settings (not just the keys you sent).

---

## Extensibility — Plugin Settings

### Add a new setting (pro add-on pattern)

**Step 1 — Extend the schema via filter:**
```php
add_filter( 'allfeedback_settings_schema', function ( array $schema ): array {
    $schema['my_pro_feature_enabled'] = [
        'type'        => 'boolean',
        'default'     => false,
        'description' => 'Enable the pro feature.',
    ];
    return $schema;
} );
```
This single filter automatically:
- Exposes the key in `GET /settings` response
- Adds WP REST arg validation on `PATCH /settings`
- Includes it in the JSON Schema at `/settings/schema`

**Step 2 — Persist the default** (add to `SettingsManager::DEFAULTS`):
If you control the plugin source, add the key there. For external add-ons, use `allfeedback:settings:updated` to react to changes.

### React to settings changes

```php
// Fires after any PATCH /settings write.
add_action( 'allfeedback:settings:updated', function ( array $settings ): void {
    // e.g. clear a cache, toggle a feature flag, sync to a CDN
    if ( $settings['logging_enabled'] ) {
        my_plugin_enable_logging( $settings['log_level'] );
    }
} );
```

### React to a full settings reset

```php
add_action( 'allfeedback:settings:reset', function (): void {
    // Settings have been wiped — all keys are now at their defaults.
} );
```

---

## Survey Settings Schema

All survey configuration is stored in the `settings` JSON column. The `settings` object is accepted and returned on every survey write/read endpoint.

All keys are **optional** — omit any key you do not need. Unknown keys are accepted without error (forward-compatible for pro add-ons).

Validated by `SurveysController::validateSettings()`. Each enum list is filterable for pro extensibility — see WordPress Filters below.

### Submit buttons

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `submit_label` | string | `"Submit"` | Label for the final submit button |
| `next_label` | string | `"Next"` | Label for the next-page button (multi-page surveys) |
| `back_label` | string | `"Back"` | Label for the back-page button |

### Targeting — user state

| Key | Type | Allowed | Default | Description |
|-----|------|---------|---------|-------------|
| `user_state` | string | `all` · `logged_in` · `logged_out` | `all` | Which visitors see the survey |

### Targeting — where to show

| Key | Type | Allowed | Default | Description |
|-----|------|---------|---------|-------------|
| `target_pages` | string | `all` · `specific` | `all` | Show on all pages, or only specified ones |
| `target_page_ids` | int[] | — | `[]` | WordPress page/post IDs (used when `target_pages = "specific"`). Retrieve IDs from `GET /content-search`. |

### Trigger and delay

| Key | Type | Allowed | Default | Description |
|-----|------|---------|---------|-------------|
| `trigger_type` | string | `immediate` · `time_delay` · `scroll_depth` | `immediate` | When the widget appears |
| `delay_value` | int ≥ 0 | — | `0` | Number of time units to wait (`time_delay` only) |
| `delay_unit` | string | `seconds` · `minutes` · `hours` | `seconds` | Unit for `delay_value` |
| `scroll_depth` | int 0–100 | — | `50` | Page percentage scrolled before showing (`scroll_depth` only) |

### How many times to show

| Key | Type | Allowed | Default | Description |
|-----|------|---------|---------|-------------|
| `display_frequency` | string | `once` · `until_submit` | `until_submit` | Show once ever, or until the visitor submits |
| `max_impressions` | int ≥ 0 | — | `3` | Max times shown to a non-submitting visitor (`until_submit` only) |
| `dismiss_wait_value` | int ≥ 0 | — | `3` | How long to wait before re-showing after dismissal |
| `dismiss_wait_unit` | string | `hours` · `days` · `weeks` | `days` | Unit for `dismiss_wait_value` |

### Default settings object

```json
{
  "submit_label": "Submit",
  "next_label": "Next",
  "back_label": "Back",
  "user_state": "all",
  "target_pages": "all",
  "target_page_ids": [],
  "trigger_type": "immediate",
  "delay_value": 0,
  "delay_unit": "seconds",
  "scroll_depth": 50,
  "display_frequency": "until_submit",
  "max_impressions": 3,
  "dismiss_wait_value": 3,
  "dismiss_wait_unit": "days"
}
```

---

## WordPress Filters

All filters follow the `allfeedback_` prefix convention. Pro add-ons use these hooks to extend the free tier without forking core files.

### Settings validation filters

Each filter receives the current allowed-values array and must return an array of strings.

| Filter | Default values | Purpose |
|--------|----------------|---------|
| `allfeedback_settings_allowed_trigger_types` | `immediate, time_delay, scroll_depth` | Register pro trigger types (e.g. `exit_intent`, `scroll_up`) |
| `allfeedback_settings_allowed_delay_units` | `seconds, minutes, hours` | Add new time units |
| `allfeedback_settings_allowed_display_frequencies` | `once, until_submit` | Add new frequency modes |
| `allfeedback_settings_allowed_dismiss_units` | `hours, days, weeks` | Add new dismiss-wait units |
| `allfeedback_settings_allowed_user_states` | `all, logged_in, logged_out` | Add new user state segments |
| `allfeedback_settings_allowed_target_pages` | `all, specific` | Add new page targeting modes |

**Example — add exit_intent trigger type in a pro plugin:**
```php
add_filter( 'allfeedback_settings_allowed_trigger_types', function ( array $types ): array {
    $types[] = 'exit_intent';
    return $types;
} );
```

### Settings save filter

```
allfeedback_settings_before_save( mixed $settings, WP_REST_Request $request ): mixed
```
Fires after validation, before the settings object is JSON-encoded and written to the database. Use to inject computed values or transform user input.

### Survey response filter

```
allfeedback_prepare_survey( array $prepared, object $survey ): array
```
Fires inside `prepareSurvey()` before the survey object is returned to the client. Use to append pro-only fields (analytics summaries, computed scores, feature flags) without touching the controller.

### Content search filters

```
allfeedback_content_search_post_types( string[] $postTypes ): string[]
```
Controls which post types are searchable. Default: `['page', 'post']`.

```
allfeedback_content_search_query_args( array $queryArgs, WP_REST_Request $request ): array
```
Full control over the `WP_Query` arguments. Use to add `meta_query`, `tax_query`, exclude specific IDs, or change sort order.

---

## Response Submission Hooks

These hooks fire during `POST /surveys/{id}/responses`. All are in `ResponsesController::store()`.

### Filters

#### `allfeedback_allow_response_submission`

```
allfeedback_allow_response_submission( bool $allowed, int $surveyId, object $survey, WP_REST_Request $request ): bool
```

Return `false` to reject the submission before it reaches the database. Designed for pro-tier blocking features such as reCAPTCHA verification, rate limiting, or geo-restrictions.

**Example — block submissions from a specific country (pro use case):**
```php
add_filter( 'allfeedback_allow_response_submission', function ( bool $allowed, int $surveyId, object $survey, WP_REST_Request $request ): bool {
    // e.g. check IP geolocation via a pro module
    return $allowed;
}, 10, 4 );
```

#### `allfeedback_response_data_before_save`

```
allfeedback_response_data_before_save( array $responseData, int $surveyId, object $survey ): array
```

Filters the `response_data` payload **after nonce/duplicate validation but before the domain service saves it**. Use to sanitise field values, strip disallowed HTML, normalise answers, or inject server-side computed fields.

**Example — strip tags from all text answers:**
```php
add_filter( 'allfeedback_response_data_before_save', function ( array $data ): array {
    return array_map( fn( $v ) => is_string( $v ) ? wp_strip_all_tags( $v ) : $v, $data );
} );
```

### Actions

#### `allfeedback_response_submitted` *(WordPress action)*

```
do_action( 'allfeedback_response_submitted', int $responseId, int $surveyId, object $survey )
```

Fires after a response has been **successfully persisted and the notification pipeline triggered**. Use for custom side-effects: CRM syncs, webhooks, third-party analytics, or loyalty point awards.

**Example — push to an external webhook:**
```php
add_action( 'allfeedback_response_submitted', function ( int $responseId, int $surveyId ): void {
    wp_remote_post( 'https://hooks.example.com/survey', [
        'body' => wp_json_encode( [ 'response_id' => $responseId, 'survey_id' => $surveyId ] ),
    ] );
}, 10, 2 );
```

#### `allfeedback:response:submitted` *(internal notification bus)*

```
do_action( 'allfeedback:response:submitted', Response $response, Survey $domainSurvey )
```

Fired **inside `SubmitResponseService::execute()`** immediately after the response is saved. The `NotificationServiceProvider` listens to this action and dispatches the `new_response_alert` and `thank_you_respondent` email jobs asynchronously via Action Scheduler.

**Email notifications are automatic** — as long as `Settings → Email Notifications` is enabled and the site's `admin_email` (or a custom `notification_email`) is configured.

> **Pro tip:** Use `allfeedback_response_submitted` (underscores) for lightweight third-party hooks. Reserve `allfeedback:response:submitted` (colons) for internal notification infrastructure.

---

## Allowed Field Types

Valid values for `field.type` inside `form_schema` (enforced by `SurveysController::validateFormSchema()`; source of truth is `Manager::FIELD_TYPES`):

| Type | Category | Builder `settings` keys |
|------|----------|------------------------|
| `nps` | Metric | `{}` |
| `csat` | Metric | `{}` |
| `ces` | Metric | `{}` |
| `short_text` | Text | `{ "placeholder": "" }` |
| `long_text` | Text | `{ "placeholder": "" }` |
| `radio` | Choice | `{ "options": ["…"] }` |
| `checkboxes` | Choice | `{ "options": ["…"] }` |
| `dropdown` | Choice | `{ "options": ["…"] }` |
| `star_rating` | Scale | `{}` |
| `scale` | Scale | `{}` |
| `email` | Misc | `{ "placeholder": "" }` |
| `yes_no` | Misc | `{}` |

---

## Postman Quick-Start Checklist

1. Log in to WordPress as admin in your browser.
2. Open browser console → type `__ALLFB_ADMIN__.nonce` → copy the value.
3. In Postman, set a collection variable `nonce` to that value.
4. Add header `X-WP-Nonce: {{nonce}}` to all admin requests.
5. Set `Content-Type: application/json` on POST/PUT bodies.
6. Base URL: `https://your-site.local/wp-json/all-feedback/v1`

**Test sequence:**
1. `POST /surveys` with `{"title":"Test NPS"}` → note the returned `id`
2. `GET /surveys` → confirm new survey appears
3. `PUT /surveys/{id}` with a `form_schema` and `settings` body
4. `POST /surveys/{id}/publish` → status becomes `published`
5. `GET /content-search?search=home` → verify pages/posts are returned
6. `PUT /surveys/{id}` with `{"settings":{"target_pages":"specific","target_page_ids":[2,5]}}` → target specific pages
7. `GET /surveys/{id}` → confirm `settings.target_page_ids` is saved
8. `POST /surveys/{id}/duplicate` → new draft copy
9. `DELETE /surveys/{id}/trash` → status becomes `trashed`
10. `DELETE /surveys/{id}/delete` → permanently removed (must be trashed first; returns 409 otherwise)
11. `DELETE /surveys/trash` with `{"ids":[2,3]}` → bulk trash; check `trashed`, `skipped`, `failed` in the response
12. `DELETE /surveys/delete` with `{"ids":[2,3]}` → bulk permanent delete (surveys must be trashed first)
