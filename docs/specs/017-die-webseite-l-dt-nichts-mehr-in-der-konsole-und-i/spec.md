# Specification: Website Not Loading - Silent Failure Debug

## Overview

The website (Express.js Transit Status application) has stopped loading completely with no visible error messages in the browser console or network tab. This is a critical silent failure issue where the page displays nothing (blank/white screen) despite the server appearing to respond. The task is to diagnose and fix the root cause preventing the application from initializing or rendering content.

## Workflow Type

**Type**: bug_fix

**Rationale**: The application was working (implied by "doesn't load anymore") and has regressed due to an unknown cause. No error messages suggest a pre-runtime or initialization issue. This requires systematic debugging to identify what broke, then implementing the fix.

## Task Scope

### Services Involved
- **main** (primary) - Express.js backend service rendering transit status pages and API endpoints

### This Task Will:
- [ ] Diagnose root cause of silent loading failure
- [ ] Identify and fix broken initialization chain (server, dependencies, templates)
- [ ] Verify website loads and displays content in browser
- [ ] Confirm API endpoints respond correctly
- [ ] Verify no regression in existing functionality

### Out of Scope:
- Adding new features or routes
- Refactoring architecture or code structure
- Performance optimization beyond fixing the loading issue
- Database changes (if any)

## Service Context

### Main Service (Express.js Backend)

**Tech Stack:**
- Language: JavaScript (Node.js)
- Framework: Express.js
- Template Engine: Pug
- Key Dependencies: hafas-client, morgan, dotenv
- Package Manager: npm
- Testing Framework: Jest

**Entry Point:** `src/routes/index.js` (routes definition)
**Main Application File:** `src/app.js` or similar (likely contains Express setup)
**Server Startup:** Port 3000 (configurable via PORT environment variable)

**How to Run:**
```bash
npm install
npm run dev
```

**Port:** 3000 (default, configurable via PORT env var)

**Required Environment Variables:**
- `PORT`: Application port (default 3000)
- `NODE_ENV`: Environment (development/production)
- `BVG_API_TYPE`: Transit API type configuration
- `REFRESH_INTERVAL`: Data refresh interval (seconds)
- `LOG_LEVEL`: Logging level
- `THRESHOLD_DEGRADED`: Status threshold for degraded state
- `THRESHOLD_FUCKED`: Status threshold for fucked state
- `DELAY_THRESHOLD`: Delay detection threshold
- `STALENESS_THRESHOLD`: Data staleness threshold

## Problem Analysis

### Symptoms
1. **Complete Page Failure**: Website shows nothing (blank page or white screen)
2. **No Console Errors**: Browser console displays no JavaScript errors
3. **No Network Errors**: Network tab shows no failed requests or HTTP errors
4. **Silent Failure**: Application initializes without throwing errors but produces no output

### Root Cause Categories to Investigate

| Category | Potential Causes | Investigation |
|----------|-----------------|---|
| **Environment** | Missing/incorrect .env file or variables | Check .env.example and .env setup |
| **Dependencies** | Incomplete npm install, broken packages | Verify node_modules exists, npm audit |
| **Build/Startup** | Server not starting, port binding issues | Check console output when running npm run dev |
| **Rendering** | Pug template failure, missing templates | Verify template files exist in correct paths |
| **API Integration** | hafas-client initialization failing silently | Check require() statements, module loading |
| **Middleware** | Express middleware chain broken, silent error catching | Inspect app.js middleware order, error handlers |

## Files to Investigate & Modify

| File | Purpose | Investigation Needed |
|------|---------|-----|
| `.env` or `.env.local` | Environment configuration | Verify all required variables are set |
| `.env.example` | Environment template | Compare with .env to find missing vars |
| `package.json` | Dependencies and scripts | Check dev command, verify all deps installed |
| `package-lock.json` | Dependency lock file | May need to be regenerated if corrupted |
| `src/app.js` or `src/index.js` | Express application setup | Check startup code, middleware, route mounting |
| `src/routes/index.js` | Route definitions | Verify routes are properly defined |
| `src/` (template files) | Pug templates | Locate and verify template files exist |
| `npm-debug.log` or server console | Runtime logs | Check for errors not visible in browser |

## Patterns to Follow

### Express.js Application Setup Pattern
From typical Express.js projects:

```javascript
// Standard Express startup pattern
const express = require('express');
const app = express();

// Middleware setup
app.use(express.static('public'));
app.set('view engine', 'pug');

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error');
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Key Points to Verify:**
- Express app is properly instantiated
- View engine is set to 'pug'
- Routes are mounted BEFORE error middleware
- Error handlers are present and functional
- Server.listen() is actually called
- Startup logs appear in console

## Requirements

### Functional Requirements

1. **Website Must Load**
   - Description: Users can access http://localhost:3000 and see the transit status dashboard
   - Acceptance: Page displays HTML content with transit status information
   - Verification: Load page in browser, inspect Elements tab shows HTML structure

2. **Home Route Works**
   - Description: GET / returns rendered HTML page without errors
   - Acceptance: Response status 200, Content-Type: text/html, page contains expected content
   - Verification: curl http://localhost:3000 returns full HTML

3. **API Status Endpoint Works**
   - Description: GET /api/status returns status data
   - Acceptance: Response status 200, Content-Type: application/json, contains status data
   - Verification: curl http://localhost:3000/api/status returns JSON

4. **No Console Errors During Load**
   - Description: Browser console shows no JavaScript errors after page load
   - Acceptance: No red error messages in browser console
   - Verification: Open DevTools Console tab, no errors appear

5. **Environment Properly Configured**
   - Description: All required environment variables are set correctly
   - Acceptance: No "undefined" values breaking functionality
   - Verification: npm run dev starts without ENV variable warnings

### Edge Cases & Error Scenarios

1. **Missing .env File** - App must fail gracefully or use .env.example as reference
2. **Missing Template Files** - Error in template rendering should bubble up as HTTP error, not silent failure
3. **Port Already in Use** - Should show clear error, not silently fail
4. **Incomplete npm install** - Required packages missing should show error on startup
5. **Breaking Changes in Dependencies** - hafas-client API changes should be evident in logs

## Investigation & Resolution Strategy

### Phase 1: Verify Server Is Running
```bash
npm install
npm run dev
# Check if server starts successfully
# Look for "Server running on port 3000" or similar
# Check for any error messages in console
```

### Phase 2: Verify Environment
```bash
ls -la | grep env
# Check if .env exists, if not create from .env.example
cat .env
# Verify all required variables are present
```

### Phase 3: Verify Dependencies
```bash
npm audit
npm ls hafas-client
# Check if packages are properly installed
ls -la node_modules | wc -l
```

### Phase 4: Test Routes Directly
```bash
curl -v http://localhost:3000/
curl -v http://localhost:3000/api/status
# Check HTTP status codes and response headers
```

### Phase 5: Inspect Application Code
1. Find and read the main entry point (likely src/app.js)
2. Verify all require() statements work
3. Check error handlers are in place
4. Verify templates exist in expected locations
5. Check for any synchronous errors that might silently fail

### Phase 6: Browser Developer Tools Deep Dive
1. **Elements Tab**: Verify HTML is being sent (not blank)
2. **Network Tab**: Check if all assets load (even if no errors shown)
3. **Sources Tab**: Verify JavaScript files are present and executable
4. **Console Tab**: Run `console.log('test')` to verify console works
5. **Application Tab**: Check localStorage, cookies, service workers

## Implementation Notes

### DO
- Start the server with `npm run dev` and capture ALL console output
- Check `.env` file exists and all required variables are set
- Verify `package-lock.json` exists (use `npm ci` instead of `npm install` if available)
- Inspect the Express app.js for proper middleware and route setup
- Test routes with curl before browser to eliminate browser-specific issues
- Look for console.error() calls that might be catching errors silently
- Check if Pug templates exist in the correct directory structure

### DON'T
- Assume the server is running without checking console output
- Skip checking environment variables - missing vars often cause silent failures
- Ignore npm error messages or warnings
- Delete node_modules and reinstall without checking package-lock.json
- Assume browser developer tools are the only place to find errors (check terminal/server logs)

## Development Environment

### Prerequisites
- Node.js (version should match package.json engines field if present)
- npm (usually comes with Node.js)

### Start Service
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Expected output: "Server running on port 3000" or similar
```

### Service URLs
- Home Page: http://localhost:3000
- API Status: http://localhost:3000/api/status

### Required Files to Check
- `.env` - Must exist with all required variables
- `.env.example` - Reference for required variables
- `src/app.js` - Express application setup
- `src/routes/index.js` - Route definitions
- `package.json` - Dependencies and scripts
- `src/` - Should contain views and route files

## Success Criteria

The task is complete when:

1. [ ] Website loads at http://localhost:3000 and displays content
2. [ ] Home page (/) renders successfully with HTML content visible
3. [ ] API endpoint (/api/status) returns valid JSON response
4. [ ] Browser console shows no JavaScript errors
5. [ ] Server starts with npm run dev without failures
6. [ ] All required environment variables are properly configured
7. [ ] No "white screen of death" or blank page
8. [ ] Page is interactive and functional (not just loading HTML)

## Debugging Checklist

Before assuming the cause, systematically verify:

- [ ] Server console shows startup message without errors
- [ ] `.env` file exists with all required variables from `.env.example`
- [ ] `npm install` completes successfully
- [ ] `node_modules` directory contains packages
- [ ] `curl http://localhost:3000` returns HTML (not blank)
- [ ] Browser can reach localhost:3000 (connection established)
- [ ] Browser DevTools Elements tab shows HTML received
- [ ] Browser DevTools Network tab shows requests completing
- [ ] No error messages in server console during page load
- [ ] Express app.js file exists and can be read
- [ ] All require() statements in app.js point to existing files
- [ ] Pug template files exist in expected directory
- [ ] No async errors in catch handlers or promise rejections

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified before task completion.

### Browser Verification
| Check | What to Do | Expected Result |
|-------|-----------|-----------------|
| Page Load | Open http://localhost:3000 in Chrome/Firefox | Page displays without errors, content visible |
| Console Check | Open DevTools Console tab | No error messages, only expected logs if any |
| Network Tab | Open DevTools Network tab, refresh page | All requests show status 200 or 304, no 500 errors |
| Elements Tab | Open DevTools Elements tab | HTML structure present, not empty <body> |
| Responsive | Test mobile view in DevTools | Page layout responsive, text readable |

### API Verification
| Endpoint | Test Method | Expected Response |
|----------|-------------|---|
| GET / | `curl http://localhost:3000/` | HTTP 200, HTML content with transit data |
| GET /api/status | `curl http://localhost:3000/api/status` | HTTP 200, JSON with status object |
| Refresh Page | Browser refresh (F5) | Page reloads successfully without stalling |

### Server Verification
| Check | Test | Expected |
|-------|------|----------|
| Startup | Run `npm run dev` | Console shows "Server running" message without errors |
| Port Binding | After startup, run `netstat -tulpn \| grep 3000` | Port 3000 shows as LISTEN |
| Logs | Check server console during page load | Request logs show GET / and subsequent requests |
| No Crashes | Run for 30 seconds | No error stacks, no crashes, server stays running |

### Environment Verification
| Variable | Check | Expected |
|----------|-------|----------|
| .env file | `test -f .env && echo "exists"` | File exists and is readable |
| All vars set | `grep -c "=" .env` | Should match count of required variables |
| No undefined | Check app.js uses env vars correctly | No "undefined" values breaking logic |
| PORT | `echo $PORT` or check .env | Should be 3000 or configured value |

### QA Sign-off Checklist
- [ ] Website loads and displays content at http://localhost:3000
- [ ] No errors in browser console after full page load
- [ ] No errors on browser network tab (all requests 200/304)
- [ ] API endpoint /api/status returns JSON successfully
- [ ] Server starts cleanly with npm run dev
- [ ] Page is interactive and responsive
- [ ] No silent failures or blank screens
- [ ] All required environment variables configured correctly
- [ ] Server logs show successful request handling
- [ ] No regressions - existing routes work as expected
