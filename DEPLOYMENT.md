# Deployment Guide

## Overview

**Is BVG Fucked Up?** is a static website served by nginx on a Linux server. There is no backend runtime, no build step, and no dependencies to install. Deployment means copying files to a directory and pointing nginx at them.

## Prerequisites

- A Linux server (Ubuntu/Debian recommended)
- nginx installed (`sudo apt install nginx`)
- A domain name pointing to your server's IP address
- SSH access to the server
- (Optional) Certbot for SSL/TLS (`sudo apt install certbot python3-certbot-nginx`)

## 1. Upload Files

**Option A: Git clone (recommended)**

```bash
sudo mkdir -p /var/www/isbvgfuckedup
sudo git clone https://github.com/YOUR_USER/isbvgfuckedup.git /var/www/isbvgfuckedup
```

**Option B: SCP from local machine**

```bash
scp -r ./* user@your-server:/var/www/isbvgfuckedup/
```

Verify the files are in place:

```bash
ls /var/www/isbvgfuckedup/
# Expected: index.html  css/  js/  nginx-site.conf  README.md  ...
```

Set ownership so nginx can read the files:

```bash
sudo chown -R www-data:www-data /var/www/isbvgfuckedup
```

## 2. Configure nginx

Copy the included nginx configuration:

```bash
sudo cp /var/www/isbvgfuckedup/nginx-site.conf /etc/nginx/sites-available/isbvgfuckedup
```

Edit the config to set your domain name:

```bash
sudo nano /etc/nginx/sites-available/isbvgfuckedup
# Change "your-domain.com" to your actual domain
```

Enable the site by creating a symlink:

```bash
sudo ln -s /etc/nginx/sites-available/isbvgfuckedup /etc/nginx/sites-enabled/
```

Test the configuration and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. SSL/TLS (Recommended)

Use Certbot to automatically configure HTTPS:

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot will:
- Obtain a free Let's Encrypt certificate
- Update the nginx config to serve HTTPS
- Set up automatic certificate renewal

Verify auto-renewal is scheduled:

```bash
sudo certbot renew --dry-run
```

## 4. Verify

Test from the server:

```bash
curl -I http://your-domain.com
# Should return HTTP 200
```

Test from your browser:

- Open `https://your-domain.com`
- Confirm the status page loads and displays BVG status
- Check that data refreshes automatically (wait 60 seconds)

## 5. Updates

To deploy updates, pull the latest code. No restart is needed — nginx serves files directly from disk.

```bash
cd /var/www/isbvgfuckedup
sudo git pull
```

That's it. nginx picks up file changes immediately.

## 6. Troubleshooting

### Page returns 403 Forbidden

File permissions are wrong. Fix with:

```bash
sudo chown -R www-data:www-data /var/www/isbvgfuckedup
sudo chmod -R 755 /var/www/isbvgfuckedup
```

### Page returns 404

The nginx `root` directive may point to the wrong directory. Check:

```bash
grep "root" /etc/nginx/sites-available/isbvgfuckedup
# Should show: root /var/www/isbvgfuckedup;
```

### nginx fails to start

Test the configuration for syntax errors:

```bash
sudo nginx -t
```

Check if another service is using port 80:

```bash
sudo ss -tlnp | grep ':80'
```

### Site not reachable from outside

Check your firewall allows HTTP/HTTPS traffic:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

Verify DNS records point to your server's IP:

```bash
dig your-domain.com
```

### SSL certificate issues

Re-run Certbot:

```bash
sudo certbot --nginx -d your-domain.com
```

Check certificate expiry:

```bash
sudo certbot certificates
```

### API data not loading

The site fetches data from `https://v6.vbb.transport.rest` directly in the browser. If data doesn't load:

- Open browser Developer Tools (F12) → Console tab for errors
- Check the Network tab for failed requests to `v6.vbb.transport.rest`
- The VBB API has a rate limit of 100 requests/minute per client IP
- Ensure your server doesn't block outbound HTTPS connections (this only matters if the browser is on a restricted network)
