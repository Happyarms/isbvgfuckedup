#!/bin/bash

# End-to-End Test Helper Script for Dual Status Display
# Subtask 6-1: Automated checks + manual test instructions

set -e

echo "=================================================="
echo "  E2E Verification: Dual Status Display"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if port 8080 is available or already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓${NC} Server already running on port 8080"
    SERVER_RUNNING=true
else
    echo -e "${YELLOW}!${NC} No server detected on port 8080"
    echo ""
    echo "Starting development server..."
    python3 -m http.server 8080 > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_RUNNING=false
    sleep 2
    echo -e "${GREEN}✓${NC} Server started (PID: $SERVER_PID)"
fi

echo ""
echo "=================================================="
echo "  Automated Checks"
echo "=================================================="
echo ""

# Check 1: Files exist
echo "1. Checking required files..."
files=("index.html" "js/app.js" "css/style.css")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file exists"
    else
        echo -e "   ${RED}✗${NC} $file missing"
        exit 1
    fi
done

# Check 2: HTML structure
echo ""
echo "2. Checking HTML structure..."
if grep -q "categories-wrapper" index.html; then
    echo -e "   ${GREEN}✓${NC} Dual category wrapper found"
else
    echo -e "   ${RED}✗${NC} Missing categories-wrapper"
    exit 1
fi

if grep -q "Busse" index.html && grep -q "Bahnen" index.html; then
    echo -e "   ${GREEN}✓${NC} Category labels present"
else
    echo -e "   ${RED}✗${NC} Missing category labels"
    exit 1
fi

if grep -q "status-answer-buses" index.html && grep -q "status-answer-trains" index.html; then
    echo -e "   ${GREEN}✓${NC} Category-specific DOM IDs found"
else
    echo -e "   ${RED}✗${NC} Missing category-specific IDs"
    exit 1
fi

# Check 3: JavaScript implementation
echo ""
echo "3. Checking JavaScript implementation..."
if grep -q "filterByProduct" js/app.js; then
    echo -e "   ${GREEN}✓${NC} filterByProduct() function exists"
else
    echo -e "   ${RED}✗${NC} Missing filterByProduct() function"
    exit 1
fi

if grep -q "determineOverallStatus" js/app.js; then
    echo -e "   ${GREEN}✓${NC} determineOverallStatus() function exists"
else
    echo -e "   ${RED}✗${NC} Missing determineOverallStatus() function"
    exit 1
fi

if grep -q "dep && dep.line && dep.line.product" js/app.js; then
    echo -e "   ${GREEN}✓${NC} Null safety checks present"
else
    echo -e "   ${RED}✗${NC} Missing null safety checks"
    exit 1
fi

if grep -q "dom.buses" js/app.js && grep -q "dom.trains" js/app.js; then
    echo -e "   ${GREEN}✓${NC} Dual DOM references found"
else
    echo -e "   ${RED}✗${NC} Missing dual DOM references"
    exit 1
fi

# Check 4: CSS responsive layout
echo ""
echo "4. Checking CSS responsive layout..."
if grep -q "categories-wrapper" css/style.css; then
    echo -e "   ${GREEN}✓${NC} Category wrapper styles found"
else
    echo -e "   ${RED}✗${NC} Missing category wrapper styles"
    exit 1
fi

if grep -q "@media (max-width: 768px)" css/style.css; then
    echo -e "   ${GREEN}✓${NC} Responsive breakpoint (768px) found"
else
    echo -e "   ${RED}✗${NC} Missing responsive breakpoint"
    exit 1
fi

if grep -q "flex-direction: column" css/style.css; then
    echo -e "   ${GREEN}✓${NC} Stacked mobile layout implemented"
else
    echo -e "   ${RED}✗${NC} Missing mobile layout"
    exit 1
fi

# Check 5: API accessibility
echo ""
echo "5. Checking VBB API accessibility..."
if curl -s --max-time 5 "https://v6.vbb.transport.rest/stops/900003201/departures?duration=30&results=1" > /dev/null; then
    echo -e "   ${GREEN}✓${NC} VBB API is accessible"
else
    echo -e "   ${YELLOW}!${NC} VBB API may be slow or unreachable (non-critical)"
fi

echo ""
echo "=================================================="
echo "  Automated Checks: ${GREEN}PASSED${NC}"
echo "=================================================="
echo ""

# Manual test instructions
echo ""
echo "=================================================="
echo "  Manual Browser Testing Required"
echo "=================================================="
echo ""
echo "The application is running at: ${GREEN}http://localhost:8080${NC}"
echo ""
echo "Please perform the following manual checks:"
echo ""
echo "□ 1. Open http://localhost:8080 in your browser"
echo "□ 2. Wait for loading indicator to disappear"
echo "□ 3. Verify two category labels visible: 'Busse' and 'Bahnen'"
echo "□ 4. Verify both categories show status (JA/NAJA/NEIN/?)"
echo "□ 5. Verify both categories show independent metrics"
echo "□ 6. Verify background color reflects a status"
echo "□ 7. Resize browser to <768px, verify stacked layout"
echo "□ 8. Wait 60 seconds, verify auto-refresh updates"
echo "□ 9. Open browser console (F12), verify ZERO errors"
echo ""
echo "For detailed testing steps, see: VERIFICATION_REPORT.md"
echo ""

# Keep server running or clean up
if [ "$SERVER_RUNNING" = false ]; then
    echo "Press Ctrl+C to stop the server and exit"
    echo ""
    wait $SERVER_PID
else
    echo "Server was already running, leaving it active"
    echo ""
fi
