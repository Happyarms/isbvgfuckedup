# Deployment Pipeline Dry-Run Testing Guide

This guide provides step-by-step instructions for testing the CI/CD deployment pipeline in a safe, controlled manner before enabling it for production use.

## Overview

The dry-run testing process verifies that:
1. GitHub Secrets are correctly configured
2. SSH authentication works from GitHub Actions
3. The deployment script executes successfully on the production server
4. The application restarts correctly after deployment
5. Rollback procedures work if needed

## Prerequisites

Before starting the dry-run test, ensure:
- [ ] Production server is accessible via SSH
- [ ] Application is deployed and running on the production server
- [ ] PM2 is managing the application process
- [ ] Git repository is properly configured on the production server
- [ ] Deployment script exists at `scripts/deploy.sh` on the server
- [ ] You have generated an SSH key pair for GitHub Actions deployment

## Phase 1: Verify Production Server Setup

### 1.1 SSH Access Test

Test SSH access to your production server:

```bash
# Test with your deployment SSH key
ssh -i ~/.ssh/github_deploy_key your-username@your-server.com "echo 'SSH test successful'"
```

**Expected output:**
```
SSH test successful
```

**If this fails:**
- Verify the public key is in `~/.ssh/authorized_keys` on the server
- Check SSH key file permissions: `chmod 600 ~/.ssh/github_deploy_key`
- Verify the server hostname/IP is correct

### 1.2 Deployment Script Verification

Verify the deployment script exists and is executable:

```bash
ssh your-username@your-server.com "cd /home/your-username/isbvgfuckedup && ls -lh scripts/deploy.sh"
```

**Expected output:**
```
-rwxr-xr-x 1 your-username your-username 4.9K Jan 29 10:21 scripts/deploy.sh
```

**If the script is not executable:**
```bash
ssh your-username@your-server.com "cd /home/your-username/isbvgfuckedup && chmod +x scripts/deploy.sh"
```

### 1.3 Manual Deployment Test

Test the deployment script manually to ensure it works:

```bash
ssh your-username@your-server.com "cd /home/your-username/isbvgfuckedup && bash scripts/deploy.sh"
```

**Expected output:**
```
[INFO] Starting deployment of isbvgfuckedup...
[INFO] Pulling latest changes from git...
Already up to date.
[INFO] Installing production dependencies...
Dependencies installed successfully.
[INFO] Restarting application with PM2...
[PM2] Applying action restartProcessId on app [isbvgfuckedup](ids: [ 0 ])
[PM2] [isbvgfuckedup](0) ✓
[INFO] Waiting for application to be healthy...
[INFO] Application is healthy
[INFO] Verifying deployment...
[INFO] PM2 status:
[PM2 status table showing application online]
[INFO] Deployment completed successfully!
```

**If manual deployment fails, fix the issues before continuing to Phase 2.**

## Phase 2: Configure GitHub Secrets

### 2.1 Prepare Secret Values

Collect all required secret values:

```bash
# 1. Get private SSH key
cat ~/.ssh/github_deploy_key
# Copy the ENTIRE output including BEGIN/END lines

# 2. Get deployment host (use your actual hostname or IP)
echo "your-server.com"

# 3. Get deployment user
echo "your-username"

# 4. Get deployment path (SSH into server and run)
ssh your-username@your-server.com "cd ~/isbvgfuckedup && pwd"
# Example output: /home/your-username/isbvgfuckedup
```

### 2.2 Add Secrets to GitHub

1. Navigate to your GitHub repository: `https://github.com/Happyarms/isbvgfuckedup`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add each secret:

**Secret 1: DEPLOY_SSH_KEY**
- Name: `DEPLOY_SSH_KEY`
- Value: Paste entire private key contents (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
- Click **Add secret**

**Secret 2: DEPLOY_HOST**
- Name: `DEPLOY_HOST`
- Value: Your server hostname or IP (e.g., `your-server.com`)
- Click **Add secret**

**Secret 3: DEPLOY_USER**
- Name: `DEPLOY_USER`
- Value: Your SSH username (e.g., `your-username`)
- Click **Add secret**

**Secret 4: DEPLOY_PATH**
- Name: `DEPLOY_PATH`
- Value: Absolute path to application (e.g., `/home/your-username/isbvgfuckedup`)
- Click **Add secret**

### 2.3 Verify Secrets Configuration

After adding all secrets, verify:
- Go to **Settings** → **Secrets and variables** → **Actions**
- You should see 4 repository secrets listed:
  - ✅ `DEPLOY_SSH_KEY`
  - ✅ `DEPLOY_HOST`
  - ✅ `DEPLOY_USER`
  - ✅ `DEPLOY_PATH`

**Note:** GitHub does not display secret values for security reasons.

## Phase 3: Dry-Run Test of CD Workflow

### 3.1 Manual Workflow Trigger (Recommended for First Test)

Test the deployment workflow manually before enabling automatic deployments:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **CD** workflow in the left sidebar
4. Click **Run workflow** button (top right)
5. Ensure **Branch: main** is selected
6. Click **Run workflow**

### 3.2 Monitor Workflow Execution

1. The workflow run will appear in the list
2. Click the workflow run to view details
3. Click **Deploy to Production** job
4. Watch the logs in real-time

**Expected Steps:**

```
✅ Set up job
✅ Checkout code
✅ Setup SSH
✅ Add server to known hosts
✅ Deploy to production server
✅ Verify deployment
✅ Complete job
```

**Each step should show:**
- Green checkmark ✅ for success
- Detailed logs you can expand to review

### 3.3 Verify Deployment on Server

After the workflow completes successfully, verify the deployment on your server:

```bash
# SSH into production server
ssh your-username@your-server.com

# Check PM2 status
pm2 status

# Check application uptime (should be recent - a few seconds or minutes)
pm2 status | grep isbvgfuckedup

# Test health endpoint
curl http://localhost:3000/api/status

# Check recent logs
pm2 logs isbvgfuckedup --lines 20
```

**Expected PM2 status:**
- Status: `online`
- Uptime: Recent (seconds or minutes)
- Restarts: Count should have incremented by 1

**Expected health endpoint:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T...",
  "uptime": 5.123,
  ...
}
```

**Uptime should be a low number (seconds).**

## Phase 4: Test Rollback Procedure

Before relying on the deployment pipeline, verify the rollback procedure works.

### 4.1 Document Current State

Before making a breaking change, document the current state:

```bash
# SSH into production server
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup

# Get current commit hash
git log --oneline -n 1
# Example output: abc123f Test deployment pipeline

# Save this commit hash - you'll use it for rollback
```

### 4.2 Create a Test Breaking Change

Create a temporary breaking change to test rollback:

```bash
# On your local machine
cd ~/isbvgfuckedup
git checkout main
git pull origin main

# Create a test branch
git checkout -b test-rollback

# Make a breaking change (introduce a syntax error)
echo "module.exports = {broken syntax" >> test-broken.js

# Commit and push (but DON'T merge to main yet)
git add test-broken.js
git commit -m "Test: Breaking change for rollback testing"
git push origin test-rollback
```

### 4.3 Test Manual Rollback

Test the rollback procedure manually:

```bash
# SSH into production server
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup

# Method 1: Rollback to previous commit
git log --oneline -n 5
# Identify the previous working commit (the one before your test change)

git reset --hard abc123f  # Replace with your actual previous commit hash
pm2 restart isbvgfuckedup

# Verify application is working
curl http://localhost:3000/api/status
pm2 status

# Method 2: Rollback using git reflog (if you didn't note the commit hash)
git reflog
# Find the previous HEAD position
git reset --hard HEAD@{1}
pm2 restart isbvgfuckedup
```

### 4.4 Verify Rollback Success

```bash
# Check application status
pm2 status

# Test health endpoint
curl http://localhost:3000/api/status

# Verify git is on the correct commit
git log --oneline -n 1
```

**Expected result:**
- Application is online and healthy
- Health endpoint returns `{"status": "ok", ...}`
- Git shows the previous working commit

### 4.5 Clean Up Test Branch

```bash
# On your local machine
git checkout main
git branch -D test-rollback
git push origin --delete test-rollback

# On production server, sync back to main
ssh your-username@your-server.com "cd /home/your-username/isbvgfuckedup && git checkout main && git pull origin main"
```

## Phase 5: Common Issues and Solutions

### Issue 1: SSH Permission Denied

**Error in workflow logs:**
```
Permission denied (publickey)
```

**Solution:**
```bash
# Verify SSH key works locally first
ssh -i ~/.ssh/github_deploy_key your-username@your-server.com "echo test"

# If local test fails:
# 1. Check public key is on server
ssh your-username@your-server.com "cat ~/.ssh/authorized_keys | grep github-actions"

# 2. Verify key permissions
chmod 600 ~/.ssh/github_deploy_key
chmod 644 ~/.ssh/github_deploy_key.pub

# 3. Re-add public key to server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub your-username@your-server.com

# 4. Update DEPLOY_SSH_KEY secret in GitHub with correct private key
```

### Issue 2: Host Key Verification Failed

**Error in workflow logs:**
```
Host key verification failed
```

**Solution:**
This is usually handled automatically by the "Add server to known hosts" step. If it persists:

```bash
# Get your server's host key
ssh-keyscan -H your-server.com

# The workflow should handle this, but verify DEPLOY_HOST matches exactly
```

### Issue 3: Deployment Script Not Found

**Error in workflow logs:**
```
scripts/deploy.sh: No such file or directory
```

**Solution:**
```bash
# SSH into server and pull latest code
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup
git pull origin main

# Verify script exists
ls -lh scripts/deploy.sh

# Make it executable
chmod +x scripts/deploy.sh
```

### Issue 4: PM2 Not Found

**Error in workflow logs:**
```
pm2: command not found
```

**Solution:**
```bash
# SSH into server
ssh your-username@your-server.com

# Load nvm and install PM2
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18
npm install -g pm2

# Update deploy.sh to load nvm before using pm2
# Add at the top of scripts/deploy.sh:
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# nvm use 18
```

### Issue 5: Wrong Deployment Path

**Error in workflow logs:**
```
cd: /path/to/app: No such file or directory
```

**Solution:**
```bash
# SSH into server and find correct path
ssh your-username@your-server.com
cd ~/isbvgfuckedup  # Or wherever your app is
pwd  # This shows the absolute path

# Update DEPLOY_PATH secret in GitHub with the correct path
```

### Issue 6: Deployment Verification Failed

**Error in workflow logs:**
```
curl: (7) Failed to connect to localhost port 3000
```

**Solution:**
```bash
# SSH into server
ssh your-username@your-server.com

# Check PM2 status
pm2 status

# Check PM2 logs for errors
pm2 logs isbvgfuckedup --lines 50

# Check if app is listening on correct port
netstat -tulpn | grep 3000

# Verify .env has correct PORT setting
cat .env | grep PORT

# Manually restart if needed
pm2 restart isbvgfuckedup
```

## Phase 6: Enable Automatic Deployment

After successfully completing the dry-run test, you can enable automatic deployments.

### 6.1 Verify CI/CD Pipeline

The deployment workflow is already configured to run automatically on push to `main`. To test the full pipeline:

```bash
# On your local machine
cd ~/isbvgfuckedup
git checkout main
git pull origin main

# Make a small, safe change
echo "" >> README.md
echo "<!-- Deployment pipeline tested $(date) -->" >> README.md

# Commit and push
git add README.md
git commit -m "Enable automatic deployments after dry-run testing"
git push origin main
```

### 6.2 Monitor Automatic Deployment

1. Go to **Actions** tab in GitHub
2. You should see both CI and CD workflows running
3. Verify both complete successfully
4. Check production server to confirm deployment

### 6.3 Verify Production

```bash
# Check application status
ssh your-username@your-server.com "pm2 status"

# Verify latest commit
ssh your-username@your-server.com "cd /home/your-username/isbvgfuckedup && git log --oneline -n 1"

# Test health endpoint
curl https://your-domain.com/api/status
```

## Rollback Procedures Reference

### Quick Rollback (Emergency)

If a deployment breaks production:

```bash
# SSH into production server
ssh your-username@your-server.com
cd /home/your-username/isbvgfuckedup

# Option 1: Rollback to previous commit
git reset --hard HEAD~1
pm2 restart isbvgfuckedup

# Option 2: Rollback to specific commit (if you know the hash)
git reset --hard abc123f
pm2 restart isbvgfuckedup

# Option 3: Use git reflog to find previous state
git reflog
git reset --hard HEAD@{1}
pm2 restart isbvgfuckedup
```

### Verify Rollback

```bash
# Check application status
pm2 status

# Test health endpoint
curl http://localhost:3000/api/status

# Check current commit
git log --oneline -n 1
```

### Prevent Future Bad Deployments

After rolling back:

1. Identify what went wrong in the deployment
2. Fix the issue in a new branch
3. Test locally before pushing
4. Create a pull request for review
5. Merge to main only after CI passes

## Dry-Run Testing Checklist

Before marking the deployment pipeline as production-ready, verify all items:

**Phase 1: Server Setup**
- [ ] SSH access works with deployment key
- [ ] Deployment script exists and is executable
- [ ] Manual deployment test succeeds
- [ ] Application restarts correctly via PM2

**Phase 2: GitHub Configuration**
- [ ] All 4 GitHub Secrets configured correctly
- [ ] DEPLOY_SSH_KEY contains full private key
- [ ] DEPLOY_HOST matches server hostname
- [ ] DEPLOY_USER is correct SSH username
- [ ] DEPLOY_PATH is correct absolute path

**Phase 3: CD Workflow Test**
- [ ] Manual workflow trigger succeeds
- [ ] All workflow steps complete successfully
- [ ] SSH connection from GitHub Actions works
- [ ] Deployment script executes without errors
- [ ] Application restarts and becomes healthy
- [ ] Health endpoint verification passes

**Phase 4: Rollback Verification**
- [ ] Current state documented before test
- [ ] Rollback to previous commit works
- [ ] Application recovers after rollback
- [ ] Health endpoint responds after rollback
- [ ] Test changes cleaned up

**Phase 5: Issue Resolution**
- [ ] No SSH authentication errors
- [ ] No host key verification errors
- [ ] No deployment script errors
- [ ] No PM2 errors
- [ ] No path errors
- [ ] No verification failures

**Phase 6: Automatic Deployment**
- [ ] Automatic deployment on push to main works
- [ ] Both CI and CD workflows complete successfully
- [ ] Production server runs latest code
- [ ] No errors in workflow logs

**All checks completed! ✅** Your deployment pipeline is production-ready.

## Next Steps

After completing the dry-run testing:

1. **Enable branch protection** on `main`:
   - Go to **Settings** → **Branches**
   - Add branch protection rule for `main`
   - Enable "Require status checks to pass before merging"
   - Select the CI workflow as required

2. **Monitor deployments**:
   - Check **Actions** tab regularly
   - Review workflow logs for any issues
   - Monitor production server health

3. **Document for team**:
   - Share rollback procedures with team members
   - Document any custom configurations
   - Update deployment guide if needed

4. **Consider enhancements**:
   - Add deployment notifications (Slack, email, etc.)
   - Implement staging environment for pre-production testing
   - Add automated rollback on deployment failure
   - Set up monitoring and alerting for production

## Support

For issues during dry-run testing:
- Review workflow logs in **Actions** tab
- Check production server logs: `pm2 logs isbvgfuckedup`
- Consult `.github/DEPLOYMENT.md` for detailed setup instructions
- Review `scripts/deploy.sh` for deployment script logic

## Summary

This dry-run testing guide walked you through:
1. ✅ Verifying production server setup
2. ✅ Configuring GitHub Secrets securely
3. ✅ Testing the CD workflow manually
4. ✅ Verifying rollback procedures work
5. ✅ Troubleshooting common issues
6. ✅ Enabling automatic deployments

Your CI/CD pipeline is now tested and ready for production use! Every push to `main` will automatically test and deploy your application.
