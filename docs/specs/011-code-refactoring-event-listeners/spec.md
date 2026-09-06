# Code Refactoring - Event Listeners

Refactor the accordion event listener setup to use a loop-based approach instead of repetitive individual setup code. This reduces code duplication and makes adding new accordion sections easier.

## Rationale
Technical debt identified in discovery. Clean code is easier to maintain and extend, especially important for a solo developer project. Makes future feature additions faster.

## User Stories
- As a developer, I want clean code so that I can add features quickly
- As a contributor, I want readable code so that I can understand and improve it

## Acceptance Criteria
- [ ] Accordion setup uses a single loop over elements
- [ ] All existing accordion functionality is preserved
- [ ] Tests verify accordion behavior works correctly
- [ ] Code is more maintainable and DRY
