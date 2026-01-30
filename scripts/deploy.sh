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
