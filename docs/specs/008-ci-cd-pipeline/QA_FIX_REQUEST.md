# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29T15:15:00Z
**QA Session**: 1

## Executive Summary

The CI/CD pipeline implementation is **fundamentally incorrect**. It was built for a Node.js/Express application with PM2 deployment, but the actual project is a **static HTML/CSS/JavaScript website** served by nginx with no backend server.

**Required Action**: Complete rewrite of deployment strategy to match static site architecture.

---

## Critical Issues to Fix

### 1. Fix CI Workflow - Remove Missing Lint Command

**Problem**: CI workflow runs `npm run lint` but this script doesn't exist in package.json.

**Location**: `.github/workflows/ci.yml` (lines 31-32)

**Required Fix**:

Remove the lint step from the CI workflow:

```yaml
# BEFORE (WRONG):
    - name: Run linter
      run: npm run lint

    - name: Run tests
      run: npm test

# AFTER (CORRECT):
    - name: Run tests
      run: npm test
```

Or alternatively, if you want to add a linter:

1. Install ESLint: Add to package.json devDependencies
2. Create `.eslintrc.json` configuration
3. Add `"lint": "eslint js/**/*.js"` to package.json scripts
4. Keep the lint step in CI workflow

**Verification**:
- Push to test branch and create PR
- CI workflow should pass without "Missing script: lint" error
- `npm test` should run successfully

---

### 2. Completely Rewrite Deployment Script for Static Site

**Problem**: `scripts/deploy.sh` is designed for Node.js/PM2 application but should deploy static files to nginx.

**Location**: `scripts/deploy.sh` (entire file)

**Current script** (WRONG - uses PM2 and npm):
- Checks for npm and PM2 installation
- Runs `npm ci --production`
- Restarts application with `pm2 restart`
- Checks health at `http://localhost:3000/api/status`

**Required Fix**:

Replace the entire deployment script with static site deployment:

```bash
#!/usr/bin/env bash

# Deployment script for static BVG Status Website
# Deploys static HTML/CSS/JS files served by nginx
# Usage: ./scripts/deploy.sh

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
# DEPLOY_DIR is the nginx web root where static files are served from
# Default: /var/www/isbvgfuckedup (standard nginx web root)
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/isbvgfuckedup}"

# SITE_URL is used for health checks after deployment
# Can be localhost, domain.com, or full URL
SITE_URL="${SITE_URL:-http://localhost}"

# Main deployment process
main() {
    log_info "Starting deployment of static BVG status website..."

    # Check required commands
    if ! command -v git >/dev/null 2>&1; then
        log_error "git is not installed"
        exit 1
    fi

    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is not installed"
        exit 1
    fi

    # Ensure we're in a git repository
    if [ ! -d .git ]; then
        log_error "Not in a git repository. Run this script from the project root."
        exit 1
    fi

    # Pull latest changes from git
    log_info "Pulling latest changes from git..."
    if ! git pull; then
        log_error "Failed to pull latest changes"
        exit 1
    fi

    # For static sites, NO npm install or PM2 restart is needed!
    # Files are served directly by nginx from disk.

    # Optional: Copy files to nginx web root (only if running outside web root)
    CURRENT_DIR="$(pwd)"
    if [ "$CURRENT_DIR" != "$DEPLOY_DIR" ]; then
        log_info "Current directory is $CURRENT_DIR"
        log_info "Copying static files to nginx web root: $DEPLOY_DIR"

        # Ensure target directory exists
        if [ ! -d "$DEPLOY_DIR" ]; then
            log_error "Deploy directory $DEPLOY_DIR does not exist"
            exit 1
        fi

        # Copy static files
        cp -v index.html "$DEPLOY_DIR/" || { log_error "Failed to copy index.html"; exit 1; }
        cp -rv css/ "$DEPLOY_DIR/" || { log_error "Failed to copy css/"; exit 1; }
        cp -rv js/ "$DEPLOY_DIR/" || { log_error "Failed to copy js/"; exit 1; }

        log_info "Static files copied successfully"
    else
        log_info "Already in nginx web root directory, no copy needed"
    fi

    # Verify deployment by checking if site is accessible
    log_info "Verifying deployment..."

    # Test if index.html is accessible
    if curl -sf "$SITE_URL" > /dev/null 2>&1; then
        log_info "✓ Site is accessible at $SITE_URL"
    else
        log_warning "Site check failed for $SITE_URL"
        log_warning "This may be expected if nginx is configured for a specific domain"
        log_warning "Verify manually: curl $SITE_URL"
    fi

    # Optional: Test specific files
    if curl -sf "$SITE_URL/css/style.css" > /dev/null 2>&1; then
        log_info "✓ CSS files are accessible"
    fi

    if curl -sf "$SITE_URL/js/app.js" > /dev/null 2>&1; then
        log_info "✓ JavaScript files are accessible"
    fi

    log_info "========================================"
    log_info "Deployment completed successfully!"
    log_info "========================================"
    log_info "Static website is now serving latest code"
    log_info "No application restart needed (nginx serves files directly)"
}

# Run main function
main "$@"
```

**Key Changes**:
1. ✅ Removed npm and PM2 checks (not needed for static site)
2. ✅ Removed `npm ci --production` (no dependencies to install)
3. ✅ Removed `pm2 restart` (no Node.js process to restart)
4. ✅ Changed health check from `/api/status` to root URL `/`
5. ✅ Added logic to copy files to nginx web root if needed
6. ✅ Simplified to just: git pull + verify site accessibility

**Verification**:
```bash
# Test deployment script syntax
bash -n scripts/deploy.sh

# Test on production server
ssh user@server
cd /var/www/isbvgfuckedup
bash scripts/deploy.sh

# Expected output:
# [INFO] Pulling latest changes from git...
# [INFO] Already in nginx web root directory, no copy needed
# [INFO] Verifying deployment...
# [INFO] ✓ Site is accessible at http://localhost
# [INFO] Deployment completed successfully!
```

---

### 3. Fix CD Workflow Health Check

**Problem**: CD workflow checks `http://localhost:3000/api/status` which doesn't exist on static site.

**Location**: `.github/workflows/deploy.yml` (lines 37-42)

**Required Fix**:

Change the health check to verify static site is accessible:

```yaml
# BEFORE (WRONG - checks non-existent API):
- name: Verify deployment
  run: |
    echo "Waiting for application to be ready..."
    sleep 10
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "curl -f http://localhost:3000/api/status || exit 1"
    echo "Deployment successful!"

# AFTER (CORRECT - checks static site):
- name: Verify deployment
  run: |
    echo "Verifying static site is accessible..."
    sleep 3
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "curl -sf http://localhost/ > /dev/null || exit 1"
    echo "Deployment successful! Static site is accessible."
```

**Notes**:
- Changed from port 3000 to root `/` (nginx default port 80)
- Reduced sleep from 10s to 3s (no application startup time for static site)
- Changed to `curl -sf` (silent, fail on error)
- Updated message to reflect static site deployment

**Alternative** (if site is only accessible via domain):
```yaml
- name: Verify deployment
  run: |
    echo "Verifying static site is accessible..."
    # Check via actual domain if localhost doesn't work
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "curl -sf https://your-domain.com/ > /dev/null || exit 1"
    echo "Deployment successful!"
```

**Verification**: Trigger CD workflow manually and verify health check passes

---

### 4. Fix README Documentation

**Problem**: README describes Express.js/Node.js application but project is static HTML site.

**Location**: `README.md` (lines 1-100)

**Required Fix**:

Replace the incorrect Node.js application description with accurate static site description. The master branch README is correct - revert to it or update based on master:

```markdown
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
```

**Key Changes**:
1. ✅ Removed Express.js references
2. ✅ Removed PM2 references
3. ✅ Removed API endpoint documentation (no backend)
4. ✅ Clarified Node.js is only for tests, not production
5. ✅ Updated deployment section for static site

**Verification**: Read README and verify it accurately describes static site architecture

---

### 5. Fix .github/DEPLOYMENT.md Documentation

**Problem**: Deployment guide describes Node.js/PM2 deployment but should describe static site deployment.

**Location**: `.github/DEPLOYMENT.md`

**Required Fix**:

Update the deployment guide to reflect static site deployment process:

**Key sections to change**:

1. **Prerequisites** - Remove Node.js, PM2, npm requirements
2. **Production server setup** - Remove nvm and PM2 installation steps
3. **Deployment script testing** - Update expected output (no PM2 restart)
4. **Health check verification** - Change from `http://localhost:3000/api/status` to root URL

**Example changes needed**:

```markdown
## Prerequisites

Before configuring the GitHub Actions pipeline, ensure you have:

- GitHub repository with Actions enabled
- Production server with nginx installed and configured
- SSH access to your production server
- SSH key pair for automated deployment

# REMOVE these:
# - Production server deployed and running (see DEPLOYMENT.md)
# - PM2 installed on production server
# - Node.js 18+ installed via nvm
```

```markdown
## Step 3: Verify Production Server Setup

### Check Deployment Script Exists

The CD workflow executes `scripts/deploy.sh` on your production server:

```bash
# SSH into production server
ssh your-username@your-server.com

# Navigate to nginx web root
cd /var/www/isbvgfuckedup  # Use your DEPLOY_PATH

# Check if deploy script exists
ls -lh scripts/deploy.sh
```

### Test Deployment Script Manually

```bash
# Run deployment script
bash scripts/deploy.sh
```

**Expected output:**
```
[INFO] Starting deployment of static BVG status website...
[INFO] Pulling latest changes from git...
Already up to date.
[INFO] Verifying deployment...
[INFO] ✓ Site is accessible at http://localhost
[INFO] Deployment completed successfully!
```

**Success criteria:**
- Script completes without errors
- Site remains accessible
- No PM2 or npm references in output

# REMOVE these checks:
# - PM2 shows application online: pm2 status
# - Health endpoint responds: curl http://localhost:3000/api/status
```

**Verification**: Follow updated deployment guide and verify all steps work for static site

---

### 6. Remove or Fix ecosystem.config.js

**Problem**: `ecosystem.config.js` references `src/server.js` which doesn't exist. This file is not needed for static sites.

**Location**: `ecosystem.config.js` (in master branch, not modified by this spec)

**Required Fix**:

**Option A** (Recommended): Remove the file entirely:
```bash
git rm ecosystem.config.js
# Commit with message explaining it's not needed for static site
```

**Option B**: Update deployment script to not reference it:
- Already done if you implement Fix #2 (rewritten deployment script doesn't use PM2)

**Verification**: Ensure deployment script doesn't fail looking for ecosystem.config.js

---

## After Fixes

Once you've implemented all fixes:

### 1. Commit Your Changes

```bash
git add .github/workflows/ci.yml
git add .github/workflows/deploy.yml
git add scripts/deploy.sh
git add README.md
git add .github/DEPLOYMENT.md

git commit -m "fix: correct CI/CD pipeline for static site deployment (qa-requested)

- Remove npm run lint from CI (script doesn't exist)
- Rewrite deployment script for static site (remove PM2/npm)
- Fix CD health check to test static site root URL
- Update README to accurately describe static site architecture
- Update deployment documentation for nginx static file serving

Addresses QA feedback: Project is static HTML site, not Node.js app"
```

### 2. Test CI Workflow

```bash
# Push to your branch
git push origin auto-claude/008-ci-cd-pipeline

# Create PR to main (or push directly to main if allowed)
# Monitor GitHub Actions to verify CI passes
```

### 3. Test Deployment Script Locally

```bash
# Test syntax
bash -n scripts/deploy.sh

# If you have access to a test server:
ssh test-server
cd /var/www/test-site
# Create test git repo
git clone <your-repo> .
bash scripts/deploy.sh
```

### 4. Test CD Workflow

```bash
# Configure GitHub Secrets (if not already done)
# Trigger workflow manually via workflow_dispatch
# Monitor workflow logs to verify deployment succeeds
```

### 5. Verify End-to-End

```bash
# Make a small change (e.g., update index.html)
# Push to main
# Verify:
# 1. CI workflow passes
# 2. CD workflow deploys
# 3. Production site shows changes
```

---

## Testing Checklist

Before requesting QA re-review, verify:

- [ ] `bash -n scripts/deploy.sh` shows no syntax errors
- [ ] `git diff master...HEAD` shows only intended changes
- [ ] README accurately describes static site (no Express.js references)
- [ ] CI workflow YAML is valid: `cat .github/workflows/ci.yml`
- [ ] CD workflow YAML is valid: `cat .github/workflows/deploy.yml`
- [ ] No references to PM2 in deployment files
- [ ] No references to port 3000 or /api/status in health checks
- [ ] Deployment script only uses git pull + file verification
- [ ] Documentation matches static site architecture

---

## Questions or Issues?

If you encounter issues implementing these fixes:

1. **Check the master branch** for reference:
   - `git show master:README.md` - Correct static site description
   - `git show master:DEPLOYMENT.md` - Correct nginx deployment guide
   - `git show master:index.html` - Verify this is the main file

2. **Verify project type**:
   ```bash
   git ls-tree -r --name-only master | grep -E "server\.js|app\.js|express"
   # Should return nothing - no backend files exist

   git ls-tree -r --name-only master | grep -E "index\.html|css/|js/"
   # Should show static files
   ```

3. **Review static site characteristics**:
   - ✓ HTML/CSS/JS served by nginx
   - ✓ Client-side JavaScript calls external API (VBB Transport REST)
   - ✓ No backend server process
   - ✓ No npm packages needed in production
   - ✓ No PM2 process manager
   - ✗ NOT a Node.js application
   - ✗ NOT an Express.js server
   - ✗ NO API endpoints served by this project

---

## Summary

**Core Issue**: Wrong project type assumption (Node.js app vs static site)

**Required Fixes**: 6 critical fixes
1. Remove `npm run lint` from CI workflow
2. Rewrite deployment script for static site (remove PM2/npm)
3. Fix CD health check (no /api/status endpoint)
4. Update README (remove Express.js references)
5. Update .github/DEPLOYMENT.md (remove PM2/Node.js steps)
6. Remove or ignore ecosystem.config.js (not needed)

**Estimated Time**: 2-3 hours

**Verification**: Test CI, test deployment script, test CD, verify documentation

---

After implementing fixes, QA will automatically re-run and verify:
- CI workflow passes
- Deployment script works on static site
- CD workflow deploys successfully
- Documentation accurately describes project
- No Node.js/PM2 references remain in deployment code

Good luck with the fixes! 🚀
