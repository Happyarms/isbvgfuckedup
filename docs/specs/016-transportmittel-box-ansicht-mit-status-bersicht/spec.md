# Specification: Dashboard Transit Status Overview Boxes

## Overview

This feature adds a new dashboard section displaying real-time transit status overview with 4 summary boxes, one for each transit mode (Bus, U-Bahn/Subway, Tram, and S-Bahn/Commuter Rail). Each box displays the count of delayed lines and cancelled lines for that transit type. The new section will be positioned above the existing overall view and accordion detail menus, which remain unchanged. The layout is responsive, displaying as a horizontal row on desktop and a 2x2 grid on mobile devices.

## Workflow Type

**Type**: feature

**Rationale**: This is a new feature implementation that adds dashboard functionality without modifying existing features. It introduces new UI components for status visualization while preserving all existing dashboard elements.

## Task Scope

### Services Involved
- **main** (primary) - JavaScript frontend application displaying transit data

### This Task Will:
- [ ] Create 4 summary box components for transit modes (Bus, U-Bahn, Tram, S-Bahn)
- [ ] Display delayed line count and cancelled line count in each box
- [ ] Implement responsive layout (horizontal on desktop, 2x2 grid on mobile)
- [ ] Position new boxes above existing dashboard content
- [ ] Ensure existing overall view and accordion menus remain functional
- [ ] Integrate with existing transit data source
- [ ] Style boxes consistently with existing dashboard design

### Out of Scope:
- Modifying existing accordion detail menus
- Changing overall view functionality
- Backend API changes (uses existing data endpoints)
- Adding filtering or sorting capabilities to the boxes
- Click-through interactions from boxes to detail views

## Service Context

### main

**Tech Stack:**
- Language: JavaScript
- Framework: Express (backend), Frontend framework TBD during discovery
- Package Manager: npm
- Testing: Jest

**How to Run:**
```bash
npm run dev
```

**Key Directories:**
- `tests/` - Jest test files

**API Endpoints:**
- `GET /` - Main application route
- `GET /api/status` - Status endpoint (potential data source)

## Files to Modify

⚠️ **Discovery Required**: The context phase did not identify specific files. During implementation, discover and document:

| File Pattern | Service | What to Change |
|--------------|---------|----------------|
| `src/components/Dashboard.*` (or similar) | main | Add transit status box section |
| `src/components/TransitStatusBox.*` (NEW) | main | Create new box component |
| `src/styles/*` or CSS files | main | Add responsive grid styles |
| Route/data fetching files | main | Ensure transit data is accessible |

## Files to Reference

⚠️ **Discovery Required**: During implementation, identify these patterns:

| Pattern Needed | What to Look For |
|----------------|------------------|
| Existing dashboard component structure | How is the current dashboard built? |
| Data fetching patterns | How does the app retrieve transit line data? |
| Styling approach | CSS modules, styled-components, or plain CSS? |
| Responsive breakpoint strategy | What breakpoints are used? |
| Component patterns | How are reusable components structured? |

## Patterns to Follow

### Transit Data Structure

**To be discovered during implementation:**

Expected data structure for transit lines should include:
- Transit type/mode (Bus, U-Bahn, Tram, S-Bahn)
- Status (delayed, cancelled, on-time)
- Line identifier

### Component Architecture

**To be discovered during implementation:**

Look for patterns in existing components:
- Component file organization
- Props and state management approach
- Event handling patterns
- Error boundaries

### Responsive Design

**To be discovered during implementation:**

Identify existing responsive patterns:
- Media query breakpoints
- Grid/flexbox usage
- Mobile-first vs desktop-first approach

## Requirements

### Functional Requirements

1. **Transit Status Box Display**
   - Description: Display 4 boxes representing Bus, U-Bahn, Tram, and S-Bahn
   - Acceptance: Each box is visible and clearly labeled with its transit type

2. **Delayed Lines Counter**
   - Description: Show count of delayed lines for each transit mode
   - Acceptance: Each box displays accurate count of delayed lines from data source

3. **Cancelled Lines Counter**
   - Description: Show count of cancelled lines for each transit mode
   - Acceptance: Each box displays accurate count of cancelled lines from data source

4. **Desktop Layout**
   - Description: Display all 4 boxes horizontally in a row
   - Acceptance: On desktop viewports (≥768px or project standard), boxes appear side-by-side

5. **Mobile Layout**
   - Description: Display boxes in 2x2 grid on mobile devices
   - Acceptance: On mobile viewports (<768px or project standard), boxes arrange in 2 columns, 2 rows

6. **Content Preservation**
   - Description: Existing overall view and accordion menus remain below boxes
   - Acceptance: All existing dashboard functionality works unchanged; new boxes appear above existing content

### Edge Cases

1. **Zero Delayed/Cancelled Lines** - Display "0" clearly, not empty or error state
2. **Missing Data for Transit Type** - Show "N/A" or appropriate placeholder
3. **Data Loading State** - Display loading indicator while fetching counts
4. **Data Fetch Error** - Show error state without breaking existing dashboard
5. **Very High Numbers** - Handle display of large counts (e.g., 100+ lines) without layout breaking

## Implementation Notes

### DO
- **Discover existing patterns first** - Explore codebase before creating new patterns
- **Reuse existing data fetching** - Don't create new API calls if data is already available
- **Follow existing component structure** - Match file organization and naming conventions
- **Use project's responsive breakpoints** - Don't introduce new breakpoint values
- **Maintain existing styling approach** - Use same CSS methodology as existing components
- **Test with real data scenarios** - Verify with 0, small, and large count values

### DON'T
- **Modify existing dashboard functionality** - Only add new section above
- **Create new backend endpoints** - Use existing data sources
- **Introduce new libraries** - Work with existing dependencies
- **Hardcode breakpoint values** - Use project's existing responsive system
- **Skip loading/error states** - Handle all async data states properly

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Main Application: http://localhost:[port] (discover port during implementation)

### Required Environment Variables
⚠️ **Discovery Required**: Check for:
- API endpoint configuration
- Port configuration
- Any transit data source settings

## Implementation Discovery Phase

Before coding, the implementation phase MUST:

1. **Locate Dashboard Files**
   ```bash
   # Find dashboard-related files
   # Look for: Dashboard, TransitView, Overview, etc.
   ```

2. **Understand Data Structure**
   - Where does transit line data come from?
   - What fields are available (status, type, delay info)?
   - Is data real-time or cached?

3. **Identify Styling System**
   - CSS Modules, styled-components, SASS, plain CSS?
   - Where are global styles defined?
   - How are responsive breakpoints managed?

4. **Review Component Patterns**
   - How are components structured?
   - What's the state management approach?
   - Are there existing utility components to reuse?

5. **Check Existing Tests**
   - What testing patterns exist?
   - How are components tested?
   - Are there fixture/mock data files?

## Success Criteria

The task is complete when:

1. [ ] 4 transit status boxes (Bus, U-Bahn, Tram, S-Bahn) are visible on the dashboard
2. [ ] Each box displays accurate delayed line count from data source
3. [ ] Each box displays accurate cancelled line count from data source
4. [ ] Desktop layout shows all 4 boxes horizontally
5. [ ] Mobile layout shows boxes in 2x2 grid
6. [ ] New boxes appear above existing overall view
7. [ ] Existing accordion menus remain functional and unchanged
8. [ ] No console errors or warnings
9. [ ] Loading states display during data fetch
10. [ ] Error states handle data fetch failures gracefully
11. [ ] Responsive breakpoint transitions work smoothly
12. [ ] Existing tests still pass
13. [ ] Visual consistency with existing dashboard design

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| TransitStatusBox renders correctly | `tests/components/TransitStatusBox.test.js` (or discovered path) | Box displays transit type, delayed count, cancelled count |
| TransitStatusBox handles zero counts | `tests/components/TransitStatusBox.test.js` | Shows "0" for zero delayed/cancelled lines |
| TransitStatusBox handles loading state | `tests/components/TransitStatusBox.test.js` | Displays loading indicator when data is pending |
| TransitStatusBox handles error state | `tests/components/TransitStatusBox.test.js` | Shows error message when data fetch fails |
| Dashboard integration | `tests/components/Dashboard.test.js` (or discovered path) | Boxes appear above existing content |

### Integration Tests
| Test | Components | What to Verify |
|------|------------|----------------|
| Data aggregation by transit type | Data layer → TransitStatusBox | Counts are correctly filtered by Bus, U-Bahn, Tram, S-Bahn |
| Dashboard layout integrity | Dashboard → StatusBoxes → ExistingViews | New boxes don't break existing accordion/overall view |

### Responsive Tests
| Test | Viewport | Expected Behavior |
|------|----------|-------------------|
| Desktop layout | ≥768px (or project standard) | 4 boxes in horizontal row |
| Mobile layout | <768px | Boxes in 2x2 grid |
| Tablet layout (if applicable) | Medium viewport | Verify layout still works |

### Browser Verification
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Dashboard | `http://localhost:[port]/` | ✓ 4 boxes visible<br>✓ Labels correct (Bus, U-Bahn, Tram, S-Bahn)<br>✓ Counts display numbers<br>✓ Boxes positioned above existing content |
| Desktop View | Same, desktop browser | ✓ Boxes horizontal<br>✓ Spacing consistent |
| Mobile View | Same, mobile viewport | ✓ 2x2 grid layout<br>✓ Touch-friendly spacing |

### Visual Regression Checks
| Check | What to Verify |
|-------|----------------|
| Existing content unchanged | Overall view and accordion menus appear identical to before |
| Styling consistency | New boxes match color scheme, typography, spacing of existing dashboard |
| No layout shifts | Adding boxes doesn't cause unexpected content jumps |

### Data Verification
| Check | Command/Action | Expected |
|-------|---------------|----------|
| Delayed count accuracy | Compare box count to detail view | Counts match actual delayed lines |
| Cancelled count accuracy | Compare box count to detail view | Counts match actual cancelled lines |
| Transit type filtering | Verify each box shows only its type | Bus box shows only bus lines, etc. |

### Performance Checks
| Check | What to Verify |
|-------|----------------|
| Initial load time | Dashboard loads without significant delay |
| Data refresh (if applicable) | Status updates don't cause UI flicker |
| Responsive transitions | Layout changes smoothly at breakpoints |

### QA Sign-off Requirements
- [ ] All unit tests pass (npm test)
- [ ] Integration tests verify data flows correctly
- [ ] Responsive layouts verified in at least 3 viewports (mobile, tablet, desktop)
- [ ] Browser verification complete in primary target browser
- [ ] Counts are accurate when compared to detail views
- [ ] No regressions in existing functionality (accordion, overall view)
- [ ] No console errors or warnings
- [ ] Visual consistency with existing design maintained
- [ ] Loading and error states tested manually
- [ ] Code follows patterns discovered in existing components
- [ ] No security vulnerabilities introduced
- [ ] Accessibility: boxes are keyboard navigable (if interactive) and screen-reader friendly

## Implementation Sequence

**Phase 1: Discovery** (Required before coding)
1. Explore codebase to find dashboard files
2. Understand data structure and source
3. Identify styling and responsive patterns
4. Document findings in implementation notes

**Phase 2: Component Creation**
1. Create TransitStatusBox component
2. Implement delayed/cancelled count display
3. Add loading and error states
4. Style component to match existing design

**Phase 3: Dashboard Integration**
1. Add box section to dashboard above existing content
2. Implement data aggregation by transit type
3. Pass data to 4 box instances (Bus, U-Bahn, Tram, S-Bahn)

**Phase 4: Responsive Layout**
1. Implement horizontal layout for desktop
2. Implement 2x2 grid for mobile
3. Test transitions between breakpoints

**Phase 5: Testing & QA**
1. Write unit tests for TransitStatusBox
2. Write integration tests for dashboard
3. Manual testing in browser
4. QA verification per acceptance criteria

## Notes for Implementation Phase

⚠️ **Context Phase Incomplete**: The context gathering phase did not identify specific files. The implementation phase MUST begin with a discovery step to:

1. Locate dashboard component files
2. Find transit data source and structure
3. Identify styling system and responsive patterns
4. Document existing component patterns

Once discovery is complete, update the "Files to Modify" and "Files to Reference" sections with actual file paths before proceeding with implementation.
