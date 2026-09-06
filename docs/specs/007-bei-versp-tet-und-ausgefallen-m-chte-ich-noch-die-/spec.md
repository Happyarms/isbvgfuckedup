# Specification: Add Vehicle Type Breakdown for Delayed & Cancelled Transit Services

## Overview

Enhance the "Is BVG Fucked Up?" transit status dashboard by replacing the generic "Bahnen" (trains) category with a detailed 5-way breakdown of all transit service disruptions (delayed and cancelled services). This will provide users with a quick, at-a-glance overview of service issues categorized by vehicle type: Buses, Trams, S-Bahn, U-Bahn, and Other transit modes. The feature leverages existing VBB API data (the `line.product` field) which already contains vehicle type information, requiring no API changes or backend modifications.

## Workflow Type

**Type**: `feature`

**Rationale**: This is a feature addition that enhances the user-facing dashboard with new categorization and filtering capabilities. It modifies the UI structure, refactors data categorization logic, and improves the information architecture without changing core system behavior or fixing bugs.

## Task Scope

### Services Involved
- **Static Website** (primary) - Single-page HTML/CSS/JavaScript application serving real-time BVG transit status

### This Task Will:
- [ ] Replace the generic "Bahnen" accordion with 4 separate transit type accordions
- [ ] Add Tram accordion for `line.product === 'tram'` disruptions
- [ ] Add S-Bahn accordion for `line.product === 'suburban'` disruptions
- [ ] Add U-Bahn accordion for `line.product === 'subway'` disruptions
- [ ] Add "Sonstige" accordion for other transit types (ferry, express, regional, etc.)
- [ ] Update JavaScript categorization logic to support 5-way vehicle type classification
- [ ] Update HTML structure to include 4 new accordion panels
- [ ] Ensure accessibility (ARIA attributes) maintained across all new accordions
- [ ] Maintain backward compatibility with existing CSS styling
- [ ] Verify responsive design works on mobile/tablet viewports

### Out of Scope:
- Modifying the VBB API integration (already provides vehicle type data)
- Adding new stations or data sources
- Changing the overall status display logic (normal/degraded/fucked)
- Backend database or server changes (application is fully client-side)
- Implementing new filtering UI controls beyond the accordion expansion
- Modifying metric calculations (delay %, cancel %)

## Service Context

### Is BVG Fucked Up? — Static Website

**Tech Stack:**
- Language: HTML5, CSS3, Vanilla JavaScript (ES5)
- Framework: None (zero dependencies)
- Build Process: None (static files served directly)
- Deployment: Static file serving via nginx
- Key directories:
  - `index.html` - Main page template
  - `js/app.js` - Application logic
  - `css/style.css` - Styling

**Entry Point:** `index.html`

**How to Run:**
```bash
# Option 1: Using Node.js with ecosystem (PM2)
npm install
npm start

# Option 2: Using Docker
docker-compose up

# Option 3: Direct nginx (production)
docker build -t bvg-status .
docker run -p 80:80 bvg-status

# Option 4: Local development (no dependencies needed)
# Simply open index.html in a browser or serve with any HTTP server:
python -m http.server 8000
# Then visit http://localhost:8000
```

**Port:** 80 (nginx), or 8000 (local dev)

**Data Source:** VBB Transport REST API v6
- Endpoint: `https://v6.vbb.transport.rest`
- Stations queried:
  - Berlin Hauptbahnhof (ID: 900003201)
  - Alexanderplatz (ID: 900100003)
  - Zoologischer Garten (ID: 900023201)
  - Friedrichstrasse (ID: 900100001)
- Refresh interval: 60 seconds
- No authentication required

## Files to Modify

| File | Change |
|------|--------|
| `index.html` | Add 4 new accordion panels (Tram, S-Bahn, U-Bahn, Sonstige) to replace "Bahnen" accordion |
| `js/app.js` | Refactor disruption categorization from 2-way (bus vs train) to 5-way (bus, tram, s-bahn, u-bahn, other) |
| `css/style.css` | No changes required (existing accordion styles apply to all accordions) |

## Files to Reference

These files demonstrate patterns to follow:

| File | Pattern to Copy |
|------|-----------------|
| `index.html` (lines 51-97) | Accordion HTML structure with ARIA attributes, panel IDs, trigger buttons |
| `js/app.js` (lines 223-229) | Current `isBusDisruption()` function pattern for product-based categorization |
| `js/app.js` (lines 279-293) | Current disruption filtering and rendering pattern |
| `css/style.css` (lines 264-399) | Accordion styling, panel animations, disruption list styles |

## Patterns to Follow

### Pattern 1: Vehicle Type Categorization Function

From `js/app.js` (current implementation, lines 223-229):

```javascript
function isBusDisruption(disruption) {
  if (!disruption || !disruption.line || !disruption.line.product) {
    return false;
  }
  var product = disruption.line.product.toLowerCase();
  return product === 'bus';
}
```

**Key Points:**
- Always check for `disruption.line.product` existence (may be null/undefined)
- Convert product to lowercase for safe comparison
- Return boolean for use in `Array.filter()`

**Application to New Pattern:**
Create similar helper functions for each vehicle type:
- `isTramDisruption()` - check for `product === 'tram'`
- `isSBahnDisruption()` - check for `product === 'suburban'`
- `isUBahnDisruption()` - check for `product === 'subway'`
- `isOtherDisruption()` - check if NOT bus, tram, suburban, or subway

### Pattern 2: Accordion HTML Structure

From `index.html` (lines 51-73):

```html
<div class="accordion" id="bus-accordion">
  <button
    id="bus-accordion-trigger"
    class="accordion-trigger"
    aria-expanded="false"
    aria-controls="bus-accordion-panel"
    type="button"
  >
    Busse
  </button>
  <div
    id="bus-accordion-panel"
    class="accordion-panel"
    role="region"
    aria-labelledby="bus-accordion-trigger"
    hidden
  >
    <div class="disruption-list" id="bus-disruption-list">
      <!-- Populated dynamically via JavaScript -->
    </div>
  </div>
</div>
```

**Key Points:**
- Each accordion has unique `id` attributes (accordion, trigger, panel)
- ARIA attributes for accessibility: `aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby`
- Trigger button is keyboard accessible
- Panel is hidden by default
- Disruption list is populated dynamically by JavaScript

**Application to New Pattern:**
Create similar HTML for Tram, S-Bahn, U-Bahn, Sonstige:
- Replace "Bahnen" accordion (lines 75-97) with 4 new accordions
- Use consistent ID naming: `[type]-accordion`, `[type]-accordion-trigger`, etc.
- Maintain all ARIA attributes for accessibility

### Pattern 3: Disruption Rendering

From `js/app.js` (lines 346-416):

```javascript
function renderDisruptions(disruptions, containerElement, type) {
  containerElement.innerHTML = '';

  if (!disruptions || disruptions.length === 0) {
    var emptyMessage = document.createElement('p');
    emptyMessage.className = 'disruption-empty';
    emptyMessage.textContent = 'Keine Ausfälle/Verspätungen';
    containerElement.appendChild(emptyMessage);
    return;
  }

  // Create list items for each disruption
  disruptions.forEach(function (disruption) {
    // ... create and append disruption item
  });
}
```

**Key Points:**
- Clear container before rendering
- Show "empty" message when no disruptions
- Create DOM elements dynamically (ES5 compatible)
- Each disruption displays line name, direction, delay/cancellation status

**Application to New Pattern:**
Reuse existing `renderDisruptions()` function for all 5 accordion types.

## Requirements

### Functional Requirements

1. **5-Way Vehicle Type Breakdown**
   - Description: Display disruptions in 5 separate accordion categories based on vehicle type
   - Categories:
     - **Busse** - Bus services (`line.product === 'bus'`)
     - **Tram** - Tram services (`line.product === 'tram'`)
     - **S-Bahn** - Suburban rail (`line.product === 'suburban'`)
     - **U-Bahn** - Subway/metro (`line.product === 'subway'`)
     - **Sonstige** - Other transit (`ferry`, `express`, `regional`, undefined/null)
   - Acceptance: Each category shows only its corresponding vehicle types; other types are excluded

2. **Delayed Services Categorization**
   - Description: Show all delayed services grouped by vehicle type
   - Criteria: Delay > 300 seconds (5 minutes) AND not cancelled
   - Display format: Line name, direction, delay duration in minutes
   - Acceptance: Delayed services appear in correct accordion only

3. **Cancelled Services Categorization**
   - Description: Show all cancelled services grouped by vehicle type
   - Criteria: `cancelled === true` (regardless of delay value)
   - Display format: Line name, direction, "Ausfall" status indicator
   - Acceptance: Cancelled services appear in correct accordion only

4. **Direct Quick Overview**
   - Description: Each accordion shows a scrollable list of disruptions without requiring additional filters
   - Format: Compact, left-aligned list with line number, direction, and status
   - Acceptance: User can expand any accordion and immediately see all disruptions in that category

5. **Accordion Interactivity**
   - Description: Each accordion independently toggles open/closed
   - Controls: Keyboard (Enter/Space) and mouse (click)
   - Accessibility: ARIA attributes updated on state change
   - Acceptance: All accordions respond to both mouse and keyboard input

### Edge Cases

1. **Vehicle Type is Null/Undefined** - Categorize as "Sonstige" (other); prevents crashes from missing product data
2. **No Disruptions in Category** - Show "Keine Ausfälle/Verspätungen" message; prevents empty accordion from appearing broken
3. **Mixed Delayed & Cancelled** - Display both types in same category; user sees complete picture for one transit mode
4. **Single Station Down** - Remaining 3 stations' data included; partial data display is better than error state
5. **API Timeout** - Show error message; maintains existing error handling behavior

## Implementation Notes

### DO

- Follow the existing `isBusDisruption()` pattern for all 5 vehicle type checks
- Reuse the existing `renderDisruptions()` function for all accordion lists
- Use lowercase `.toLowerCase()` when comparing `line.product` values
- Check for `null` or `undefined` product before using in comparisons
- Maintain all ARIA attributes (aria-expanded, aria-controls, role="region", aria-labelledby)
- Keep the existing CSS class naming (accordion, accordion-trigger, accordion-panel, etc.)
- Test in all major browsers (Chrome, Firefox, Safari, Edge)
- Test keyboard navigation (Tab, Enter, Space keys)
- Preserve the existing metrics (delay %, cancel %) — these show overall system status
- Add event listeners for toggle functionality to all new accordion triggers

### DON'T

- Create new CSS classes — reuse existing accordion styling
- Modify the API endpoint or data fetching logic
- Change the overall status determination (normal/degraded/fucked)
- Use ES6+ syntax — maintain ES5 compatibility for broad browser support
- Remove the existing "Busse" accordion — keep it alongside new rail type accordions
- Add external JavaScript dependencies or libraries
- Use `querySelector`/`querySelectorAll` — stick with `getElementById` for IE11 compatibility
- Rely on `Array.includes()` or other ES6 Array methods — use `indexOf()` for compatibility

## Development Environment

### Start Services

```bash
# Option 1: Using Docker Compose (recommended)
docker-compose up --build

# Option 2: Using Node.js with ecosystem/PM2
npm install
npm start

# Option 3: Local development server (simplest)
python -m http.server 8000
# or
npx http-server

# Option 4: Direct Docker build and run
docker build -t bvg-status .
docker run -p 80:80 bvg-status
```

### Service URLs
- **Website**: http://localhost (docker) or http://localhost:8000 (dev)
- **VBB API**: https://v6.vbb.transport.rest (external, no setup needed)

### Required Environment Variables

No environment variables required. The application is fully client-side with hardcoded station IDs and API endpoint.

### Local Testing Checklist

- [ ] Open http://localhost in browser
- [ ] Wait for data to load (should see status and metrics)
- [ ] Click on "Busse" accordion to expand
- [ ] Click on each new accordion (Tram, S-Bahn, U-Bahn, Sonstige) to verify they expand/collapse
- [ ] Check that disruptions appear only in correct category
- [ ] Verify keyboard navigation works (Tab between accordions, Enter/Space to toggle)
- [ ] Check mobile responsiveness by resizing to 480px width
- [ ] Inspect browser console for any JavaScript errors
- [ ] Verify refresh happens every 60 seconds (check last-updated timestamp)

## Success Criteria

The task is complete when:

1. [ ] HTML modified: "Bahnen" accordion replaced with 4 separate accordions (Tram, S-Bahn, U-Bahn, Sonstige)
2. [ ] JavaScript refactored: 5-way categorization function implemented (bus, tram, s-bahn, u-bahn, other)
3. [ ] Disruption filtering: All disruptions correctly categorized by vehicle type and rendered in appropriate accordions
4. [ ] Accessibility maintained: All ARIA attributes correct, keyboard navigation works
5. [ ] Visual consistency: All 5 accordions use existing CSS styling (no new styles added)
6. [ ] Backward compatibility: No regressions in existing features (status display, metrics, refresh logic)
7. [ ] Browser compatibility: Works in Chrome, Firefox, Safari, Edge (ES5 compatible)
8. [ ] Mobile responsive: All accordions function correctly on 480px-wide viewport
9. [ ] No console errors: Browser console shows no JavaScript errors or warnings
10. [ ] Data accuracy: Verified that each transit type appears only in its designated accordion

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Categorization - Bus | `js/app.js` | `isBusDisruption()` returns true for `product === 'bus'` only |
| Categorization - Tram | `js/app.js` | New tram function returns true for `product === 'tram'` only |
| Categorization - S-Bahn | `js/app.js` | New s-bahn function returns true for `product === 'suburban'` only |
| Categorization - U-Bahn | `js/app.js` | New u-bahn function returns true for `product === 'subway'` only |
| Categorization - Other | `js/app.js` | New other function catches ferry, express, regional, undefined/null |
| Null Handling | `js/app.js` | All functions safely handle null/undefined product values |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Full Categorization Flow | Static Site ↔ VBB API | All disruptions categorized correctly from API response |
| Accordion Toggle | Browser DOM ↔ JavaScript | All 5 accordions toggle independently |
| Keyboard Navigation | Browser ↔ DOM | Tab navigation and Enter/Space toggle work for all accordions |
| Data Refresh | JavaScript ↔ VBB API | Data refreshes every 60 seconds, old disruptions cleared |
| Status Calculation | JavaScript | Overall status (normal/degraded/fucked) unaffected by categorization |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View All Disruptions | 1. Load page 2. Expand Busse 3. Expand Tram 4. Expand S-Bahn 5. Expand U-Bahn 6. Expand Sonstige | All disruptions visible and correct category for each |
| Keyboard Navigation | 1. Tab through accordions 2. Press Space to toggle | All accordions respond; focus visible throughout |
| Mobile Responsive | 1. Load on 480px mobile 2. Expand accordions | All accordions expand/collapse; no layout breaks; text readable |
| API Failure | 1. Disconnect internet 2. Wait for refresh 3. Reconnect | Error message shown; recovers on next refresh |
| Data Refresh | 1. Load page 2. Wait 65 seconds | Timestamp updates; new data fetched and disruptions updated |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Busse Accordion | http://localhost:8000 | Click to expand; verify bus disruptions displayed |
| Tram Accordion | http://localhost:8000 | Click to expand; verify tram disruptions (no buses/trains) |
| S-Bahn Accordion | http://localhost:8000 | Click to expand; verify suburban disruptions only |
| U-Bahn Accordion | http://localhost:8000 | Click to expand; verify subway disruptions only |
| Sonstige Accordion | http://localhost:8000 | Click to expand; verify only non-standard types or null products |
| Status Display | http://localhost:8000 | Status text (JA!/NAJA.../NEIN) still accurate |
| Metrics | http://localhost:8000 | Delay % and Cancel % match pre-change calculations |
| Mobile (480px) | http://localhost:8000 (resized) | All accordions work; no horizontal scroll; readable text |

### QA Sign-off Requirements

- [ ] All unit tests pass (categorization functions return correct values)
- [ ] All integration tests pass (categorization works end-to-end)
- [ ] All E2E tests pass (user flows work in browser)
- [ ] Browser verification complete (all 5 accordions work on desktop & mobile)
- [ ] No console errors or warnings in any browser
- [ ] Keyboard navigation verified (Tab, Enter, Space work)
- [ ] Mobile responsive verified (480px, 768px viewports)
- [ ] No regressions in existing functionality (status display, metrics, refresh)
- [ ] Code follows existing patterns (ES5, no new dependencies)
- [ ] Performance impact minimal (no slowdown on 60-second refresh)
- [ ] ARIA accessibility attributes correct and functional
- [ ] Data accuracy verified (spot-checked 5+ disruptions in each category)

