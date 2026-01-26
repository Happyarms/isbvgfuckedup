# Deployment Guide: BVG Status Monitor on Hetzner

This guide covers deploying the BVG Status Monitor Express.js application on a Hetzner server **without Docker**, using nvm for Node.js installation, PM2 for process management, and nginx as a reverse proxy.

## Overview

This deployment approach enables running Node.js applications on servers where Docker is unavailable and root access may be limited. All installations are performed at the user level without requiring sudo privileges.

## Prerequisites

Before starting, ensure you have:
- SSH access to your Hetzner server
- bash or zsh shell available
- curl or wget installed
- At least 500MB free disk space
- Domain name pointed to your server (for SSL/TLS)

Verify prerequisites:
```bash
# Check shell
echo $SHELL

# Check curl availability
curl --version

# Check disk space
df -h

# Check current directory
pwd
```

## Step 1: Install Node.js via nvm

**CRITICAL:** Never use `sudo` with nvm. It's designed for user-level installation.

### Install nvm

```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Load nvm into current shell session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Verify nvm installation
nvm --version
```

**Note:** The install script automatically adds nvm to your `~/.bashrc` or `~/.zshrc`. For future shell sessions, nvm will be available automatically.

### Install Node.js 18

This application requires Node.js 18 or higher:

```bash
# Install Node.js 18 LTS
nvm install 18

# Set Node.js 18 as the active version
nvm use 18

# Set Node.js 18 as the default version
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show compatible npm version
```

**Alpine Linux Note:** If your server uses Alpine Linux (musl libc), compile from source:
```bash
nvm install -s 18
```

### Verify Node.js Installation

After installing Node.js via nvm, verify the runtime environment is correctly configured:

```bash
# Check Node.js version
node --version
```

**Expected output:**
```
v18.x.x
```

Where `x.x` represents the specific patch version (e.g., v18.19.0). Any version starting with `v18.` is acceptable.

```bash
# Check npm version
npm --version
```

**Expected output:**
```
9.x.x or 10.x.x
```

npm version should be compatible with Node.js 18 (typically npm 9 or 10).

```bash
# Verify nvm is managing Node.js
nvm current
```

**Expected output:**
```
v18.x.x
```

This confirms nvm is active and Node.js 18 is the current version.

```bash
# Check Node.js path (should point to nvm directory)
which node
```

**Expected output:**
```
/home/[username]/.nvm/versions/node/v18.x.x/bin/node
```

**Troubleshooting verification failures:**

- **"command not found: node"** - Node.js not installed or nvm not loaded. Run:
  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use 18
  ```

- **Wrong version displayed** - Different Node.js version active. Switch to Node.js 18:
  ```bash
  nvm use 18
  nvm alias default 18
  ```

- **npm version incompatible** - Update npm if needed:
  ```bash
  npm install -g npm@latest
  ```

## Step 2: Deploy Application Files

### Clone or Upload Project

```bash
# Navigate to home directory
cd ~

# Option 1: Clone from Git repository
git clone https://github.com/your-username/isbvgfuckedup.git
cd isbvgfuckedup

# Option 2: Upload files via SCP (from your local machine)
# scp -r ./isbvgfuckedup user@your-server.com:~/
```

### Configure Environment Variables

Create production environment configuration:

```bash
# Copy example file
cp .env.example .env

# Edit with your preferred editor
nano .env  # or vim .env
```

**Required environment variables:**
```env
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

**Configuration notes:**
- `NODE_ENV=production` disables verbose logging and enables optimizations
- `REFRESH_INTERVAL=60000` (60 seconds) prevents BVG API rate limiting
- Thresholds are percentages (0.3 = 30%) and minutes for delays

### Install Dependencies

Install all required Node.js packages for production:

```bash
# Install production dependencies (faster and deterministic)
npm ci --production

# Verify installation
npm list --depth=0
```

**Why `npm ci --production`?**

- `npm ci` (clean install) is preferred over `npm install` in production because it:
  - Installs exact versions from `package-lock.json` (deterministic builds)
  - Removes `node_modules/` folder before install (clean state)
  - Fails if dependencies don't match lock file (prevents version drift)
  - Faster than `npm install` in production environments

- `--production` flag:
  - Skips `devDependencies` (testing, build tools)
  - Reduces installation time and disk space
  - Only installs packages needed to run the application

**Expected output:**
```
added X packages in Ys
```

Where X is the number of production dependencies (typically 20-30 packages for this application).

**Troubleshooting dependency installation:**

- **Error: `package-lock.json` missing** - Generate it first:
  ```bash
  npm install --package-lock-only
  npm ci --production
  ```

- **Error: Node version mismatch** - Ensure Node.js 18 is active:
  ```bash
  nvm use 18
  node --version  # Should show v18.x.x
  npm ci --production
  ```

- **Error: Permission denied** - Never use `sudo` with nvm-managed npm:
  ```bash
  # Verify npm is from nvm
  which npm  # Should show ~/.nvm/versions/node/...

  # If needed, reinstall npm
  npm install -g npm@latest
  ```

### Verify Application Startup

Before configuring PM2 for production, manually verify the application starts correctly and responds to requests:

```bash
# Start the application in development mode
npm start
```

**Expected output:**
```
BVG Status Monitor starting...
Environment: development
Server running on http://localhost:3000
BVG API: VBB (Berlin & Brandenburg)
Refresh interval: 60000ms
```

The application will continue running in the foreground. Leave this terminal open.

**Open a new SSH session** to your server and test the health endpoint:

```bash
# Test the application health endpoint
curl http://localhost:3000/api/status
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 12.456,
  "environment": "development",
  "nodeVersion": "v18.x.x"
}
```

**Success criteria:**
- Application starts without errors
- Health endpoint returns `"status": "ok"`
- Response includes valid timestamp and uptime
- No error messages in the console

**To stop the application:**

Return to the first terminal and press `Ctrl+C` to gracefully shut down the application.

**Troubleshooting startup issues:**

- **Error: `Cannot find module 'express'`** - Dependencies not installed:
  ```bash
  npm ci --production
  npm start
  ```

- **Error: `Port 3000 already in use`** - Another process is using the port:
  ```bash
  # Find process using port 3000
  lsof -i :3000 || netstat -tuln | grep 3000

  # Kill the process or use a different port
  PORT=3001 npm start
  ```

- **Error: `.env file not found`** - Environment configuration missing:
  ```bash
  cp .env.example .env
  nano .env  # Configure required variables
  npm start
  ```

- **curl returns `Connection refused`** - Application not running or wrong port:
  ```bash
  # Verify application is running
  # Check first terminal for error messages

  # Verify port in .env matches curl request
  cat .env | grep PORT
  ```

Once manual startup verification succeeds, proceed to configure PM2 for production deployment.

## Step 3: Configure PM2 Process Manager

PM2 keeps your application running 24/7, automatically restarts on crashes, and survives server reboots.

### Install PM2

```bash
# Install PM2 globally (user-level via nvm)
npm install -g pm2

# Verify installation
pm2 --version
```

### Start Application

The application includes a `ecosystem.config.js` file with production-ready PM2 configuration. You can start the application using either the ecosystem file (recommended) or a basic command.

**Create logs directory:**

```bash
# Create directory for PM2 logs
mkdir -p logs
```

**Option 1: Using ecosystem.config.js (Recommended)**

The ecosystem file provides comprehensive configuration including environment variables, logging, memory limits, and restart policies:

```bash
# Start using ecosystem configuration
pm2 start ecosystem.config.js

# Verify it's running
pm2 status

# Check logs for errors
pm2 logs isbvgfuckedup --lines 50
```

**Option 2: Basic PM2 command**

For simple deployments, you can start with a basic command:

```bash
# Start the application with PM2
pm2 start src/server.js --name isbvgfuckedup

# Verify it's running
pm2 status

# Check logs for errors
pm2 logs isbvgfuckedup --lines 50
```

**Expected output in logs:**
```
Server running on port 3000
```

**Note:** The ecosystem.config.js approach is preferred for production as it:
- Centralizes all PM2 configuration in one file
- Defines production and development environments
- Configures logging paths (./logs/pm2-error.log, ./logs/pm2-out.log)
- Sets memory limits (1GB max before restart)
- Configures restart policies (max 15 restarts, 4s delay)
- Includes all required environment variables

### Configure Auto-Start on Reboot

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# IMPORTANT: Copy and run the command that PM2 outputs
# It will look something like:
# sudo env PATH=$PATH:/home/user/.nvm/versions/node/v18.x.x/bin pm2 startup systemd -u user --hp /home/user
```

**No sudo access?** Add to crontab instead:
```bash
crontab -e

# Add this line:
@reboot cd /home/user/isbvgfuckedup && /home/user/.nvm/versions/node/v18.x.x/bin/pm2 resurrect
```

### Useful PM2 Commands

```bash
# View application status
pm2 status

# View logs (live)
pm2 logs isbvgfuckedup

# View logs (last 100 lines)
pm2 logs isbvgfuckedup --lines 100

# Restart application (after code updates)
pm2 restart isbvgfuckedup

# Stop application
pm2 stop isbvgfuckedup

# Remove from PM2
pm2 delete isbvgfuckedup

# Monitor in real-time
pm2 monit
```

## Step 4: Configure nginx Reverse Proxy

nginx forwards external HTTP/HTTPS traffic to your Node.js application running on port 3000. This section covers installation, configuration with security headers, and verification.

### Install nginx

```bash
# If you have sudo access
sudo apt update
sudo apt install nginx

# Verify installation
nginx -v
```

**Expected output:**
```
nginx version: nginx/1.x.x
```

**No sudo access?** Use Hetzner's hosting panel (konsoleH) to configure the reverse proxy. Note that activating Node.js in konsoleH will disable PHP on the same domain. If using konsoleH, skip the manual configuration steps below and use the hosting panel's interface.

### Create nginx Configuration

The application includes a production-ready nginx configuration template at `nginx-site.conf`. This configuration includes security headers, proper proxy settings, WebSocket support, and logging.

Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/isbvgfuckedup
```

Add this comprehensive configuration:

```nginx
# nginx reverse proxy configuration for isbvgfuckedup
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy all requests to Express.js application on port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support (upgrade headers)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Essential proxy headers for Express 'trust proxy' setting
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent proxy caching issues
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optional: Custom error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    # Logging
    access_log /var/log/nginx/isbvgfuckedup_access.log;
    error_log /var/log/nginx/isbvgfuckedup_error.log;
}

# SSL configuration will be automatically added by Certbot
```

**Important configuration notes:**

- **server_name:** Replace `your-domain.com` with your actual domain name
- **Security headers:** Protect against clickjacking, MIME-sniffing, and XSS attacks
- **WebSocket support:** Enables real-time communication if needed in future
- **Proxy headers:** Required for Express.js to correctly detect client IP and protocol
- **Timeouts:** Set to 60 seconds to handle slow API responses
- **Custom error pages:** Shows nginx error page for 502/503/504 errors
- **Logging:** Separate log files for this application make debugging easier

### Enable Site and Reload nginx

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/isbvgfuckedup /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx
```

**Expected output from `nginx -t`:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Expected output from `systemctl status nginx`:**
```
● nginx.service - A high performance web server and a reverse proxy server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
   Active: active (running) since ...
```

**Troubleshooting nginx configuration:**

- **Error: "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"**
  ```bash
  # Check what's using port 80
  sudo lsof -i :80

  # If another nginx process, restart it
  sudo systemctl restart nginx

  # If Apache or other server, stop it first
  sudo systemctl stop apache2
  sudo systemctl start nginx
  ```

- **Error: "nginx: [emerg] could not build server_names_hash"**
  ```bash
  # Add to /etc/nginx/nginx.conf in http block:
  # server_names_hash_bucket_size 64;
  sudo nano /etc/nginx/nginx.conf
  sudo nginx -t
  sudo systemctl reload nginx
  ```

- **502 Bad Gateway error**
  ```bash
  # Verify application is running
  pm2 status
  curl http://localhost:3000/api/status

  # Check nginx error logs
  sudo tail -f /var/log/nginx/isbvgfuckedup_error.log

  # Ensure proxy_pass port matches application PORT
  cat .env | grep PORT
  ```

## Step 5: Configure SSL/TLS with Let's Encrypt

Secure your application with free SSL/TLS certificates from Let's Encrypt.

### Install Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
# Automatic nginx configuration
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

### Verify Certificate

```bash
# Check certificate status
sudo certbot certificates

# Expected output shows:
# - Certificate name
# - Domains covered
# - Expiry date (90 days from issuance)
```

**Auto-renewal:** Certbot automatically configures renewal. Test it:
```bash
sudo certbot renew --dry-run
```

## Step 6: Verify Deployment

### Local Verification

Test the application locally on the server:

```bash
# Test API endpoint
curl http://localhost:3000/api/status

# Expected: JSON response with BVG departure data
```

### External Verification

Test from your local machine or browser:

```bash
# Test HTTP (should redirect to HTTPS if configured)
curl http://your-domain.com/api/status

# Test HTTPS
curl https://your-domain.com/api/status

# Test home page
curl https://your-domain.com/
```

### Verify Web Server and nginx Reverse Proxy

After deploying with nginx, thoroughly verify the web server is correctly proxying requests and serving your application over HTTP and HTTPS.

#### Test HTTP Access

Verify the application is accessible via HTTP from external clients:

```bash
# Test from your local machine (not the server)
curl http://your-domain.com
```

**Expected output:**

If you configured HTTP to HTTPS redirect (recommended with Certbot), you should see:
```html
<html>
<head><title>301 Moved Permanently</title></head>
<body>
<center><h1>301 Moved Permanently</h1></center>
<center>nginx</center>
</body>
</html>
```

If redirect is not configured, you should see your application's HTML response (the BVG status page).

**Success criteria:**
- Returns HTTP 200 (no redirect) or HTTP 301 (with redirect to HTTPS)
- Response time < 2 seconds
- No connection errors or timeouts

**Test the API endpoint:**
```bash
curl http://your-domain.com/api/status
```

**Expected output (if no HTTPS redirect):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 300.456,
  "environment": "production",
  "nodeVersion": "v18.x.x"
}
```

**If redirect is enabled**, curl will follow the redirect automatically with `-L`:
```bash
curl -L http://your-domain.com/api/status
```

#### Test HTTPS Access

Verify the application is accessible via HTTPS with valid SSL/TLS certificate:

```bash
# Test from your local machine
curl https://your-domain.com
```

**Expected output:**
```html
<!DOCTYPE html>
<html>
...
[Your application's HTML response]
...
</html>
```

**Test the API endpoint:**
```bash
curl https://your-domain.com/api/status
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 300.456,
  "environment": "production",
  "nodeVersion": "v18.x.x"
}
```

**Success criteria:**
- Returns HTTP 200
- Valid SSL certificate (no warnings)
- Response time < 2 seconds
- Returns same content as local verification

**Test SSL certificate validity:**
```bash
# Verify certificate details
curl -vI https://your-domain.com 2>&1 | grep -A 10 "SSL connection"
```

**Expected output includes:**
```
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=your-domain.com
*  issuer: C=US; O=Let's Encrypt; CN=R3
*  SSL certificate verify ok.
```

#### Verify HTTP Response Headers

Check that nginx is correctly setting security headers and proxy headers:

```bash
# Test security headers on HTTPS
curl -I https://your-domain.com
```

**Expected output:**
```
HTTP/1.1 200 OK
Server: nginx/1.x.x
Date: Mon, 15 Jan 2024 10:30:45 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 1234
Connection: keep-alive
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Powered-By: Express
```

**Success criteria:**
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `X-Powered-By: Express` - Confirms request reached Express.js application
- `Server: nginx` - Confirms nginx is handling the request

**Test API endpoint headers:**
```bash
curl -I https://your-domain.com/api/status
```

**Expected output:**
```
HTTP/1.1 200 OK
Server: nginx/1.x.x
Date: Mon, 15 Jan 2024 10:30:45 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 156
Connection: keep-alive
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Powered-By: Express
```

**Additional header verification with verbose output:**
```bash
# See full request/response cycle
curl -v https://your-domain.com/api/status
```

This shows:
- TLS handshake details
- All request headers sent
- All response headers received
- Response body

**Troubleshooting header issues:**

- **Missing security headers** - nginx configuration not applied:
  ```bash
  # Verify nginx configuration
  sudo nginx -t

  # Check your site config includes security headers
  sudo cat /etc/nginx/sites-available/isbvgfuckedup | grep "add_header"

  # Reload nginx to apply changes
  sudo systemctl reload nginx
  ```

- **No `X-Powered-By: Express` header** - Application not responding:
  ```bash
  # Verify application is running
  pm2 status
  curl http://localhost:3000/api/status

  # Check nginx error logs
  sudo tail -f /var/log/nginx/isbvgfuckedup_error.log
  ```

- **Certificate errors** - SSL not properly configured:
  ```bash
  # Check certificate status
  sudo certbot certificates

  # Renew if expired or expiring soon
  sudo certbot renew

  # Verify nginx SSL configuration
  sudo cat /etc/nginx/sites-available/isbvgfuckedup | grep ssl
  ```

#### Test from Web Browser

Open your browser and visit:

1. **HTTP URL:** `http://your-domain.com`
   - Should redirect to HTTPS (if configured)
   - Or show the application

2. **HTTPS URL:** `https://your-domain.com`
   - Should show valid certificate (lock icon in address bar)
   - Should display the BVG Status Monitor page
   - No browser security warnings

3. **API Endpoint:** `https://your-domain.com/api/status`
   - Should return JSON response
   - Should show in browser as formatted JSON

**Browser DevTools verification:**

Open browser DevTools (F12) → Network tab → Reload page:

1. **Check Headers tab:**
   - Verify `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection` present
   - Verify `Content-Type` is correct (text/html or application/json)

2. **Check Security tab:**
   - Certificate should be valid
   - Connection should use TLS 1.2 or 1.3
   - Cipher suite should be modern/secure

3. **Check Console tab:**
   - No JavaScript errors
   - No mixed content warnings (HTTP resources on HTTPS page)

#### Test External DNS Resolution

Verify your domain correctly resolves to your server:

```bash
# Check DNS resolution
nslookup your-domain.com

# Or use dig for more details
dig your-domain.com
```

**Expected output:**
```
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	your-domain.com
Address: XXX.XXX.XXX.XXX
```

Where `XXX.XXX.XXX.XXX` is your Hetzner server's IP address.

**Verify HTTPS from multiple locations:**

Test from different networks to ensure global accessibility:
- Your local computer (different network than server)
- Mobile device on cellular network
- Online tools like https://www.ssllabs.com/ssltest/

**Success criteria for complete web server verification:**
- ✅ HTTP access works (redirects to HTTPS or serves content)
- ✅ HTTPS access works with valid certificate
- ✅ Security headers present in all responses
- ✅ API endpoints return correct JSON
- ✅ DNS resolves correctly
- ✅ Accessible from multiple networks/locations
- ✅ No browser security warnings
- ✅ Response times < 2 seconds

### Verify PM2 Process Manager

After deploying with PM2, thoroughly verify the process manager is correctly managing your application.

#### Check PM2 Status

Verify the application shows as "online" in PM2:

```bash
pm2 status
```

**Expected output:**
```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ isbvgfuckedup  │ default     │ 1.0.0   │ fork    │ 12345    │ 5m     │ 0    │ online    │ 0.1%     │ 45.2mb   │ user     │ disabled │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

**Success criteria:**
- **status** column shows `online` (not `errored`, `stopped`, or `launching`)
- **uptime** shows time since last restart
- **↺** (restart count) should be low (0-2); high values indicate instability
- **cpu** and **mem** show reasonable resource usage

**Troubleshooting PM2 status issues:**

- **Status shows `errored`** - Application crashed during startup:
  ```bash
  # Check logs for error details
  pm2 logs isbvgfuckedup --lines 50

  # Common causes:
  # - Missing .env file
  # - Missing dependencies
  # - Port already in use
  # - Syntax error in code
  ```

- **Status shows `stopped`** - Application was manually stopped:
  ```bash
  # Restart the application
  pm2 restart isbvgfuckedup
  ```

- **Status shows `launching`** - Application stuck during startup:
  ```bash
  # Check logs for what it's waiting on
  pm2 logs isbvgfuckedup --lines 50

  # If stuck for > 30 seconds, restart
  pm2 restart isbvgfuckedup
  ```

- **High restart count (↺ > 10)** - Application is crash-looping:
  ```bash
  # View recent errors
  pm2 logs isbvgfuckedup --lines 100 --err

  # Check for:
  # - Uncaught exceptions
  # - Memory leaks (mem column growing)
  # - Database connection failures
  # - API rate limiting (429 errors)
  ```

#### Check Application Logs

Verify logs show no errors and application started successfully:

```bash
pm2 logs isbvgfuckedup --lines 50
```

**Expected output:**
```
0|isbvgfu | BVG Status Monitor starting...
0|isbvgfu | Environment: production
0|isbvgfu | Server running on http://localhost:3000
0|isbvgfu | BVG API: VBB (Berlin & Brandenburg)
0|isbvgfu | Refresh interval: 60000ms
```

**Success criteria:**
- No error stack traces
- Shows "Server running on port 3000" (or your configured PORT)
- No repeated crash/restart messages
- No API errors (404, 429, 500 responses)

**Troubleshooting log issues:**

- **Error: Cannot find module** - Dependencies not installed:
  ```bash
  cd ~/isbvgfuckedup
  npm ci --production
  pm2 restart isbvgfuckedup
  ```

- **Error: EADDRINUSE** - Port already in use:
  ```bash
  # Find process using the port
  lsof -i :3000

  # Either kill that process or change PORT in .env
  nano .env  # Change PORT to 3001
  pm2 restart isbvgfuckedup
  ```

- **429 Too Many Requests** - BVG API rate limiting:
  ```bash
  # Increase refresh interval in .env
  nano .env  # Set REFRESH_INTERVAL=120000
  pm2 restart isbvgfuckedup
  ```

- **Logs are empty** - PM2 not capturing output:
  ```bash
  # Check PM2 log configuration
  pm2 show isbvgfuckedup

  # Verify log files exist
  ls -lh logs/

  # Restart PM2 daemon
  pm2 kill
  pm2 start ecosystem.config.js
  ```

#### Verify Application Responds

Test that the application is actually responding to requests:

```bash
# Test health endpoint
curl http://localhost:3000/api/status
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 300.456,
  "environment": "production",
  "nodeVersion": "v18.x.x"
}
```

**Success criteria:**
- Returns valid JSON
- `status` field is `"ok"`
- Response time < 1 second

**If curl fails:**
```bash
# Verify port is actually listening
lsof -i :3000 || netstat -tuln | grep 3000

# Check PM2 status again
pm2 status

# Check process is running
ps aux | grep "node.*server.js"
```

#### Simulate Crash and Auto-Restart

Test PM2's automatic restart functionality by simulating a crash:

```bash
# Find the Node.js process ID
pm2 status
# Note the PID from the output

# Kill the underlying Node.js process (not PM2)
# Replace XXXXX with the actual PID from pm2 status
kill -9 XXXXX

# Wait 2-3 seconds for PM2 to detect and restart
sleep 3

# Check status - should show "online" again
pm2 status
```

**Expected behavior:**
- Within 2-3 seconds, PM2 detects the crash
- Automatically restarts the application
- `pm2 status` shows `online` again
- Restart counter (↺) increments by 1

**Verify application recovered:**
```bash
# Test endpoint again
curl http://localhost:3000/api/status

# Check logs for restart message
pm2 logs isbvgfuckedup --lines 20
```

**Expected log output:**
```
PM2: App [isbvgfuckedup] exited with code 137
PM2: App [isbvgfuckedup] starting
0|isbvgfu | BVG Status Monitor starting...
0|isbvgfu | Server running on http://localhost:3000
```

**Alternative crash test using PM2 restart:**
```bash
# Graceful restart test
pm2 restart isbvgfuckedup

# Verify it came back online
pm2 status

# Check uptime reset to 0s
pm2 status
```

**If auto-restart fails:**

- **Status stays `errored`** - Application has a startup error:
  ```bash
  # Check logs for the error
  pm2 logs isbvgfuckedup --lines 100 --err

  # Fix the error, then restart
  pm2 restart isbvgfuckedup
  ```

- **PM2 not detecting crash** - PM2 daemon not running:
  ```bash
  # Check PM2 is running
  pm2 list

  # If empty or error, restart PM2
  pm2 resurrect
  ```

- **Restart takes > 10 seconds** - Slow startup or resource constraints:
  ```bash
  # Check server resources
  free -h  # Available memory
  df -h    # Available disk space

  # Check for startup bottlenecks in logs
  pm2 logs isbvgfuckedup --lines 50
  ```

#### Verify PM2 Persistence

Ensure PM2 will restart the application after a server reboot:

```bash
# Check current PM2 startup configuration
pm2 startup

# Verify process list is saved
ls -lh ~/.pm2/dump.pm2

# Expected: File should exist and be recently modified
```

**If dump.pm2 is missing or old:**
```bash
# Save current process list
pm2 save

# Verify it was saved
ls -lh ~/.pm2/dump.pm2
cat ~/.pm2/dump.pm2
```

**Test persistence (requires server reboot or cron simulation):**
```bash
# Simulate reboot by killing PM2 daemon and resurrecting
pm2 kill

# Wait a moment
sleep 2

# Resurrect saved processes
pm2 resurrect

# Verify application is running
pm2 status
curl http://localhost:3000/api/status
```

### Verify BVG API Integration

After deploying the application, thoroughly verify the BVG API integration is functioning correctly and returning real-time departure data.

#### Test API Endpoint Response

Test that the `/api/status` endpoint returns valid BVG departure data:

```bash
# Test from the server
curl http://localhost:3000/api/status

# Or test externally (after nginx is configured)
curl https://your-domain.com/api/status
```

**Expected output:**
```json
{
  "status": "operational",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "realtimeDataUpdatedAt": "2024-01-15T10:30:42.000Z",
  "departures": [
    {
      "when": "2024-01-15T10:35:00.000Z",
      "delay": 120,
      "line": {
        "name": "U2",
        "type": "subway"
      },
      "direction": "Pankow"
    },
    {
      "when": "2024-01-15T10:38:00.000Z",
      "delay": 0,
      "line": {
        "name": "S1",
        "type": "suburban"
      },
      "direction": "Wannsee"
    }
  ],
  "stats": {
    "total": 15,
    "delayed": 3,
    "onTime": 12
  }
}
```

**Success criteria:**
- Returns HTTP 200 status code
- Valid JSON response structure
- Response time < 2 seconds

#### Verify Departures Array

Ensure the `departures` array contains valid BVG departure data:

```bash
# Extract and format departures array
curl -s http://localhost:3000/api/status | jq '.departures'
```

**Expected output:**
```json
[
  {
    "when": "2024-01-15T10:35:00.000Z",
    "delay": 120,
    "line": { "name": "U2", "type": "subway" },
    "direction": "Pankow"
  },
  ...
]
```

**Success criteria:**
- `departures` array exists and is not empty
- Each departure contains required fields:
  - `when`: ISO 8601 timestamp of scheduled/expected departure
  - `delay`: Delay in seconds (number, can be 0 or null)
  - `line`: Object with `name` and `type` (e.g., "U2", "subway")
  - `direction`: String indicating destination
- Array contains multiple departures (typically 10-20 entries)

**Troubleshooting empty departures:**

- **Empty array `[]`** - BVG API returned no data or API error:
  ```bash
  # Check PM2 logs for API errors
  pm2 logs isbvgfuckedup --lines 50 | grep -i "error\|bvg\|api"

  # Common causes:
  # - BVG API rate limiting (429 errors)
  # - Invalid BVG_API_TYPE in .env
  # - Network connectivity issues
  # - BVG API service outage
  ```

- **Missing fields in departures** - Check configuration:
  ```bash
  # Verify BVG_API_TYPE is set correctly
  cat .env | grep BVG_API_TYPE
  # Should be: BVG_API_TYPE=vbb

  # Restart application after fixing
  pm2 restart isbvgfuckedup
  ```

#### Check Data Freshness

Verify the `realtimeDataUpdatedAt` timestamp indicates recent data:

```bash
# Extract timestamp
curl -s http://localhost:3000/api/status | jq '.realtimeDataUpdatedAt'
```

**Expected output:**
```json
"2024-01-15T10:30:42.000Z"
```

**Data freshness validation:**

The `realtimeDataUpdatedAt` timestamp should be:
- **Recent:** Within the last `STALENESS_THRESHOLD` minutes (default: 10 minutes)
- **Format:** Valid ISO 8601 timestamp
- **Timezone:** UTC (indicated by trailing 'Z')

**Check timestamp age:**
```bash
# Calculate timestamp age in minutes (requires date command)
CURRENT_TIME=$(date -u +%s)
API_TIME=$(curl -s http://localhost:3000/api/status | jq -r '.realtimeDataUpdatedAt' | xargs -I {} date -u -d {} +%s)
AGE_MINUTES=$(( ($CURRENT_TIME - $API_TIME) / 60 ))
echo "Data age: $AGE_MINUTES minutes"

# Should be less than STALENESS_THRESHOLD (default: 10 minutes)
```

**Expected output:**
```
Data age: 2 minutes
```

**Success criteria:**
- Timestamp age < `STALENESS_THRESHOLD` minutes (check `.env` for configured value)
- If age exceeds threshold, application should report degraded status

**Troubleshooting stale data:**

- **Timestamp older than threshold** - Data refresh not working:
  ```bash
  # Check REFRESH_INTERVAL setting
  cat .env | grep REFRESH_INTERVAL
  # Should be: REFRESH_INTERVAL=60000 (60 seconds)

  # Check PM2 logs for refresh errors
  pm2 logs isbvgfuckedup --lines 50

  # Look for:
  # - API timeout errors
  # - Network connectivity issues
  # - BVG API rate limiting (429 errors)
  ```

- **Timestamp null or missing** - API integration failure:
  ```bash
  # Check full API response
  curl -s http://localhost:3000/api/status | jq '.'

  # Verify BVG API configuration
  cat .env | grep BVG_API

  # Restart application
  pm2 restart isbvgfuckedup

  # Monitor logs for startup errors
  pm2 logs isbvgfuckedup --lines 100
  ```

- **Timestamp in future** - Server time misconfiguration:
  ```bash
  # Check server time
  date -u

  # Should match approximately with realtimeDataUpdatedAt
  # If significantly different, server clock may be wrong

  # Sync server time (requires sudo)
  sudo ntpdate pool.ntp.org
  ```

#### Test Rate Limiting Compliance

Verify the application respects BVG API rate limits:

```bash
# Monitor API request frequency in PM2 logs
pm2 logs isbvgfuckedup --lines 50 | grep -i "fetching\|refresh"

# Check for rate limit errors
pm2 logs isbvgfuckedup --lines 200 | grep -i "429\|rate limit"
```

**Expected behavior:**
- No 429 (Too Many Requests) errors in logs
- Requests occur at `REFRESH_INTERVAL` frequency (default: 60 seconds)
- Logs show successful data fetches

**If rate limiting errors occur:**
```bash
# Increase refresh interval
nano .env
# Set: REFRESH_INTERVAL=120000 (2 minutes)

# Restart application
pm2 restart isbvgfuckedup

# Monitor for continued errors
pm2 logs isbvgfuckedup --lines 50
```

#### Verify Status Calculation

Test that the application correctly calculates status based on delay thresholds:

```bash
# Get full status response
curl -s http://localhost:3000/api/status | jq '{status, stats}'
```

**Expected output:**
```json
{
  "status": "operational",
  "stats": {
    "total": 15,
    "delayed": 3,
    "onTime": 12
  }
}
```

**Status values:**
- `"operational"` - Less than `THRESHOLD_DEGRADED` (30%) of departures delayed
- `"degraded"` - Between `THRESHOLD_DEGRADED` (30%) and `THRESHOLD_FUCKED` (60%) delayed
- `"fucked"` - More than `THRESHOLD_FUCKED` (60%) of departures delayed

**Verify thresholds:**
```bash
# Check threshold configuration
cat .env | grep THRESHOLD

# Should show:
# THRESHOLD_DEGRADED=0.3 (30%)
# THRESHOLD_FUCKED=0.6 (60%)
# DELAY_THRESHOLD=5 (minutes)
```

**Test status calculation logic:**
```bash
# Calculate delay percentage from stats
curl -s http://localhost:3000/api/status | jq '.stats | (.delayed / .total * 100 | floor)'

# Compare with thresholds:
# < 30% → status should be "operational"
# 30-60% → status should be "degraded"
# > 60% → status should be "fucked"
```

#### Complete BVG API Verification Checklist

Before considering the BVG API integration fully verified, confirm:

- ✅ `/api/status` endpoint responds with valid JSON
- ✅ `departures` array contains 10+ departure entries
- ✅ Each departure has `when`, `delay`, `line`, `direction` fields
- ✅ `realtimeDataUpdatedAt` timestamp is recent (< 10 minutes old)
- ✅ No 429 rate limiting errors in PM2 logs
- ✅ `status` field correctly reflects delay percentage
- ✅ `stats` object shows total, delayed, and onTime counts
- ✅ Response time consistently < 2 seconds
- ✅ Data refreshes at configured `REFRESH_INTERVAL`
- ✅ API works consistently across multiple test requests

**Comprehensive verification test:**
```bash
# Run multiple tests in sequence
echo "=== Testing BVG API Integration ==="

echo "1. Testing API endpoint..."
curl -s http://localhost:3000/api/status > /tmp/bvg_test.json && echo "✅ API responds"

echo "2. Checking departures array..."
DEPARTURE_COUNT=$(jq '.departures | length' /tmp/bvg_test.json)
[ "$DEPARTURE_COUNT" -gt 0 ] && echo "✅ Departures: $DEPARTURE_COUNT" || echo "❌ No departures"

echo "3. Verifying required fields..."
jq -e '.departures[0] | has("when") and has("delay") and has("line") and has("direction")' /tmp/bvg_test.json > /dev/null && echo "✅ Required fields present" || echo "❌ Missing fields"

echo "4. Checking data freshness..."
jq -e '.realtimeDataUpdatedAt' /tmp/bvg_test.json > /dev/null && echo "✅ Timestamp present" || echo "❌ Missing timestamp"

echo "5. Verifying status calculation..."
jq -e '.status and .stats' /tmp/bvg_test.json > /dev/null && echo "✅ Status and stats present" || echo "❌ Missing status/stats"

echo "6. Checking PM2 logs for errors..."
pm2 logs isbvgfuckedup --lines 50 --nostream | grep -i "error" > /dev/null && echo "⚠️  Errors in logs" || echo "✅ No errors in logs"

echo ""
echo "=== Full API Response ==="
jq '.' /tmp/bvg_test.json

rm /tmp/bvg_test.json
```

This script provides a comprehensive verification of the BVG API integration. All checks should show ✅ for a fully functional deployment.

## Complete Deployment Verification Checklist

Use this comprehensive checklist to verify your entire deployment is functioning correctly. Work through each section systematically to ensure all components are operational.

### 1. Node.js Installation

Verify Node.js is correctly installed and configured:

```bash
# Check Node.js version
node --version
```

**Expected:** `v18.x.x` (any version starting with v18)

```bash
# Verify nvm is managing Node.js
nvm current
```

**Expected:** `v18.x.x`

```bash
# Check Node.js path
which node
```

**Expected:** `/home/[username]/.nvm/versions/node/v18.x.x/bin/node`

**✅ Success criteria:**
- Node.js version is 18 or higher
- nvm is active and managing Node.js
- Node.js path points to nvm directory

### 2. PM2 Process Manager Status

Verify PM2 is running and managing the application:

```bash
# Check PM2 status
pm2 status
```

**✅ Success criteria:**
- Application shows status: `online` (not `errored` or `stopped`)
- Restart count (↺) is low (0-5 restarts)
- Memory usage is reasonable (< 200MB for this application)
- CPU usage is low (< 5% when idle)

```bash
# Check recent logs for errors
pm2 logs isbvgfuckedup --lines 50 --nostream | grep -i "error"
```

**✅ Success criteria:**
- No critical errors in logs
- No repeated crash/restart messages
- No "EADDRINUSE" or "Cannot find module" errors

```bash
# Verify PM2 auto-start is configured
ls -lh ~/.pm2/dump.pm2
```

**✅ Success criteria:**
- File exists and was recently modified
- PM2 startup configured (check with `pm2 startup`)

### 3. nginx Web Server

Verify nginx is running and properly configured:

```bash
# Check nginx is running
sudo systemctl status nginx
```

**✅ Success criteria:**
- Status shows: `Active: active (running)`
- No error messages

```bash
# Test nginx configuration
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
# Verify site configuration exists
ls -lh /etc/nginx/sites-enabled/ | grep isbvgfuckedup
```

**✅ Success criteria:**
- Site configuration is present in sites-enabled
- Configuration includes proxy_pass to port 3000

### 4. SSL Certificate Validity

Verify SSL/TLS certificate is valid and auto-renewal is configured:

```bash
# Check certificate status
sudo certbot certificates
```

**✅ Success criteria:**
- Certificate exists for your domain
- Expiry date is at least 30 days in the future
- Certificate domains match your configuration

```bash
# Test auto-renewal
sudo certbot renew --dry-run
```

**Expected output:**
```
Congratulations, all simulated renewals succeeded
```

```bash
# Verify SSL from external client
curl -vI https://your-domain.com 2>&1 | grep "SSL certificate verify ok"
```

**✅ Success criteria:**
- Shows "SSL certificate verify ok"
- No certificate warnings or errors

### 5. Application External Accessibility

Verify the application is accessible from external networks:

```bash
# Test HTTPS access (from your local machine, NOT the server)
curl -I https://your-domain.com
```

**Expected output includes:**
```
HTTP/1.1 200 OK
Server: nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Powered-By: Express
```

**✅ Success criteria:**
- Returns HTTP 200 status code
- Security headers are present
- Response time < 2 seconds
- `X-Powered-By: Express` confirms request reached the application

```bash
# Test API endpoint
curl https://your-domain.com/api/status
```

**✅ Success criteria:**
- Returns valid JSON response
- Response includes BVG departure data
- No connection errors or timeouts

**Browser verification:**
1. Open `https://your-domain.com` in a web browser
2. Check for valid certificate (lock icon in address bar)
3. No browser security warnings
4. BVG Status Monitor page loads correctly

### 6. BVG API Integration

Verify BVG API is providing real-time departure data:

```bash
# Test API endpoint and extract key information
curl -s https://your-domain.com/api/status | jq '{status, realtimeDataUpdatedAt, departureCount: (.departures | length), stats}'
```

**Expected output:**
```json
{
  "status": "operational",
  "realtimeDataUpdatedAt": "2024-01-15T10:30:42.000Z",
  "departureCount": 15,
  "stats": {
    "total": 15,
    "delayed": 3,
    "onTime": 12
  }
}
```

**✅ Success criteria:**
- `status` field is present (`operational`, `degraded`, or `fucked`)
- `realtimeDataUpdatedAt` timestamp is recent (< 10 minutes old)
- `departureCount` > 0 (at least some departures)
- `stats` object includes `total`, `delayed`, and `onTime` counts

```bash
# Check for BVG API errors in logs
pm2 logs isbvgfuckedup --lines 100 --nostream | grep -i "429\|rate limit\|api error"
```

**✅ Success criteria:**
- No 429 (Too Many Requests) errors
- No API timeout errors
- No repeated API failures

### 7. Application Logs Health

Verify application logs are clean and showing normal operation:

```bash
# Check PM2 logs for errors
pm2 logs isbvgfuckedup --lines 100 --nostream
```

**✅ Success criteria:**
- Logs show "Server running on port 3000"
- No uncaught exceptions or error stack traces
- No repeated error messages
- No "ECONNREFUSED" or "ETIMEDOUT" errors
- Logs show periodic data refresh activity

```bash
# Check nginx error logs
sudo tail -n 50 /var/log/nginx/isbvgfuckedup_error.log
```

**✅ Success criteria:**
- No 502 Bad Gateway errors
- No "upstream timed out" errors
- No "connect() failed" errors

### Complete Verification Summary

Run this comprehensive verification script to check all components:

```bash
#!/bin/bash
echo "======================================"
echo "BVG Status Monitor Deployment Verification"
echo "======================================"
echo ""

# 1. Node.js
echo "1. Node.js Version Check"
NODE_VERSION=$(node --version 2>&1)
if [[ $NODE_VERSION == v18* ]]; then
  echo "   ✅ Node.js: $NODE_VERSION"
else
  echo "   ❌ Node.js: $NODE_VERSION (expected v18.x.x)"
fi
echo ""

# 2. PM2 Status
echo "2. PM2 Process Manager"
PM2_STATUS=$(pm2 jlist 2>&1 | jq -r '.[0].pm2_env.status' 2>/dev/null)
if [[ $PM2_STATUS == "online" ]]; then
  echo "   ✅ PM2 Status: online"
else
  echo "   ❌ PM2 Status: $PM2_STATUS"
fi
echo ""

# 3. nginx
echo "3. nginx Web Server"
if sudo systemctl is-active --quiet nginx; then
  echo "   ✅ nginx: running"
else
  echo "   ❌ nginx: not running"
fi
echo ""

# 4. SSL Certificate
echo "4. SSL Certificate"
SSL_EXPIRY=$(sudo certbot certificates 2>&1 | grep "Expiry Date" | head -n 1 | awk '{print $3}')
if [[ -n $SSL_EXPIRY ]]; then
  echo "   ✅ SSL Certificate: valid (expires $SSL_EXPIRY)"
else
  echo "   ❌ SSL Certificate: not found or invalid"
fi
echo ""

# 5. Application Accessibility
echo "5. External Application Access"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com 2>/dev/null)
if [[ $HTTP_STATUS == "200" ]]; then
  echo "   ✅ HTTPS Access: $HTTP_STATUS OK"
else
  echo "   ❌ HTTPS Access: $HTTP_STATUS"
fi
echo ""

# 6. BVG API
echo "6. BVG API Integration"
API_STATUS=$(curl -s https://your-domain.com/api/status 2>/dev/null | jq -r '.status' 2>/dev/null)
DEPARTURE_COUNT=$(curl -s https://your-domain.com/api/status 2>/dev/null | jq '.departures | length' 2>/dev/null)
if [[ -n $API_STATUS ]] && [[ $DEPARTURE_COUNT -gt 0 ]]; then
  echo "   ✅ BVG API: $API_STATUS ($DEPARTURE_COUNT departures)"
else
  echo "   ❌ BVG API: not responding or no data"
fi
echo ""

# 7. Logs
echo "7. Application Logs"
ERROR_COUNT=$(pm2 logs isbvgfuckedup --lines 100 --nostream 2>/dev/null | grep -i "error" | wc -l)
if [[ $ERROR_COUNT -lt 5 ]]; then
  echo "   ✅ Logs: clean ($ERROR_COUNT errors in last 100 lines)"
else
  echo "   ⚠️  Logs: $ERROR_COUNT errors found (review with: pm2 logs isbvgfuckedup)"
fi
echo ""

echo "======================================"
echo "Verification Complete"
echo "======================================"
echo ""
echo "All checks with ✅ indicate successful deployment."
echo "Any ❌ or ⚠️  should be investigated using the troubleshooting guide."
```

**To use this verification script:**

1. Save it to a file:
   ```bash
   nano ~/verify-deployment.sh
   ```

2. Make it executable:
   ```bash
   chmod +x ~/verify-deployment.sh
   ```

3. Run the verification:
   ```bash
   # Update 'your-domain.com' in the script first
   ~/verify-deployment.sh
   ```

### Final Deployment Checklist

Before considering your deployment complete, verify all items below:

- [ ] **Node.js 18+** installed via nvm and set as default
- [ ] **Application files** deployed to `~/isbvgfuckedup`
- [ ] **Environment variables** configured in `.env` file
- [ ] **Dependencies** installed with `npm ci --production`
- [ ] **PM2 status** shows `online` with low restart count
- [ ] **PM2 logs** show no critical errors
- [ ] **PM2 auto-start** configured for server reboots
- [ ] **nginx running** and configuration passes `nginx -t`
- [ ] **nginx site** enabled and linked in sites-enabled
- [ ] **SSL certificate** valid and auto-renewal configured
- [ ] **HTTPS access** works from external networks
- [ ] **Security headers** present in HTTP responses
- [ ] **DNS resolution** points to correct server IP
- [ ] **API endpoint** returns valid JSON with departure data
- [ ] **BVG API integration** shows recent data (< 10 min old)
- [ ] **No rate limiting** errors (429) in application logs
- [ ] **Status calculation** working correctly based on delays
- [ ] **Application logs** clean with no repeated errors
- [ ] **nginx error logs** clean with no 502 errors
- [ ] **Browser access** shows valid certificate and no warnings
- [ ] **Crash recovery** tested (PM2 auto-restarts on failure)

**Deployment is complete when all items are checked! ✅**

If any checks fail, refer to the relevant verification section above or the Troubleshooting section below for detailed guidance.

## Troubleshooting

### nvm commands not found

**Problem:** After installation, `nvm: command not found`

**Solution:** Manually load nvm or restart your shell
```bash
# Load nvm manually
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Or restart shell
exec $SHELL

# Or logout and login again
```

### Port 3000 already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Find and kill the conflicting process or change the port
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID)
kill -9 PID

# Or change PORT in .env file
echo "PORT=3001" >> .env
pm2 restart isbvgfuckedup
```

### BVG API rate limiting (429 errors)

**Problem:** Logs show `429 Too Many Requests`

**Solution:** Increase refresh interval
```bash
# Edit .env file
nano .env

# Change REFRESH_INTERVAL to higher value
REFRESH_INTERVAL=120000  # 2 minutes

# Restart application
pm2 restart isbvgfuckedup
```

### Application not starting

**Problem:** PM2 shows "errored" status

**Solution:** Check logs for specific error
```bash
# View detailed logs
pm2 logs isbvgfuckedup --lines 200

# Common issues:
# - Missing .env file: Copy from .env.example
# - Missing dependencies: Run npm ci --production
# - Wrong Node version: Run nvm use 18
# - Syntax error: Check src/server.js
```

### nginx not forwarding traffic

**Problem:** Domain shows nginx default page or 502 error

**Solution:** Verify configuration and application status
```bash
# Check nginx configuration
sudo nginx -t

# Verify application is running
pm2 status
curl http://localhost:3000/api/status

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Reload nginx
sudo systemctl reload nginx
```

### SSL certificate issues

**Problem:** Browser shows certificate warning or "Not Secure"

**Solution:** Verify Certbot configuration
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### PM2 not starting on reboot

**Problem:** Application offline after server restart

**Solution:** Reconfigure PM2 startup
```bash
# Remove old startup script
pm2 unstartup

# Generate new startup script
pm2 startup

# Run the command PM2 outputs
# Then save process list
pm2 save
```

### PM2 Process Manager Issues

#### PM2 shows "online" but application not responding

**Problem:** `pm2 status` shows online but `curl http://localhost:3000` fails

**Diagnosis:**
```bash
# Verify the correct port
pm2 show isbvgfuckedup | grep -A 5 "env:"

# Check if port matches your .env
cat .env | grep PORT

# Test the actual port PM2 is using
lsof -i -P -n | grep LISTEN | grep node
```

**Solution:**
```bash
# If port mismatch, update .env
nano .env  # Set correct PORT

# Restart application
pm2 restart isbvgfuckedup

# Verify it's listening on correct port
lsof -i :3000
```

#### High restart count (crash looping)

**Problem:** `pm2 status` shows restart count (↺) > 10

**Diagnosis:**
```bash
# Check error logs only
pm2 logs isbvgfuckedup --lines 100 --err

# Common crash loop causes:
# - Uncaught exceptions
# - Memory exhaustion
# - Invalid configuration
# - Missing environment variables
```

**Solution:**
```bash
# For uncaught exceptions - check and fix code
pm2 logs isbvgfuckedup --lines 200 | grep "Error:"

# For memory issues - increase max_memory_restart
pm2 delete isbvgfuckedup
pm2 start ecosystem.config.js  # Has max_memory_restart: '1G'

# For config issues - verify .env
cat .env
cp .env.example .env.new  # Compare

# Reset restart counter after fixing
pm2 reset isbvgfuckedup
```

#### PM2 logs command shows nothing

**Problem:** `pm2 logs isbvgfuckedup` returns no output

**Diagnosis:**
```bash
# Check PM2 configuration
pm2 show isbvgfuckedup

# Look for log paths in output
# Check if log directory exists
ls -lh logs/

# Check if logs are being written
ls -lh ~/.pm2/logs/
```

**Solution:**
```bash
# If using ecosystem.config.js, verify logs directory
mkdir -p logs

# Restart application
pm2 restart isbvgfuckedup

# If still no logs, check PM2 log files directly
tail -f ~/.pm2/logs/isbvgfuckedup-out.log
tail -f ~/.pm2/logs/isbvgfuckedup-error.log

# Or check logs configured in ecosystem.config.js
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log
```

#### PM2 command not found after reboot

**Problem:** After server restart, `pm2: command not found`

**Diagnosis:**
```bash
# Check if nvm is loaded
nvm --version

# Check PATH
echo $PATH | grep nvm

# Check if pm2 exists
ls -l ~/.nvm/versions/node/v18*/bin/pm2
```

**Solution:**
```bash
# Load nvm manually
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use correct Node.js version
nvm use 18

# Verify pm2 is available
pm2 --version

# If pm2 missing, reinstall
npm install -g pm2

# For permanent fix, ensure nvm loads in .bashrc or .zshrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
```

#### PM2 startup script not running on boot

**Problem:** Server reboots but application doesn't auto-start

**Diagnosis:**
```bash
# Check if startup script is configured
pm2 startup

# Check if process list is saved
ls -lh ~/.pm2/dump.pm2

# For crontab method (no sudo), verify cron job
crontab -l | grep pm2
```

**Solution:**

**Option 1: Using systemd (requires sudo):**
```bash
# Remove old startup
pm2 unstartup

# Generate new startup script
pm2 startup

# Run the command PM2 outputs (it will look like):
# sudo env PATH=$PATH:/home/user/.nvm/versions/node/v18.x.x/bin pm2 startup systemd -u user --hp /home/user

# Save process list
pm2 save

# Test by simulating reboot
pm2 kill
pm2 resurrect
pm2 status
```

**Option 2: Using crontab (no sudo required):**
```bash
# Edit crontab
crontab -e

# Add this line (update paths for your system):
# @reboot cd /home/user/isbvgfuckedup && /home/user/.nvm/versions/node/v18.x.x/bin/pm2 resurrect

# Save process list
pm2 save

# Verify crontab entry
crontab -l
```

#### PM2 using too much memory

**Problem:** PM2 process or application consuming excessive memory

**Diagnosis:**
```bash
# Check memory usage
pm2 status  # Look at mem column

# Monitor in real-time
pm2 monit

# Check if memory is growing (memory leak)
watch -n 5 'pm2 status'
```

**Solution:**
```bash
# Set memory limit with auto-restart on exceed
pm2 delete isbvgfuckedup
pm2 start ecosystem.config.js  # Has max_memory_restart: '1G'

# Or set manually
pm2 start src/server.js --name isbvgfuckedup --max-memory-restart 500M

# Save configuration
pm2 save

# Monitor to verify restarts occur before OOM
pm2 logs isbvgfuckedup
```

#### PM2 not detecting crashed processes

**Problem:** Application crashes but PM2 doesn't restart it

**Diagnosis:**
```bash
# Check if PM2 daemon is running
pm2 ping

# Check PM2 logs
pm2 logs

# Verify process is being monitored
pm2 list
```

**Solution:**
```bash
# Restart PM2 daemon
pm2 kill
pm2 resurrect

# Verify application is back
pm2 status

# If still not working, restart application with PM2
pm2 start ecosystem.config.js

# Save configuration
pm2 save
```

## Maintenance

### Updating Application Code

```bash
# Navigate to project directory
cd ~/isbvgfuckedup

# Pull latest changes (if using git)
git pull

# Install any new dependencies
npm ci --production

# Restart application
pm2 restart isbvgfuckedup

# Verify update
pm2 logs isbvgfuckedup --lines 50
curl http://localhost:3000/api/status
```

### Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs isbvgfuckedup

# Check system resources
htop  # or top

# Check disk space
df -h

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Backup

Regularly backup critical files:
```bash
# Create backup directory
mkdir -p ~/backups

# Backup environment file
cp ~/isbvgfuckedup/.env ~/backups/.env.backup

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/backups/dump.pm2.backup

# Backup nginx configuration
sudo cp /etc/nginx/sites-available/isbvgfuckedup ~/backups/nginx-isbvgfuckedup.backup
```

## Performance Optimization

### Adjust Refresh Interval

Balance data freshness with API rate limits:
```env
# More frequent updates (30 seconds)
REFRESH_INTERVAL=30000

# Less frequent updates (2 minutes)
REFRESH_INTERVAL=120000
```

### PM2 Cluster Mode

For high traffic, run multiple instances:
```bash
# Stop current instance
pm2 delete isbvgfuckedup

# Start in cluster mode (4 instances)
pm2 start src/server.js --name isbvgfuckedup -i 4

# Or use max CPU cores
pm2 start src/server.js --name isbvgfuckedup -i max

# Save configuration
pm2 save
```

### nginx Caching

Add caching for static responses:
```nginx
# Add to nginx configuration
location /api/status {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 30s;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Security Considerations

### Environment Variables

- Never commit `.env` file to version control
- Use strong, unique values for any API keys
- Restrict file permissions: `chmod 600 .env`

### SSH Security

- Use SSH keys instead of passwords
- Disable root login
- Configure firewall (ufw) to only allow necessary ports

### nginx Security Headers

Add security headers to nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Known Limitations

- **Hetzner Shared Hosting:** Activating Node.js in konsoleH disables PHP on the same domain
- **Rate Limiting:** BVG API may impose rate limits; keep REFRESH_INTERVAL >= 30 seconds
- **No Root Access:** Some nginx configurations may require hosting provider support
- **Alpine Linux:** Requires compiling Node.js from source with `nvm install -s 18`

## Support and Resources

### Official Documentation
- [nvm GitHub](https://github.com/nvm-sh/nvm)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

### Hetzner Resources
- [Hetzner Docs](https://docs.hetzner.com/)
- [konsoleH Manual](https://www.hetzner.com/help-center)

### Project Repository
- Issues: Report bugs and request features on GitHub
- Logs: Check PM2 logs first: `pm2 logs isbvgfuckedup`

## Summary

This deployment guide covered:
1. ✅ Installing Node.js via nvm (user-level, no sudo required)
2. ✅ Deploying the Express.js application
3. ✅ Configuring PM2 for process management and auto-restart
4. ✅ Setting up nginx reverse proxy
5. ✅ Securing with SSL/TLS certificates
6. ✅ Verifying deployment and troubleshooting

Your BVG Status Monitor should now be running reliably on your Hetzner server, accessible via HTTPS, with automatic restarts and proper monitoring.

For updates and maintenance, refer to the relevant sections above. Keep your Node.js version updated and monitor PM2 logs regularly for any issues.
