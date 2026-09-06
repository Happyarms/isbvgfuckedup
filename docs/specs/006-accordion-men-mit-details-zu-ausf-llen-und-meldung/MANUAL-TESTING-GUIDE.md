# Manual Accessibility Testing Guide

## Quick Start
1. Open a local server: `python3 -m http.server 8080` or `npx http-server -p 8080`
2. Open http://localhost:8080 in your browser
3. Enable your screen reader (NVDA, JAWS, or VoiceOver)
4. Follow the test steps below

---

## Test 1: Accordion Button Announcements
**Objective:** Verify screen reader announces expanded/collapsed states

### Steps:
1. With screen reader active, press Tab until you reach the "Busse" button
2. Listen for announcement (should say "Busse, button, collapsed" or similar)
3. Press Enter or Space to expand the accordion
4. Listen for state change (should announce "expanded")
5. Press Enter or Space again to collapse
6. Listen for state change (should announce "collapsed")

### Expected Results:
- ✅ Initial state announced as "collapsed" or "aria-expanded false"
- ✅ Expanded state announced when accordion opens
- ✅ Collapsed state announced when accordion closes

---

## Test 2: Panel Content Announcements
**Objective:** Verify screen reader reads disruption information

### Steps:
1. Expand the "Busse" accordion
2. Continue pressing Tab to enter the panel
3. Listen as screen reader reads the content
4. Tab through each disruption item
5. Tab to source links

### Expected Results:
- ✅ Region landmark announced ("Busse region" or similar)
- ✅ Line numbers read clearly (e.g., "M41", "U2")
- ✅ Details read clearly (e.g., "Richtung... — Verspätung: 8 Min.")
- ✅ Source links announced as links ("Quelle: BVG Meldung, link")
- ✅ Empty state message read if no disruptions ("Keine Ausfälle/Verspätungen")

---

## Test 3: Tab Navigation
**Objective:** Verify keyboard navigation works correctly

### Steps (Keyboard Only - No Mouse):
1. Press Tab repeatedly from page top
2. Verify focus order: Header → Status → Metrics → Bus Accordion → Train Accordion
3. When focused on accordion button, press Enter or Space to toggle
4. Continue tabbing through expanded accordion content
5. Press Tab to reach Train accordion
6. Press Shift+Tab to move backwards

### Expected Results:
- ✅ Tab order is logical and predictable
- ✅ Focus never gets trapped
- ✅ All interactive elements are reachable
- ✅ Enter and Space keys both work to toggle
- ✅ Shift+Tab moves backward correctly

---

## Test 4: ARIA Attributes in DevTools
**Objective:** Verify no ARIA errors

### Steps:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this code:
```javascript
// Check Bus Accordion
const busBtn = document.getElementById('bus-accordion-trigger');
console.log('Bus ARIA Check:');
console.log('  aria-expanded:', busBtn.getAttribute('aria-expanded'));
console.log('  aria-controls:', busBtn.getAttribute('aria-controls'));

const busPanel = document.getElementById('bus-accordion-panel');
console.log('  panel role:', busPanel.getAttribute('role'));
console.log('  panel aria-labelledby:', busPanel.getAttribute('aria-labelledby'));

// Check Train Accordion
const trainBtn = document.getElementById('train-accordion-trigger');
console.log('Train ARIA Check:');
console.log('  aria-expanded:', trainBtn.getAttribute('aria-expanded'));
console.log('  aria-controls:', trainBtn.getAttribute('aria-controls'));

const trainPanel = document.getElementById('train-accordion-panel');
console.log('  panel role:', trainPanel.getAttribute('role'));
console.log('  panel aria-labelledby:', trainPanel.getAttribute('aria-labelledby'));
```

### Expected Console Output:
```
Bus ARIA Check:
  aria-expanded: false
  aria-controls: bus-accordion-panel
  panel role: region
  panel aria-labelledby: bus-accordion-trigger
Train ARIA Check:
  aria-expanded: false
  aria-controls: train-accordion-panel
  panel role: region
  panel aria-labelledby: train-accordion-trigger
```

4. Click "Busse" accordion and run the check again
5. Verify `aria-expanded` changes to `"true"`

### Expected Results:
- ✅ All ARIA attributes present and correctly valued
- ✅ No console errors or warnings
- ✅ aria-expanded toggles between "true" and "false"

---

## Test 5: Visual Focus Indicators
**Objective:** Verify focus is clearly visible

### Steps (Keyboard Only):
1. Press Tab to move through the page
2. Observe the focus indicator on each element
3. Check accordion buttons have clear outline
4. Check source links have clear outline
5. Test on all background colors (normal, degraded, fucked)

### Expected Results:
- ✅ Accordion buttons show 3px white outline with 2px offset when focused
- ✅ Source links show 2px white outline with 2px offset when focused
- ✅ Focus indicators are visible on all background colors
- ✅ Focus indicators are distinct from hover states

---

## Optional: Automated Accessibility Scans

### aXe DevTools Extension
1. Install: https://www.deque.com/axe/devtools/
2. Open DevTools → aXe tab
3. Click "Scan All of My Page"
4. Review results

**Expected:** No critical or serious ARIA issues

### Lighthouse Audit
1. Open Chrome DevTools → Lighthouse tab
2. Select "Accessibility" category only
3. Click "Generate report"
4. Review score and issues

**Expected:** Score 95+ (ideally 100)

---

## Success Criteria Checklist

After completing all tests, verify:

- [ ] Accordion buttons announce "expanded" state when opened
- [ ] Accordion buttons announce "collapsed" state when closed
- [ ] Panel content is announced by screen reader
- [ ] Tab navigation flows logically through all elements
- [ ] Enter key toggles accordion
- [ ] Space key toggles accordion
- [ ] Focus indicators are clearly visible
- [ ] No ARIA errors in DevTools console
- [ ] All interactive elements are keyboard accessible
- [ ] No focus traps (can always tab away)

---

## Troubleshooting

### Screen Reader Not Announcing States
- Check DevTools console for JavaScript errors
- Verify ARIA attributes are present in Elements panel
- Try refreshing the page with screen reader already active

### Focus Indicators Not Visible
- Check browser zoom level (should be 100%)
- Verify you're using Tab key (not clicking with mouse)
- Check browser DevTools for CSS conflicts

### Tab Navigation Not Working
- Ensure page has fully loaded
- Check for JavaScript console errors
- Verify you're not focused in an input field

---

## Testing with Different Screen Readers

### NVDA (Windows)
- Download: https://www.nvaccess.org/download/
- Start: Ctrl+Alt+N
- Stop: NVDA menu → Exit

### JAWS (Windows)
- Download: https://www.freedomscientific.com/products/software/jaws/
- Start: Automatically starts after installation
- Stop: Insert+F4

### VoiceOver (macOS)
- Built-in to macOS
- Start: Cmd+F5
- Stop: Cmd+F5

### TalkBack (Android)
- Built-in to Android
- Enable: Settings → Accessibility → TalkBack → On
- Navigate: Swipe right/left

---

## Report Issues

If any test fails:
1. Document which test failed
2. Note the expected vs actual behavior
3. Include browser and screen reader versions
4. Take screenshots if visual issues occur
5. Check browser console for errors

---

**Note:** This implementation follows WCAG 2.1 Level AA standards. All programmatic checks have passed. Manual verification with physical screen readers is the final step to ensure complete accessibility compliance.
