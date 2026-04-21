# Analytics Tracking Design

## Overview

The `af_survey_sessions` table and REST endpoint (`POST /surveys/{id}/analytics/event`) are embed-method agnostic. The backend doesn't care how the survey was shown — it just receives events. The tracking logic (when to fire which event) is entirely a frontend concern and differs by embed method.

---

## Embed Methods

| Method | Description |
|--------|-------------|
| **Widget** | Floating trigger button + slide-up panel. User must click to open. |
| **Shortcode** | `[allfeedback id="5"]` dropped in post/page content. Form always visible. |
| **Gutenberg Block** | Drag-and-drop block in the editor. Form always visible on page load. |

---

## Event Mapping by Embed Method

### `viewed` — "the user saw the survey"

| Method | When to fire |
|--------|-------------|
| Widget | When the widget panel opens (user clicked the trigger button). |
| Shortcode / Block | When the form element scrolls into the viewport for the first time. Use `IntersectionObserver` with `threshold: 0.5` (at least half the form is visible). |

**Why not fire on page load for shortcode/block?** The form may be below the fold and the user never actually sees it. `IntersectionObserver` gives an accurate "was it actually seen" signal.

---

### `started` — "the user touched the first field"

| Method | When to fire |
|--------|-------------|
| Widget | First `handleChange` call in `SurveyForm`. |
| Shortcode / Block | Same — first `handleChange` call in `SurveyForm`. |

**This is already implemented correctly.** `SurveyForm.tsx` fires `started` on first field change as long as `sessionId` is passed in. No changes needed here for shortcode/block support.

---

### `heartbeat` — "the user is still active"

| Method | When to fire |
|--------|-------------|
| Widget | Every 15 s while `isOpen === true`. Cleared when widget closes. |
| Shortcode / Block | Every 15 s while the form is intersecting (visible in viewport). Stop when user navigates away or form leaves viewport. |

**Implementation:** In the shortcode/block entry component, start the interval inside the `IntersectionObserver` callback when `isIntersecting === true`. Clear it when `isIntersecting === false` or on component unmount.

---

### `abandoned` — "the user left without submitting"

| Method | When to fire |
|--------|-------------|
| Widget | X-button click (`handleClose`) if `!hasSubmittedRef.current`. |
| Shortcode / Block | `document.addEventListener('visibilitychange')` — fire when `document.visibilityState === 'hidden'` if session was `started` and not yet `submitted`. Also `window.addEventListener('pagehide')` as a fallback for mobile browsers that skip `visibilitychange`. |

**Important caveats for shortcode/block:**
- Only fire `abandoned` if `started` — a user who saw the form but never touched it is not an abandonment, it's just a view.
- Use `sendBeacon` instead of `fetch` for the `abandoned` event on page unload — regular `fetch` gets cancelled when the page unloads. `sendBeacon` is fire-and-forget and survives page teardown.

```typescript
// Use sendBeacon for page-unload abandonment (shortcode/block only)
const url = `${restUrl}surveys/${surveyId}/analytics/event`;
const data = JSON.stringify({ event: 'abandoned', session_id: sessionId });
navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
```

Note: `sendBeacon` does not send custom headers, so the WP Nonce (`X-WP-Nonce`) cannot be included. The `analytics/event` endpoint uses `publicPermission()` (no auth required), so this is safe — the nonce is not required for this endpoint.

---

### `submitted` — "the user completed the form"

| Method | When to fire |
|--------|-------------|
| Widget | Server-side in `SubmitController` after response is saved. `session_id` is sent in the submit POST body. |
| Shortcode / Block | Same — no frontend event needed. `SubmitController` handles it. |

`submitted` is always server-side. The frontend just needs to include `session_id` in the submit body, which `SurveyForm.tsx` already does.

---

## Session ID Lifecycle

```
Page load
  │
  ├─ Widget: sessionId = '' until panel opens
  │     └─ Panel opens → crypto.randomUUID() → fire 'viewed' → heartbeat starts
  │
  └─ Shortcode/Block: sessionId = '' until form enters viewport
        └─ IntersectionObserver fires → crypto.randomUUID() → fire 'viewed' → heartbeat starts
```

**One session per page load per survey.** The sessionId is stored in a `useRef` (not `useState`, not `sessionStorage`) so it:
- Persists across re-renders without causing them
- Resets on page reload (intentional — each page visit is a new session)
- Is scoped to the component instance (one survey = one session, even if two surveys appear on the same page)

---

## Implementation Checklist

### Free tier — Widget (current)
- [x] `trackEvent()` helper in `utils.ts`
- [x] `sessionId` generated in `Widget.tsx` on panel open
- [x] `viewed` fired on first open
- [x] `heartbeat` every 15 s while `isOpen`
- [x] `abandoned` fired on X-button close (if not submitted)
- [x] `sessionId` passed Widget → SurveyPanel → SurveyForm
- [x] `started` fired on first field change in `SurveyForm`
- [x] `session_id` included in submit POST body
- [x] `SubmitController` calls `markSubmitted()` server-side

### Future — Shortcode / Block
- [ ] Create `useAnalyticsSession(cfg, surveyId)` custom hook encapsulating session init, `IntersectionObserver`, heartbeat, and `visibilitychange` abandonment
- [ ] Use `sendBeacon` for page-unload `abandoned` event
- [ ] Wire hook into the shortcode/block entry component (equivalent of `Widget.tsx`)
- [ ] Pass `sessionId` from hook down to `SurveyForm` (same prop, no `SurveyForm` changes needed)

---

## Custom Hook Design (Future — Shortcode/Block)

```typescript
// resources/scripts/frontend/hooks/useAnalyticsSession.ts

export function useAnalyticsSession(
    cfg:      AllfbConfig,
    surveyId: number,
    formRef:  React.RefObject<HTMLElement>, // ref to the form's root element
): string {
    const sessionIdRef    = useRef('');
    const hasStartedRef   = useRef(false);  // passed back so SurveyForm can set it
    const hasSubmittedRef = useRef(false);

    // 1. IntersectionObserver — fires 'viewed' on first intersection
    useEffect(() => {
        if (!formRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || sessionIdRef.current !== '') return;
                const sid = crypto.randomUUID();
                sessionIdRef.current = sid;
                void trackEvent(cfg.restUrl, cfg.nonce, surveyId, 'viewed', sid);
            },
            { threshold: 0.5 }
        );
        observer.observe(formRef.current);
        return () => observer.disconnect();
    }, [cfg, surveyId, formRef]);

    // 2. Heartbeat while form is intersecting
    // ... (setInterval inside IntersectionObserver callback, cleared on !isIntersecting)

    // 3. Abandoned on page hide (only if started, not submitted)
    useEffect(() => {
        const onHide = () => {
            if (!sessionIdRef.current || !hasStartedRef.current || hasSubmittedRef.current) return;
            const url  = `${cfg.restUrl}surveys/${surveyId}/analytics/event`;
            const body = JSON.stringify({ event: 'abandoned', session_id: sessionIdRef.current });
            navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        };
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onHide);
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onHide);
        };
    }, [cfg, surveyId]);

    return sessionIdRef.current;
}
```

The widget's session logic in `Widget.tsx` could also be refactored to use this hook in the future, with the difference that "intersection" is replaced by "panel open" as the trigger for session init.
