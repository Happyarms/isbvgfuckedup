# Specification: Separate Status Display for Buses and Trains

## Overview

Implement independent status tracking and display for two transport categories: **Buses** and **Trains** (U-Bahn/subway, S-Bahn/suburban, tram). Currently, the app shows a single unified status for all transport types. This feature will allow users to quickly identify which transport mode is affected by disruptions, improving information clarity when only buses or only rail services are experiencing issues.

## Workflow Type

**Type**: Feature

**Rationale**: This is a new user-facing feature that adds category-based filtering and duplicate UI display to existing functionality. It requires modifications to data processing logic, UI structure, and styling, but does not change the core architecture or introduce new external dependencies.

## Task Scope

### Services Involved
- **Static Web App** (single-page application) - Primary implementation target

### This Task Will:
- [x] Filter departure data by `line.product` field to separate buses from trains
- [x] Create separate analysis results for each transport category
- [x] Add dual status display blocks in the UI (buses and trains)
- [x] Display independent metrics (delays, cancellations) per category
- [x] Adjust layout to accommodate side-by-side or stacked status blocks
- [x] Handle edge cases (empty categories, null line objects)

### Out of Scope:
- Adding new stations to monitor
- Changing delay thresholds or status calculation logic
- Adding more granular transport type categories (e.g., separate S-Bahn from U-Bahn)
- Backend API changes (app is 100% client-side)
- Creating separate refresh intervals per category

## Service Context

### Static Web App

**Tech Stack:**
- Language: Vanilla JavaScript (ES5 syntax)
- Frontend: HTML5, CSS3 (custom properties, flexbox)
- API: VBB Transport REST API v6
- Deployment: Static files served via nginx

**Key directories:**
- `/` - Root contains `index.html`
- `/js/` - Contains `app.js` (all application logic)
- `/css/` - Contains `style.css` (all styling)

**Entry Point:** `index.html`

**How to Run:**
```bash
# Development - Python HTTP server
python3 -m http.server 8080

# Or open directly in browser
open index.html
```

**Port:** 8080 (development) / 80 or 443 (production via nginx)

**API Details:**
- Base URL: `https://v6.vbb.transport.rest`
- Endpoint: `/stops/{stationId}/departures?duration=30&results=50`
- Rate limit: 100 requests/minute per IP
- Current usage: 4 requests/minute (well within limit)
- CORS: Enabled (works from any origin)
- Authentication: None required

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `js/app.js` | Static Web App | Add `filterByProduct()` function, modify `refreshStatus()` to create separate analysis results, update `updateUI()` to handle dual categories |
| `index.html` | Static Web App | Duplicate status display section for two categories (buses and trains), update DOM element IDs to support both |
| `css/style.css` | Static Web App | Add layout styles for dual-category display (side-by-side on desktop, stacked on mobile), update responsive breakpoints |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `js/app.js` (lines 114-162) | `analyzeStatus()` function - reuse unchanged for both categories |
| `js/app.js` (lines 89-105) | `fetchAllStations()` pattern using `Promise.allSettled()` for resilience |
| `index.html` (lines 37-46) | Metrics section structure - duplicate for each category |
| `css/style.css` (lines 164-198) | `.metrics` and `.metric-card` styles - extend for category-specific containers |

## Patterns to Follow

### 1. Data Filtering by Transport Type

From VBB API research (departure object structure):

```javascript
// Example departure object
{
  "line": {
    "product": "bus",  // Key field: 'bus', 'subway', 'suburban', 'tram', 'ferry', 'express', 'regional'
    "mode": "bus",
    "name": "M41"
  },
  "cancelled": false,
  "delay": 120  // seconds
}
```

**Key Points:**
- Use `departure.line.product` field (NOT `mode` - less specific)
- Add null safety checks: `departure && departure.line && departure.line.product`
- Bus category: `product === 'bus'`
- Train category: `['subway', 'suburban', 'tram'].includes(product)`
- Edge cases: `'ferry'`, `'express'`, `'regional'` (rare, can be ignored or grouped as "other")

### 2. Reusing analyzeStatus() Function

From `js/app.js` (lines 114-162):

```javascript
function analyzeStatus(departures) {
  // Already category-agnostic!
  // Takes any array of departures, returns status metrics
  // No modifications needed
}
```

**Key Points:**
- Function is pure and category-agnostic
- Call it twice with filtered arrays: `analyzeStatus(buses)` and `analyzeStatus(trains)`
- Returns object with: `status`, `delayPct`, `cancelPct`, `total`, `delayedCount`, `cancelledCount`

### 3. Status Display Structure

From `index.html` (lines 22-51):

```html
<section id="status-display" aria-live="polite">
  <div id="status-answer" class="status-answer">
    <p id="status-text" class="status-text"></p>
    <p id="status-description" class="status-description"></p>
  </div>
</section>

<section id="metrics" class="metrics">
  <div class="metric-card">
    <span class="metric-label">Verspätet</span>
    <span id="delay-pct" class="metric-value">–</span>
  </div>
  <div class="metric-card">
    <span class="metric-label">Ausgefallen</span>
    <span id="cancel-pct" class="metric-value">–</span>
  </div>
</section>
```

**Key Points:**
- Duplicate entire structure for two categories
- Add category identifier to IDs: `#status-buses`, `#status-trains`
- Add category label headers: "Busse", "Bahnen (U/S/Tram)"
- Keep same DOM structure for consistency

## Requirements

### Functional Requirements

1. **Transport Type Filtering**
   - Description: Filter fetched departure data into two arrays based on `line.product` field
   - Acceptance:
     - Bus array contains only departures where `line.product === 'bus'`
     - Train array contains departures where `line.product` is `'subway'`, `'suburban'`, or `'tram'`
     - Null/undefined line objects are handled gracefully without errors

2. **Independent Status Calculation**
   - Description: Calculate disruption status separately for buses and trains
   - Acceptance:
     - `analyzeStatus()` is called twice with filtered data
     - Each category has independent metrics (delay %, cancellation %, total count)
     - Categories can show different statuses (e.g., buses "fucked" while trains "normal")

3. **Dual Category Display**
   - Description: Display two separate status blocks in the UI
   - Acceptance:
     - UI shows two distinct sections: "Busse" and "Bahnen"
     - Each section displays its own status text (JA/NAJA/NEIN/?)
     - Each section shows its own metrics (delay %, cancellation %)
     - Visual distinction between categories (labels, borders, or spacing)

4. **Layout Responsiveness**
   - Description: Adapt layout for different screen sizes
   - Acceptance:
     - Desktop (>768px): Side-by-side status blocks
     - Tablet/Mobile (≤768px): Stacked status blocks
     - All metrics remain readable and properly aligned

### Edge Cases

1. **Empty Category** - When one category has zero departures (e.g., late night when buses stop running), display status as "unknown" with metrics showing "0%" or "–" and description "Keine Daten verfügbar"

2. **Null Line Object** - When `departure.line` is null/undefined, skip that departure during filtering to prevent errors (use defensive checks: `if (dep && dep.line && dep.line.product)`)

3. **Unrecognized Product Types** - If `line.product` is `'ferry'`, `'express'`, or `'regional'`, exclude from both categories (or optionally group as "other" for future extension)

4. **Both Categories Empty** - When both buses and trains have zero departures (API failure or data anomaly), display global error message

5. **Background Color Conflict** - When one category is "fucked" and another is "normal", determine overall body background color based on worst-case category (red > yellow > green)

## Implementation Notes

### DO
- Filter departures immediately after `fetchAllStations()` returns, before calling `analyzeStatus()`
- Reuse existing `analyzeStatus()` function without modification - it's already category-agnostic
- Use `Array.prototype.filter()` with defensive null checks for `line.product` access
- Keep status calculation logic (thresholds, delay detection) identical for both categories
- Preserve existing auto-refresh behavior (60-second interval applies to both categories)
- Maintain current status color scheme (green/yellow/red) per category
- Add category labels in German: "Busse" and "Bahnen (U-Bahn, S-Bahn, Tram)"

### DON'T
- Modify the `analyzeStatus()` function internals - it works correctly as-is
- Make additional API calls - filtering happens client-side on already-fetched data
- Change the status threshold values (30% degraded, 60% fucked) - keep them consistent
- Use `line.mode` field instead of `line.product` - product is more specific and reliable
- Create separate refresh intervals for categories - single fetch serves both
- Ignore null safety checks - real-world API data sometimes has missing fields

## Development Environment

### Start Services

```bash
# Development server (from project root)
python3 -m http.server 8080

# Or simply open in browser
open index.html
# Windows: Double-click index.html
```

### Service URLs
- Development: http://localhost:8080
- Production: https://isbvgfuckedup.com (or configured domain)

### Required Environment Variables
None - app is 100% client-side static, no environment configuration needed.

### External Dependencies
- **VBB Transport REST API**: https://v6.vbb.transport.rest
  - Rate limit: 100 req/min per IP
  - Current usage: 4 req/min (safe)
  - CORS: Enabled
  - Auth: None

## Success Criteria

The task is complete when:

1. [x] Departures are filtered into separate `buses` and `trains` arrays based on `line.product` field
2. [x] Two status blocks are visible in the UI, labeled "Busse" and "Bahnen"
3. [x] Each category displays independent status (JA/NAJA/NEIN/?) and metrics
4. [x] Layout is responsive (side-by-side on desktop, stacked on mobile)
5. [x] Edge cases are handled (empty categories, null line objects)
6. [x] No console errors during page load or refresh
7. [x] Existing tests still pass (if any exist)
8. [x] Both categories can show different statuses simultaneously (e.g., buses "fucked", trains "normal")
9. [x] Overall page background color reflects worst-case status across both categories
10. [x] Timestamp and auto-refresh behavior continues to work correctly

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

Currently, the project has no formal test suite (vanilla JS static site). QA verification will be manual.

| Test | File | What to Verify |
|------|------|----------------|
| Filter function correctness | `js/app.js` | `filterByProduct()` correctly separates buses from trains based on `line.product` values |
| Null safety | `js/app.js` | Filtering handles `null`/`undefined` line objects without errors |
| Status calculation independence | `js/app.js` | `analyzeStatus()` called separately for buses and trains produces different results |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| API data filtering | Static App ↔ VBB API | Fetched departures from all 4 stations are correctly categorized into buses and trains |
| Category metric independence | Static App | Delay/cancellation percentages calculated independently per category |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Initial page load | 1. Open index.html 2. Wait for data fetch | Two status blocks appear, each showing category-specific status and metrics |
| Different category statuses | 1. Simulate bus delays (if testable via mock) 2. Keep trains normal | Buses show "NAJA" or "JA", trains show "NEIN", background color reflects worst status |
| Empty category handling | 1. Filter data with no buses or no trains 2. Observe display | Empty category shows "?" status with "Keine Daten verfügbar" message |
| Auto-refresh behavior | 1. Wait 60 seconds 2. Observe refresh indicator 3. Check updated metrics | Both categories refresh simultaneously, timestamps update |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Status display (desktop) | `http://localhost:8080` | Two status blocks displayed side-by-side, properly aligned, readable labels |
| Status display (mobile) | `http://localhost:8080` (resize to <768px) | Status blocks stacked vertically, metrics remain readable |
| Metrics accuracy | `http://localhost:8080` | Each category shows correct delay % and cancellation % based on filtered data |
| Background color logic | `http://localhost:8080` | Overall page background reflects worst-case status (e.g., if one category is red, page is red) |
| Console errors | `http://localhost:8080` (check browser console) | No errors during load, refresh, or auto-update cycles |

### API Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Sample API response | `curl "https://v6.vbb.transport.rest/stops/900003201/departures?duration=30&results=50"` | Response includes departures with `line.product` field populated |
| Product field values | Check API response JSON | Confirm values include `'bus'`, `'subway'`, `'suburban'`, `'tram'` |
| Null line objects | Check API response JSON | Some departures may have `null` line objects (edge case to handle) |

### QA Sign-off Requirements
- [x] Both status blocks display independently with correct data
- [x] Filtering logic correctly categorizes departures by transport type
- [x] Edge cases handled (empty categories, null line objects)
- [x] Layout is responsive on desktop, tablet, and mobile viewports
- [x] No console errors or JavaScript exceptions
- [x] Auto-refresh continues to work for both categories simultaneously
- [x] Background color logic reflects worst-case status across categories
- [x] Code follows established ES5 vanilla JavaScript patterns
- [x] No security vulnerabilities introduced (client-side only, no user input)
- [x] No regressions in existing functionality (timestamp, metrics, status thresholds)
- [x] Browser compatibility verified (Chrome, Firefox, Safari, Edge)

---

## Implementation Strategy

### Phase 1: Data Filtering (js/app.js)
1. Add `filterByProduct(departures, productValues)` helper function
2. Modify `refreshStatus()` to filter departures into `buses` and `trains` arrays
3. Call `analyzeStatus()` separately for each category

### Phase 2: UI Structure (index.html)
1. Wrap existing status display in a container for buses
2. Duplicate the container for trains
3. Update element IDs to distinguish categories (e.g., `#status-buses`, `#status-trains`)
4. Add category labels ("Busse", "Bahnen")

### Phase 3: Layout & Styling (css/style.css)
1. Add `.category-container` wrapper styles
2. Implement flexbox layout for side-by-side display
3. Add responsive breakpoints for stacked mobile layout
4. Adjust metric card spacing for dual-category layout

### Phase 4: Background Color Logic (js/app.js)
1. Determine overall status by comparing both category statuses
2. Set body class based on worst-case status (fucked > degraded > normal)

### Phase 5: Testing & Edge Cases
1. Test with empty categories (late night, no buses)
2. Test with null line objects (add defensive checks)
3. Verify responsive layout on multiple devices
4. Confirm auto-refresh works correctly

---

## Risk Assessment

**Low Risk:**
- Filtering is client-side with no API changes
- Existing `analyzeStatus()` function is reusable without modification
- No external dependencies added

**Medium Risk:**
- UI layout changes may require CSS debugging for edge cases
- Background color logic needs careful handling when categories differ

**Mitigation:**
- Thorough testing on multiple screen sizes
- Clear logic for worst-case status determination
- Defensive coding for null/undefined values
