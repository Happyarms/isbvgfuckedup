# GitHub Actions CI/CD Deployment Guide

This guide covers configuring and testing the GitHub Actions CI/CD pipeline for the BVG Status Monitor application.

## Overview

The CI/CD pipeline consists of two GitHub Actions workflows:

1. **CI Workflow** (`ci.yml`) - Runs linting and tests on every push and pull request to `main`
2. **CD Workflow** (`deploy.yml`) - Deploys to production server via SSH after code is pushed to `main`

## Prerequisites

Before configuring the GitHub Actions pipeline, ensure you have:

- GitHub repository with Actions enabled
- Production server with nginx installed and configured
- SSH access to your production server
- SSH key pair for automated deployment
- Production server details (hostname, username, deployment path)

## Step 1: Generate SSH Deployment Key

The CD workflow requires an SSH key to connect to your production server for automated deployments.

### Create SSH Key Pair

Generate a dedicated SSH key pair for GitHub Actions:

```bash
# On your local machine (not the production server)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# This creates two files:
# - ~/.ssh/github_deploy_key (private key - for GitHub Secrets)
# - ~/.ssh/github_deploy_key.pub (public key - for production server)
```

**Important:** Use a unique SSH key specifically for GitHub Actions deployment. Do not reuse your personal SSH key.

### Add Public Key to Production Server

Copy the public key to your production server's authorized keys:

```bash
# Option 1: Using ssh-copy-id (recommended)
ssh-copy-id -i ~/.ssh/github_deploy_key.pub your-username@your-server.com

# Option 2: Manual copy
cat ~/.ssh/github_deploy_key.pub
# Copy the output, then on your production server:
# echo "ssh-ed25519 AAAAC3... github-actions-deploy" >> ~/.ssh/authorized_keys
```

### Verify SSH Key Access

Test the SSH key works:

```bash
# Test connection using the new key
ssh -i ~/.ssh/github_deploy_key your-username@your-server.com "echo 'SSH access successful'"
```

**Expected output:**
```
SSH access successful
```

**Troubleshooting SSH access:**

- **"Permission denied (publickey)"** - Public key not properly added:
  ```bash
  # On production server, check authorized_keys
  cat ~/.ssh/authorized_keys | grep "github-actions-deploy"

  # Verify permissions
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  ```

- **"Host key verification failed"** - Server not in known_hosts (this is handled automatically by the workflow)

- **Connection times out** - Check firewall rules on production server allow SSH (port 22)

## Step 2: Configure GitHub Secrets

GitHub Secrets securely store sensitive information like SSH keys and server credentials. The CD workflow requires four secrets.

### Required GitHub Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DEPLOY_SSH_KEY` | Private SSH key for deployment | Contents of `~/.ssh/github_deploy_key` |
| `DEPLOY_HOST` | Production server hostname or IP | `your-server.com` or `198.51.100.42` |
| `DEPLOY_USER` | SSH username on production server | `your-username` |
| `DEPLOY_PATH` | Absolute path to application directory | `/home/your-username/isbvgfuckedup` |

### Add Secrets to GitHub Repository

#### Step 2.1: Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/your-username/isbvgfuckedup`
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

#### Step 2.2: Add DEPLOY_SSH_KEY

1. **Name:** `DEPLOY_SSH_KEY`
2. **Secret:** Copy the **entire contents** of your private key:
   ```bash
   cat ~/.ssh/github_deploy_key
   ```

   **Expected format:**
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
   ...
   -----END OPENSSH PRIVATE KEY-----
   ```

3. Click **Add secret**

**Important:** Copy the entire key including the `BEGIN` and `END` lines. Do not add extra spaces or newlines.

#### Step 2.3: Add DEPLOY_HOST

1. **Name:** `DEPLOY_HOST`
2. **Secret:** Your production server hostname or IP address
   ```
   your-domain.com
   ```
   or
   ```
   198.51.100.42
   ```

3. Click **Add secret**

**Note:** Use the same hostname/IP you use for SSH access. If your server uses a custom SSH port (not 22), you'll need to modify the workflow (see Customization section).

#### Step 2.4: Add DEPLOY_USER

1. **Name:** `DEPLOY_USER`
2. **Secret:** Your SSH username on the production server
   ```
   your-username
   ```

3. Click **Add secret**

**Verification:** This should match the username in your SSH command: `ssh your-username@your-server.com`

#### Step 2.5: Add DEPLOY_PATH

1. **Name:** `DEPLOY_PATH`
2. **Secret:** Absolute path to application directory on production server
   ```
   /home/your-username/isbvgfuckedup
   ```

3. Click **Add secret**

**Important:** Use the absolute path, not relative paths like `~/isbvgfuckedup`. The CD workflow expects an absolute path.

**To find the absolute path:**
```bash
# SSH into your production server
ssh your-username@your-server.com

# Navigate to application directory
cd ~/isbvgfuckedup

# Get absolute path
pwd
```

**Expected output:**
```
/home/your-username/isbvgfuckedup
```

### Verify GitHub Secrets Configuration

After adding all secrets, verify they appear in the repository settings:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see 4 **Repository secrets**:
   - ✅ `DEPLOY_SSH_KEY`
   - ✅ `DEPLOY_HOST`
   - ✅ `DEPLOY_USER`
   - ✅ `DEPLOY_PATH`

**Note:** GitHub does not show secret values for security. You cannot view or edit secret values after creation - only update or delete them.

## Step 3: Verify Production Server Setup

Before triggering the CD workflow, ensure your production server has the deployment script and is properly configured.

### Check Deployment Script Exists

The CD workflow executes `scripts/deploy.sh` on your production server:

```bash
# SSH into production server
ssh your-username@your-server.com

# Navigate to application directory
cd /home/your-username/isbvgfuckedup  # Use your DEPLOY_PATH

# Check if deploy script exists
ls -lh scripts/deploy.sh
```

**Expected output:**
```
-rwxr-xr-x 1 your-username your-username 1.5K Jan 15 10:30 scripts/deploy.sh
```

**If script is missing:**

The deployment script should be in your repository at `scripts/deploy.sh`. If it's not on the production server:

```bash
# Create scripts directory if it doesn't exist
mkdir -p scripts

# The script should be deployed with your application code
# Verify git repository is set up
git status
```

### Verify Deployment Script is Executable

The deploy script must have execute permissions:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Verify permissions
ls -l scripts/deploy.sh
```

**Expected output:** First column should show `-rwxr-xr-x` (note the `x` for execute permission)

### Test Deployment Script Manually

Before running through GitHub Actions, test the deployment script manually:

```bash
# SSH into production server
ssh your-username@your-server.com

# Navigate to nginx web root
cd /var/www/isbvgfuckedup  # Use your DEPLOY_PATH

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

**Troubleshooting deployment script:**

- **"Permission denied"** - Script not executable:
  ```bash
  chmod +x scripts/deploy.sh
  ```

- **Git pull fails** - Check git remote is configured:
  ```bash
  git remote -v
  # Should show origin pointing to your GitHub repository
  ```

- **Site check fails** - Verify nginx is running and configured:
  ```bash
  sudo systemctl status nginx
  curl http://localhost/
  ```

## Step 4: Test CI Workflow

The CI workflow runs automatically on every push and pull request to `main`. It performs linting and testing.

### Trigger CI Workflow

Create a test branch and push a small change:

```bash
# On your local machine, in your repository
cd ~/isbvgfuckedup

# Create test branch
git checkout -b test-ci-workflow

# Make a trivial change (add a comment to README)
echo "" >> README.md
echo "<!-- CI test -->" >> README.md

# Commit and push
git add README.md
git commit -m "Test CI workflow"
git push origin test-ci-workflow
```

### Create Pull Request

1. Go to your GitHub repository
2. Click **Pull requests** tab
3. Click **New pull request**
4. Select **base: main** and **compare: test-ci-workflow**
5. Click **Create pull request**

### Monitor CI Workflow

After creating the PR, the CI workflow should start automatically:

1. On the Pull Request page, scroll to the bottom
2. You should see a **CI / Test and Lint** check running
3. Click **Details** to view workflow execution in real-time

**Expected workflow steps:**
1. ✅ Checkout code
2. ✅ Setup Node.js 18.x
3. ✅ Install dependencies
4. ✅ Run linter
5. ✅ Run tests

**Total duration:** Approximately 1-2 minutes

### Verify CI Workflow Success

**Success criteria:**
- All steps show green checkmarks ✅
- Pull request shows "All checks have passed"
- No error messages in workflow logs

**If CI workflow fails:**

1. Click **Details** next to the failed check
2. Expand the failed step to see error output
3. Common failures:
   - **Linting errors:** Fix code style issues, commit and push
   - **Test failures:** Fix failing tests, commit and push
   - **Dependency issues:** Verify `package-lock.json` is committed

**View workflow logs:**
```bash
# Alternative: View from Actions tab
# 1. Click "Actions" tab in your repository
# 2. Click the workflow run
# 3. Click "Test and Lint" job
# 4. Expand steps to view detailed logs
```

### Clean Up Test Branch

After verifying CI works:

```bash
# Delete the test branch (if PR was not merged)
git checkout main
git branch -D test-ci-workflow
git push origin --delete test-ci-workflow
```

## Step 5: Test CD Workflow (Deployment)

The CD workflow deploys your application to production when code is pushed to `main`. Test it carefully.

### Trigger CD Workflow via Manual Dispatch

Before testing automatic deployment on push, test manually using workflow_dispatch:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **CD** workflow in the left sidebar
4. Click **Run workflow** dropdown (top right)
5. Select **Branch: main**
6. Click **Run workflow**

### Monitor CD Workflow Execution

1. The workflow will appear in the list with a yellow dot (running)
2. Click the workflow run to view details
3. Click **Deploy to Production** job to view logs

**Expected workflow steps:**
1. ✅ Checkout code
2. ✅ Setup SSH
3. ✅ Add server to known hosts
4. ✅ Deploy to production server
5. ✅ Verify deployment

**Total duration:** Approximately 30-60 seconds (depending on server response time)

### Verify Deployment Success

**Success criteria:**
- All workflow steps show green checkmarks ✅
- "Deployment successful!" message appears in logs
- No SSH connection errors
- No deployment script errors

**Check deployment on production server:**

```bash
# SSH into production server
ssh your-username@your-server.com

# Check PM2 status
pm2 status

# Verify application is online
curl http://localhost:3000/api/status
```

**Expected PM2 output:**
```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ isbvgfuckedup  │ default     │ 1.0.0   │ fork    │ 12345    │ 2s     │ X    │ online    │ 0.1%     │ 45.2mb   │ user     │ disabled │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

**Note:** Uptime should be very recent (seconds or minutes) and restart counter (↺) should increment by 1.

**Expected health endpoint response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 5.123,
  "environment": "production",
  "nodeVersion": "v18.x.x"
}
```

**Note:** Uptime should be very low (a few seconds).

### Troubleshooting CD Workflow Failures

#### SSH Connection Failures

**Error:** `Permission denied (publickey)`

**Cause:** GitHub Actions cannot authenticate with production server

**Solution:**
```bash
# Verify DEPLOY_SSH_KEY secret contains correct private key
# Re-add the secret:
cat ~/.ssh/github_deploy_key  # Copy entire output including BEGIN/END lines

# Verify public key is on production server
ssh your-username@your-server.com "cat ~/.ssh/authorized_keys | grep github-actions-deploy"
```

#### Host Key Verification Failed

**Error:** `Host key verification failed`

**Cause:** Production server's host key not in GitHub Actions known_hosts

**Solution:** This should be handled automatically by the "Add server to known hosts" step. If it persists:

```bash
# Manually get server host key
ssh-keyscan -H your-server.com

# Verify DEPLOY_HOST secret matches your server hostname
```

#### Deploy Script Not Found

**Error:** `scripts/deploy.sh: No such file or directory`

**Cause:** Deploy script missing from production server

**Solution:**
```bash
# SSH into production server
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup

# Pull latest code to get deploy script
git pull origin main

# Verify script exists
ls -lh scripts/deploy.sh

# Make executable
chmod +x scripts/deploy.sh
```

#### Deployment Verification Failed

**Error:** `curl: (7) Failed to connect to localhost`

**Cause:** nginx not running or not configured correctly

**Solution:**
```bash
# SSH into production server
ssh your-username@your-server.com

# Check nginx status
sudo systemctl status nginx

# Restart nginx if needed
sudo systemctl restart nginx

# Verify site is accessible
curl http://localhost/

# Check nginx configuration
sudo nginx -t
```

#### Wrong Deployment Path

**Error:** `cd: /home/user/isbvgfuckedup: No such file or directory`

**Cause:** DEPLOY_PATH secret points to non-existent directory

**Solution:**
```bash
# SSH into production server
ssh your-username@your-server.com

# Find correct application path
pwd  # If you're in the application directory
# Or
find ~ -name "isbvgfuckedup" -type d

# Update DEPLOY_PATH secret in GitHub with correct absolute path
```

## Step 6: Test Full Deployment Pipeline

After verifying CI and CD workflows work independently, test the complete pipeline end-to-end.

### Test Automatic Deployment on Push to Main

Make a small change and push directly to `main` to trigger both workflows:

```bash
# On your local machine, in your repository
cd ~/isbvgfuckedup

# Ensure you're on main branch
git checkout main
git pull origin main

# Make a trivial change (update version or add comment)
echo "" >> README.md
echo "<!-- CD test: $(date) -->" >> README.md

# Commit and push to main
git add README.md
git commit -m "Test full CI/CD pipeline"
git push origin main
```

### Monitor Both Workflows

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see two workflow runs triggered by your push:
   - **CI** workflow (Test and Lint)
   - **CD** workflow (Deploy to Production)

**Expected execution:**
1. CI workflow starts immediately
2. CD workflow starts immediately (runs in parallel)
3. Both workflows complete successfully

**Note:** The CD workflow does not wait for CI to complete. If you want CD to wait for CI, see the Customization section below.

### Verify End-to-End Success

**Success criteria:**
- ✅ CI workflow completes successfully (all tests pass)
- ✅ CD workflow completes successfully (deployment succeeds)
- ✅ Production application is running latest code
- ✅ No errors in GitHub Actions logs
- ✅ Health endpoint responds correctly

**Verify on production server:**

```bash
# SSH into production server
ssh your-username@your-server.com

# Check git is on latest commit
cd /var/www/isbvgfuckedup  # Use your DEPLOY_PATH
git log --oneline -n 1
# Should show your "Test full CI/CD pipeline" commit

# Verify site is accessible
curl -s http://localhost/ | head -10
# Should show HTML content of index.html
```

### External Verification

If your site is accessible via HTTPS:

```bash
# From your local machine
curl https://your-domain.com/

# Verify static files are served
curl -I https://your-domain.com/css/style.css
curl -I https://your-domain.com/js/app.js
```

## Complete Testing Checklist

Before considering your CI/CD pipeline fully configured, verify all items below:

**GitHub Secrets Configuration:**
- [ ] `DEPLOY_SSH_KEY` contains full private key (including BEGIN/END lines)
- [ ] `DEPLOY_HOST` matches your production server hostname/IP
- [ ] `DEPLOY_USER` matches your SSH username
- [ ] `DEPLOY_PATH` is absolute path to application directory
- [ ] SSH key successfully authenticates to production server
- [ ] Public key is in production server's `~/.ssh/authorized_keys`

**Production Server Setup:**
- [ ] Static site deployed and served by nginx
- [ ] Deployment script exists at `scripts/deploy.sh`
- [ ] Deployment script has execute permissions (`chmod +x`)
- [ ] Deployment script runs successfully when executed manually
- [ ] Git repository configured with remote pointing to GitHub
- [ ] nginx is running and configured correctly

**CI Workflow:**
- [ ] CI workflow triggers on push to `main`
- [ ] CI workflow triggers on pull requests to `main`
- [ ] All CI steps complete successfully (checkout, setup, install, lint, test)
- [ ] Failed tests properly fail the workflow
- [ ] Linting errors properly fail the workflow

**CD Workflow:**
- [ ] CD workflow triggers on push to `main`
- [ ] CD workflow can be manually triggered via workflow_dispatch
- [ ] SSH connection to production server succeeds
- [ ] Deployment script executes without errors
- [ ] Static files updated successfully after deployment
- [ ] Deployment verification step passes (health check)
- [ ] No SSH permission errors
- [ ] No "command not found" errors (git, curl)

**End-to-End Pipeline:**
- [ ] Push to `main` triggers both CI and CD workflows
- [ ] Both workflows complete successfully
- [ ] Production server serves latest code after push
- [ ] Updated files are accessible via nginx
- [ ] No downtime during deployment (static files updated atomically)

**All checks completed! ✅** Your CI/CD pipeline is fully configured and tested.

## Workflow Customization

### Make CD Wait for CI to Pass

By default, the CD workflow runs immediately on push to `main`, regardless of CI status. To make CD wait for CI to pass:

Edit `.github/workflows/deploy.yml`:

```yaml
jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: []  # Change this line

    steps:
    # ... rest of workflow
```

Change to:

```yaml
jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [ci]  # Wait for CI job to complete

    steps:
    # ... rest of workflow
```

**Note:** This requires renaming the CI workflow job to match:

Edit `.github/workflows/ci.yml`:

```yaml
jobs:
  test:  # Change this to "ci"
    name: Test and Lint
    # ... rest of workflow
```

Change to:

```yaml
jobs:
  ci:  # Match the "needs" reference in deploy.yml
    name: Test and Lint
    # ... rest of workflow
```

### Custom SSH Port

If your production server uses a non-standard SSH port (not 22):

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to production server
  run: |
    ssh -p 2222 ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "cd ${{ secrets.DEPLOY_PATH }} && bash scripts/deploy.sh"
```

Also update the "Verify deployment" step:

```yaml
- name: Verify deployment
  run: |
    echo "Waiting for application to be ready..."
    sleep 10
    ssh -p 2222 ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "curl -f http://localhost:3000/api/status || exit 1"
    echo "Deployment successful!"
```

### Add Deployment Notifications

Add a notification step to send alerts on deployment success/failure:

#### Slack Notification Example

Add to `.github/workflows/deploy.yml` after the verify step:

```yaml
- name: Notify deployment success
  if: success()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "✅ Deployment successful!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "✅ *Deployment Successful*\n*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}"
            }
          }
        ]
      }

- name: Notify deployment failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ Deployment failed!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "❌ *Deployment Failed*\n*Repository:* ${{ github.repository }}\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*Logs:* ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
          }
        ]
      }
```

Add `SLACK_WEBHOOK_URL` to GitHub Secrets.

#### Email Notification Example

GitHub Actions can send email notifications natively:

1. Go to **Settings** → **Notifications** in your GitHub account
2. Enable notifications for **Actions**
3. GitHub will email you on workflow failures

### Rollback on Deployment Failure

Add a rollback step that reverts to the previous deployment if verification fails:

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Verify deployment
  id: verify
  run: |
    echo "Waiting for application to be ready..."
    sleep 10
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "curl -f http://localhost:3000/api/status || exit 1"
    echo "Deployment successful!"
  continue-on-error: true

- name: Rollback on failure
  if: steps.verify.outcome == 'failure'
  run: |
    echo "Deployment verification failed. Rolling back..."
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "cd ${{ secrets.DEPLOY_PATH }} && git reset --hard HEAD@{1} && pm2 restart isbvgfuckedup"
    echo "Rollback complete."
    exit 1
```

**Warning:** This rollback strategy only works if the previous commit is compatible. For more robust rollbacks, consider using PM2 deploy or blue-green deployment strategies.

## Security Best Practices

### SSH Key Security

- **Never commit SSH keys to the repository** - Use GitHub Secrets exclusively
- **Use dedicated deployment keys** - Don't reuse personal SSH keys
- **Rotate keys regularly** - Generate new keys every 6-12 months
- **Limit key permissions** - Use SSH authorized_keys restrictions if possible:
  ```bash
  # On production server, restrict key to only run deploy script
  # Edit ~/.ssh/authorized_keys:
  command="cd /home/user/isbvgfuckedup && bash scripts/deploy.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAAC3... github-actions-deploy
  ```

### GitHub Secrets Management

- **Use repository secrets** for single repositories
- **Use environment secrets** for multiple environments (staging, production)
- **Use organization secrets** to share across multiple repositories
- **Never log secret values** - GitHub automatically masks secrets in logs
- **Review secret access** - Check which workflows and environments have access

### Deployment Security

- **Verify deployment script** - Review `scripts/deploy.sh` for security issues
- **Use HTTPS for git operations** - Avoid storing git credentials on server
- **Limit deployment user permissions** - Use a dedicated user with minimal privileges
- **Monitor deployment logs** - Check for suspicious activity in workflow logs
- **Enable branch protection** - Require pull request reviews before merging to `main`:
  1. Go to **Settings** → **Branches**
  2. Add rule for `main` branch
  3. Enable "Require pull request reviews before merging"
  4. Enable "Require status checks to pass before merging" (select CI workflow)

## Monitoring and Maintenance

### View Workflow History

```bash
# View recent workflow runs
# Navigate to: https://github.com/your-username/isbvgfuckedup/actions

# Filter by workflow:
# - Click "CI" or "CD" in left sidebar
# - Click a workflow run to view details
```

### Download Workflow Logs

1. Go to **Actions** tab
2. Click a workflow run
3. Click **...** (three dots) in top right
4. Click **Download log archive**

### Monitor Deployment Frequency

```bash
# On production server, check git log for deployment commits
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup
git log --oneline --since="1 week ago"

# Check PM2 restart history
pm2 status
# Look at restart count (↺) and uptime
```

### Troubleshoot Failed Deployments

```bash
# View GitHub Actions logs (see above)

# On production server, check PM2 logs
ssh your-username@your-server.com
pm2 logs isbvgfuckedup --lines 100

# Check deployment script execution
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup
bash -x scripts/deploy.sh  # Run with debug output
```

## Known Limitations

- **No Automatic Rollback:** If deployment verification passes but application fails later, manual intervention required
- **Brief Downtime:** PM2 restart causes 1-2 seconds of downtime during deployment
- **Single Server:** CD workflow deploys to one server only (no load balancer or multiple servers)
- **No Database Migrations:** Deployment script does not handle database schema changes
- **No Staging Environment:** Pipeline deploys directly to production without intermediate testing environment

## Advanced Deployment Strategies

### Blue-Green Deployment

For zero-downtime deployments, consider implementing blue-green deployment:

1. **Two PM2 instances:** Run application on two different ports
2. **nginx load balancer:** Route traffic to active instance
3. **Deploy to inactive instance:** Update code and restart
4. **Switch traffic:** Update nginx to point to new instance
5. **Keep old instance:** Available for instant rollback

**This requires additional setup beyond the scope of this guide.**

### Staging Environment

To test deployments before production:

1. **Create staging branch:** Separate from `main`
2. **Deploy to staging server:** Add new workflow for staging
3. **Promote to production:** Merge staging to `main` after validation

**Example staging workflow:**

```yaml
name: Deploy to Staging

on:
  push:
    branches: [ staging ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Same as CD workflow but with STAGING_* secrets
```

## Support and Resources

### GitHub Actions Documentation
- [GitHub Actions Quickstart](https://docs.github.com/en/actions/quickstart)
- [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH with GitHub Actions](https://github.com/marketplace/actions/ssh-remote-commands)

### Troubleshooting Resources
- Check workflow logs in **Actions** tab
- Review deployment script on production server
- Verify GitHub Secrets configuration
- Test SSH connection manually from local machine

### Project Resources
- Main deployment guide: `DEPLOYMENT.md` in repository root
- Deployment script: `scripts/deploy.sh`
- GitHub Issues: Report CI/CD problems on GitHub

## Summary

This guide covered:
1. ✅ Generating SSH deployment keys for GitHub Actions
2. ✅ Configuring GitHub Secrets for secure deployment credentials
3. ✅ Verifying production server setup for automated deployment
4. ✅ Testing CI workflow (linting and testing)
5. ✅ Testing CD workflow (automated deployment)
6. ✅ Testing complete CI/CD pipeline end-to-end
7. ✅ Customizing workflows for specific needs
8. ✅ Security best practices for deployment automation

Your CI/CD pipeline is now configured and tested! Every push to `main` will automatically run tests and deploy to your production server.

For ongoing maintenance, monitor the **Actions** tab for workflow status and check production server logs regularly for deployment issues.
