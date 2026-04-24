# AllFeedback REST API Reference

**Base URL:** `/wp-json/all-feedback/v1`  
**Response envelope:** `{ "success": true, "data": <payload> }` (all endpoints)  
**Auth:** All admin endpoints require `manage_options` (overridable via `allfeedback_required_capability` filter). The submit endpoint requires a WordPress nonce only.

---

## Surveys

### `GET /surveys`
Return a paginated, filterable list of surveys.

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-based) |
| `per_page` | int | 20 | Items per page (max 100) |
| `search` | string | — | Filter by title keyword |
| `status` | string | `any` | One of: `draft`, `published`, `archived`, `trashed`, `any` |
| `orderby` | string | `created_at` | Column to sort by |
| `order` | string | `DESC` | `ASC` or `DESC` |

**Response**
```json
{
  "surveys": [ { "id": 1, "title": "NPS Survey", "status": "published", ... } ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

---

### `POST /surveys`
Create a new survey (always starts as `draft`).

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Survey title |
| `description` | string | No | Optional description |
| `form_schema` | object/array | No | Field definitions |
| `settings` | object | No | Behavioural settings. Keys: `trigger_type`, `delay_value`, `delay_unit`, `scroll_depth`, `display_frequency`, `max_impressions`, `dismiss_wait_value`, `dismiss_wait_unit`, `user_state`, `target_pages`, `target_page_ids`, `progress_indicator`, `trigger_icon`. Advanced page-targeting rules stored as nested `settings.targeting` object. |
| `styling` | object | No | Visual appearance overrides — separate from behavioural settings. Keys: `widget_position` (`bottom-right` \| `bottom-left` \| `side-tab` \| `""`), `widget_icon` (string), `progress_indicator` (`dots` \| `numbers` \| `bar` \| `none`). Empty string on any key means inherit the global default. |

**Response — 201**
```json
{ "id": 5, "title": "My Survey", "status": "draft", "styling": null, ... }
```

---

### `GET /surveys/{id}`
Return a single survey including full `form_schema`, `settings`, and `styling`.  
Non-admins can only read `published` surveys (widget/shortcode use-case).

**Response**
```json
{
  "id": 1,
  "title": "NPS Survey",
  "status": "published",
  "form_schema": { "version": "1.0", "sections": [...] },
  "settings": {
    "trigger_type": "immediate", "delay_value": 0, "delay_unit": "seconds",
    "display_frequency": "until_submit", "max_impressions": 3,
    "user_state": "all", "target_pages": "all", "target_page_ids": [],
    "progress_indicator": "dots", "trigger_icon": "message",
    "targeting": { "mode": "all", "rules": [], "exclusions": [] }
  },
  "settings": { ..., "widget_label": "Feedback" },
  "styling": { "widget_position": "bottom-right", "widget_icon": "", "progress_indicator": "dots" }
}
```

---

### `PUT /surveys/{id}`
Apply a full or partial update to an existing survey. Called by the builder autosave on every change. Send only the fields that changed.

**Body** — same fields as `POST /surveys` plus `status` (enum: `draft`, `published`, `archived`, `trashed`).

**Response** — updated survey object. When `status: "published"` is included and other published surveys target overlapping pages, a `warnings` array is appended:

```json
{
  "id": 3, "title": "...", "status": "published",
  "warnings": [{
    "code": "targeting_conflict",
    "message": "2 published forms target the same pages. Visitors will only see the most recently published one.",
    "conflicting_surveys": [
      { "id": 1, "title": "NPS Survey",  "targeting_scope": "all_pages" },
      { "id": 2, "title": "Exit Survey", "targeting_scope": "specific_pages" }
    ],
    "can_revert_to_draft": true
  }]
}
```

---

### `DELETE /surveys/trash`
Bulk-move multiple surveys to the trash. Already-trashed surveys are skipped.

**Body**
```json
{ "ids": [1, 2, 3] }
```

**Response**
```json
{ "trashed": 2, "skipped": [3], "failed": [] }
```

---

### `DELETE /surveys/delete`
Bulk-permanently-delete multiple surveys. Only surveys with status `trashed` are deleted — others are skipped. Also permanently deletes all responses belonging to each deleted survey.

**Body**
```json
{ "ids": [1, 2] }
```

**Response**
```json
{ "deleted": 2, "skipped": [], "failed": [] }
```

---

### `DELETE /surveys/{id}/trash`
Move a single survey to the trash (sets status to `trashed`). Returns 409 if already trashed.

**Response**
```json
{ "trashed": true, "id": 1 }
```

---

### `DELETE /surveys/{id}/delete`
Permanently delete a single survey. The survey must be `trashed` first — returns 409 otherwise. Also permanently deletes all associated responses.

**Response**
```json
{ "deleted": true, "id": 1 }
```

---

### `POST /surveys/{id}/duplicate`
Create a copy of a survey with status reset to `draft`.

**Response — 201** — the new survey object.

---

### `POST /surveys/{id}/publish`
Transition a survey from any status to `published`.

**Response** — updated survey object. Same `warnings` shape as `PUT /surveys/{id}` applies when targeting conflicts are detected.

---

## Responses

> Responses from trashed surveys are never returned by any listing endpoint.

### `GET /responses`
Return a paginated list of responses across **all** surveys (excluding trashed surveys).

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `date_from` | string | — | Lower-bound date filter (Y-m-d) |
| `date_to` | string | — | Upper-bound date filter (Y-m-d) |

**Response**
```json
{
  "responses": [ { "id": 10, "survey_id": 1, "score": 9, ... } ],
  "total": 150,
  "page": 1,
  "per_page": 20
}
```

---

### `DELETE /responses/delete`
Bulk-permanently-delete multiple responses by ID across **any** survey.

**Body**
```json
{ "ids": [10, 11, 12] }
```

**Response**
```json
{ "deleted": 3, "failed": [] }
```

IDs that do not exist are counted as `failed`.

---

### `GET /responses/unread-count`
Return the total number of unread responses across all non-trashed surveys.

Used by the React admin to keep the WP sidebar badge in sync reactively (polled every 60 s).

**Response**
```json
{ "count": 8 }
```

---

### `POST /responses/mark-read`
Bulk mark multiple responses as read across any survey.

**Body**
```json
{ "ids": [10, 11, 12] }
```

**Response**
```json
{ "updated": 3, "failed": [] }
```

IDs that do not exist are counted as `failed`.

---

### `POST /responses/mark-unread`
Bulk mark multiple responses as unread across any survey.

**Body**
```json
{ "ids": [10, 11, 12] }
```

**Response**
```json
{ "updated": 3, "failed": [] }
```

---

### `GET /surveys/{id}/responses`
Return a paginated list of responses for a specific survey. Returns an empty list (not 404) if the survey is trashed.

**Query params** — same as `GET /responses`.

**Response** — same shape as `GET /responses`.

---

### `DELETE /surveys/{id}/responses/delete`
Bulk-permanently-delete multiple responses scoped to a specific survey. Responses that belong to a different survey are counted as `failed`.

**Body**
```json
{ "ids": [10, 11] }
```

**Response**
```json
{ "deleted": 2, "failed": [] }
```

---

### `GET /surveys/{id}/responses/{rid}`
Return a single response. Returns 404 if the response does not belong to the given survey.

**Response**
```json
{
  "id": 10,
  "survey_id": 1,
  "response_data": { "field_1": "Very satisfied" },
  "score": 9,
  "page_url": "https://example.com/pricing",
  "device_type": "desktop",
  "user_id": null,
  "is_read": false,
  "created_at": "2026-04-15 07:00:00"
}
```

---

### `PUT /surveys/{id}/responses/{rid}`
Patch `response_data` and/or `is_read` on an existing response.

**Body**

| Field | Type | Description |
|-------|------|-------------|
| `response_data` | object/null | Updated field answers |
| `is_read` | boolean | Mark response as read/unread |

**Response** — updated response object.

---

### `DELETE /surveys/{id}/responses/{rid}`
Permanently delete a single response. Returns 404 if the response does not belong to the given survey.

**Response**
```json
{ "deleted": true, "id": 10 }
```

---

## Analytics

### `POST /surveys/{id}/analytics/event`
Track a single session lifecycle event for a survey. **Public** — no `manage_options` required, but rate-limited to 60 events per session per 5-minute window (configurable via `allfeedback_analytics_rate_limit` filter).

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | One of: `viewed`, `started`, `abandoned`, `heartbeat` |
| `session_id` | string | Yes | Client-generated UUID v4 (max 36 chars) |
| `guest_id` | string | No | Persistent guest visitor token from `localStorage` (max 36 chars) |

**Response — 200**
```json
{ "success": true, "data": null }
```

---

### `GET /surveys/{id}/analytics`
Return aggregate session metrics for a single survey. Admin only.

**Response**
```json
{
  "total_views": 500,
  "total_starts": 200,
  "total_submissions": 150,
  "completion_rate": 75.00,
  "abandonment_rate": 25.00,
  "avg_completion_time": 120
}
```

> `completion_rate` and `abandonment_rate` are percentages (0–100). `avg_completion_time` is in seconds. All three fields are `null` when there are no started sessions yet.
> Abandonment includes explicit closes **and** sessions with `started_at` set but no `submitted_at` whose `last_active_at` is older than 30 minutes.

---

### `GET /analytics/overview`
Return the global "all forms" summary — stat cards with week-over-week deltas, a 30-day response chart, enriched recent responses, and device breakdown. Admin only. All aggregation runs in SQL.

**Response**
```json
{
  "stats": {
    "total_feedback":  { "value": 2847,  "change": 12.4 },
    "completion_rate": { "value": 87.3,  "change": 3.1  },
    "abandonment_rate": { "value": 12.7, "change": -2.4 },
    "avg_rating":      { "value": 4.4,   "change": 2.8  },
    "active_surveys":  { "value": 12, "new_this_week": 2, "change": 16.7 }
  },
  "chart": [
    { "date": "2026-03-25", "count": 52 },
    { "date": "2026-03-26", "count": 38 }
  ],
  "total_in_period": 3189,
  "recent_responses": [
    {
      "id": 42,
      "survey_id": 3,
      "survey_title": "Post-purchase NPS",
      "survey_type": "NPS",
      "score": 10,
      "response_text": "Fastest support I've ever gotten from a plugin. Refreshing.",
      "created_at": "2026-04-24 11:00:00"
    }
  ],
  "device_breakdown": {
    "desktop": 1500,
    "mobile": 900,
    "tablet": 400,
    "unknown": 47
  }
}
```

**Field notes**

| Field | Notes |
|-------|-------|
| `stats.*.change` | Week-over-week % change (this 7 days vs previous 7 days). `null` when baseline is zero or no data. |
| `stats.active_surveys.change` | % of active surveys that are new this week (not a WoW delta). |
| `stats.abandonment_rate.value` | % of started sessions that were abandoned (explicit closes + timed-out sessions > 30 min inactive). `null` when no started sessions exist. |
| `chart` | Always 30 entries (today − 29 → today). Days with no responses have `count: 0`. |
| `total_in_period` | Sum of all `chart[*].count` values. |
| `recent_responses[*].survey_type` | `"NPS"`, `"CSAT"`, `"CES"`, or `null` (plain text survey). Derived from the first primary field in `form_schema`. |
| `recent_responses[*].score` | Raw numeric score as stored (NPS: 0–10, CSAT: 1–5, etc). `null` if no scored field. |
| `device_breakdown` | Keys are `desktop`, `mobile`, `tablet`, or `unknown`. Only keys with at least one response are returned. |

---

### `GET /analytics/forms`
Return a paginated list of all forms with per-form session and response metrics. Admin only. Uses bulk SQL aggregation — **2 queries regardless of page size**, not N+1.

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-based) |
| `per_page` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter by status: `draft`, `published`, `archived`, `trashed` |

**Response**
```json
{
  "forms": [
    {
      "id": 1,
      "title": "Customer NPS Survey",
      "status": "published",
      "response_count": 150,
      "created_at": "2024-01-15 10:00:00",
      "updated_at": "2024-02-01 12:00:00",
      "session_metrics": {
        "total_views": 500,
        "total_starts": 200,
        "total_submissions": 150,
        "completion_rate": 75.00,
        "abandonment_rate": 25.00,
        "avg_completion_time": 120
      },
      "response_metrics": {
        "total_responses": 150,
        "average_score": 8.5,
        "nps_score": {
          "score": 65.00,
          "promoters": 100,
          "passives": 30,
          "detractors": 20
        }
      }
    }
  ],
  "pagination": {
    "total": 5,
    "total_pages": 1,
    "page": 1,
    "per_page": 20
  },
  "totals": {
    "total_forms": 5,
    "total_responses": 750,
    "total_views": 2500
  }
}
```

> `average_score` is `null` when no scored responses exist. `nps_score.score` is `0.0` when there are no responses. Session metric fields (`completion_rate`, `abandonment_rate`, `avg_completion_time`) are `null` when no sessions exist for that form.

---

### `GET /analytics/forms/{id}`
Return full analytics for a single form: survey metadata + session metrics + complete response metrics (including device breakdown and responses over time). Admin only.

**Response**
```json
{
  "survey": {
    "id": 1,
    "title": "Customer NPS Survey",
    "description": "Help us improve.",
    "status": "published",
    "response_count": 150,
    "created_at": "2024-01-15 10:00:00",
    "updated_at": "2024-02-01 12:00:00"
  },
  "session_metrics": {
    "total_views": 500,
    "total_starts": 200,
    "total_submissions": 150,
    "completion_rate": 75.00,
    "abandonment_rate": 25.00,
    "avg_completion_time": 120
  },
  "response_metrics": {
    "total_responses": 150,
    "average_score": 8.5,
    "nps_score": {
      "score": 65.00,
      "promoters": 100,
      "passives": 30,
      "detractors": 20
    },
    "response_rate_by_device": {
      "desktop": 100,
      "mobile": 40,
      "tablet": 10
    },
    "responses_over_time": {
      "2024-01-15": 10,
      "2024-01-16": 15,
      "2024-01-17": 8
    }
  }
}
```

**Error responses**

| Code | Reason |
|------|--------|
| 404 | Survey not found |

---

## Submit (Public)

### `POST /surveys/{id}/submit`
Accept a public widget submission. Requires a valid WordPress nonce (`action: allfeedback_submit`). No `manage_options` needed.

**Submission flow:**
1. Nonce verification
2. Survey existence + published-status guard (admins may submit to draft surveys as preview)
3. Three-tier duplicate detection (skipped if privacy mode or `manage_options`):
   - Logged-in user → `existsByUserId()`
   - Guest with `visitor_token` → `existsByGuestToken()`
   - Guest without token → `existsByIpHash()` (fallback)
4. `allfeedback_allow_response_submission` filter (pro blocking hooks)
5. `allfeedback_response_data_before_save` filter (data transformation)
6. Persist via `SubmitResponseService` → fires `allfeedback:response:submitted` event
7. `allfeedback_response_submitted` action for third-party side-effects

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nonce` | string | Yes | WordPress nonce for action `allfeedback_submit` |
| `response_data` | object | Yes | Field answers keyed by field ID |
| `score` | int | No | Numeric score (0–100) for NPS/CSAT/CES/star fields |
| `page_url` | string | No | URL where the survey was displayed (max 2083 chars) |
| `device_type` | string | No | `desktop`, `tablet`, or `mobile` |
| `consent_given` | boolean | No | GDPR data-processing consent flag (default: false) |
| `visitor_token` | string | No | UUID v4 generated in the browser (`localStorage` key `allfb_visitor_id`). Used for guest duplicate detection. Invalid/missing values fall back to IP hash. |

**Response — 201**
```json
{ "id": 42 }
```

**Error responses**

| Code | Reason |
|------|--------|
| 403 | Invalid nonce |
| 403 | Survey not published (and not admin preview) |
| 403 | Blocked by `allfeedback_allow_response_submission` filter |
| 409 | Duplicate submission (user_id, guest_token, or IP hash match) |
| 422 | Validation failure in response data |
| 404 | Survey not found |

---

## Dashboard

### `GET /dashboard/stats`
Return a high-level stats summary for the admin dashboard. Admin only.

**Response**
```json
{
  "stats": {
    "surveys": 12,
    "responses": 843,
    "unread": 5
  },
  "chart": [
    { "date": "2026-03-25", "count": 14 },
    { "date": "2026-03-26", "count": 9 }
  ],
  "recent": [
    {
      "id": 42,
      "survey_id": 3,
      "created_at": "2026-04-22 11:05:00",
      "summary": "Very satisfied"
    }
  ]
}
```

> `chart` always contains exactly 30 entries (today − 29 days → today), with `count: 0` for days with no responses. `recent` contains the 5 most recent responses across all surveys.

---

## Survey State

### `GET /surveys/{id}/state`
Return the display state for a survey for the current logged-in user. Used by the frontend widget to determine whether to show, suppress, or defer the survey. Requires the user to be logged in.

**Response**
```json
{
  "should_show": true,
  "reason": null
}
```

When suppressed, `should_show` is `false` and `reason` explains why:

```json
{
  "should_show": false,
  "reason": "already_submitted"
}
```

Possible `reason` values: `already_submitted`, `max_impressions_reached`, `dismissed_recently`, `targeting_mismatch`.

---

## Wizard

### `GET /wizard`
Return the current setup wizard state. Admin only.

**Response**
```json
{
  "status": "pending",
  "completed_steps": ["welcome", "settings"],
  "current_step": "create_survey"
}
```

---

### `PUT /wizard`
Update the wizard state (advance steps, mark complete). Admin only.

**Body**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `pending` or `completed` |
| `completed_steps` | array | List of completed step slugs |
| `current_step` | string | Active step slug |

**Response** — updated wizard state object.

---

## Settings

### `GET /settings`
Return the complete three-level settings object merged with defaults. Every page, section, and field is always present.

**Response**
```json
{
  "general":  { "widget":  { "color": "#6366F1", "position": "bottom-right" } },
  "advanced": {
    "privacy": { "disable_user_details": false },
    "logging": { "enabled": false, "level": "error", "retention_days": 30 },
    "plugin":  { "delete_on_uninstall": false, "allow_usage_tracking": true }
  }
}
```

---

### `PUT /settings` / `PATCH /settings`
Persist one or more pages/sections/fields. Partial updates are fully supported — send only what changed.

**Body example**
```json
{ "advanced": { "logging": { "enabled": true, "level": "debug" } } }
```

**Response** — complete settings object after the update.

---

## Content Search

### `GET /content-search`
Search published pages and posts. Powers the "Select specific pages & posts" targeting picker in the form builder.

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Keyword filter on post title |
| `post_type` | string | — | Comma-separated post type slugs (default: `page,post`) |
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 50) |

**Response**
```json
{
  "items": [ { "id": 5, "title": "Pricing", "type": "page", "url": "https://example.com/pricing" } ],
  "total": 12,
  "page": 1,
  "per_page": 20
}
```

---

## Logs

### `GET /logs`
Return a paginated list of log file metadata (no content).

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `orderby` | string | `date` | `date`, `name`, or `size` |
| `order` | string | `desc` | `asc` or `desc` |
| `search` | string | — | Filter by filename |

**Response**
```json
{
  "logs": [ { "id": "allfeedback-2026-04-15", "name": "allfeedback-2026-04-15.log", "size": "12.4 KB", "bytes": 12698, "entries": 87, "date": "2026-04-15T07:00:00+00:00" } ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

---

### `DELETE /logs/delete`
Bulk-delete multiple log files.

**Body**
```json
{ "ids": ["allfeedback-2026-04-13", "allfeedback-2026-04-14"] }
```

**Response**
```json
{ "deleted": ["allfeedback-2026-04-13"], "skipped": ["allfeedback-2026-04-14"], "failed": [] }
```

`skipped` = file not found. `failed` = file exists but could not be deleted.

---

### `GET /logs/{id}`
Return metadata and full content of a single log file. `id` is the filename stem without `.log`.

**Response**
```json
{
  "id": "allfeedback-2026-04-15",
  "name": "allfeedback-2026-04-15.log",
  "size": "12.4 KB",
  "bytes": 12698,
  "entries": 87,
  "date": "2026-04-15T07:00:00+00:00",
  "content": "[2026-04-15 07:00:00] INFO Survey created ..."
}
```

---

### `DELETE /logs/{id}`
Permanently delete a single log file.

**Response**
```json
{ "deleted": true, "id": "allfeedback-2026-04-15" }
```

---

## Endpoint Summary

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/surveys` | Admin | List surveys |
| POST | `/surveys` | Admin | Create survey |
| DELETE | `/surveys/trash` | Admin | Bulk trash surveys |
| DELETE | `/surveys/delete` | Admin | Bulk permanent delete surveys + responses |
| GET | `/surveys/{id}` | Public* | Get single survey |
| PUT | `/surveys/{id}` | Admin | Update survey |
| DELETE | `/surveys/{id}/trash` | Admin | Trash single survey |
| DELETE | `/surveys/{id}/delete` | Admin | Permanently delete survey + responses |
| POST | `/surveys/{id}/duplicate` | Admin | Duplicate survey |
| POST | `/surveys/{id}/publish` | Admin | Publish survey |
| POST | `/surveys/{id}/submit` | Nonce | Submit a response (public widget) |
| POST | `/surveys/{id}/analytics/event` | Public† | Track session lifecycle event |
| GET | `/surveys/{id}/analytics` | Admin | Session metrics for one survey |
| GET | `/surveys/{id}/state` | Auth | Display state for logged-in user |
| GET | `/analytics/overview` | Admin | Global stats, chart, recent responses, device breakdown |
| GET | `/analytics/forms` | Admin | All forms with session + response metrics |
| GET | `/analytics/forms/{id}` | Admin | Full analytics for a single form |
| GET | `/responses` | Admin | List all responses (all surveys) |
| GET | `/responses/unread-count` | Admin | Count unread responses (sidebar badge) |
| DELETE | `/responses/delete` | Admin | Bulk delete responses (any survey) |
| POST | `/responses/mark-read` | Admin | Bulk mark responses as read |
| POST | `/responses/mark-unread` | Admin | Bulk mark responses as unread |
| GET | `/surveys/{id}/responses` | Admin | List responses for one survey |
| DELETE | `/surveys/{id}/responses/delete` | Admin | Bulk delete responses for one survey |
| GET | `/surveys/{id}/responses/{rid}` | Admin | Get single response |
| PUT | `/surveys/{id}/responses/{rid}` | Admin | Patch response |
| DELETE | `/surveys/{id}/responses/{rid}` | Admin | Delete single response |
| GET | `/dashboard/stats` | Admin | High-level stats + 30-day chart |
| GET | `/wizard` | Admin | Get wizard state |
| PUT | `/wizard` | Admin | Update wizard state |
| GET | `/settings` | Admin | Get all settings |
| PUT/PATCH | `/settings` | Admin | Update settings |
| GET | `/content-search` | Admin | Search pages/posts for targeting |
| GET | `/logs` | Admin | List log files |
| DELETE | `/logs/delete` | Admin | Bulk delete log files |
| GET | `/logs/{id}` | Admin | Get single log file with content |
| DELETE | `/logs/{id}` | Admin | Delete single log file |

*`GET /surveys/{id}` — admins see all statuses; non-admins see only `published` surveys.  
†`POST /surveys/{id}/analytics/event` — public but rate-limited to 60 events per session per 5-minute window.
