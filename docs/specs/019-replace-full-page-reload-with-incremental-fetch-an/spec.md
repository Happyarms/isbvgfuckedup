# Replace full-page reload with incremental fetch-and-DOM-patch for 60-second refresh

## Overview

client.js currently auto-refreshes the entire page via window.location.reload() every 60 seconds. The /api/status endpoint already exists and returns a lightweight JSON payload (~200-400 bytes). Replacing the reload with a fetch() call to /api/status and surgically updating only the changed DOM elements (status emoji, text, body/status CSS classes, metric values, transit-box counts, stale warning visibility) turns a full-page blocking reload into a sub-millisecond in-place update. The countdown timer UI can remain unchanged.

## Rationale

Every 60 seconds every active user triggers: a full HTML re-download (~3-5KB), a complete DOM teardown and re-parse, a CSS re-application, a layout recalculation, and a visual flicker as content disappears and reappears. The /api/status endpoint already returns state, metrics, message, timestamp, and stale — all the data the page needs. The only missing piece is transitBoxes, which needs to be added to the JSON response (a one-line addition to routes/index.js). This is the single highest-leverage change for perceived page responsiveness, especially for mobile commuters on variable-speed networks.

---
*This spec was created from ideation and is pending detailed specification.*
