# Line-Specific Status Filtering

Allow users to filter the status display by specific transit lines (e.g., U1, U2, S1, S5) or line groups. Show overall status for selected lines only.

## Rationale
Users currently have to 'check multiple lines/stations individually' with official apps. By letting users filter to their specific commute lines, we provide personalized relevance while maintaining simplicity.

## User Stories
- As a U8 commuter, I want to filter to U8 status so that I see only relevant disruptions
- As a multi-line commuter, I want to select U6 and S1 so that I see my specific route status

## Acceptance Criteria
- [ ] Line filter dropdown/chips available
- [ ] Status recalculates based on selected lines
- [ ] Filter preferences are remembered
- [ ] Clear indication of active filters
- [ ] Easy way to reset to 'all lines' view
