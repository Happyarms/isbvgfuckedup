# localStorage Edge Case Verification Guide

This document explains how to manually verify that localStorage edge cases are handled correctly.

## Edge Case 1: localStorage Disabled (Private Browsing Mode)

**Test Steps:**
1. Open the app in private/incognito mode (localStorage may be disabled)
2. Select some line filters from the dropdown
3. Verify the filters work (status updates correctly)
4. Reload the page
5. **Expected Result:**
   - No JavaScript errors in console
   - App works normally but filters don't persist (graceful degradation)
   - All lines shown after reload (default state)

**Implementation:**
- `isLocalStorageAvailable()` function tests storage before use
- Both save and load functions check availability first
- Returns `false` if localStorage throws errors
- Functions silently fail without breaking the app

## Edge Case 2: Corrupt Data in localStorage

**Test Steps:**
1. Open browser DevTools (F12) → Console
2. Inject corrupt data into localStorage:
   ```javascript
   // Test case 1: Invalid JSON
   localStorage.setItem('bvg-line-filters', '{invalid json}');
   location.reload();

   // Test case 2: Non-array data
   localStorage.setItem('bvg-line-filters', '"not-an-array"');
   location.reload();

   // Test case 3: Array with non-string elements
   localStorage.setItem('bvg-line-filters', '[123, true, null]');
   location.reload();

   // Test case 4: Mixed valid/invalid
   localStorage.setItem('bvg-line-filters', '["U1", 123, "U2"]');
   location.reload();
   ```
3. **Expected Result for all cases:**
   - No JavaScript errors in console
   - App loads normally with no filters active
   - Corrupt data automatically removed from localStorage
   - Fresh state (all lines shown)

**Implementation:**
- `loadFiltersFromLocalStorage()` wraps JSON.parse in try-catch
- `isValidFilterData()` validates array structure and element types
- Corrupt data is automatically removed: `localStorage.removeItem('bvg-line-filters')`
- Returns empty array `[]` on any validation failure

## Edge Case 3: Filter for Lines That No Longer Exist

**Test Steps:**
1. Open browser DevTools (F12) → Console
2. Save filters for lines that might not exist in current API data:
   ```javascript
   localStorage.setItem('bvg-line-filters', '["U1", "FAKE-LINE-999", "S5", "INVALID"]');
   location.reload();
   ```
3. **Expected Result:**
   - No JavaScript errors in console
   - Only valid lines (U1, S5) that exist in API data are selected
   - Invalid lines (FAKE-LINE-999, INVALID) are silently filtered out
   - Active filter chips show only valid lines
   - Status calculated correctly for valid lines only

**Implementation:**
- `populateLineFilter()` function (lines 537-541 in app.js):
  ```javascript
  // Update appState.selectedLines to only include lines that exist in current data
  // This ensures saved filters are cleaned up if some lines no longer exist
  appState.selectedLines = previouslySelected.filter(function (lineName) {
    return lineNames.indexOf(lineName) !== -1;
  });
  ```
- Runs on every data refresh
- Filters `appState.selectedLines` to only include lines in current API data
- Automatically cleans up stale saved filters

## Edge Case 4: Multiple Edge Cases Combined

**Test Steps:**
1. Test combination scenarios:
   ```javascript
   // Scenario 1: Some valid, some invalid lines
   localStorage.setItem('bvg-line-filters', '["U1", "FAKE", null, "S5"]');
   location.reload();

   // Scenario 2: Empty but valid
   localStorage.setItem('bvg-line-filters', '[]');
   location.reload();
   ```
2. **Expected Result:**
   - Data validation catches type errors first (null element)
   - Corrupt data cleared, returns empty array
   - Valid empty array works correctly
   - No errors, graceful handling in all cases

## Verification Checklist

- [ ] Private browsing mode: App works without errors, filters don't persist
- [ ] Invalid JSON: Corrupt data cleared, app loads with clean state
- [ ] Non-array data: Validation rejects, data cleared, no errors
- [ ] Array with non-strings: Validation rejects, data cleared, no errors
- [ ] Non-existent line names: Invalid lines filtered out, valid ones remain
- [ ] Empty array: Works correctly, shows all lines
- [ ] Normal operation: Existing functionality not broken

## Technical Implementation Summary

**New Functions:**
1. `isLocalStorageAvailable()` - Tests storage access (lines 616-626)
2. `isValidFilterData(data)` - Validates array of strings (lines 628-640)

**Enhanced Functions:**
1. `saveFiltersToLocalStorage()` - Checks availability, handles errors (lines 642-660)
2. `loadFiltersFromLocalStorage()` - Validates data, clears corrupt entries (lines 662-693)

**Existing Cleanup:**
- `populateLineFilter()` already filters non-existent lines (lines 537-541)

**Error Handling Strategy:**
- Fail silently without breaking the app
- Clear corrupt data automatically
- Return safe defaults (empty array)
- Graceful degradation when storage unavailable
