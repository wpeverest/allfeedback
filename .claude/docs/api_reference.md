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
| `status` | string | `any` | `draft` \| `published` \| `paused` \| `archived` \| `any` |
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
| `status` | string | `draft` \| `published` \| `paused` \| `archived` |

**Response:** `200 OK` with the updated survey object.

---

### DELETE /surveys/{id}

Soft-delete (archive) or permanently delete a survey.

**Permission:** `manage_options`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `force` | boolean | `false` | `true` = permanent delete |

**Response:**
```json
{ "success": true, "data": { "deleted": true, "id": 1, "force": false } }
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

### POST /surveys/{id}/responses

Submit a response from the public widget.

**Permission:** Public — no login required. A valid nonce is required instead.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nonce` | string | Yes | `wp_create_nonce('allfeedback_submit')` |
| `response_data` | object | Yes | Field answers keyed by field ID |
| `score` | integer | No | Numeric score (0–10) for NPS/CSAT/CES |
| `page_url` | string | No | Page URL where the survey appeared |
| `device_type` | string | No | `desktop` \| `tablet` \| `mobile` |
| `consent_given` | boolean | No | GDPR consent flag |

**Response:** `201 Created` — `{ "success": true, "data": { "id": 1 } }`

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
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 50) |

**Example:** `GET /content-search?search=about&post_type=page`

**Example response:**
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

---

## Settings Schema

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
9. `DELETE /surveys/{id}?force=false` → archived
