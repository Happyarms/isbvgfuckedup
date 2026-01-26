# Specification: BVG Status Website - Analysis & Implementation Plan

## Overview

Build a minimal, direct status website for Berlin's public transit system (BVG - Berliner Verkehrsbetriebe) inspired by the proven pattern of isseptafucked.com. The site will provide a bold yes/no answer to "Is BVG fucked right now?" by querying real-time transit data from the BVG REST API or bvg-hafas library. The application will display current service disruptions, delays, and cancellations across Berlin's U-Bahn, S-Bahn, buses, and trams to help users quickly assess transit reliability.

## Workflow Type

**Type**: Feature

**Rationale**: This is a new standalone website creation that follows an established pattern (isseptafucked.com) applied to a new transit system. It requires integration with external APIs, a simple frontend, and real-time status determination logic.

## Task Scope

### Services Involved
- **Web Server** (primary) - Express.js application serving the status page and API endpoints
- **BVG Data Source** (integration) - Either REST API (with Redis) or npm library (bvg-hafas)

### This Task Will:
- [ ] Analyze isseptafucked.com to understand feature scope and UI/UX patterns
- [ ] Explore BVG API capabilities and determine status criteria
- [ ] Design and implement Express.js web application with real-time BVG status logic
- [ ] Build simple, bold frontend matching isseptafucked.com aesthetic
- [ ] Define "service degradation" metrics (delays, cancellations thresholds)
- [ ] Implement data caching/polling strategy for real-time updates
- [ ] Create Docker container for deployment
- [ ] Deploy application (Fly.io or Heroku recommended)
- [ ] Implement automated testing for status logic and API integration

### Out of Scope:
- Complex route planning or journey optimization features
- User accounts, authentication, or personalization
- Mobile app development
- Advanced analytics or historical data tracking
- Multi-language support beyond German/English

## Service Context

### Web Server (Express.js + Pug)

**Tech Stack:**
- Language: JavaScript (Node.js)
- Framework: Express.js
- Template Engine: Pug (for server-side HTML rendering)
- Runtime: Node.js 18+
- Containerization: Docker

**Entry Point:** `server.js` or `app.js` (to be created)

**How to Run:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run with Docker
docker build -t bvg-status .
docker run -p 3000:3000 bvg-status
```

**Port:** 3000

**Key Directories (to be created):**
```
.
├── server.js           # Express app entry point
├── routes/
│   └── index.js        # Route handlers
├── controllers/
│   └── bvgController.js # Status determination logic
├── services/
│   └── bvgService.js   # BVG API integration
├── views/
│   ├── layout.pug      # Main layout template
│   └── index.pug       # Status page
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── client.js
│   └── images/
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── .env.example
└── package.json
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `package.json` | Web Server | Create with Express, Pug, dotenv, and testing dependencies |
| `server.js` | Web Server | Create main Express application with route setup |
| `routes/index.js` | Web Server | Create endpoint for status page and API |
| `controllers/bvgController.js` | Web Server | Implement status determination logic |
| `services/bvgService.js` | Web Server | Integrate with BVG API (choose: REST or npm library) |
| `views/layout.pug` | Web Server | Create HTML template layout |
| `views/index.pug` | Web Server | Create status page template |
| `public/css/style.css` | Web Server | Implement bold, minimalist design |
| `Dockerfile` | Web Server | Create container configuration |
| `.env.example` | Web Server | Document required environment variables |

## Files to Reference

These resources demonstrate patterns to follow:

| Resource | Pattern to Copy |
|----------|-----------------|
| https://isseptafucked.com | UI/UX design: minimal, bold yes/no answer, real-time updates |
| https://github.com/derhuerst/bvg-rest | REST API documentation and endpoints |
| https://github.com/derhuerst/bvg-hafas | npm library for BVG data access (alternative to REST API) |
| Express.js Documentation | Standard web server patterns |
| Pug Template Engine Docs | Server-side rendering of HTML |

## Integration Architecture Decision

### Option 1: BVG REST API (Recommended for Simplicity with Docker)

**Deployment:**
```bash
# Use official Docker image
docker run -p 3000:3000 -e REDIS_URL=redis://redis:6379 derhuerst/bvg-rest

# Or deploy separately on Fly.io/Heroku
```

**In your Express app:**
```javascript
const http = require('http');

async function getBVGStatus() {
  const response = await fetch('http://bvg-api:3000/stops/900000008101/departures');
  const departures = await response.json();
  // Process for status determination
}
```

**Pros:** Proven, well-documented, matches isseptafucked.com pattern
**Cons:** Requires Redis, external service management

### Option 2: bvg-hafas npm Library (Simpler, No Dependencies)

**Installation:**
```bash
npm install bvg-hafas
```

**In your Express app:**
```javascript
const createClient = require('bvg-hafas');
const client = createClient();

async function getBVGStatus() {
  const berlin = await client.locations('Berlin Hauptbahnhof');
  const stationId = berlin[0].id;
  const departures = await client.departures(stationId);
  // Process for status determination
}
```

**Pros:** No external service needed, lightweight, simpler deployment
**Cons:** Direct HAFAS API calls (same underlying source)

**DECISION REQUIRED:** Spec assumes Option 2 (bvg-hafas) for simplicity. Update accordingly if Option 1 preferred.

## Patterns to Follow

### Pattern 1: Status Determination Logic

From analyzed isseptafucked.com concept:

```javascript
// services/bvgService.js
async function determineBVGStatus() {
  try {
    // Get departures from key Berlin transit hubs
    const majorStations = [
      '900000008101', // Berlin Hauptbahnhof
      '900000003352', // Berlin Alexanderplatz
      '900000005106', // Berlin Zoologischer Garten
    ];

    let totalDepartures = 0;
    let delayedCount = 0;
    let cancelledCount = 0;

    for (const stationId of majorStations) {
      const departures = await client.departures(stationId, {
        duration: 60, // Next 60 minutes
      });

      totalDepartures += departures.length;
      delayedCount += departures.filter(d => d.delay && d.delay > 5).length;
      cancelledCount += departures.filter(d => d.cancelled).length;
    }

    // Calculate "fucked" status based on thresholds
    const delayPercentage = (delayedCount / totalDepartures) * 100;
    const cancelPercentage = (cancelledCount / totalDepartures) * 100;

    const isFucked = delayPercentage > 30 || cancelPercentage > 10;

    return {
      status: isFucked ? 'fucked' : 'working',
      delayPercentage: Math.round(delayPercentage),
      cancelPercentage: Math.round(cancelPercentage),
      timestamp: new Date(),
      details: {
        totalDepartures,
        delayedCount,
        cancelledCount,
      }
    };
  } catch (error) {
    return {
      status: 'unknown',
      error: error.message,
      timestamp: new Date(),
    };
  }
}
```

**Key Points:**
- Query multiple major transit hubs to get citywide picture
- Use delay and cancellation data to determine status
- Cache results (30-60 second TTL) to avoid API rate limiting
- Handle errors gracefully with "unknown" status

### Pattern 2: Pug Template for Status Display

From isseptafucked.com pattern:

```pug
// views/index.pug
extends layout

block content
  .status-container
    .status-badge(class=`status-${status.status}`)
      h1.status-text= status.isFucked ? 'YES' : 'NO'

    .status-description
      if status.status === 'fucked'
        p Berlin's BVG is experiencing major disruptions
        .metrics
          .metric
            .number= status.delayPercentage + '%'
            .label Departures Delayed
          .metric
            .number= status.cancelPercentage + '%'
            .label Departures Cancelled
      else if status.status === 'working'
        p BVG is operating normally right now
      else
        p Unable to determine status at this moment

    .timestamp
      small Last updated: #{new Date(status.timestamp).toLocaleString('de-DE')}
```

**Key Points:**
- Bold, unambiguous yes/no answer
- Show supporting metrics
- Real-time timestamp
- Minimal, focused design

### Pattern 3: Express Route Handler

From standard Express patterns:

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();
const bvgController = require('../controllers/bvgController');

// Cache middleware
let cachedStatus = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

router.get('/', async (req, res) => {
  try {
    // Use cached status if fresh
    if (cachedStatus && Date.now() - cacheTime < CACHE_TTL) {
      return res.render('index', { status: cachedStatus });
    }

    // Otherwise, fetch fresh status
    const status = await bvgController.getStatus();
    cachedStatus = status;
    cacheTime = Date.now();

    res.render('index', { status });
  } catch (error) {
    res.render('index', {
      status: { status: 'unknown', error: error.message }
    });
  }
});

router.get('/api/status', async (req, res) => {
  try {
    const status = await bvgController.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Key Points:**
- Implement caching to respect rate limits
- Provide both HTML and JSON endpoints
- Handle errors gracefully
- Short cache TTL (30s) for real-time feel

## Requirements

### Functional Requirements

1. **Real-Time Status Display**
   - Description: Display bold yes/no answer to "Is BVG fucked right now?"
   - Acceptance: Page loads with clear answer based on current transit conditions
   - Criteria: Determined from delays/cancellations across major Berlin transit hubs

2. **Support Metrics Display**
   - Description: Show percentage of delayed and cancelled departures
   - Acceptance: Metrics calculated from last 60 minutes of departures
   - Criteria: Users can understand why status is "fucked" or "working"

3. **Real-Time Updates**
   - Description: Status updates automatically without manual refresh
   - Acceptance: Browser polls API every 30-60 seconds for fresh status
   - Criteria: Status changes within 1 minute of actual disruption

4. **API Endpoint**
   - Description: Provide JSON API for external integrations
   - Acceptance: `/api/status` returns JSON with current status and metrics
   - Criteria: Can be used by other applications, dashboards, automation

5. **Performance & Rate Limiting**
   - Description: Application respects BVG API rate limits and responds quickly
   - Acceptance: Server-side caching implemented; page loads in <1 second
   - Criteria: No rate limit errors despite high traffic

6. **Docker Deployment**
   - Description: Application runs in Docker container
   - Acceptance: Can build and run with `docker build` and `docker run`
   - Criteria: Container starts cleanly, exposes port 3000

### Edge Cases

1. **BVG API Unavailable** - Return "unknown" status with timestamp; allow users to refresh manually
2. **Network Latency** - Implement reasonable timeout (5 seconds) and serve cached status
3. **No Departures in Query Window** - Exclude station from calculation rather than treating as error
4. **Mixed Service Quality** - Handle case where some modes (U-Bahn) fucked but others (bus) working
5. **Weekend/Holiday Service** - Account for reduced service schedules; adjust thresholds accordingly
6. **Extreme Disruptions** - Handle case where 100% of departures cancelled (rare but possible)

## Implementation Notes

### DO
- Follow the proven isseptafucked.com pattern of bold simplicity
- Use server-side caching (in-memory or Redis) to avoid API throttling
- Query multiple transit hubs (at least 3-5 major stations) for representative sample
- Include delay data (>5 min threshold) in status determination
- Update status every 30-60 seconds via background refresh
- Test status logic against edge cases (zero departures, all cancelled, etc.)
- Use environment variables for configuration (API URL, cache TTL, thresholds)
- Deploy in Docker for consistency and scalability

### DON'T
- Query ALL stations/departures - too expensive and slow
- Show complex journey planning or route details - keep it simple
- Use live WebSocket updates - polling is simpler and sufficient
- Create user accounts or authentication - stateless is better
- Over-engineer the design - minimal is proven to work
- Hard-code magic numbers - use config for thresholds and delays
- Forget error handling - API calls can fail, network can be unreliable

## Development Environment

### Start Services

```bash
# Clone repository
git clone <your-repo-url>
cd bvg-status

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your settings (if using REST API option)

# Start development server with auto-reload
npm run dev
```

### Service URLs
- BVG Status Website: http://localhost:3000
- API Endpoint: http://localhost:3000/api/status

### Required Environment Variables
```
NODE_ENV=development
PORT=3000
BVG_API_TYPE=library  # or 'rest' if using REST API option
CACHE_TTL=30000       # milliseconds
```

If using BVG REST API option:
```
BVG_REST_API_URL=http://localhost:3000  # or deployed API endpoint
REDIS_URL=redis://localhost:6379
```

## Success Criteria

The task is complete when:

1. [ ] Analysis of isseptafucked.com completed and documented
2. [ ] BVG API capabilities explored and documented
3. [ ] Technology stack selected (REST API vs npm library decision made)
4. [ ] Express.js application created with working status endpoint
5. [ ] Status determination logic implemented and tested with sample data
6. [ ] Frontend template created with bold yes/no answer display
7. [ ] Real-time update mechanism implemented (polling)
8. [ ] API endpoint (JSON) working and tested
9. [ ] Caching implemented to handle rate limits
10. [ ] Error handling working for API failures and edge cases
11. [ ] Docker container builds and runs successfully
12. [ ] Unit tests pass (status logic, API integration)
13. [ ] Manual testing: Status changes correctly with test data
14. [ ] No console errors or warnings on startup
15. [ ] Documentation completed (README with setup instructions)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Status Determination - All Departures On Time | `tests/unit/bvgService.test.js` | Returns "working" when 0% delays, 0% cancellations |
| Status Determination - High Delays | `tests/unit/bvgService.test.js` | Returns "fucked" when delays > 30% |
| Status Determination - High Cancellations | `tests/unit/bvgService.test.js` | Returns "fucked" when cancellations > 10% |
| Status Determination - Mixed Conditions | `tests/unit/bvgService.test.js` | Correctly combines delay and cancellation metrics |
| Metrics Calculation - Accuracy | `tests/unit/bvgService.test.js` | Percentages calculated correctly from sample data |
| Error Handling - API Unavailable | `tests/unit/bvgService.test.js` | Returns "unknown" status on API failure |
| Caching - TTL Respected | `tests/unit/caching.test.js` | Cache returns stale data within TTL, refreshes after |

### Integration Tests

| Test | Components | What to Verify |
|------|------------|----------------|
| Full Status Flow | Express + bvgService + bvg-hafas/REST API | Request to `/` renders page with real BVG data |
| API Endpoint | Express + bvgService + bvg-hafas/REST API | GET `/api/status` returns valid JSON with metrics |
| BVG API Integration | bvgService + bvg-hafas/REST API | Correctly retrieves and parses departure data |
| Caching Behavior | Express + bvgService + Caching | Subsequent requests within TTL return cached status |
| Error Propagation | Express + bvgService | API errors handled gracefully with "unknown" status |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Load Status Page | 1. Open http://localhost:3000 in browser | Page loads immediately, shows YES or NO |
| View Metrics | 1. Load page 2. Look for delay/cancel percentages | Supporting metrics displayed (e.g., "45% Delayed") |
| Check Timestamp | 1. Load page 2. Scroll to bottom | Shows "Last updated: [time]" in German locale |
| Auto-Refresh | 1. Load page 2. Wait 30 seconds 3. Timestamp updates | Status and timestamp update automatically |
| API Access | 1. curl http://localhost:3000/api/status | Returns JSON with status, metrics, timestamp |
| Error Recovery | 1. Stop BVG API 2. Refresh page | Shows "unknown" status gracefully |
| Docker Deployment | 1. docker build -t bvg-status . 2. docker run -p 3000:3000 bvg-status | Container builds, runs, serves status at localhost:3000 |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Status Page | `http://localhost:3000` | ✓ Title correct ("Is BVG Fucked?") ✓ Large YES or NO visible ✓ Metrics shown ✓ Timestamp in German locale ✓ Page responsive on mobile |
| API Endpoint | `http://localhost:3000/api/status` | ✓ Valid JSON returned ✓ Contains status, metrics, timestamp ✓ Content-Type: application/json |
| Loading State | Refresh with network throttling | ✓ Graceful loading message or skeleton ✓ No console errors |

### Database Verification (If Applicable)

| Check | Command | Expected |
|-------|---------|----------|
| Not Applicable | N/A | No database required; stateless application |

### QA Sign-off Requirements

- [ ] All unit tests pass (npm test)
- [ ] All integration tests pass (npm run test:integration)
- [ ] All E2E tests pass (npm run test:e2e)
- [ ] Browser verification complete (Chrome, Firefox, Safari if possible)
- [ ] Docker image builds without errors
- [ ] Docker container runs and serves status page
- [ ] Page loads and displays status within 2 seconds
- [ ] Auto-refresh working (timestamp updates every 30-60 seconds)
- [ ] API endpoint returns valid JSON
- [ ] Error handling tested (API offline, network timeout)
- [ ] No regressions in existing functionality (N/A - greenfield)
- [ ] Code follows established patterns (Express, Pug conventions)
- [ ] No security vulnerabilities (input validation, no sensitive data in logs)
- [ ] No console errors or warnings in browser DevTools
- [ ] Performance acceptable (Lighthouse score >80)
