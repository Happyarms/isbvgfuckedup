# Browser Verification Checklist
## Line-Specific Status Filtering Feature

**QA Session**: 1
**Date**: 2026-01-30
**Feature Branch**: auto-claude/013-line-specific-status-filtering

---

## Setup Instructions

1. Start the development server:
   ```bash
   cd /c/vcs/isbvgfuckedup
   python3 -m http.server 8000
   # or use the init.sh script
   ```

2. Open browser to: http://localhost:8000

3. Open browser DevTools (F12) and monitor the Console tab for errors

---

## Verification Checklist

### ✅ Initial Page Load

- [ ] Page loads without JavaScript errors in console
- [ ] Status display shows loading state initially
- [ ] Filter section is initially hidden (appears after data loads)
- [ ] No network request failures

### ✅ Filter Dropdown Population

- [ ] Filter section becomes visible after data loads
- [ ] Dropdown (#line-select) is populated with line names
- [ ] Line names are sorted alphabetically
- [ ] All unique lines from API data are present
- [ ] Dropdown has proper ARIA labels

### ✅ Filter Selection

- [ ] Selecting a single line works (Ctrl/Cmd+Click)
- [ ] Selecting multiple lines works
- [ ] Active filter chips appear below dropdown
- [ ] Each chip shows the line name
- [ ] Each chip has a remove button (×)
- [ ] Filter count badge appears next to "Linien filtern" heading
- [ ] Filter container highlights when filters are active

### ✅ Status Recalculation

- [ ] Status badge changes based on selected lines
- [ ] Metrics (delay %, cancelled %) recalculate for selected lines only
- [ ] Disruption accordions show only selected lines
- [ ] Empty disruptions show "Keine Störungen" message
- [ ] Filtering to lines with no data shows "NEIN" (not "?")

### ✅ Filter Reset

- [ ] "Alle Filter zurücksetzen" button clears all filters
- [ ] Active filter chips disappear
- [ ] Status recalculates to show all lines
- [ ] Filter count badge disappears
- [ ] Filter container highlight disappears

### ✅ Individual Filter Removal

- [ ] Clicking × on a filter chip removes that line
- [ ] Other selected lines remain selected
- [ ] Status updates immediately after removal
- [ ] Filter count badge updates

### ✅ Filter Persistence

- [ ] Select one or more lines
- [ ] Reload the page (Ctrl+R or F5)
- [ ] Filter selections are restored
- [ ] Active filter chips appear on page load
- [ ] Status calculates with saved filters immediately

### ✅ Edge Cases

- [ ] Filter to a line with no departures → Shows "NEIN" status
- [ ] Filter to all lines with on-time departures → Shows "NEIN" status
- [ ] Clear all filters → Shows full status
- [ ] Select filters, wait 60 seconds → Auto-refresh preserves filters
- [ ] Test in Private/Incognito mode → Filters work but don't persist

### ✅ Accessibility

**Keyboard Navigation:**
- [ ] Tab key navigates through: dropdown → reset button → filter chips → accordions
- [ ] Arrow keys work in dropdown for selection
- [ ] Enter/Space activate the reset button
- [ ] Enter/Space remove individual filter chips
- [ ] Focus indicators are visible on all interactive elements

**Screen Reader (NVDA/JAWS/VoiceOver):**
- [ ] Filter section announced: "Linien filtern"
- [ ] Dropdown label read: "Wähle eine oder mehrere Linien zum Filtern"
- [ ] Active filters region announces: "Aktive Filter: X Linien ausgewählt"
- [ ] Filter count updates announced (aria-live="polite")
- [ ] Each filter chip remove button has proper label

### ✅ Responsive Design

**Desktop (>1024px):**
- [ ] Filter section displays correctly
- [ ] Filter chips wrap properly
- [ ] All controls are easily clickable

**Tablet (768px - 1024px):**
- [ ] Filter section adapts to narrower width
- [ ] Dropdown remains usable
- [ ] Filter chips stack appropriately

**Mobile (<768px):**
- [ ] Filter section is readable and usable
- [ ] Dropdown is touch-friendly
- [ ] Filter chips are touch-friendly (×  button large enough)
- [ ] Reset button is easily tappable

### ✅ Visual Polish

- [ ] Filter section has consistent styling with rest of page
- [ ] Active filter highlight is subtle but visible
- [ ] Filter count badge appears with animation
- [ ] No layout shifts when filters are added/removed
- [ ] Colors and contrast are accessible

### ✅ Console Checks

**No Errors:**
- [ ] No JavaScript errors in Console
- [ ] No network request failures (check Network tab)
- [ ] No CORS issues
- [ ] No 404s for resources

**localStorage:**
- [ ] Check Application → Local Storage in DevTools
- [ ] Verify 'bvg-line-filters' key exists after selection
- [ ] Verify value is a JSON array of strings
- [ ] Manually corrupt the data (e.g., set to `"{invalid}"`) → App handles gracefully

---

## Expected Behavior Summary

1. **Filter dropdown** populated with unique, sorted line names from API
2. **Status recalculation** happens immediately when filters change
3. **Active filter chips** provide visual feedback and quick removal
4. **Filter persistence** across page reloads via localStorage
5. **Graceful handling** of empty results, edge cases, and errors
6. **Full accessibility** via keyboard and screen reader
7. **Responsive design** works on all screen sizes
8. **No console errors** or performance issues

---

## Sign-off

- [ ] All checklist items verified
- [ ] No critical issues found
- [ ] Feature ready for production

**Verified By**: _________________
**Date**: _________________
**Notes**: _________________

