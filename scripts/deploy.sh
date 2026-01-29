#!/usr/bin/env bash

# Deployment script for BVG Status Monitor
# This script automates the deployment process on the production server
# Usage: ./scripts/deploy.sh

set -e  # Exit immediately if a command exits with a non-zero status
set -u  # Treat unset variables as an error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
APP_NAME="isbvgfuckedup"
HEALTH_ENDPOINT="http://localhost:3000/api/status"
MAX_RETRIES=5
RETRY_DELAY=2

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for application to be healthy
wait_for_health() {
    local retries=0
    log_info "Waiting for application to be healthy..."

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
            log_info "Application is healthy"
            return 0
        fi

        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            log_warning "Health check failed, retrying in ${RETRY_DELAY}s... (${retries}/${MAX_RETRIES})"
            sleep $RETRY_DELAY
        fi
    done

    log_error "Application failed to become healthy after ${MAX_RETRIES} attempts"
    return 1
}

# Main deployment process
main() {
    log_info "Starting deployment of ${APP_NAME}..."

    # Check required commands are available
    if ! command_exists git; then
        log_error "git is not installed"
        exit 1
    fi

    if ! command_exists npm; then
        log_error "npm is not installed. Please install Node.js via nvm"
        exit 1
    fi

    if ! command_exists pm2; then
        log_error "pm2 is not installed. Run: npm install -g pm2"
        exit 1
    fi

    if ! command_exists curl; then
        log_error "curl is not installed"
        exit 1
    fi

    # Ensure we're in a git repository
    if [ ! -d .git ]; then
        log_error "Not in a git repository. Run this script from the project root"
        exit 1
    fi

    # Step 1: Pull latest changes
    log_info "Pulling latest changes from git..."
    if ! git pull; then
        log_error "Failed to pull latest changes"
        exit 1
    fi

    # Step 2: Install dependencies
    log_info "Installing production dependencies..."
    if ! npm ci --production; then
        log_error "Failed to install dependencies"
        exit 1
    fi

    # Step 3: Restart application with PM2
    log_info "Restarting application with PM2..."
    if ! pm2 restart "$APP_NAME" 2>/dev/null; then
        log_warning "Application not found in PM2, attempting to start..."
        if [ -f ecosystem.config.js ]; then
            if ! pm2 start ecosystem.config.js; then
                log_error "Failed to start application"
                exit 1
            fi
        else
            log_error "ecosystem.config.js not found"
            exit 1
        fi
    fi

    # Step 4: Wait for application to be healthy
    if ! wait_for_health; then
        log_error "Deployment failed: application is not healthy"
        log_info "Checking PM2 logs..."
        pm2 logs "$APP_NAME" --lines 50 --nostream || true
        exit 1
    fi

    # Step 5: Verify deployment
    log_info "Verifying deployment..."

    # Check PM2 status
    log_info "PM2 status:"
    pm2 status "$APP_NAME"

    # Display recent logs
    log_info "Recent application logs:"
    pm2 logs "$APP_NAME" --lines 20 --nostream

    # Test health endpoint
    log_info "Health check response:"
    curl -s "$HEALTH_ENDPOINT" | grep -o '"status":"ok"' && log_info "Health endpoint verified" || log_error "Health endpoint check failed"

    # Save PM2 configuration
    log_info "Saving PM2 configuration..."
    pm2 save

    log_info "Deployment completed successfully!"
    log_info "Application ${APP_NAME} is now running"
}

# Run main function
main "$@"
