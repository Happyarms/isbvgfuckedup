# Is BVG Fucked Up?

A real-time status page for Berlin's public transport system (BVG). Checks live departure data and gives you a bold, unmistakable answer: **YES**, **NAJA…**, or **NEIN**.

Pure static website — just HTML, CSS, and vanilla JavaScript. No build step, no dependencies, no server-side runtime.

## Features

- **Real-time monitoring** — fetches live departure data from the VBB Transport REST API
- **Bold YES/NO display** — instantly see whether BVG is fucked right now
- **Auto-refresh** — status updates every 60 seconds without reloading the page
- **Responsive design** — works on desktop, tablet, and mobile
- **Zero dependencies** — no frameworks, no libraries, no build tools

## How It Works

1. Your browser fetches real-time departure data from the [VBB Transport REST API](https://v6.vbb.transport.rest) for 4 major Berlin stations
2. The JavaScript analyzes all departures — counting delays (>5 minutes) and cancellations
3. A disruption percentage is computed from delayed + cancelled departures
4. The page displays the result with color-coded status and supporting metrics

Everything runs client-side. There is no backend.

## Status Thresholds

| Disruption Level | Threshold | Status | Display |
|---|---|---|---|
| Normal | < 30% disrupted | `NEIN` | Green |
| Degraded | 30–60% disrupted | `NAJA…` | Yellow |
| Fucked | > 60% disrupted | `JA!` | Red |

**Delay threshold:** A departure counts as delayed if it is more than **5 minutes** (300 seconds) behind schedule. Cancelled departures always count as disrupted.

## File Structure

```
isbvgfuckedup/
├── index.html           # Main HTML page
├── css/
│   └── style.css        # All styles — bold, minimalist design
├── js/
│   └── app.js           # All JavaScript — API calls, status logic, DOM updates
├── nginx-site.conf      # nginx configuration (static file serving)
├── DEPLOYMENT.md        # Production deployment guide
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

## Development

No installation required. Just serve the files:

```bash
# Option 1: Python HTTP server
python3 -m http.server 8080

# Option 2: Open directly in your browser
open index.html
# (or double-click index.html on Windows)
```

Then visit [http://localhost:8080](http://localhost:8080).

The VBB API has CORS enabled, so `fetch()` calls work from any origin — including `file://`.

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions on deploying to a server with nginx.

The short version:

```bash
# Copy files to the web root
sudo cp -r index.html css/ js/ /var/www/isbvgfuckedup/

# Copy nginx config
sudo cp nginx-site.conf /etc/nginx/sites-available/isbvgfuckedup
sudo ln -s /etc/nginx/sites-available/isbvgfuckedup /etc/nginx/sites-enabled/

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Monitored Stations

| Station | VBB Station ID |
|---|---|
| Berlin Hauptbahnhof | `900003201` |
| Alexanderplatz | `900100003` |
| Zoologischer Garten | `900023201` |
| Friedrichstrasse | `900100001` |

These four major stations provide a representative sample of BVG service across Berlin.

## VBB API

This site uses the **VBB Transport REST API** to fetch real-time departure data.

- **Base URL:** `https://v6.vbb.transport.rest`
- **Documentation:** [https://v6.vbb.transport.rest](https://v6.vbb.transport.rest)
- **Key endpoint:** `GET /stops/{stationId}/departures?duration=30&results=50`
- **Authentication:** None required
- **CORS:** Enabled
- **Rate limit:** 100 requests/minute per client IP

Each visitor's browser makes its own API calls (4 stations every 60 seconds = 4 req/min), well within the rate limit.

## License

MIT
