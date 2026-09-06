# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-26 19:41]
VBB API delay field is in SECONDS not minutes. The threshold is 300 seconds (5 minutes). Also: when can be null (use plannedWhen), realtimeDataUpdatedAt is Unix timestamp (multiply by 1000 for JS Date), fetch() doesn't reject on HTTP errors (must check response.ok).

_Context: VBB Transport REST API integration in js/app.js for spec 003_

## [2026-01-26 19:41]
HARD CONSTRAINT: Zero Node.js. No npm, no package.json, no require(), no import/export ES modules, no build step. The user explicitly rejected the previous Node.js approach. Use only vanilla HTML/CSS/JS with plain script tags.

_Context: Spec 003 - Convert to static website. User frustrated by previous Node.js suggestions._
