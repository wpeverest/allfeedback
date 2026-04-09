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
        "targeting": null,
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
| `form_schema` | object | No | Builder structure (see schema below) |
| `settings` | object | No | Trigger/display/GDPR config |
| `targeting` | object | No | Page targeting rules |

**Minimal Postman body:**
```json
{
  "title": "My First Survey"
}
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
    "trigger_type": "time_delay",
    "delay_value": 3,
    "delay_unit": "seconds",
    "display_frequency": "once",
    "max_impressions": 1,
    "dismiss_behaviour": "hide",
    "gdpr_consent": false,
    "consent_label": "",
    "thankyou_message": "Thanks for your feedback!",
    "redirect_url": ""
  },
  "targeting": [
    { "type": "all", "value": [] }
  ]
}
```

**Response:** `201 Created` with the new survey object.

---

### GET /surveys/{id}

Return a single survey including full `form_schema`, `settings`, and `targeting`.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Example:** `GET /surveys/1`

**Response:** `200 OK` with the survey object.

---

### PUT /surveys/{id}

Update a survey. All fields are optional — only send what changed (autosave-friendly).

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Body (JSON) — all optional:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Survey title |
| `description` | string | HTML description |
| `form_schema` | object | Full builder structure |
| `settings` | object | Trigger/display/GDPR config |
| `targeting` | array | Page targeting rules |
| `status` | string | `draft` \| `published` \| `paused` \| `archived` |

**Example (autosave form_schema):**
```json
{
  "form_schema": {
    "version": "1.0",
    "sections": [...]
  }
}
```

**Response:** `200 OK` with the updated survey object.

---

### DELETE /surveys/{id}

Soft-delete (archive) or permanently delete a survey.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `force` | boolean | `false` | `true` = permanent delete; `false` = set status to `archived` |

**Example (soft delete):** `DELETE /surveys/1`

**Example (hard delete):** `DELETE /surveys/1?force=true`

**Response:**
```json
{
  "success": true,
  "data": { "deleted": true, "id": 1, "force": false }
}
```

---

### POST /surveys/{id}/duplicate

Copy a survey. The copy gets "Copy of " prepended to its title and starts as `draft` with `response_count = 0`.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Body:** none required.

**Response:** `201 Created` with the new survey object.

---

### POST /surveys/{id}/publish

Transition status from `draft` or `paused` → `published`.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Body:** none required.

**Response:** `200 OK` with the updated survey object (status = `published`).

---

### POST /surveys/{id}/pause

Transition status → `paused`.

**Permission:** `manage_options`

**URL param:** `id` (integer)

**Body:** none required.

**Response:** `200 OK` with the updated survey object (status = `paused`).

---

## Responses

### GET /surveys/{id}/responses

Return a paginated list of responses for a survey.

**Permission:** `manage_options`

**URL param:** `id` (integer, survey ID)

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `date_from` | string | — | Lower bound `Y-m-d` |
| `date_to` | string | — | Upper bound `Y-m-d` |

**Example:** `GET /surveys/1/responses?date_from=2026-04-01&date_to=2026-04-30`

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

**URL param:** `id` (integer, survey ID)

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nonce` | string | Yes | Value of `wp_create_nonce('allfeedback_submit')` |
| `response_data` | object | Yes | Field answers keyed by field ID |
| `score` | integer | No | Numeric score (0–10) for NPS/CSAT/CES |
| `page_url` | string | No | Page URL where the survey appeared |
| `device_type` | string | No | `desktop` \| `tablet` \| `mobile` |
| `consent_given` | boolean | No | GDPR consent flag |

**Notes:**
- The survey must have status `published`. Otherwise returns `403`.
- Duplicate detection uses HMAC-SHA256 of the visitor IP. A second submission from the same IP returns `409`.
- The nonce will be passed by `wp_localize_script` once `Assets.php` is built. For now, generate it manually or skip this endpoint in Postman.

**Example body:**
```json
{
  "nonce": "abc123",
  "response_data": { "fld_1": 8 },
  "score": 8,
  "page_url": "https://example.com/checkout",
  "device_type": "desktop",
  "consent_given": true
}
```

**Response:** `201 Created`
```json
{ "success": true, "data": { "id": 1 } }
```

---

## Allowed Field Types

Valid values for `field.type` inside `form_schema` (enforced by `SurveysController::validateFormSchema()`; source of truth is `Manager::FIELD_TYPES`):

| Type | Category | Builder `settings` keys |
|------|----------|------------------------|
| `nps` | Metric | `{}` |
| `csat` | Metric | `{}` |
| `ces` | Metric | `{}` |
| `short_text` | Text input | `{ "placeholder": "" }` |
| `long_text` | Text input | `{ "placeholder": "" }` |
| `radio` | Choice | `{ "options": ["…"] }` |
| `checkboxes` | Choice | `{ "options": ["…"] }` |
| `dropdown` | Choice | `{ "options": ["…"] }` |
| `star_rating` | Scale | `{}` |
| `scale` | Scale | `{}` |
| `email` | Misc | `{ "placeholder": "" }` |
| `yes_no` | Misc | `{}` |

Every field object must carry a `settings` key (an object, may be empty `{}`). The React builder always emits it; server-side validation does not currently require it but will in a future version.

---

## Postman Quick-Start Checklist

1. Log in to WordPress as admin in your browser.
2. Open browser console → type `__ALLFB_ADMIN__.nonce` → copy the value.
3. In Postman, set a collection variable `nonce` to that value.
4. Add a header `X-WP-Nonce: {{nonce}}` to all admin requests.
5. Set `Content-Type: application/json` on POST/PUT bodies.
6. Base URL: `https://your-site.local/wp-json/all-feedback/v1` (adjust to your local URL).

**Test sequence:**
1. `POST /surveys` with `{"title":"Test NPS"}` → note the returned `id`
2. `GET /surveys` → should show the new survey
3. `PUT /surveys/{id}` with a `form_schema` body
4. `POST /surveys/{id}/publish` → status becomes `published`
5. `GET /surveys/{id}` → confirm status and form_schema
6. `POST /surveys/{id}/duplicate` → new draft copy
7. `DELETE /surveys/{id}?force=false` → archived
8. `GET /surveys?status=archived` → confirm it appears
