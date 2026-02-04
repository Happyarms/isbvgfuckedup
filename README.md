# 🚇 Is BVG Fucked Up?

Real-time status tracker for Berlin's BVG public transit system. Inspired by [IsSeptaFucked.com](https://www.isseptafucked.com/).

## What Is This?

A website that answers one simple question: **Is BVG fucked up right now?**

The app polls real-time departure data from major Berlin transit stations every 60 seconds and determines whether the system is running normally, degraded, or completely fucked.

### Status Examples

```
🔥  Ja, BVG ist gefickt.              — FUCKED    (>50% services disrupted)
⚠️   BVG ist ein bisschen gefickt.     — DEGRADED  (25-50% disrupted)
✅  Nein, BVG läuft.                   — FINE      (<25% disrupted)
❓  Keine Daten verfügbar.             — UNKNOWN   (no data / API down)
```

## How It Works

The application monitors departures from five major Berlin transit hubs:

- **Berlin Hauptbahnhof** (900003201)
- **Berlin Alexanderplatz** (900100003)
- **Berlin Zoologischer Garten** (900023201)
- **Berlin Friedrichstraße** (900100001)
- **Berlin Ostkreuz** (900120005)

Every 60 seconds, it fetches departure data via [hafas-client](https://github.com/public-transport/hafas-client) with the BVG profile. It counts delayed (>5 min late) and cancelled services, then calculates a disruption ratio:

```
disruption = (delayed + cancelled) / total_services
```

| Disruption Level | Status    | Meaning                      |
|------------------|-----------|------------------------------|
| >50%             | FUCKED    | Major disruptions            |
| 25–50%           | DEGRADED  | Noticeable issues            |
| <25%             | FINE      | Running normally             |
| No data          | UNKNOWN   | Cannot determine status      |

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/isbvgfuckedup.git
cd isbvgfuckedup

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

| Command             | Description                                        |
|---------------------|----------------------------------------------------|
| `npm start`         | Start the production server                        |
| `npm run dev`       | Start with auto-reload on file changes             |
| `npm test`          | Run all tests (unit + integration)                 |
| `npm run test:integration` | Run integration tests only                  |
| `npm run coverage`  | Run tests with coverage report                     |
| `npm run lint`      | Run ESLint on source and test files                |

## Environment Variables

Create a `.env` file in the project root (or copy from `.env.example`):

| Variable               | Default     | Description                                          |
|------------------------|-------------|------------------------------------------------------|
| `PORT`                 | `3000`      | Server port                                          |
| `NODE_ENV`             | `development` | Environment mode (`development` / `production`)   |
| `BVG_API_TYPE`         | `hafas`     | Data source (`hafas` recommended, or `rest-api`)     |
| `REFRESH_INTERVAL`     | `60000`     | Polling interval in milliseconds                     |
| `LOG_LEVEL`            | `info`      | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `THRESHOLD_DEGRADED`   | `0.25`      | Disruption ratio for DEGRADED status (0–1)           |
| `THRESHOLD_FUCKED`     | `0.5`       | Disruption ratio for FUCKED status (0–1)             |
| `DELAY_THRESHOLD`      | `300`       | Seconds of delay to count as disrupted               |
| `STALENESS_THRESHOLD`  | `300000`    | Max cache age in ms before marking UNKNOWN           |
| `REDIS_URL`            | —           | Redis URL (only if `BVG_API_TYPE=rest-api`)          |

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t isbvgfuckedup .

# Run the container
docker run -p 3000:3000 isbvgfuckedup
```

### With Environment Variables

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e REFRESH_INTERVAL=60000 \
  isbvgfuckedup
```

### Dockerfile Overview

The image uses `node:18-alpine` for a minimal footprint:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
```

### Deploy to Fly.io

```bash
flyctl launch
flyctl deploy
```

### Deploy to Heroku

```bash
heroku create isbvgfuckedup
git push heroku main
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│          http://localhost:3000                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│               Express Server                        │
│                src/server.js                         │
│                                                     │
│  ┌────────────────┐    ┌──────────────────────┐     │
│  │  GET /         │    │  GET /api/status      │     │
│  │  (HTML page)   │    │  (JSON + CORS)        │     │
│  └───────┬────────┘    └──────────┬───────────┘     │
│          │                        │                  │
│          └────────┬───────────────┘                  │
│                   ▼                                  │
│  ┌────────────────────────────────────────────┐     │
│  │           BVG Poller (cache)               │     │
│  │           src/services/bvg-poller.js        │     │
│  │   Polls every 60s, stores pre-computed     │     │
│  │   status in memory                          │     │
│  └───────────────┬────────────────────────────┘     │
│                  ▼                                   │
│  ┌───────────────────────┐  ┌──────────────────┐    │
│  │  BVG Client           │  │  Transit Status  │    │
│  │  src/services/        │  │  src/models/      │    │
│  │  bvg-client.js        │  │  transit-status.js│    │
│  │  (hafas-client wrapper)│  │  (status logic)  │    │
│  └───────────┬───────────┘  └──────────────────┘    │
│              │                                       │
└──────────────┼───────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│            BVG HAFAS API                            │
│  (via hafas-client with BVG profile)                │
│  5 major Berlin stations polled concurrently        │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Poll-and-cache pattern**: Background poller fetches data on a timer. Routes serve pre-computed results instantly — no API calls during request handling.
- **ESM modules**: The project uses ES modules (`import`/`export`) throughout, as required by `hafas-client` v6+.
- **Graceful degradation**: If the BVG API fails, cached data is served until it becomes stale (>5 minutes), then status becomes UNKNOWN.
- **Percentage-based thresholds**: Unlike IsSeptaFcked (which uses absolute counts), this app uses percentage-based disruption ratios — better suited for BVG's larger network.

### Project Structure

```
isbvgfuckedup/
├── src/
│   ├── server.js                 # Express app entry point
│   ├── config.js                 # Centralized environment config
│   ├── routes/
│   │   └── index.js              # Route handlers (/, /api/status)
│   ├── services/
│   │   ├── bvg-client.js         # hafas-client wrapper with timeouts
│   │   ├── bvg-poller.js         # Poll-and-cache orchestrator
│   │   └── status-text.js        # Status → CSS class, message, emoji
│   ├── models/
│   │   └── transit-status.js     # Status determination algorithm
│   ├── views/
│   │   ├── layouts/
│   │   │   └── main.pug          # Base HTML layout
│   │   ├── index.pug             # Status display page
│   │   └── error.pug             # Error fallback page
│   └── public/
│       ├── css/
│       │   └── style.css         # Status-specific styling
│       └── js/
│           └── client.js         # Auto-refresh countdown
├── tests/
│   ├── unit/
│   │   ├── transit-status.test.js
│   │   └── bvg-poller.test.js
│   ├── integration/
│   │   └── api.test.js
│   └── fixtures/
│       └── departures.js         # Mock departure data
├── Dockerfile
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── .dockerignore
├── .gitignore
├── package.json
└── README.md
```

## API Documentation

### `GET /api/status`

Returns the current BVG system status as JSON. CORS-enabled for third-party consumption.

**Response:**

```json
{
  "state": "DEGRADED",
  "metrics": {
    "totalServices": 120,
    "delayedCount": 25,
    "cancelledCount": 10,
    "disruptedCount": 35,
    "percentDelayed": 20.83,
    "percentCancelled": 8.33,
    "percentDisrupted": 29.17
  },
  "message": "BVG ist ein bisschen gefickt.",
  "timestamp": "2026-01-26T12:00:00.000Z",
  "stale": false
}
```

**Fields:**

| Field                     | Type    | Description                                   |
|---------------------------|---------|-----------------------------------------------|
| `state`                   | string  | `FUCKED`, `DEGRADED`, `FINE`, or `UNKNOWN`    |
| `metrics.totalServices`   | number  | Total departures sampled                      |
| `metrics.delayedCount`    | number  | Services delayed >5 minutes                   |
| `metrics.cancelledCount`  | number  | Cancelled services                            |
| `metrics.disruptedCount`  | number  | Delayed + cancelled                           |
| `metrics.percentDelayed`  | number  | Percentage of delayed services                |
| `metrics.percentCancelled`| number  | Percentage of cancelled services              |
| `metrics.percentDisrupted`| number  | Overall disruption percentage                 |
| `message`                 | string  | Human-readable status in German               |
| `timestamp`               | string  | ISO 8601 timestamp of last data fetch         |
| `stale`                   | boolean | `true` if data is older than staleness threshold |

### `GET /api/voice`

Returns a voice-optimized response with the current BVG status, including SSML markup for text-to-speech synthesis. CORS-enabled.

**Response:**

```json
{
  "text": "BVG ist ein bisschen gefickt.",
  "ssml": "<speak>BVG ist ein bisschen gefickt.</speak>",
  "state": "DEGRADED",
  "stale": false
}
```

**Fields:**

| Field    | Type    | Description                                            |
|----------|---------|--------------------------------------------------------|
| `text`   | string  | Plain-text status message suitable for TTS             |
| `ssml`   | string  | SSML-wrapped message for speech synthesis              |
| `state`  | string  | `FUCKED`, `DEGRADED`, `FINE`, or `UNKNOWN`             |
| `stale`  | boolean | `true` if data is older than staleness threshold       |

### `GET /`

Returns the HTML status page rendered with Pug templates. The page includes:

- Bold status display with status-specific background colors
- Disruption metrics (% delayed, % cancelled, total services)
- Last update timestamp (German locale)
- Auto-refresh countdown (60 seconds)
- Staleness warning when data is outdated

## Voice Assistant Integration

The `/api/voice` endpoint provides a voice-friendly interface to the BVG status, returning both plain text and SSML-formatted responses for use with voice assistants like Siri, Google Assistant, or Alexa. See [docs/voice-assistant-setup.md](docs/voice-assistant-setup.md) for a full setup guide, including Siri Shortcuts configuration.

## Testing

Tests use [Jest](https://jestjs.io/) with ES module support and [Supertest](https://github.com/ladjs/supertest) for HTTP assertions.

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run integration tests only
npm run test:integration
```

### Test Coverage

| Module                    | Tests | Coverage |
|---------------------------|-------|----------|
| `transit-status.js`       | 21    | Status thresholds, edge cases, metrics |
| `bvg-poller.js`           | 23    | Caching, staleness, error handling     |
| `api.test.js` (integration) | 24 | Routes, CORS, error middleware         |

## Tech Stack

| Component     | Technology                                             |
|---------------|--------------------------------------------------------|
| Runtime       | [Node.js](https://nodejs.org/) v18+                   |
| Framework     | [Express.js](https://expressjs.com/) v4                |
| Templates     | [Pug](https://pugjs.org/) v3                           |
| Transit Data  | [hafas-client](https://github.com/public-transport/hafas-client) v6 (BVG profile) |
| Logging       | [Morgan](https://github.com/expressjs/morgan)          |
| Testing       | [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) |
| Linting       | [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) |
| Container     | [Docker](https://www.docker.com/) (node:18-alpine)    |

## Credits & References

- **Inspiration**: [IsSeptaFucked.com](https://www.isseptafucked.com/) by [Doug Muth](https://github.com/dmuth/IsSeptaFcked) — the original transit status tracker for Philadelphia's SEPTA
- **Transit Data**: [hafas-client](https://github.com/public-transport/hafas-client) by [Jannis R](https://github.com/derhuerst) — a JavaScript client for HAFAS public transport APIs
- **BVG Profile**: [hafas-client BVG profile](https://github.com/public-transport/hafas-client/blob/main/p/bvg/readme.md) — Berlin transit integration
- **BVG REST API**: [bvg-rest](https://github.com/derhuerst/bvg-rest) by Jannis R — alternative REST API for BVG

## License

MIT
