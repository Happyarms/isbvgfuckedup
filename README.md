# Is BVG Fucked Up?

[![CI Status](https://github.com/Happyarms/isbvgfuckedup/actions/workflows/ci.yml/badge.svg)](https://github.com/Happyarms/isbvgfuckedup/actions/workflows/ci.yml)

A real-time status page for Berlin's public transport system (BVG). Checks live departure data and gives you a bold, unmistakable answer: **YES**, **NAJA…**, or **NEIN**.

**Pure static website** — just HTML, CSS, and vanilla JavaScript. No build step, no backend server, no Node.js runtime in production.

## Features

- **Real-time monitoring** — fetches live departure data from the VBB Transport REST API
- **Bold YES/NO display** — instantly see whether BVG is fucked right now
- **Auto-refresh** — status updates every 60 seconds without reloading the page
- **Responsive design** — works on desktop, tablet, and mobile
- **Zero dependencies in production** — no frameworks, no libraries, no build tools
- **CI/CD Pipeline** — automated testing and deployment with GitHub Actions

## How It Works

1. Your browser fetches real-time departure data from the [VBB Transport REST API](https://v6.vbb.transport.rest) for 4 major Berlin stations
2. The JavaScript analyzes all departures — counting delays (>5 minutes) and cancellations
3. A disruption percentage is computed from delayed + cancelled departures
4. The page displays the result with color-coded status and supporting metrics

**Everything runs client-side. There is no backend.**

## Development

### Prerequisites

- **For running tests only**: Node.js 18+ and npm
- **For production deployment**: Just nginx (no Node.js needed)

### Running Tests Locally

```bash
# Install test dependencies (Jest)
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Note: npm and Node.js are **only needed for running tests**, not for production deployment.

## Production Deployment

This is a static website served by nginx. No Node.js runtime, PM2, or npm packages are needed in production.

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md)** for nginx deployment guide.

## GitHub Actions CI/CD

This project uses GitHub Actions for continuous integration and deployment.

### CI Workflow

- **Triggers**: On push to `main` or pull request to `main`
- **Actions**: Installs test dependencies and runs Jest tests
- **Purpose**: Ensures client-side JavaScript logic works correctly

### CD Workflow

- **Triggers**: On push to `main` branch
- **Actions**: SSHs to production server, pulls latest code, verifies site is accessible
- **Purpose**: Automatically deploys static files to nginx

### Required GitHub Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEPLOY_SSH_KEY` | SSH private key for server access | Contents of `~/.ssh/id_ed25519` |
| `DEPLOY_HOST` | Production server hostname or IP | `example.com` or `192.168.1.100` |
| `DEPLOY_USER` | SSH username | `deploy` or `ubuntu` |
| `DEPLOY_PATH` | Path to nginx web root | `/var/www/isbvgfuckedup` |

**See [.github/DEPLOYMENT.md](.github/DEPLOYMENT.md)** for full CI/CD setup instructions.

## File Structure

```
isbvgfuckedup/
├── index.html              # Main HTML page
├── css/
│   └── style.css           # All styles — bold, minimalist design
├── js/
│   └── app.js              # All JavaScript — API calls, status logic, DOM updates
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # GitHub Actions CI workflow
│   │   └── deploy.yml      # GitHub Actions CD workflow
│   └── DEPLOYMENT.md       # CI/CD setup guide
├── scripts/
│   └── deploy.sh           # Deployment script (for static site)
├── nginx-site.conf         # nginx configuration example
├── package.json            # Test dependencies only (Jest)
├── jest.config.js          # Jest test configuration
├── tests/                  # Jest tests for client-side JavaScript
├── DEPLOYMENT.md           # nginx deployment guide
├── README.md               # This file
└── .gitignore              # Git ignore rules
```

## Tech Stack

- **Client-Side**: Pure HTML, CSS, vanilla JavaScript (ES6+)
- **API**: VBB Transport REST API (external, third-party)
- **Testing**: Jest (development only)
- **Production Server**: nginx (static file serving)
- **CI/CD**: GitHub Actions

No backend runtime. No build step. No npm packages in production.
