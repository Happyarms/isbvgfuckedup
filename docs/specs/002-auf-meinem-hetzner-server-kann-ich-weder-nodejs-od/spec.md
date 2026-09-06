# Specification: Deploy Node.js Application on Hetzner Server Without Docker

## Overview

This task addresses the deployment constraint where Node.js and Docker are unavailable on the Hetzner server. The solution involves installing Node.js via nvm (Node Version Manager) without requiring root access, then deploying the existing Express.js BVG API monitoring application using PM2 process manager and nginx as a reverse proxy. This approach eliminates the need for Docker containerization while maintaining production-grade reliability and performance.

## Workflow Type

**Type**: feature

**Rationale**: While the existing application code requires no changes, this task implements a new deployment infrastructure and process. It introduces new capabilities (nvm-based Node.js installation, PM2 process management, nginx reverse proxy configuration) that enable the application to run in a constrained hosting environment. This qualifies as a feature rather than a refactor or investigation because it delivers new deployment functionality.

## Task Scope

### Services Involved
- **main** (primary) - Express.js backend serving BVG departure status via hafas-client

### This Task Will:
- [ ] Install Node.js 18+ via nvm (user-level, no root required)
- [ ] Configure PM2 process manager for automatic restarts and daemonization
- [ ] Set up nginx or Caddy reverse proxy to forward traffic from port 80/443 to port 3000
- [ ] Configure SSL/TLS certificates via Let's Encrypt (Certbot)
- [ ] Deploy application dependencies and start the Express server
- [ ] Verify BVG API integration works in production environment
- [ ] Document deployment commands and troubleshooting steps

### Out of Scope:
- Modifying application source code
- Creating new features or API endpoints
- Database setup (application has no database)
- Multi-server deployment or load balancing
- Docker containerization (explicitly avoiding due to constraint)
- Installing Node.js system-wide with root access

## Service Context

### main

**Tech Stack:**
- Language: JavaScript (ESM modules, not CommonJS)
- Framework: Express 4.21.2
- Key dependencies: hafas-client 6.3.6 (BVG API), Pug (templating), dotenv (config)
- Testing: Jest with Supertest
- Linting: ESLint + Prettier
- Key directories: `src/` (source code), `tests/` (test suite)

**Entry Point:** `src/server.js`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000 (configurable via PORT environment variable)

**API Routes:**
- `GET /` - Home page showing BVG status
- `GET /api/status` - JSON endpoint for programmatic access

**Environment Variables Required:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (production/development)
- `BVG_API_TYPE` - BVG API profile type
- `REFRESH_INTERVAL` - Data refresh interval in milliseconds
- `LOG_LEVEL` - Logging verbosity
- `THRESHOLD_DEGRADED` - Threshold for degraded status
- `THRESHOLD_FUCKED` - Threshold for critical status
- `DELAY_THRESHOLD` - Delay threshold in minutes
- `STALENESS_THRESHOLD` - Data staleness threshold in minutes

## Files to Modify

**Note:** This is an infrastructure deployment task. No application source files require modification. All changes are server-level configuration.

| File | Location | What to Change |
|------|---------|---------------|
| `.env` | Server: `/home/[user]/isbvgfuckedup/.env` | Create production environment configuration with all required variables |
| `ecosystem.config.js` | Server: `/home/[user]/isbvgfuckedup/ecosystem.config.js` | Create PM2 configuration file (new file) |
| `nginx.conf` or site config | Server: `/etc/nginx/sites-available/isbvgfuckedup` | Create nginx reverse proxy configuration (requires sudo or hosting panel) |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `.env.example` | Environment variable structure and naming conventions |
| `package.json` | Node.js version requirement (>=18.0.0), script commands, dependencies |
| `Dockerfile` | Port exposure (3000), entry point command, though Docker itself won't be used |
| `src/config/index.js` | Configuration management pattern using dotenv |
| `src/services/bvgService.js` | BVG API integration that must work in production |

## Patterns to Follow

### Node.js Installation via nvm

**Pattern:** User-level installation without root access

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Load nvm into shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 18 (required by package.json)
nvm install 18
nvm use 18
nvm alias default 18
```

**Key Points:**
- NEVER use `sudo` with nvm - it's designed for per-user installation
- nvm modifies `~/.bashrc` or `~/.zshrc` automatically
- Verify installation: `node --version` should show v18.x.x

### PM2 Process Management

**Pattern:** Daemonize Node.js application with auto-restart

```bash
# Install PM2 globally (user-level via nvm)
npm install -g pm2

# Start application
pm2 start src/server.js --name isbvgfuckedup

# Save PM2 process list
pm2 save

# Generate startup script (auto-start on reboot)
pm2 startup
# Follow the command PM2 outputs
```

**Key Points:**
- PM2 restarts app on crashes
- `pm2 logs` shows application output
- `pm2 monit` provides real-time monitoring
- Use `pm2 restart isbvgfuckedup` after code updates

### nginx Reverse Proxy Configuration

**Pattern:** Forward external traffic to Express.js on port 3000

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Key Points:**
- Express app has `app.set('trust proxy', true)` already enabled
- SSL/TLS can be added via Certbot: `certbot --nginx -d your-domain.com`
- nginx must be installed and running (may require hosting provider support)

### Environment Configuration

**Pattern:** Production `.env` file based on `.env.example`

```bash
PORT=3000
NODE_ENV=production
BVG_API_TYPE=vbb
REFRESH_INTERVAL=60000
LOG_LEVEL=info
THRESHOLD_DEGRADED=0.3
THRESHOLD_FUCKED=0.6
DELAY_THRESHOLD=5
STALENESS_THRESHOLD=10
```

**Key Points:**
- Use `production` for NODE_ENV to disable verbose logging
- REFRESH_INTERVAL: Recommended 30000-60000ms (30-60 seconds) to avoid rate limiting
- Thresholds are percentages/minutes - follow existing conventions

## Requirements

### Functional Requirements

1. **Node.js Runtime Availability**
   - Description: Install Node.js 18+ via nvm without requiring root/sudo access
   - Acceptance: `node --version` returns v18.x.x, `npm --version` returns compatible version

2. **Application Deployment**
   - Description: Deploy Express.js application with all dependencies installed
   - Acceptance: `npm ci --production` completes successfully, all node_modules present

3. **Process Management**
   - Description: Application runs as a daemon, auto-restarts on failure, survives server reboots
   - Acceptance: `pm2 status` shows app running, `pm2 logs` shows no errors, app accessible after simulated crash

4. **Web Server Reverse Proxy**
   - Description: nginx forwards port 80/443 traffic to Node.js on port 3000
   - Acceptance: External HTTP request to domain returns Express response, headers show correct proxy configuration

5. **BVG API Integration**
   - Description: hafas-client successfully queries BVG departures in production environment
   - Acceptance: `GET /api/status` returns valid BVG departure data, no API errors in logs

6. **SSL/TLS Certificate**
   - Description: HTTPS enabled via Let's Encrypt certificate
   - Acceptance: `https://your-domain.com` works without browser warnings, certificate valid for 90 days

### Edge Cases

1. **nvm Shell Integration** - If nvm commands not found after installation, manually source `~/.nvm/nvm.sh` or restart shell session
2. **PM2 Startup Persistence** - If server uses non-standard init system, `pm2 startup` may fail; manually add PM2 to cron with `@reboot` directive
3. **nginx Configuration Permissions** - If no sudo access, use Hetzner hosting panel (konsoleH or similar) to configure reverse proxy
4. **BVG API Rate Limiting** - If 429 errors occur, increase REFRESH_INTERVAL to reduce request frequency
5. **Port 3000 Already in Use** - Check for conflicting processes with `lsof -i :3000`, kill or change PORT environment variable
6. **Alpine Linux Compatibility** - If server uses Alpine, use `nvm install -s 18` to compile from source (musl libc compatibility)
7. **Hetzner Shared Hosting Limitation** - If konsoleH Node.js activation required, it will disable PHP on the same domain

## Implementation Notes

### DO
- Follow nvm installation exactly as documented (curl command, no sudo)
- Use `npm ci --production` for deployment (faster, deterministic)
- Set NODE_ENV=production in .env file
- Configure PM2 with `pm2 save` and `pm2 startup` for persistence
- Test BVG API connectivity before considering deployment complete
- Use `pm2 logs --lines 100` to check for startup errors
- Verify all environment variables from .env.example are present in production .env
- Keep nginx proxy headers (X-Forwarded-For, X-Real-IP) - Express app expects them

### DON'T
- Install nvm with sudo (breaks user-level isolation)
- Use Docker (explicit constraint - unavailable on server)
- Skip PM2 startup configuration (app won't survive reboots)
- Expose port 3000 directly to internet (use nginx reverse proxy)
- Use `npm install` instead of `npm ci` in production
- Set NODE_ENV=development in production
- Activate konsoleH Node.js if PHP must remain active on the domain
- Forget to copy .env.example to .env (app will crash without environment variables)

## Development Environment

### Start Services

**Local Development:**
```bash
npm install
npm run dev
```

**Production Deployment:**
```bash
# SSH into Hetzner server
ssh user@your-server.com

# Navigate to project directory
cd ~/isbvgfuckedup

# Install dependencies (production only)
npm ci --production

# Start with PM2
pm2 start src/server.js --name isbvgfuckedup
pm2 save
```

### Service URLs
- **Local Development:** http://localhost:3000
- **Production:** http://your-domain.com (via nginx) → http://localhost:3000 (Express)

### Required Environment Variables
See `.env.example` for complete list:
- `PORT=3000`
- `NODE_ENV=production`
- `BVG_API_TYPE=vbb`
- `REFRESH_INTERVAL=60000`
- `LOG_LEVEL=info`
- `THRESHOLD_DEGRADED=0.3`
- `THRESHOLD_FUCKED=0.6`
- `DELAY_THRESHOLD=5`
- `STALENESS_THRESHOLD=10`

## Success Criteria

The task is complete when:

1. [ ] Node.js 18+ installed via nvm, accessible in user's shell session
2. [ ] Application dependencies installed with `npm ci --production`
3. [ ] PM2 running application as daemon, survives kill -9 and server reboot
4. [ ] nginx reverse proxy forwards traffic from domain to port 3000
5. [ ] HTTPS enabled with valid Let's Encrypt certificate
6. [ ] `GET /api/status` returns valid BVG departure data
7. [ ] No console errors in `pm2 logs isbvgfuckedup`
8. [ ] Application accessible from external network via domain name
9. [ ] Environment variables properly configured in production `.env`
10. [ ] Documentation created for future deployments and troubleshooting

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| All Jest tests | `tests/**/*.test.js` | All unit tests pass with `npm test` (run locally before deployment) |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| BVG API connectivity | main ↔ hafas-client | hafas-client successfully queries BVG API, returns departure data |
| Express routing | main internal | Both `/` and `/api/status` routes respond correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Home page load | 1. Visit root URL 2. Check rendered Pug template | Page displays BVG status with departure information |
| API endpoint | 1. GET /api/status 2. Parse JSON response | Valid JSON with `departures` array and timestamps |
| Status calculation | 1. API returns delayed departures 2. Check status color | Status correctly calculated based on thresholds |

### Server Verification (Deployment-Specific)
| Check | Command | Expected |
|-------|---------|----------|
| Node.js installed | `node --version` | v18.x.x or higher |
| nvm available | `nvm --version` | 0.39.x or higher |
| PM2 running | `pm2 status` | `isbvgfuckedup` shows `online` status |
| Application logs | `pm2 logs isbvgfuckedup --lines 50` | No errors, shows "Server running on port 3000" |
| Port listening | `lsof -i :3000` or `netstat -tuln \| grep 3000` | Node.js process listening on port 3000 |
| Environment loaded | `pm2 env 0` | All required env vars present |
| Auto-start configured | `pm2 startup` output | Startup script saved and enabled |

### Web Server Verification
| Check | Command/URL | Expected |
|-------|-------------|----------|
| nginx running | `systemctl status nginx` or hosting panel | Active and running |
| HTTP access | `curl http://your-domain.com` | Returns HTML response (Express app) |
| HTTPS access | `curl https://your-domain.com` | Returns HTML response with valid certificate |
| Proxy headers | Check `X-Forwarded-For` in Express logs | Headers correctly forwarded by nginx |
| SSL certificate | `certbot certificates` | Valid certificate for domain, 60+ days remaining |

### BVG API Verification
| Check | Method | Expected |
|-------|--------|----------|
| API response | `curl http://localhost:3000/api/status` | JSON with `departures` array, `realtimeDataUpdatedAt` timestamp |
| Data freshness | Check `realtimeDataUpdatedAt` field | Timestamp within STALENESS_THRESHOLD minutes |
| Departure data | Inspect `departures[0]` object | Contains `when`, `delay`, `line`, `direction` fields |
| Error handling | Check logs if API fails | Graceful error handling, no app crashes |

### QA Sign-off Requirements
- [ ] Node.js 18+ installed via nvm (verified with `node --version`)
- [ ] All npm dependencies installed (verified with `npm list --depth=0`)
- [ ] PM2 process manager running application (verified with `pm2 status`)
- [ ] Application survives kill -9 (auto-restart verified)
- [ ] nginx reverse proxy forwards traffic correctly
- [ ] HTTPS certificate valid and active
- [ ] BVG API integration functional (returns real-time data)
- [ ] No errors in PM2 logs (`pm2 logs --lines 100`)
- [ ] Environment variables correctly configured
- [ ] Application accessible from external network
- [ ] No regressions in existing functionality (all routes work)
- [ ] Application survives server reboot (PM2 startup script works)
- [ ] Documentation complete for future maintenance

### Known Limitations
- **Hetzner Shared Hosting:** If konsoleH Node.js activation is used, PHP will be disabled on the same domain
- **Rate Limiting:** BVG API may impose rate limits; REFRESH_INTERVAL should remain >= 30 seconds
- **No Root Access:** Some nginx configurations may require hosting provider support if sudo is unavailable
- **Alpine Linux:** If server uses Alpine, nvm must compile Node.js from source (`nvm install -s 18`)

## Deployment Checklist

**Pre-Deployment:**
- [ ] Verify SSH access to Hetzner server
- [ ] Check available disk space (`df -h`)
- [ ] Confirm server OS and shell (bash/zsh)
- [ ] Verify curl or wget available for nvm installation

**Installation Phase:**
- [ ] Install nvm via curl command
- [ ] Install Node.js 18 with `nvm install 18`
- [ ] Clone or upload project files to server
- [ ] Copy `.env.example` to `.env` and configure variables
- [ ] Run `npm ci --production`

**Process Management:**
- [ ] Install PM2 with `npm install -g pm2`
- [ ] Start app with `pm2 start src/server.js --name isbvgfuckedup`
- [ ] Verify running with `pm2 status`
- [ ] Save process list with `pm2 save`
- [ ] Configure auto-start with `pm2 startup`

**Web Server:**
- [ ] Install nginx (or use Hetzner hosting panel)
- [ ] Configure reverse proxy (see nginx pattern above)
- [ ] Test nginx config: `nginx -t`
- [ ] Reload nginx: `systemctl reload nginx`
- [ ] Install Certbot and configure SSL
- [ ] Test HTTPS access

**Verification:**
- [ ] Test `curl http://localhost:3000/api/status` (local)
- [ ] Test `curl http://your-domain.com/api/status` (external)
- [ ] Check PM2 logs for errors
- [ ] Verify BVG data freshness
- [ ] Simulate crash (`pm2 kill isbvgfuckedup`, verify auto-restart)
- [ ] Simulate reboot (if possible, verify PM2 startup)

**Documentation:**
- [ ] Document deployment steps taken
- [ ] Note any Hetzner-specific configurations
- [ ] Record troubleshooting commands used
- [ ] Update README.md with production deployment instructions
