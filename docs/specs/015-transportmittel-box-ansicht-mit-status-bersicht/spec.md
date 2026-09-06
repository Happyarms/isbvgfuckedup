# Specification: Transportmittel Box-Ansicht mit Statusübersicht

## Overview

Add a prominent 4-box dashboard display showing real-time delayed and cancelled line counts for each Berlin transit type (Bus, U-Bahn, Tram, S-Bahn). This visual summary will sit above the existing overall metrics and accordion details, providing users with an instant breakdown of disruptions by transportation mode. The layout adapts responsively from horizontal (4 columns) on desktop to a 2×2 grid on mobile devices.

## Workflow Type

**Type**: feature

**Rationale**: This is a new UI component addition that enhances the existing dashboard without modifying core data fetching or status computation logic. The aggregation functions are already implemented; this task focuses on HTML structure, CSS styling, and integration into the existing client-side application.

## Task Scope

### Services Involved
- **main** (primary) - Static HTML/CSS/JS frontend application

### This Task Will:
- [x] Add HTML structure for 4 transit boxes in index.html (Bus, U-Bahn, Tram, S-Bahn)
- [x] Create responsive CSS grid layout (4 columns → 2×2 on mobile)
- [x] Integrate existing `aggregateDisruptionsByType()` and `updateTransitBoxes()` functions into main app logic
- [x] Display counts (not percentages) for delayed and cancelled lines per transit type
- [x] Position boxes above existing metrics section
- [x] Ensure existing accordion menus and overall view remain functional

### Out of Scope:
- Server-side rendering (Pug templates) - focusing on static HTML version only
- Changes to data fetching logic or API endpoints
- Modifications to existing accordion functionality
- New data aggregation logic (already implemented in src/public/js/app.js)

## Service Context

### main

**Tech Stack:**
- Language: JavaScript (ES5/ES6)
- Framework: Vanilla JavaScript (no framework), Express backend available but not used for static site
- Key directories:
  - `js/` - Client-side application logic
  - `css/` - Stylesheets
  - `tests/` - Jest test suites

**Entry Point:** `index.html` (static site), loads `js/app.js` and `js/line-filter.js`

**How to Run:**
```bash
# Static development server
npm run dev
# Or using Python simple server
python3 -m http.server 8000
```

**Port:** 8000 (development)

**Key Files:**
- `index.html` - Main HTML structure
- `js/app.js` - Main client application (1048 lines, fetches API data, updates DOM)
- `js/app-logic.js` - Helper functions
- `js/line-filter.js` - Line filtering functionality
- `src/public/css/style.css` - Stylesheet with CSS variables and theme support
- `src/public/js/app.js` - NEW transit box aggregation functions (already implemented, needs integration)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `index.html` | main | Add transit boxes HTML structure above metrics section (after line 36, before line 37) |
| `src/public/css/style.css` | main | Add `.transit-boxes` grid layout styles with responsive breakpoints |
| `js/app.js` | main | Integrate `aggregateDisruptionsByType()` and `updateTransitBoxes()` calls in the main data update flow |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `tests/transit-boxes-ui.test.js` | Expected HTML structure for transit boxes (lines 30-89) - shows required element IDs and structure |
| `src/public/js/app.js` | Aggregation functions already implemented - `aggregateDisruptionsByType()` (line 40) and `updateTransitBoxes()` (line 117) |
| `index.html` | Existing metrics section structure (lines 37-46) - use similar card pattern for transit boxes |
| `src/public/css/style.css` | CSS variable usage and responsive patterns (lines 10-102) |
| `tests/transit-boxes.test.js` | Complete unit tests showing expected data structure and behavior |

## Patterns to Follow

### Transit Box HTML Structure

From `tests/transit-boxes-ui.test.js` (lines 30-89):

```html
<div class="transit-boxes">
  <div class="transit-box" data-type="bus">
    <h3>Bus</h3>
    <div>
      <span>Verspätet:</span>
      <span id="bus-delayed-count">0</span>
    </div>
    <div>
      <span>Ausgefallen:</span>
      <span id="bus-cancelled-count">0</span>
    </div>
  </div>
  <!-- Repeat for ubahn, tram, sbahn -->
</div>
```

**Key Points:**
- Each box must have exact element IDs: `{type}-delayed-count`, `{type}-cancelled-count`
- Transit types: `bus`, `ubahn`, `tram`, `sbahn`
- Labels: "Verspätet" (delayed), "Ausgefallen" (cancelled)
- Initial values should be "0" not empty

### Responsive Grid Layout Pattern

From existing CSS patterns in `style.css`:

```css
.transit-boxes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .transit-boxes {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Key Points:**
- Use CSS Grid for layout
- 4 columns on desktop, 2 columns on mobile (2×2 grid)
- Follow existing spacing patterns (use rem units)
- Apply CSS variables for colors and themes

### Data Aggregation Integration

From `src/public/js/app.js` (lines 40-92, 117-150):

```javascript
// 1. Aggregate departures by transit type
var aggregatedData = aggregateDisruptionsByType(departures);

// 2. Update DOM elements with counts
updateTransitBoxes(aggregatedData);
```

**Key Points:**
- Call after fetching departure data in `js/app.js`
- Functions are already implemented and tested
- Handle empty/null data gracefully (functions return zeros)
- Update on every data refresh cycle

## Requirements

### Functional Requirements

1. **Transit Box Display**
   - Description: Display 4 boxes for Bus, U-Bahn, Tram, S-Bahn showing delayed and cancelled counts
   - Acceptance: Each box shows two numbers: count of delayed lines (>300s delay) and count of cancelled lines

2. **Responsive Layout**
   - Description: Boxes arrange horizontally (4 columns) on desktop, 2×2 grid on mobile
   - Acceptance: At viewport width >768px, boxes appear in single row; at ≤768px, boxes appear in 2×2 grid

3. **Real-time Updates**
   - Description: Box counts update automatically when new departure data is fetched
   - Acceptance: Numbers change when page auto-refreshes (60s interval) or on manual reload

4. **Preserve Existing UI**
   - Description: Overall metrics section and accordion menus remain unchanged
   - Acceptance: Existing elements (metrics, accordions, filters) still functional and appear below transit boxes

### Edge Cases

1. **No departures available** - Display "0" for all counts, not empty or undefined
2. **Missing transit type data** - Show "0" for types with no data (handled by aggregation function)
3. **Large count values** - Support displaying counts >100 without layout breaking
4. **Theme switching** - Transit boxes must respect light/dark theme CSS variables

## Implementation Notes

### DO
- Follow the exact HTML structure from `tests/transit-boxes-ui.test.js` to ensure tests pass
- Use existing CSS variable patterns (`--color-overlay-light`, `--shadow-medium`, etc.)
- Copy the integration point from the test structure showing where to call functions
- Reuse metric card styling patterns from existing `.metric-card` class (lines 37-46 in index.html)
- Place transit boxes section immediately above the metrics section (line 37 in index.html)
- Use German labels consistent with existing UI ("Verspätet", "Ausgefallen")

### DON'T
- Create new data fetching logic - reuse existing departure data from `appState.allDepartures`
- Modify the existing accordion functionality or structure
- Use inline styles - all styling must be in CSS file
- Change the existing `aggregateDisruptionsByType` or `updateTransitBoxes` functions - they are already tested and working
- Add transit boxes to Pug templates (out of scope for this task)

## Development Environment

### Start Services

```bash
# Development server (static site)
npm run dev
# Opens on http://localhost:8000

# Run tests
npm test

# Run specific test suites
NODE_OPTIONS='--experimental-vm-modules' jest tests/transit-boxes.test.js
NODE_OPTIONS='--experimental-vm-modules' jest tests/transit-boxes-ui.test.js
```

### Service URLs
- Static Site: http://localhost:8000
- API (if running Express server): http://localhost:3000

### Required Environment Variables
- None required for static site development
- VBB Transport REST API is public: `https://v6.vbb.transport.rest`

## Success Criteria

The task is complete when:

1. [x] Transit boxes appear above metrics section showing 4 boxes (Bus, U-Bahn, Tram, S-Bahn)
2. [x] Each box displays two counts: delayed and cancelled
3. [x] Responsive layout works: 4 columns on desktop (>768px), 2×2 on mobile (≤768px)
4. [x] Counts update correctly when page loads/refreshes with real API data
5. [x] Existing metrics section and accordions still appear and function below boxes
6. [x] All existing tests still pass
7. [x] Transit box tests pass: `tests/transit-boxes.test.js` and `tests/transit-boxes-ui.test.js`
8. [x] No console errors in browser
9. [x] Theme switching (light/dark) works correctly with transit boxes

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| aggregateDisruptionsByType - all scenarios | `tests/transit-boxes.test.js` | Function correctly aggregates departure counts by transit type (bus/ubahn/tram/sbahn), handles edge cases (empty, null, invalid data), applies 300s delay threshold |
| updateTransitBoxes - DOM manipulation | `tests/transit-boxes-ui.test.js` | Function updates all 8 DOM elements correctly (4 delayed + 4 cancelled counts), displays "0" for zero values, handles missing elements gracefully |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Full data flow | Static frontend → VBB API | Departure data fetches, aggregates, and displays in transit boxes without errors |
| Line filtering integration | Frontend filtering + transit boxes | When lines are filtered, transit box counts should update to reflect filtered data (if filtering logic is integrated) |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Initial Page Load | 1. Open http://localhost:8000 2. Wait for data to load | Transit boxes appear with counts, no errors in console |
| Auto-refresh | 1. Load page 2. Wait 60 seconds for auto-refresh | Transit box counts update with new data |
| Responsive Layout | 1. Load page 2. Resize browser to <768px 3. Resize to >768px | Layout changes from 4 columns → 2×2 grid → 4 columns smoothly |
| Theme Switching | 1. Load page 2. Toggle dark/light theme (if implemented) | Transit boxes respect theme colors (CSS variables apply) |

### Browser Verification (if frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Dashboard | `http://localhost:8000/` | ✓ Transit boxes render above metrics section<br>✓ All 4 boxes present (Bus, U-Bahn, Tram, S-Bahn)<br>✓ Counts display as numbers (not "undefined" or empty)<br>✓ German labels present ("Verspätet", "Ausgefallen")<br>✓ Existing metrics section below boxes<br>✓ Accordions still functional |
| Mobile Viewport | `http://localhost:8000/` (viewport 375px) | ✓ 2×2 grid layout<br>✓ All boxes readable<br>✓ No horizontal scroll |
| Desktop Viewport | `http://localhost:8000/` (viewport 1920px) | ✓ 4 boxes in single row<br>✓ Even spacing between boxes |

### Database Verification (if applicable)
N/A - This is a frontend-only feature using public API data

### QA Sign-off Requirements

- [x] All unit tests pass (`npm test` exits with 0)
- [x] Transit box unit tests specifically pass:
  - `tests/transit-boxes.test.js` - all 70+ assertions pass
  - `tests/transit-boxes-ui.test.js` - all DOM manipulation tests pass
- [x] Browser verification complete:
  - Visual inspection confirms 4 boxes render correctly
  - Responsive breakpoints work (tested at 375px, 768px, 1920px)
  - Counts display actual numbers from API data
- [x] No regressions in existing functionality:
  - Metrics section still displays percentages
  - Accordions expand/collapse correctly
  - Line filter still works (if applicable)
  - Auto-refresh still functions (60s interval)
- [x] Code follows established patterns:
  - Uses CSS variables from existing theme system
  - Follows existing HTML structure conventions
  - JavaScript integration uses existing patterns from `js/app.js`
- [x] No security vulnerabilities introduced:
  - No XSS risks (counts are numbers, not user input)
  - No external dependencies added
  - API calls unchanged (existing public API)
- [x] Accessibility considerations:
  - Element IDs are unique and semantic
  - Numbers are readable by screen readers
  - Responsive layout maintains readability

## Implementation Plan Summary

**Phase 1: HTML Structure**
1. Add transit boxes container in index.html before metrics section
2. Create 4 boxes with proper IDs following test structure

**Phase 2: CSS Styling**
1. Add `.transit-boxes` grid layout styles
2. Add `.transit-box` card styling matching existing metric cards
3. Add responsive breakpoint for mobile (2×2 grid)
4. Ensure theme variables apply correctly

**Phase 3: JavaScript Integration**
1. Import or copy `aggregateDisruptionsByType` and `updateTransitBoxes` from `src/public/js/app.js` to `js/app.js`
2. Find the data update point in `js/app.js` (after fetching departures)
3. Call aggregation function with `appState.allDepartures`
4. Call update function to populate DOM

**Phase 4: Testing & Verification**
1. Run all tests: `npm test`
2. Verify transit box tests pass
3. Manual browser testing at different viewport sizes
4. Check theme switching compatibility

## Risk Assessment

**Low Risk Items:**
- HTML structure is well-defined by existing tests
- CSS follows established patterns
- Functions are already implemented and tested

**Medium Risk Items:**
- Integration point in `js/app.js` - need to find correct location to call functions
- Ensuring data flows correctly from existing fetch logic

**Mitigation:**
- Review `js/app.js` structure carefully to find where departure data is processed
- Test with various data scenarios (empty, partial, full)
- Verify tests pass before considering complete
