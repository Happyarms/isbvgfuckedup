# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29T15:28:00Z
**QA Session**: 1

## Critical Issues to Fix

### 1. Coverage Reports Committed to Git

**Problem**: The `coverage/` directory containing 22+ generated HTML/CSS/JS files was committed to the repository. Coverage reports are build artifacts that should never be version controlled.

**Location**:
- `coverage/` directory (entire directory)
- `.gitignore` (missing coverage/ entry)

**Why This Blocks Sign-Off**:
- Violates standard best practices for version control
- Will bloat repository size over time (coverage reports can be large)
- Will cause merge conflicts on every test run
- Makes it unclear which files are source code vs generated artifacts
- Every CI run will generate new coverage reports, creating diff noise

**Required Fix**:
```bash
# 1. Add coverage/ to .gitignore
echo "" >> .gitignore
echo "# Test coverage reports" >> .gitignore
echo "coverage/" >> .gitignore

# 2. Remove coverage files from git tracking (but keep locally)
git rm -r --cached coverage/

# 3. Commit the changes
git add .gitignore
git commit -m "fix: add coverage/ to .gitignore and remove committed coverage reports (qa-requested)"
```

**Verification Steps**:
1. Run `git status` - should NOT show coverage/ files
2. Run `npm test -- --coverage` - coverage/ should regenerate locally
3. Run `git status` again - coverage/ should still not appear (ignored)
4. Confirm `.gitignore` contains `coverage/`

---

### 2. Code Duplication Between app.js and app-logic.js

**Problem**: Core business logic functions (analyzeStatus, formatPct, renderDisruptions, isBusDisruption, isTramDisruption, isSBahnDisruption, isUBahnDisruption, isOtherDisruption) are duplicated between:
- `js/app.js` (IIFE pattern for browser)
- `js/app-logic.js` (ES modules for testing)

**Location**:
- `js/app.js` lines ~60-600
- `js/app-logic.js` lines 1-304

**Why This Blocks Sign-Off**:
- **Maintenance Risk**: Any logic change must be manually synchronized across both files
- **Single Source of Truth Violated**: Tests validate app-logic.js but production uses app.js
- **Risk of Divergence**: If the two implementations drift apart, tests will pass but production will be broken
- **Current State**: The functions are currently identical, but there's no mechanism to keep them synchronized

**Required Fix** (Choose One Approach):

#### Approach A: Use ES Modules (RECOMMENDED)

Convert app.js to use ES modules and import from app-logic.js:

```bash
# 1. Find and update index.html (if it exists in this branch, or document for merge)
# Change the script tag from:
#   <script src="js/app.js"></script>
# To:
#   <script type="module" src="js/app.js"></script>

# 2. Update js/app.js to import functions instead of defining them
# At the top of the IIFE in app.js, replace duplicate function definitions with:
import {
  analyzeStatus,
  formatPct,
  isBusDisruption,
  isTramDisruption,
  isSBahnDisruption,
  isUBahnDisruption,
  isOtherDisruption,
  renderDisruptions,
  parseAPIResponse,
  validateDepartures
} from './app-logic.js';

# 3. Remove all duplicate function definitions from app.js
#    Keep only the IIFE wrapper, DOM references, and UI update logic

# 4. Test in browser
python -m http.server 8080
# Navigate to http://localhost:8080 and verify status calculations work

# 5. Run tests
npm test
```

#### Approach B: Add Documentation and Warning (FALLBACK)

If ES modules cause browser compatibility issues, document the duplication:

```bash
# 1. Add a prominent comment in js/app.js:
/*
 * WARNING: This file contains logic duplicated from app-logic.js
 * app-logic.js is the SOURCE OF TRUTH for all business logic.
 *
 * When updating business logic:
 * 1. Make changes in app-logic.js first
 * 2. Run tests: npm test
 * 3. Manually sync changes to this file (app.js)
 * 4. Test in browser
 *
 * TODO: Migrate to ES modules to eliminate this duplication
 */

# 2. Update README.md with the same warning

# 3. Create a script to check for drift:
cat > scripts/check-sync.sh << 'EOF'
#!/bin/bash
# Check if app.js and app-logic.js have diverged
# (This is a simple check - you may want to make it more sophisticated)
echo "Checking for logic drift between app.js and app-logic.js..."
echo "Manual review required after any logic changes"
EOF
chmod +x scripts/check-sync.sh
```

**Verification Steps**:

For Approach A (ES Modules):
1. Run `npm test` - all 226 tests should still pass
2. Run `grep -c "function analyzeStatus" js/app.js` - should return 0 (imported, not defined)
3. Run `grep -c "import.*app-logic" js/app.js` - should return 1 (import statement exists)
4. Start dev server: `python -m http.server 8080`
5. Open browser to `http://localhost:8080`, verify:
   - Page loads without console errors
   - Status calculations work correctly
   - All UI elements function properly
6. Check browser console for any ES module errors

For Approach B (Documentation):
1. Verify warning comment exists at top of js/app.js
2. Verify README.md documents the duplication and sync process
3. Run `npm test` - all tests should pass

---

## After Fixes

Once both critical issues are fixed:

1. **Commit each fix separately**:
   ```bash
   # After fixing Issue #1
   git add .gitignore
   git commit -m "fix: add coverage/ to .gitignore and remove committed coverage reports (qa-requested)"

   # After fixing Issue #2
   git add js/app.js [and other modified files]
   git commit -m "fix: resolve code duplication between app.js and app-logic.js using ES modules (qa-requested)"
   ```

2. **Run full test suite**:
   ```bash
   npm test -- --coverage
   ```
   Expected: All 226 tests pass with 100% coverage

3. **Verify git status**:
   ```bash
   git status
   ```
   Expected: No untracked coverage/ files, clean working directory

4. **QA will automatically re-run** and validate:
   - Coverage reports are properly gitignored
   - Code duplication is resolved
   - All tests still pass
   - Application still functions correctly

## Notes

- Both issues are architectural/tooling issues, not logic bugs
- The test suite itself is excellent (226 tests, 100% coverage)
- The business logic is correct and comprehensive
- These fixes ensure long-term maintainability and prevent future problems

---

**Expected Outcome**: After fixes are complete, QA will approve the implementation and the feature will be ready for merge to master.
