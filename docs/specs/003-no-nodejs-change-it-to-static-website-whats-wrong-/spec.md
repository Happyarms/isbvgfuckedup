# Specification: Convert BVG Status Website to Pure Static Site (No Node.js)

## Overview

Convert the "Is BVG Fucked Up?" project from its current Node.js/Express.js architecture to a **pure static website** with zero server-side runtime. The existing project has only documentation and configuration files (no source code was ever implemented), all of which assume a Node.js stack. This task replaces the entire approach: creating static HTML/CSS/JS files that call the public VBB Transport REST API directly from the browser via `fetch()`, reconfiguring nginx to serve static files instead of proxying to Express, and removing all Node.js-related infrastructure (PM2, package.json, etc.). The result is a zero-dependency website that can be deployed by simply copying files to any web server.

## Workflow Type

**Type**: Feature

**Rationale**: Although framed as a conversion, the project has no existing source code — only documentation and config files that assumed Node.js. This is effectively a greenfield implementation of the static site plus cleanup of the existing Node.js-oriented configuration files. The core feature (real-time BVG status display) must be built from scratch using client-side JavaScript.

## Task Scope

### Services Involved
- **Static Website** (primary) — HTML/CSS/JS files served by nginx, calling VBB API from the browser
- **VBB Transport REST API** (external integration) — `https://v6.vbb.transport.rest` provides real-time departure data with CORS enabled, no auth required
- **nginx** (infrastructure) — Reconfigured from reverse proxy to static file server

### This Task Will:
- [ ] Create `index.html` — main page with "Is BVG Fucked?" bold status display
- [ ] Create `css/style.css` — minimalist, bold design inspired by isseptafucked.com
- [ ] Create `js/app.js` — client-side JavaScript that fetches VBB API, calculates status, updates DOM, auto-refreshes
- [ ] Rewrite `nginx-site.conf` — serve static files from a directory (remove `proxy_pass` to Express)
- [ ] Rewrite `README.md` — reflect static site architecture, remove all Node.js references
- [ ] Remove `ecosystem.config.js` — PM2 is not needed for a static site
- [ ] Remove or rewrite `DEPLOYMENT.md` — replace Node.js deployment steps with static file deployment
- [ ] Remove `spec.md` from project root — old Node.js-based spec is obsolete

### Out of Scope:
- Any Node.js runtime, npm packages, or build tools
- Server-side rendering or templating (no Pug, no Express)
- Docker containers (static files need only nginx or any web server)
- Redis caching (browser-side caching is sufficient)
- PM2 process management
- JSON API endpoint (the browser calls VBB API directly; no backend)
- User accounts, authentication, or personalization
- Historical data tracking or analytics

## Service Context

### Static Website

**Tech Stack:**
- Language: HTML5, CSS3, vanilla JavaScript (ES6+)
- Framework: None — pure static files
- Server: nginx (static file serving only)
- External API: VBB Transport REST API (`https://v6.vbb.transport.rest`)

**Entry Point:** `index.html`

**How to Run (Development):**
```bash
# Option 1: Python simple HTTP server (no Node.js!)
python3 -m http.server 8080

# Option 2: Open directly in browser
open index.html

# Option 3: Any static file server
# e.g., caddy file-server --browse --listen :8080
```

**How to Run (Production):**
```bash
# Copy files to nginx web root
sudo cp -r ./* /var/www/isbvgfuckedup/

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

**Port:** 80/443 (nginx) or 8080 (development)

### VBB Transport REST API (External)

**Base URL:** `https://v6.vbb.transport.rest`

**Key Endpoint:** `GET /stops/{stationId}/departures`

**Query Parameters:**
- `duration` — minutes ahead to query (use `30`)
- `results` — max number of results (use `50`)
- `suburban` / `subway` / `tram` / `bus` / `express` / `ferry` / `regional` — boolean filters (all default to `true`)

**Verified Station IDs:**
- Berlin Hauptbahnhof: `900003201`
- Alexanderplatz: `900100003`
- Zoologischer Garten: `900023201`
- Friedrichstrasse: `900100001`

**Rate Limit:** 100 requests/minute per client IP (each visitor has their own limit)

**CORS:** Enabled — browser `fetch()` works directly

## Files to Modify

| File | Action | What to Change |
|------|--------|---------------|
| `index.html` | **CREATE** | Main HTML page with status display, semantic structure, meta tags |
| `css/style.css` | **CREATE** | Bold, minimalist design — large YES/NO, color-coded status, responsive |
| `js/app.js` | **CREATE** | Fetch VBB API, compute status, update DOM, auto-refresh every 60s |
| `nginx-site.conf` | **REWRITE** | Remove `proxy_pass` to Express; serve static files from `/var/www/isbvgfuckedup/` |
| `README.md` | **REWRITE** | Replace Node.js documentation with static site documentation |
| `ecosystem.config.js` | **DELETE** | PM2 config is Node.js-specific; not needed |
| `DEPLOYMENT.md` | **REWRITE** | Replace Node.js deployment with static file deployment to nginx |
| `spec.md` (project root) | **DELETE** | Old Node.js-based spec is obsolete |

## Files to Reference

These files show the current state that must be replaced:

| File | What It Tells Us |
|------|-----------------|
| `nginx-site.conf` | Current nginx config proxies to Express on port 3000; must be changed to serve static files |
| `ecosystem.config.js` | Shows environment variable names and thresholds (THRESHOLD_DEGRADED=0.3, THRESHOLD_FUCKED=0.6, DELAY_THRESHOLD=5) to replicate as JS constants |
| `README.md` | Shows the intended feature set and UI behavior to preserve |
| `spec.md` (project root) | Contains status determination logic, station IDs, and UI requirements to carry forward |

## Patterns to Follow

### Pattern 1: VBB API Fetch (Client-Side)

The browser calls the VBB REST API directly. No backend needed.

```javascript
// js/app.js - Fetching departure data
const API_BASE = 'https://v6.vbb.transport.rest';

const STATIONS = [
  { id: '900003201', name: 'Berlin Hauptbahnhof' },
  { id: '900100003', name: 'Alexanderplatz' },
  { id: '900023201', name: 'Zoologischer Garten' },
  { id: '900100001', name: 'Friedrichstrasse' },
];

async function fetchDepartures(stationId) {
  const url = `${API_BASE}/stops/${stationId}/departures?duration=30&results=50`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
```

**Key Points:**
- `fetch()` is built-in to all modern browsers — no library needed
- MUST check `response.ok` — fetch doesn't reject on HTTP errors
- `duration=30` queries next 30 minutes of departures
- Each station fetched separately; use `Promise.allSettled()` for resilience

### Pattern 2: Status Determination (Client-Side)

Replicate the logic from the old spec but in pure client-side JS.

```javascript
// Configuration constants (from ecosystem.config.js values)
const CONFIG = {
  THRESHOLD_DEGRADED: 0.3,   // 30% delayed = degraded
  THRESHOLD_FUCKED: 0.6,     // 60% delayed = fucked
  DELAY_THRESHOLD_SECONDS: 300, // 5 minutes in seconds
};

function analyzeStatus(allDepartures) {
  const validDepartures = allDepartures.filter(d => !d.cancelled);
  const cancelledCount = allDepartures.filter(d => d.cancelled).length;
  const delayedCount = validDepartures.filter(d =>
    d.delay && d.delay > CONFIG.DELAY_THRESHOLD_SECONDS
  ).length;

  const total = allDepartures.length;
  if (total === 0) return { status: 'unknown', delayPct: 0, cancelPct: 0, total: 0 };

  const delayPct = delayedCount / total;
  const cancelPct = cancelledCount / total;
  const disruptionPct = (delayedCount + cancelledCount) / total;

  let status = 'normal';
  if (disruptionPct >= CONFIG.THRESHOLD_FUCKED) status = 'fucked';
  else if (disruptionPct >= CONFIG.THRESHOLD_DEGRADED) status = 'degraded';

  return { status, delayPct, cancelPct, total, delayedCount, cancelledCount };
}
```

**Key Points:**
- `delay` field from VBB API is in **SECONDS**, not minutes — threshold is 300 seconds (5 min)
- `when` can be `null` — use `plannedWhen` as fallback
- `cancelled` is a boolean — count separately from delays
- Combine delay + cancellation rates for overall disruption percentage

### Pattern 3: Auto-Refresh with DOM Update

```javascript
// Auto-refresh every 60 seconds
async function refreshStatus() {
  try {
    const allDepartures = await fetchAllStations();
    const result = analyzeStatus(allDepartures);
    updateUI(result);
  } catch (error) {
    showError(error.message);
  }
}

// Initial load + interval
refreshStatus();
setInterval(refreshStatus, 60000);
```

**Key Points:**
- 60-second interval respects API rate limits (4 stations × 1 req/60s = 4 req/min, well under 100/min limit)
- Use `try/catch` for network errors
- Show last-updated timestamp in German locale: `new Date().toLocaleString('de-DE')`
- Convert `realtimeDataUpdatedAt` (Unix timestamp integer) via `new Date(value * 1000)`

### Pattern 4: nginx Static File Serving

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/isbvgfuckedup;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|ico|svg)$ {
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

**Key Points:**
- No `proxy_pass` — serves files directly
- `try_files` for clean URL handling
- Cache CSS/JS for 1 hour to reduce server load
- Keep existing security headers

## Requirements

### Functional Requirements

1. **Real-Time Status Display**
   - Description: Display a bold, unmistakable YES/NO answer to "Is BVG fucked right now?" using real-time data from the VBB Transport REST API
   - Acceptance: Page loads and within a few seconds shows YES, NO, or an appropriate loading/error state based on live departure data from 4 major Berlin stations

2. **Status Calculation Logic**
   - Description: Determine BVG status by analyzing delays and cancellations across multiple stations
   - Acceptance: Status thresholds work correctly — Normal (<30% disrupted), Degraded (30-60%), Fucked (>60%). Delays >5 minutes and cancellations both count as disruptions

3. **Supporting Metrics Display**
   - Description: Show percentage of delayed and cancelled departures alongside the main YES/NO
   - Acceptance: Metrics accurately reflect the queried departure data (e.g., "42% delayed, 8% cancelled")

4. **Auto-Refresh**
   - Description: Status updates automatically every 60 seconds without requiring manual page refresh
   - Acceptance: Timestamp updates visibly every 60 seconds; status changes reflected without user action

5. **Responsive Design**
   - Description: Site works on all screen sizes — desktop, tablet, mobile
   - Acceptance: Layout is readable and usable on screens from 320px to 2560px wide

6. **Zero Node.js Dependencies**
   - Description: The entire site is pure HTML/CSS/JS with NO Node.js, npm, package.json, or build steps
   - Acceptance: Site works by opening `index.html` in a browser or copying files to any static web server. No `npm install` or build command is ever needed

7. **Error Handling**
   - Description: Gracefully handle API failures, network errors, and edge cases
   - Acceptance: When VBB API is down or unreachable, show a clear "Unable to check status" message instead of crashing or showing blank page

### Non-Functional Requirements

1. **Performance**: Page should be under 50KB total (HTML + CSS + JS). No external frameworks or libraries.
2. **Accessibility**: Semantic HTML, sufficient color contrast, screen-reader friendly status text.
3. **Browser Support**: Works in all modern browsers (Chrome 80+, Firefox 78+, Safari 13+, Edge 80+).

### Edge Cases

1. **VBB API Unavailable** — Show "Status Unknown" with a message explaining the API is unreachable; display last-known timestamp if available
2. **No Departures Returned** — If a station returns zero departures (e.g., nighttime), exclude it from calculation rather than treating as error
3. **All Departures Cancelled** — Show as "fucked" with 100% cancellation rate
4. **`when` is null** — Use `plannedWhen` as fallback for time display; treat departure as not delayed if no realtime data
5. **`delay` is null or 0** — Treat as on-time departure
6. **Mixed Station Results** — If some station fetches fail but others succeed, calculate status from available data only
7. **Rate Limiting** — With 4 stations fetched every 60 seconds, each user makes 4 req/min (well under 100/min limit). No special handling needed.

## Implementation Notes

### DO
- Use vanilla `fetch()` for all API calls — it's built into every modern browser
- Use `Promise.allSettled()` to fetch all stations in parallel and handle partial failures
- Keep all configuration as constants at the top of `js/app.js` for easy modification
- Use semantic HTML (`<main>`, `<header>`, `<section>`, `<time>`)
- Use CSS custom properties (variables) for colors so status colors are easy to change
- Use German locale for timestamp display: `toLocaleString('de-DE')`
- Remember: `delay` is in SECONDS — divide by 60 for display, compare against 300 for threshold
- Remember: `realtimeDataUpdatedAt` is a Unix timestamp (integer) — multiply by 1000 for `new Date()`
- Add a `<noscript>` tag explaining JavaScript is required
- Include `<meta>` tags for proper encoding, viewport, and description

### DON'T
- Use ANY Node.js tooling — no npm, no package.json, no node_modules, no build steps
- Import any external JavaScript libraries or CSS frameworks
- Use server-side rendering, templating engines, or backend logic
- Create a package.json file
- Use ES modules with `import`/`export` in the browser (use plain `<script>` tags for maximum compatibility)
- Hard-code station IDs in multiple places — define once in a config object
- Forget to handle the case where `when` is null (use `plannedWhen`)
- Make synchronous/blocking API calls

## Development Environment

### Start Development Server

```bash
# No installation needed! Just serve the files:
python3 -m http.server 8080

# Or on Windows:
python -m http.server 8080

# Then open http://localhost:8080 in your browser
```

### Alternatively
```bash
# Just open index.html directly in a browser (API calls require CORS,
# which the VBB API supports, so this works from file:// too in most browsers)
```

### Service URLs (Development)
- Status Page: http://localhost:8080
- VBB API (external): https://v6.vbb.transport.rest

### Service URLs (Production)
- Status Page: https://your-domain.com (served by nginx)
- VBB API (external): https://v6.vbb.transport.rest

### Required Environment Variables
- **None** — static site has no environment variables. All configuration is in `js/app.js` constants.

## File Structure

```
isbvgfuckedup/
├── index.html           # Main HTML page
├── css/
│   └── style.css        # All styles
├── js/
│   └── app.js           # All JavaScript (API calls, status logic, DOM updates)
├── nginx-site.conf      # nginx config (static file serving)
├── README.md            # Project documentation
├── DEPLOYMENT.md        # Production deployment guide (nginx + static files)
├── .gitignore           # Git ignore rules
└── .claude_settings.json # Claude settings (existing)
```

**Files to DELETE:**
- `ecosystem.config.js` — PM2 is for Node.js processes
- `spec.md` (project root) — old Node.js-based specification

## Success Criteria

The task is complete when:

1. [ ] `index.html` exists and renders the "Is BVG Fucked?" page with proper HTML structure
2. [ ] `css/style.css` provides a bold, minimalist design with color-coded status (green/yellow/red)
3. [ ] `js/app.js` fetches live data from VBB API, computes status, and updates the page
4. [ ] Status calculation is correct: Normal (<30%), Degraded (30-60%), Fucked (>60% disrupted)
5. [ ] Auto-refresh works — page updates every 60 seconds without manual reload
6. [ ] Error handling works — API failures show a graceful error message, not a blank page
7. [ ] `nginx-site.conf` serves static files (no `proxy_pass`)
8. [ ] `ecosystem.config.js` is deleted
9. [ ] `spec.md` (project root) is deleted
10. [ ] `README.md` reflects the static site architecture with no Node.js references
11. [ ] `DEPLOYMENT.md` contains static file deployment instructions
12. [ ] Site works by opening `index.html` in a browser or running `python3 -m http.server`
13. [ ] **Zero** Node.js files exist: no package.json, no node_modules, no .js files using `require()` or Node APIs
14. [ ] No console errors in browser DevTools
15. [ ] Page is responsive on mobile and desktop
16. [ ] Page total size is under 50KB

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Functional Tests

| Test | What to Verify |
|------|----------------|
| Page Load | `index.html` loads without errors; shows loading state, then status |
| API Integration | Browser DevTools Network tab shows successful fetch to `v6.vbb.transport.rest` |
| Status Display | Large YES or NO is visible based on real-time data |
| Metrics Display | Delay % and cancellation % are shown and match fetched data |
| Auto-Refresh | After 60 seconds, timestamp updates and new data is fetched |
| Error State | With network disabled, page shows error message (not blank/broken) |
| Cancelled Departures | Departures with `cancelled: true` are counted in disruption % |
| Delay Threshold | Only delays > 300 seconds (5 min) count as disrupted |
| Null `when` Handling | Departures with `when: null` use `plannedWhen` and are treated as not-delayed |

### Static Site Verification

| Check | How to Verify | Expected |
|-------|---------------|----------|
| No Node.js files | `ls package.json node_modules/ 2>/dev/null` | No such files exist |
| No ecosystem.config.js | `ls ecosystem.config.js 2>/dev/null` | File does not exist |
| No old spec.md | `ls spec.md 2>/dev/null` (in project root) | File does not exist |
| Works without server | Open `index.html` directly in browser | Page renders, API calls work |
| No npm/require | `grep -r "require(" js/ 2>/dev/null` | No matches |
| No import statements | `grep -r "^import " js/ 2>/dev/null` | No matches |
| Total file size | `du -sh index.html css/ js/` | Under 50KB combined |

### nginx Configuration Verification

| Check | How to Verify | Expected |
|-------|---------------|----------|
| No proxy_pass | `grep proxy_pass nginx-site.conf` | No matches |
| Has root directive | `grep "root " nginx-site.conf` | Points to static file directory |
| Has try_files | `grep try_files nginx-site.conf` | Present for clean URL handling |
| Config valid | `sudo nginx -t` | Syntax OK |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Status Page | `http://localhost:8080` | ✓ Title contains "BVG" ✓ Large YES/NO visible ✓ Delay/cancellation metrics shown ✓ Timestamp in German locale ✓ Responsive on mobile (320px) ✓ Responsive on desktop (1920px) |
| Loading State | Refresh page | ✓ Shows loading indicator before data arrives |
| Error State | Disable network, refresh | ✓ Shows user-friendly error message ✓ No unhandled exceptions in console |
| Auto-Refresh | Wait 60+ seconds | ✓ Timestamp updates ✓ Network tab shows new API request |
| Color Coding | Varies by live data | ✓ Green for normal ✓ Yellow for degraded ✓ Red for fucked |

### Cross-Browser Verification

| Browser | Version | Check |
|---------|---------|-------|
| Chrome | 80+ | Page loads, status displays, auto-refresh works |
| Firefox | 78+ | Page loads, status displays, auto-refresh works |
| Safari | 13+ | Page loads, status displays, auto-refresh works |
| Edge | 80+ | Page loads, status displays, auto-refresh works |
| Mobile Chrome | Latest | Responsive layout, touch-friendly |
| Mobile Safari | Latest | Responsive layout, touch-friendly |

### Database Verification

| Check | Command | Expected |
|-------|---------|----------|
| Not Applicable | N/A | No database — pure static site with client-side API calls |

### QA Sign-off Requirements
- [ ] Page loads and displays real-time BVG status (YES/NO)
- [ ] Status calculation is correct (thresholds verified)
- [ ] Metrics (delay %, cancellation %) are accurate
- [ ] Auto-refresh works every 60 seconds
- [ ] Error handling works (API down → graceful message)
- [ ] No Node.js files exist in the project
- [ ] nginx config serves static files (no proxy_pass)
- [ ] ecosystem.config.js is deleted
- [ ] Old spec.md (project root) is deleted
- [ ] README.md has no Node.js references
- [ ] Site works by opening index.html directly
- [ ] Responsive on mobile and desktop
- [ ] No console errors or warnings
- [ ] All files are pure HTML/CSS/JS (no build step needed)
- [ ] Total page size under 50KB
- [ ] German locale timestamps displayed correctly
