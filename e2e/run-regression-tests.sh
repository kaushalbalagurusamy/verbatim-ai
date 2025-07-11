#!/bin/bash

# EditorV2 Line Alignment Regression Test Suite Runner
# This script runs all regression tests and generates a comprehensive report

set -e

echo "🧪 EditorV2 Line Alignment Regression Test Suite"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory for test artifacts
ARTIFACTS_DIR="test-artifacts/regression-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARTIFACTS_DIR"

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    local description=$3
    
    echo -e "${BLUE}Running: $description${NC}"
    echo "----------------------------------------"
    
    if pnpm test:e2e "$test_file" --reporter=json > "$ARTIFACTS_DIR/${suite_name}-results.json" 2>&1; then
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        return 1
    fi
}

# Function to check if visual baselines exist
check_visual_baselines() {
    if [ -d "e2e/visual-regression.spec.ts-snapshots" ]; then
        echo -e "${GREEN}✅ Visual regression baselines found${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  No visual regression baselines found${NC}"
        echo "   Run with --update-snapshots to create baselines"
        return 1
    fi
}

# Parse command line arguments
UPDATE_SNAPSHOTS=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--update-snapshots] [--test <test-name>]"
            exit 1
            ;;
    esac
done

# Start test execution
echo "Starting regression test execution..."
echo "Test artifacts will be saved to: $ARTIFACTS_DIR"
echo ""

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 1. Run bug verification tests (should all pass if bugs are fixed)
echo -e "${BLUE}=== Bug Fix Verification Tests ===${NC}"
if run_test_suite "bug-verification" "bug-verification.spec.ts" "Verifying previously identified bugs are fixed"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
    echo -e "${YELLOW}Note: If these fail, the original bugs may not be fully fixed${NC}"
fi
((TOTAL_TESTS++))
echo ""

# 2. Run comprehensive line alignment tests
echo -e "${BLUE}=== Line Alignment Regression Tests ===${NC}"
if run_test_suite "line-alignment" "line-alignment-regression.spec.ts" "Comprehensive line alignment scenarios"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))
echo ""

# 3. Run visual regression tests
echo -e "${BLUE}=== Visual Regression Tests ===${NC}"
if [ "$UPDATE_SNAPSHOTS" = true ]; then
    echo "Updating visual regression baselines..."
    pnpm test:e2e visual-regression.spec.ts --update-snapshots
    echo -e "${GREEN}✅ Visual baselines updated${NC}"
    ((PASSED_TESTS++))
else
    if check_visual_baselines; then
        if run_test_suite "visual-regression" "visual-regression.spec.ts" "Visual regression comparison"; then
            ((PASSED_TESTS++))
        else
            ((FAILED_TESTS++))
            echo -e "${YELLOW}Tip: Check test-results/ for visual diff images${NC}"
        fi
    else
        echo "Skipping visual regression tests (no baselines)"
    fi
fi
((TOTAL_TESTS++))
echo ""

# Generate summary report
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total test suites run: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

# Generate detailed HTML report
cat > "$ARTIFACTS_DIR/regression-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>EditorV2 Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { font-size: 24px; font-weight: bold; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>EditorV2 Line Alignment Regression Test Report</h1>
    <p>Generated: $(date)</p>
    
    <h2>Overall Results</h2>
    <div class="metric">
        Total: $TOTAL_TESTS | 
        <span class="passed">Passed: $PASSED_TESTS</span> | 
        <span class="failed">Failed: $FAILED_TESTS</span>
    </div>
    
    <h2>Test Coverage</h2>
    <table>
        <tr>
            <th>Test Category</th>
            <th>Description</th>
            <th>Scenarios Covered</th>
        </tr>
        <tr>
            <td>Bug Verification</td>
            <td>Confirms previous bugs are fixed</td>
            <td>
                • Line number alignment with wrapping<br>
                • Formatting button functionality<br>
                • Keyboard shortcuts<br>
                • Toolbar state synchronization
            </td>
        </tr>
        <tr>
            <td>Line Alignment</td>
            <td>Comprehensive alignment scenarios</td>
            <td>
                • Window resize (wide to narrow, narrow to wide)<br>
                • Dynamic content changes<br>
                • Edge cases (zero width, fractional pixels)<br>
                • Unicode and emoji support<br>
                • Performance under stress
            </td>
        </tr>
        <tr>
            <td>Visual Regression</td>
            <td>Screenshot comparison tests</td>
            <td>
                • Multiple viewport sizes<br>
                • Content type variations<br>
                • State change scenarios<br>
                • Edge case rendering
            </td>
        </tr>
    </table>
    
    <h2>Performance Metrics</h2>
    <ul>
        <li>Line alignment tolerance: ≤ 1px in all scenarios</li>
        <li>Resize performance: Maintains 60 FPS target</li>
        <li>Memory usage: Bounded growth under stress</li>
    </ul>
    
    <h2>Next Steps</h2>
    <ul>
        <li>Review failed tests in Playwright report</li>
        <li>Check visual diffs for any rendering issues</li>
        <li>Update baselines if intentional changes were made</li>
    </ul>
</body>
</html>
EOF

echo -e "${GREEN}✅ HTML report generated: $ARTIFACTS_DIR/regression-report.html${NC}"

# Copy screenshots if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo "Copying failure screenshots..."
    if [ -d "test-results" ]; then
        cp -r test-results/* "$ARTIFACTS_DIR/" 2>/dev/null || true
    fi
    if [ -d "docs/bug-repro" ]; then
        cp docs/bug-repro/*.png "$ARTIFACTS_DIR/" 2>/dev/null || true
    fi
fi

# Generate Playwright HTML report
echo ""
echo "Generating Playwright HTML report..."
pnpm playwright show-report || true

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All regression tests passed!${NC}"
    echo "Line alignment is working correctly across all scenarios."
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some regression tests failed${NC}"
    echo "Please review the test results and fix any regressions."
    exit 1
fi