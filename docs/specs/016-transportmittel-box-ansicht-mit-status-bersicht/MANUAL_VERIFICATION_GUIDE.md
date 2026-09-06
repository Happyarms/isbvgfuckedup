# Manual Browser Verification Guide
## Transit Status Overview Boxes Feature

**Task:** subtask-6-1 - Manual browser verification of complete feature
**Date:** 2026-01-30
**Status:** Ready for verification

---

## Prerequisites

1. **Start the application:**
   ```bash
   npm run dev
   ```
   The server should start on http://localhost:8000

2. **Open your browser's Developer Tools** (F12 or Ctrl+Shift+I)
   - Keep the Console tab open to monitor for errors
   - Have the Network tab ready to check data loading

---

## Verification Checklist

### ✅ Step 1: Initial Page Load

**URL:** http://localhost:8000

**Visual Check:**
- [ ] Page loads successfully without errors
- [ ] 4 transit status boxes are visible above the existing metrics section
- [ ] Boxes are labeled: **Bus**, **U-Bahn**, **Tram**, **S-Bahn** (in that order)
- [ ] Each box displays two counters:
  - [ ] **Delayed count** ("verspaetet")
  - [ ] **Cancelled count** ("ausgefallen")
- [ ] All counts show numeric values (may be 0)

**Console Check:**
- [ ] No JavaScript errors in the console
- [ ] No network request failures
- [ ] Initialization script executes successfully

---

### ✅ Step 2: Desktop Layout Verification

**Requirements:** Browser width ≥ 768px (desktop/laptop view)

**Visual Check:**
- [ ] All 4 boxes display **horizontally in a single row**
- [ ] Boxes have consistent width and spacing
- [ ] Glass morphism effect is visible (semi-transparent background with blur)
- [ ] Hover effect works (box lifts slightly when hovering)
- [ ] Visual consistency with existing metrics section below

**CSS Check (DevTools):**
- [ ] `.transit-boxes` uses `display: flex`
- [ ] Boxes have proper `gap` spacing (1.5rem)
- [ ] `backdrop-filter: blur(10px)` is applied

---

### ✅ Step 3: Count Accuracy Verification

**Compare transit box counts with actual data:**

1. **Check the metrics section:**
   - Note the total "verspaetet" (delayed) percentage
   - Note the total "ausgefallen" (cancelled) percentage
   - Note total "Abfahrten" (departures)

2. **Verify transit box counts make sense:**
   - [ ] Sum of all delayed counts across 4 boxes ≤ total departures
   - [ ] Sum of all cancelled counts across 4 boxes ≤ total departures
   - [ ] Counts are non-negative integers
   - [ ] Zero values display as "0" (not empty or "-")

3. **Spot check with console (optional):**
   ```javascript
   // In browser console, check the raw data
   window.aggregateDisruptionsByType([/* departures data */])
   ```

---

### ✅ Step 4: Responsive Layout - Tablet

**Requirements:** Resize browser to width 768px or less

**Visual Check:**
- [ ] Layout changes to **2x2 grid** (2 columns, 2 rows)
- [ ] Top row: **Bus** (left) and **U-Bahn** (right)
- [ ] Bottom row: **Tram** (left) and **S-Bahn** (right)
- [ ] Boxes fill the available width properly
- [ ] No horizontal scrollbar appears
- [ ] Touch-friendly spacing (1rem gap)

**CSS Check (DevTools):**
- [ ] `@media (max-width: 768px)` rule is active
- [ ] `.transit-boxes` uses `display: grid`
- [ ] `grid-template-columns: repeat(2, 1fr)` is applied

---

### ✅ Step 5: Responsive Layout - Mobile

**Requirements:** Resize browser to width 480px or less

**Visual Check:**
- [ ] 2x2 grid layout is maintained
- [ ] Boxes stack properly (2 columns)
- [ ] Font sizes adjust for mobile readability
- [ ] Padding is reduced but still comfortable
- [ ] No horizontal scrollbar
- [ ] All text is readable

**CSS Check (DevTools):**
- [ ] `@media (max-width: 480px)` rule is active
- [ ] Reduced padding on `.transit-box` (1rem 0.75rem)
- [ ] Smaller font size for transit type labels

---

### ✅ Step 6: Auto-Refresh Behavior

**Requirements:** Wait 60 seconds for auto-refresh

1. **Before refresh:**
   - [ ] Note the current count values
   - [ ] Note the "Zuletzt aktualisiert" (Last updated) timestamp

2. **After 60 seconds:**
   - [ ] Page reloads automatically
   - [ ] Transit boxes display updated counts
   - [ ] Timestamp updates to current time
   - [ ] No errors in console during refresh

**Note:** The page uses full page reload for auto-refresh (follows IsSeptaFcked pattern)

---

### ✅ Step 7: Existing Features Regression Check

**Verify that existing dashboard features still work:**

- [ ] **Overall status display** at the top still shows correct status (emoji + message)
- [ ] **Metrics section** (percentage delayed/cancelled) still displays correctly
- [ ] **Metrics section** is positioned below the new transit boxes
- [ ] **Footer info** (timestamp + refresh indicator) still displays correctly
- [ ] No visual layout breaks or overlapping elements

---

### ✅ Step 8: Edge Cases

**Test zero disruptions:**
- If all counts are zero:
  - [ ] Each box displays "0" for delayed count
  - [ ] Each box displays "0" for cancelled count
  - [ ] No errors or "NaN" values appear

**Test loading state:**
- Refresh the page (F5) and observe:
  - [ ] Boxes initially show "0" values
  - [ ] Values update when data loads
  - [ ] No flash of "undefined" or "null"

---

### ✅ Step 9: Browser Compatibility (Optional)

**Test in multiple browsers if possible:**
- [ ] Chrome/Chromium - all features work
- [ ] Firefox - all features work
- [ ] Safari (if available) - all features work
- [ ] Edge - all features work

---

### ✅ Step 10: Performance Check

**Monitor page performance:**
- [ ] Initial page load completes in < 3 seconds
- [ ] No significant layout shift when transit boxes render
- [ ] Smooth transitions when resizing browser window
- [ ] No memory leaks (check DevTools Memory tab after multiple refreshes)
- [ ] CPU usage remains reasonable

---

## Known Issues & Limitations

1. **Auto-refresh uses full page reload** - This follows the IsSeptaFcked pattern. The page reloads every 60 seconds to fetch fresh data.

2. **Static counts** - Transit box counts only update on page load/refresh. There is no real-time WebSocket updates.

3. **No filter integration** - The specification did not include filtering capabilities. Boxes always show counts for all lines.

---

## Acceptance Criteria Summary

All of the following must be ✅ to mark this task complete:

- [x] Unit tests pass (31 tests for aggregateDisruptionsByType)
- [x] Integration tests pass (22 tests for updateTransitBoxes)
- [ ] 4 boxes appear above line filter section
- [ ] Counts match accordion detail counts
- [ ] Desktop layout shows 4 boxes horizontally
- [ ] Mobile layout shows 2x2 grid at <768px
- [ ] Auto-refresh updates counts every 60 seconds
- [ ] Existing accordion menus still work
- [ ] No console errors or warnings
- [ ] Zero counts display as "0"
- [ ] Loading state handles initial page load properly

---

## If Issues Are Found

**Document any problems:**

1. **Take a screenshot** of the issue
2. **Copy console errors** if any
3. **Note the browser** and viewport size
4. **Record steps to reproduce** the issue

**Report in:** `.auto-claude/specs/016-transportmittel-box-ansicht-mit-status-bersicht/build-progress.txt`

---

## Sign-off

When all checks pass:

```bash
# Update the implementation plan
# Mark subtask-6-1 as "completed"
# Commit the verification results
git add .
git commit -m "auto-claude: subtask-6-1 - Manual browser verification complete"
```

---

## Quick Reference

**Test Commands:**
```bash
# Run all tests
npm test

# Run specific test suites
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/transit-boxes.test.js
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/transit-boxes-ui.test.js

# Start dev server
npm run dev

# Check for console errors
# Open DevTools (F12) → Console tab
```

**Key Files:**
- HTML Structure: `src/views/index.pug`
- JavaScript Logic: `src/public/js/app.js`
- Styling: `src/public/css/style.css`
- Tests: `tests/transit-boxes.test.js`, `tests/transit-boxes-ui.test.js`

**Responsive Breakpoints:**
- Desktop: > 768px (horizontal layout)
- Tablet: ≤ 768px (2x2 grid)
- Mobile: ≤ 480px (2x2 grid with adjusted spacing)

---

**Good luck with the verification! 🚀**
