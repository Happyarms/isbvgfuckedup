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

```bash
# Start the application with PM2
pm2 start src/server.js --name isbvgfuckedup

# Verify it's running
pm2 status

# Check logs for errors
pm2 logs isbvgfuckedup --lines 50
```

Expected output in logs:
```
Server running on port 3000
```

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

nginx forwards external HTTP/HTTPS traffic to your Node.js application running on port 3000.

### Install nginx

```bash
# If you have sudo access
sudo apt update
sudo apt install nginx

# Verify installation
nginx -v
```

**No sudo access?** Use Hetzner's hosting panel (konsoleH) to configure the reverse proxy. Note that activating Node.js in konsoleH will disable PHP on the same domain.

### Create nginx Configuration

Create a new site configuration:

```bash
sudo nano /etc/nginx/sites-available/isbvgfuckedup
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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

**Important:** Replace `your-domain.com` with your actual domain name.

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

### Check Application Health

```bash
# Verify PM2 status
pm2 status
# Expected: isbvgfuckedup shows "online"

# Check for errors in logs
pm2 logs isbvgfuckedup --lines 100
# Expected: No error messages, shows "Server running on port 3000"

# Verify port is listening
lsof -i :3000
# Expected: Node process listening on port 3000

# Check process count
ps aux | grep "node.*server.js"
```

### Test Auto-Restart

Simulate a crash to verify PM2 auto-restart:

```bash
# Kill the Node.js process
pm2 kill isbvgfuckedup

# Wait a few seconds, then check status
pm2 status
# Expected: isbvgfuckedup should be "online" again

# Verify application is accessible
curl http://localhost:3000/api/status
```

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
