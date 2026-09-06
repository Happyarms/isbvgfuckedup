# QA Validation Report

**Spec**: 019 — Replace full-page reload with incremental fetch-and-DOM-patch for 60-second refresh
**Date**: 2026-02-04T10:02:00+00:00
**QA Agent Session**: 1

---

## Summary

| Category | Status | Details |
|----------|--------|---------|
| Subtasks Complete | ✓ | 6/6 completed |
| Unit Tests | ✓ | 34/34 (client-patch) + 34/34 (transit-boxes-ui) passing |
| Integration Tests | ✓ | 27/27 (api.test.js) passing |
| Other Test Suites | ✓ | 19/19 (transit-boxes.test.js) passing |
| Browser / API Verification | ✓ | Live server verified: API JSON shape correct, HTML IDs present, client.js served |
| Database Verification | N/A | No database in this project |
| Third-Party API Validation | N/A | No third-party APIs used in changes |
| Security Review | ✓ | No eval(), no hardcoded secrets, no dangerous patterns |
| Pattern Compliance | ✓ | IIFE structure, function declarations, JSDoc, mirrors app.js patterns |
| Regression Check | ✓ | All 114 tests pass; no pre-existing tests broken |

**Total: 114 tests passing, 0 failing.**

---

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All existing integration tests continue to pass | ✓ | 27/27 api.test.js pass |
| New API fields (emoji, cssClass, transitBoxes) present in /api/status | ✓ | Live curl verified: all 8 fields in JSON response |
| Transit box count spans have correct id attributes in rendered HTML | ✓ | Live HTML verified: all 8 IDs (`{bus,ubahn,tram,sbahn}-{delayed,cancelled}-count`) present |
| client.js fetchAndPatch replaces window.location.reload() — countdown timer still works | ✓ | Diff confirms `tick()` calls `fetchAndPatch()` not `reload()`; `startTimer()` restarts after patch |
| New client-patch unit tests pass covering all DOM update paths | ✓ | 34/34 tests pass across 8 categories |
| Stale warning element toggled correctly (created/removed dynamically) | ✓ | Tests: creation when missing + stale=true, removal when present + stale=false, no duplication |
| Fallback to full reload on fetch error | ✓ | `.catch()` calls `window.location.reload()` |

---

## Detailed Verification

### Phase 1: Live API Verification

**GET /api/status** response (captured live):
```json
{
  "state": "FINE",
  "metrics": { "totalServices": 130, "delayedCount": 5, "cancelledCount": 6, ... },
  "transitBoxes": {
    "bus": { "delayed": 0, "cancelled": 1 },
    "ubahn": { "delayed": 1, "cancelled": 0 },
    "tram": { "delayed": 0, "cancelled": 0 },
    "sbahn": { "delayed": 2, "cancelled": 3 }
  },
  "message": "Nein, BVG läuft.",
  "emoji": "✅",
  "cssClass": "status-fine",
  "timestamp": 1770195669120,
  "stale": false
}
```
All 8 required fields present. Transit box counts match the rendered HTML exactly.

### Phase 2: Live HTML Verification

Key elements verified in rendered HTML:
- `<body class="status-fine">` — body class set correctly
- `<div class="status status-fine">` — .status element has both base class and dynamic state class
- `<span class="status-emoji">✅</span>` — emoji rendered
- All 8 transit box count spans have correct IDs: `bus-delayed-count`, `bus-cancelled-count`, `ubahn-delayed-count`, `ubahn-cancelled-count`, `tram-delayed-count`, `tram-cancelled-count`, `sbahn-delayed-count`, `sbahn-cancelled-count`
- Transit box values match API response exactly
- `.footer-info` present for stale warning insertion point
- `<script src="/js/client.js"></script>` loads client script
- No `.stale-warning` div present (data is fresh) — correct

### Phase 3: Code Review

#### routes/index.js
- **Change**: Added `transitBoxes`, `emoji`, `cssClass` to `res.json()` in `/api/status` handler
- **Assessment**: Clean and minimal. All three values are already available on `status` (from `poller.getStatus()`). No new logic, just exposing cached data. Additive-only change that cannot break existing clients.

#### index.pug
- **Change**: Added `#id` attribute to all 8 `span.count` elements using Pug shorthand syntax
- **Assessment**: Perfect. IDs exactly match the pattern expected by `patchDOM()` in client.js and the existing `updateTransitBoxes()` in app.js. Additive-only change.

#### client.js
- **Change**: `tick()` now calls `fetchAndPatch()` instead of `window.location.reload()`. Added `fetchAndPatch()` and `patchDOM()` functions.
- **Assessment**:
  - IIFE structure preserved ✓
  - Conventional function declarations (no arrow functions) ✓
  - JSDoc on all new functions ✓
  - `fetchAndPatch()` correctly chains: fetch → validate response.ok → parse JSON → patchDOM → startTimer. Error path: catch → reload ✓
  - Timer management: `clearInterval` in `tick()` before `fetchAndPatch()`, `startTimer()` after successful patch. No timer overlap possible ✓
  - `patchDOM()` updates all 7 DOM areas as specified ✓
  - Transit box logic mirrors `app.js::updateTransitBoxes()` exactly (same iterator, same `String(value || 0)`, same element existence guards) ✓
  - Stale warning: creates `div.stale-warning` with text "Daten sind veraltet." before `.footer-info`, removes if not stale ✓
  - Timestamp: formats with `new Date(timestamp).toLocaleString('de-DE')` matching server-side formatting ✓
  - Metric values: guarded with `metricValues.length >= 3 && data.metrics` for when metrics aren't rendered (totalServices === 0) ✓
  - If `patchDOM()` itself throws, the `.catch()` safety net falls back to reload ✓

#### client-patch.test.js
- **Change**: New test file with 34 unit tests
- **Assessment**:
  - Extraction technique (regex + `new Function`) correctly isolates `patchDOM` from the IIFE because all inner closing braces are at 4+ space indent while patchDOM's closing brace is uniquely at 2-space indent. The lazy `[\s\S]*?` captures correctly ✓
  - `new Function('data', body)` runs in global scope, matching the `global.document` injection pattern used by transit-boxes-ui.test.js ✓
  - DOM fixture in tests faithfully matches actual Pug template output (verified against live HTML) ✓
  - Covers all 8 required test areas: body class switching (4 states), emoji/text, metrics, transit boxes (8 counts), stale creation, stale removal, timestamp, missing DOM elements ✓
  - Edge cases covered: zero values, falsy values, missing transit types, successive calls, completely empty DOM ✓

#### api.test.js
- **Change**: Added `transitBoxes` to mock poller defaults, added 3 new tests, updated "complete JSON shape" test
- **Assessment**: New tests correctly verify emoji presence, cssClass matching, and full transitBoxes shape. Mock factory defaults are complete and correct ✓

### Phase 4: Security Review

- No `eval()` calls in src/ ✓
- No hardcoded secrets/API keys/passwords ✓
- No dangerous DOM manipulation patterns (only `textContent` and `className` assignments, `createElement`/`insertBefore`/`removeChild`) ✓
- CORS middleware is pre-existing and appropriately scoped to `/api` routes ✓

### Phase 5: Regression Check

Pre-existing test baseline confirmed:
- `tests/integration/api.test.js`: 27 tests (was 24, +3 new) — all pass ✓
- `tests/transit-boxes.test.js`: 19 tests — all pass (unchanged) ✓
- `tests/transit-boxes-ui.test.js`: 34 tests — all pass (unchanged) ✓
- `tests/client-patch.test.js`: 34 tests (new) — all pass ✓

Console.error outputs in transit-boxes-ui.test.js are pre-existing (testing invalid-input handling in app.js's `updateTransitBoxes()`), not introduced by this change.

---

## Minor Observations (Non-Blocking)

1. **Timer restart on error path**: The spec states "Always restart the timer after patch or fallback." The `.catch()` calls `window.location.reload()` without calling `startTimer()` first. This is functionally correct because `reload()` re-executes the entire script (including `startTimer()` in the init block). The only scenario where this would matter is if reload is somehow blocked (e.g., a `beforeunload` dialog), which is an extreme edge case. Not blocking.

2. **Metrics section not dynamically created**: If the initial page load has `totalServices === 0` (metrics section not rendered), and a subsequent API response has `totalServices > 0`, the metrics section will NOT appear because `patchDOM` only updates existing `.metric-value` elements. This is consistent with the spec's note ("metrics section may not exist if totalServices was 0 on initial load; guard with querySelectorAll length check") and is acceptable — on the next full page load, metrics will render if data is available.

---

## Issues Found

### Critical (Blocks Sign-off)
None.

### Major (Should Fix)
None.

### Minor (Nice to Fix)
None blocking. See "Minor Observations" above — both are acceptable design trade-offs.

---

## Verdict

**SIGN-OFF: APPROVED ✓**

**Reason**: All 7 acceptance criteria verified. All 114 tests pass. Live server verification confirms correct API shape and HTML structure. Code follows established patterns exactly. No security issues. No regressions. The implementation is clean, minimal, and production-ready.

**Next Steps**: Ready for merge to master.
