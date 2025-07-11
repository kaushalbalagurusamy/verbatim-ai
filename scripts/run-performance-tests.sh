#!/bin/bash

# Performance Testing Script
# Runs comprehensive performance tests and generates reports

set -e

echo "🚀 Starting Performance Test Suite"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create test results directory
mkdir -p performance-results
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="performance-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

echo -e "\n${YELLOW}1. Building application...${NC}"
pnpm run build

echo -e "\n${YELLOW}2. Running Lighthouse CI tests...${NC}"
if pnpm run test:lighthouse:local; then
    echo -e "${GREEN}✓ Lighthouse tests passed${NC}"
    cp -r .lighthouseci "$RESULTS_DIR/lighthouse" 2>/dev/null || true
else
    echo -e "${RED}✗ Lighthouse tests failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}3. Running Playwright performance tests...${NC}"
if pnpm run test:performance; then
    echo -e "${GREEN}✓ Playwright performance tests passed${NC}"
    cp -r test-results "$RESULTS_DIR/playwright" 2>/dev/null || true
else
    echo -e "${RED}✗ Playwright performance tests failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}4. Generating performance report...${NC}"

# Create summary report
cat > "$RESULTS_DIR/summary.md" << EOF
# Performance Test Results
Generated: $(date)

## Test Configuration
- Device: Emulated Moto G4
- CPU Throttling: 4x
- Network: Fast 3G

## Performance Budgets
| Metric | Budget | Status |
|--------|--------|--------|
| FPS | ≥ 55 | TBD |
| TTI | < 2s | TBD |
| CLS | < 0.1 | TBD |
| FID | < 100ms | TBD |
| LCP | < 2.5s | TBD |

## Test Results
See individual test reports for detailed results:
- Lighthouse: lighthouse/
- Playwright: playwright/

EOF

echo -e "${GREEN}✓ Performance report generated${NC}"
echo -e "\nResults saved to: $RESULTS_DIR"

# Check if all tests passed
if [ -f "$RESULTS_DIR/lighthouse/assertion-results.json" ]; then
    # Parse Lighthouse results
    if grep -q '"level":"error"' "$RESULTS_DIR/lighthouse/assertion-results.json"; then
        echo -e "\n${RED}❌ Performance budgets exceeded!${NC}"
        echo "See $RESULTS_DIR/lighthouse/assertion-results.json for details"
        exit 1
    fi
fi

echo -e "\n${GREEN}✅ All performance tests passed!${NC}"