# Specification: Accordion-Menü für BVG Ausfälle und Verspätungen

## Overview

Build an accessible accordion menu component to display Berlin public transport (BVG) disruption information. The component will present cancellations and delays for buses and trains in expandable/collapsible sections, with descriptive details and traceability links to original BVG announcements. This feature provides users with detailed disruption information in a scannable, organized format that supports barrier-free access.

## Workflow Type

**Type**: feature

**Rationale**: This is net-new functionality - creating an accordion-based UI component to display transit disruption data. It introduces a new user-facing feature rather than refactoring existing code, conducting investigation, or performing migration.

## Task Scope

### Services Involved
- **Frontend Application** (primary) - UI component implementation and styling

### This Task Will:
- [ ] Create reusable accordion component with expand/collapse functionality
- [ ] Display cancelled lines with descriptive text explaining the issue
- [ ] Display delayed lines with specific delay duration information
- [ ] Include source links to original BVG announcements for verification
- [ ] Implement separate accordion instances for buses and trains
- [ ] Apply accessible CSS styling following barrier-free design principles
- [ ] Integrate with existing BVG data source/API

### Out of Scope:
- Backend API modifications for BVG data fetching
- Real-time data updates or WebSocket integration
- Mobile app implementation (web-only)
- Historical disruption data or analytics
- Push notifications for new disruptions

## Service Context

### Frontend Application

**Tech Stack:**
- Language: To be determined during discovery (likely JavaScript/TypeScript)
- Framework: To be determined during discovery (React/Vue/Svelte/vanilla)
- Key directories: To be discovered

**Entry Point:** To be identified during implementation

**How to Run:**
```bash
# To be determined during codebase discovery
# Common patterns: npm run dev / npm start / yarn dev
```

**Port:** To be identified

**Note:** Project structure exploration is required as first implementation step to identify framework, build tools, and existing component patterns.

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `[To be discovered]` | Frontend | Create new accordion component file |
| `[To be discovered]` | Frontend | Create/update disruption data interface/types |
| `[To be discovered]` | Frontend | Add accordion styles (CSS/SCSS/styled-components) |
| `[To be discovered]` | Frontend | Integrate accordion into disruption display page |

**Implementation Note:** First step requires codebase exploration to identify:
- Component directory structure
- Existing UI component patterns
- Current BVG data integration points
- Styling methodology in use

## Files to Reference

These files show patterns to follow (to be identified):

| File | Pattern to Copy |
|------|----------------|
| `[Existing accordion/collapsible component]` | Expand/collapse interaction pattern |
| `[Existing BVG data handler]` | Data fetching and parsing patterns |
| `[Accessibility reference component]` | ARIA attributes and keyboard navigation |
| `[Component test example]` | Testing patterns for interactive components |

## Patterns to Follow

### Accessibility-First Accordion Pattern

**Key Requirements:**
```html
<!-- Semantic HTML structure -->
<div class="accordion">
  <button
    aria-expanded="false"
    aria-controls="panel-id"
    class="accordion-trigger"
  >
    [Heading text]
  </button>
  <div
    id="panel-id"
    role="region"
    aria-labelledby="trigger-id"
    class="accordion-panel"
  >
    [Panel content]
  </div>
</div>
```

**Key Points:**
- Use semantic `<button>` elements for triggers
- Implement proper ARIA attributes (`aria-expanded`, `aria-controls`)
- Support keyboard navigation (Enter, Space for toggle; Tab for focus management)
- Ensure sufficient color contrast ratios
- Provide focus indicators
- Support screen reader announcements

### Data Structure Pattern

**Disruption Data Model:**
```typescript
interface Disruption {
  id: string;
  lineNumber: string;
  type: 'cancellation' | 'delay';
  category: 'bus' | 'train';
  description: string;
  delayTime?: number; // minutes, only for delays
  sourceUrl: string; // Link to BVG announcement
  timestamp: string;
}

interface DisruptionGroup {
  category: 'bus' | 'train';
  cancellations: Disruption[];
  delays: Disruption[];
}
```

**Key Points:**
- Separate data by category (bus vs. train)
- Distinguish between cancellation and delay types
- Include traceability via sourceUrl
- Optional delayTime field (null for cancellations)

## Requirements

### Functional Requirements

1. **Accordion Component**
   - Description: Reusable expandable/collapsible container component
   - Acceptance: Clicking header toggles panel visibility; only one panel per accordion needs to expand at a time (configurable)

2. **Cancellation Display**
   - Description: Show cancelled lines with line number and description text
   - Acceptance: Each cancellation entry shows `Line [number]` + description + source link

3. **Delay Display**
   - Description: Show delayed lines with line number and delay duration
   - Acceptance: Each delay entry shows `Line [number]` + "Verspätung: [X] Minuten" + source link

4. **Source Attribution**
   - Description: Every disruption entry links to original BVG announcement
   - Acceptance: Clicking source link opens BVG announcement in new tab/window

5. **Category Separation**
   - Description: Separate accordion instances for buses and trains
   - Acceptance: Two distinct accordions labeled "Busse" and "Bahnen" with category-filtered data

6. **Accessible Styling**
   - Description: CSS implementation following barrier-free design principles
   - Acceptance: Passes WCAG 2.1 AA standards for contrast, keyboard navigation, screen reader compatibility

### Edge Cases

1. **No Disruptions** - Display message "Keine Ausfälle/Verspätungen" when category has empty data
2. **Missing Source URL** - Show disruption info but disable/hide source link if URL unavailable
3. **Very Long Descriptions** - Ensure panel scrolls or wraps text without breaking layout
4. **Simultaneous Expand** - Define behavior: single-expand (accordion pattern) vs. multi-expand
5. **Zero/Negative Delay Time** - Validate delay values; treat invalid data as cancellation or hide entry

## Implementation Notes

### DO
- **Discover first**: Map out existing component structure, styling approach, and data flow before implementing
- **Reuse patterns**: Follow existing accordion/collapsible components if present in codebase
- **Accessibility priority**: Implement ARIA attributes and keyboard support from the start, not as afterthought
- **Component isolation**: Create self-contained accordion component that can be reused
- **Type safety**: Define TypeScript interfaces (if applicable) for disruption data structures
- **Test interactivity**: Verify expand/collapse, keyboard navigation, and screen reader announcements

### DON'T
- **Hardcode data**: Use props/data binding to pass disruption information
- **Inline styles**: Follow project's styling methodology (CSS modules, styled-components, etc.)
- **Accessibility shortcuts**: Don't skip ARIA attributes or keyboard support
- **Duplicate code**: Create one accordion component used twice (buses + trains), not two separate implementations
- **Assume framework**: Check project setup before choosing React/Vue/Svelte patterns

## Development Environment

### Start Services

```bash
# To be determined during codebase discovery
# Common patterns:
# npm install
# npm run dev

# Or:
# yarn install
# yarn dev

# Or:
# pnpm install
# pnpm dev
```

### Service URLs
- Frontend Application: To be determined (likely http://localhost:3000 or similar)

### Required Environment Variables
- To be discovered (check for .env.example or .env.template)
- Likely includes BVG API endpoint/key if data is fetched client-side

## Success Criteria

The task is complete when:

1. [ ] Two accordion components render on page: one for buses, one for trains
2. [ ] Clicking accordion header expands/collapses panel with smooth transition
3. [ ] Cancelled lines display with line number, description, and source link
4. [ ] Delayed lines display with line number, delay time (in minutes), and source link
5. [ ] Source links open BVG announcements in new tab
6. [ ] Keyboard navigation works (Tab to focus, Enter/Space to toggle)
7. [ ] Screen reader announces expanded/collapsed state correctly
8. [ ] Color contrast meets WCAG 2.1 AA standards (4.5:1 for text)
9. [ ] Focus indicators are visible and clear
10. [ ] No console errors or warnings
11. [ ] Component handles empty data gracefully (shows "no disruptions" message)
12. [ ] Existing tests still pass
13. [ ] New component has unit/integration tests

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Accordion renders correctly | `[accordion.test.{js,ts,tsx}]` | Component renders with correct initial state (collapsed) |
| Toggle expands/collapses panel | `[accordion.test.{js,ts,tsx}]` | Clicking trigger toggles aria-expanded and panel visibility |
| Props are passed correctly | `[accordion.test.{js,ts,tsx}]` | Component accepts and renders data from props |
| Empty state renders | `[accordion.test.{js,ts,tsx}]` | Shows appropriate message when no disruptions exist |
| Source links are functional | `[accordion.test.{js,ts,tsx}]` | Links have correct href and target="_blank" |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| BVG data populates accordions | Frontend | Data from BVG source correctly filters into bus/train categories |
| Accordion integration on page | Frontend | Both accordions render on disruption display page |
| Category filtering works | Frontend | Buses show only bus disruptions, trains show only train disruptions |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| View bus disruptions | 1. Navigate to page 2. Click "Busse" accordion | Panel expands showing bus cancellations and delays |
| View train disruptions | 1. Navigate to page 2. Click "Bahnen" accordion | Panel expands showing train cancellations and delays |
| Access source link | 1. Expand accordion 2. Click source link | BVG announcement opens in new tab |
| Keyboard navigation | 1. Tab to accordion 2. Press Enter/Space | Focus moves to trigger; Enter/Space toggles panel |

### Accessibility Verification
| Check | Tool/Method | Expected |
|-------|-------------|----------|
| ARIA attributes | Browser DevTools | `aria-expanded`, `aria-controls`, `role` present and correct |
| Keyboard support | Manual testing | Tab, Enter, Space keys work correctly |
| Screen reader | NVDA/JAWS/VoiceOver | Announces "expanded/collapsed" state and content |
| Color contrast | WCAG Color Contrast Checker | All text meets 4.5:1 ratio minimum |
| Focus indicators | Visual inspection | Clear visible outline on focused elements |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Disruption Display Page | `http://localhost:[port]/[path]` | Both accordions visible and functional |
| Bus Accordion | Same | Shows bus-specific disruptions only |
| Train Accordion | Same | Shows train-specific disruptions only |
| Mobile viewport | Same | Accordions responsive and usable on small screens |

### Code Quality Verification
| Check | Method | Expected |
|-------|--------|----------|
| Component reusability | Code review | Single accordion component used twice, not duplicated |
| Type safety | TypeScript compiler (if applicable) | No type errors; interfaces defined for disruption data |
| Style consistency | Visual inspection | Follows project's existing design system/patterns |
| No hardcoded data | Code review | Data passed via props/data binding |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Accessibility verification complete (WCAG 2.1 AA compliant)
- [ ] Browser verification complete (desktop + mobile viewports)
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatibility verified
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (after discovery phase)
- [ ] No security vulnerabilities introduced (XSS in description text, etc.)
- [ ] Source links open safely (target="_blank" with rel="noopener noreferrer")
- [ ] Empty state handling verified
- [ ] Component is reusable and maintainable

---

## Implementation Phasing

**Phase 1: Discovery** (Must complete first)
- Explore codebase to identify framework, component structure, styling approach
- Locate existing BVG data integration
- Identify accessibility patterns in use
- Map out where disruption display currently lives

**Phase 2: Component Development**
- Create accordion component with accessibility features
- Implement expand/collapse logic
- Add keyboard navigation support

**Phase 3: Data Integration**
- Connect component to BVG disruption data source
- Implement category filtering (bus vs. train)
- Handle cancellation vs. delay display logic

**Phase 4: Styling**
- Apply accessible CSS following barrier-free design principles
- Ensure responsive design
- Add smooth transitions

**Phase 5: Testing & QA**
- Write unit tests for accordion component
- Test accessibility with screen readers and keyboard
- Verify all acceptance criteria
- Get QA sign-off
