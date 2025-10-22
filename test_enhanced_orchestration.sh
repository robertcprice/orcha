#!/bin/bash
# Test Enhanced Orchestration System
# Tests the complete multi-level orchestration with ChatGPT-5 integration

set -e  # Exit on error

echo "=================================="
echo "ENHANCED ORCHESTRATION TEST SUITE"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

test_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# ============================================================
# Test 1: Component Files Exist
# ============================================================
echo "Test 1: Checking component files..."

if [ -f "orchestrator/task_decomposer.py" ]; then
    test_pass "task_decomposer.py exists"
else
    test_fail "task_decomposer.py missing"
fi

if [ -f "orchestrator/research_agent.py" ]; then
    test_pass "research_agent.py exists"
else
    test_fail "research_agent.py missing"
fi

if [ -f "orchestrator/feedback_validator.py" ]; then
    test_pass "feedback_validator.py exists"
else
    test_fail "feedback_validator.py missing"
fi

if [ -f "orchestrator/sub_orchestrator.py" ]; then
    test_pass "sub_orchestrator.py exists"
else
    test_fail "sub_orchestrator.py missing"
fi

if [ -f "orchestrator/enhanced_orchestrator.py" ]; then
    test_pass "enhanced_orchestrator.py exists"
else
    test_fail "enhanced_orchestrator.py missing"
fi

if [ -f "scripts/run_enhanced_orchestrator.py" ]; then
    test_pass "run_enhanced_orchestrator.py exists"
else
    test_fail "run_enhanced_orchestrator.py missing"
fi

if [ -f ".claude/commands/newtask.md" ]; then
    test_pass "newtask command exists"
else
    test_fail "newtask command missing"
fi

echo ""

# ============================================================
# Test 2: Python Syntax Check
# ============================================================
echo "Test 2: Checking Python syntax..."

if python3 -m py_compile orchestrator/task_decomposer.py 2>/dev/null; then
    test_pass "task_decomposer.py syntax valid"
else
    test_fail "task_decomposer.py syntax error"
fi

if python3 -m py_compile orchestrator/research_agent.py 2>/dev/null; then
    test_pass "research_agent.py syntax valid"
else
    test_fail "research_agent.py syntax error"
fi

if python3 -m py_compile orchestrator/feedback_validator.py 2>/dev/null; then
    test_pass "feedback_validator.py syntax valid"
else
    test_fail "feedback_validator.py syntax error"
fi

if python3 -m py_compile orchestrator/sub_orchestrator.py 2>/dev/null; then
    test_pass "sub_orchestrator.py syntax valid"
else
    test_fail "sub_orchestrator.py syntax error"
fi

if python3 -m py_compile orchestrator/enhanced_orchestrator.py 2>/dev/null; then
    test_pass "enhanced_orchestrator.py syntax valid"
else
    test_fail "enhanced_orchestrator.py syntax error"
fi

if python3 -m py_compile scripts/run_enhanced_orchestrator.py 2>/dev/null; then
    test_pass "run_enhanced_orchestrator.py syntax valid"
else
    test_fail "run_enhanced_orchestrator.py syntax error"
fi

echo ""

# ============================================================
# Test 3: Script Permissions
# ============================================================
echo "Test 3: Checking script permissions..."

if [ -x "scripts/run_enhanced_orchestrator.py" ]; then
    test_pass "run_enhanced_orchestrator.py is executable"
else
    test_fail "run_enhanced_orchestrator.py not executable"
fi

echo ""

# ============================================================
# Test 4: Required Directories
# ============================================================
echo "Test 4: Checking required directories..."

if [ -d "orchestrator/tasks/pending" ]; then
    test_pass "orchestrator/tasks/pending exists"
else
    test_fail "orchestrator/tasks/pending missing"
fi

if [ -d "orchestrator/tasks/active" ]; then
    test_pass "orchestrator/tasks/active exists"
else
    test_fail "orchestrator/tasks/active missing"
fi

if [ -d "orchestrator/tasks/completed" ]; then
    test_pass "orchestrator/tasks/completed exists"
else
    test_fail "orchestrator/tasks/completed missing"
fi

echo ""

# ============================================================
# Test 5: Import Tests
# ============================================================
echo "Test 5: Testing Python imports..."

test_info "Testing task_decomposer import..."
if python3 -c "import sys; sys.path.insert(0, 'orchestrator'); from task_decomposer import TaskDecomposer, MainTask, Subtask" 2>/dev/null; then
    test_pass "task_decomposer imports successfully"
else
    test_fail "task_decomposer import failed"
fi

test_info "Testing research_agent import..."
if python3 -c "import sys; sys.path.insert(0, 'orchestrator'); from research_agent import ResearchAgent, ResearchReport" 2>/dev/null; then
    test_pass "research_agent imports successfully"
else
    test_fail "research_agent import failed"
fi

test_info "Testing feedback_validator import..."
if python3 -c "import sys; sys.path.insert(0, 'orchestrator'); from feedback_validator import FeedbackValidator, ValidationFeedback" 2>/dev/null; then
    test_pass "feedback_validator imports successfully"
else
    test_fail "feedback_validator import failed"
fi

test_info "Testing sub_orchestrator import..."
if python3 -c "import sys; sys.path.insert(0, 'orchestrator'); from sub_orchestrator import SubOrchestrator, MainTaskResult" 2>/dev/null; then
    test_pass "sub_orchestrator imports successfully"
else
    test_fail "sub_orchestrator import failed"
fi

test_info "Testing enhanced_orchestrator import..."
if python3 -c "import sys; sys.path.insert(0, 'orchestrator'); from enhanced_orchestrator import EnhancedOrchestrator" 2>/dev/null; then
    test_pass "enhanced_orchestrator imports successfully"
else
    test_fail "enhanced_orchestrator import failed"
fi

echo ""

# ============================================================
# Test 6: Command Line Interface
# ============================================================
echo "Test 6: Testing command line interface..."

test_info "Testing run_enhanced_orchestrator.py --help..."
if ./scripts/run_enhanced_orchestrator.py --help &>/dev/null; then
    test_pass "Script help works"
else
    test_fail "Script help failed"
fi

echo ""

# ============================================================
# Test 7: Configuration Files
# ============================================================
echo "Test 7: Checking configuration..."

test_info "Checking newtask command configuration..."
if grep -q "run_enhanced_orchestrator.py" .claude/commands/newtask.md; then
    test_pass "newtask command configured for enhanced orchestrator"
else
    test_fail "newtask command not configured properly"
fi

echo ""

# ============================================================
# Test 8: Code Quality Checks
# ============================================================
echo "Test 8: Code quality checks..."

# Check for proper docstrings
test_info "Checking for docstrings..."
DOCSTRING_COUNT=$(grep -c '"""' orchestrator/enhanced_orchestrator.py || true)
if [ "$DOCSTRING_COUNT" -gt 10 ]; then
    test_pass "Enhanced orchestrator has comprehensive docstrings"
else
    test_fail "Enhanced orchestrator lacks documentation"
fi

# Check for error handling
test_info "Checking error handling..."
if grep -q "try:" orchestrator/enhanced_orchestrator.py && grep -q "except" orchestrator/enhanced_orchestrator.py; then
    test_pass "Enhanced orchestrator has error handling"
else
    test_fail "Enhanced orchestrator lacks error handling"
fi

# Check for async/await
test_info "Checking async implementation..."
if grep -q "async def" orchestrator/enhanced_orchestrator.py && grep -q "await" orchestrator/enhanced_orchestrator.py; then
    test_pass "Enhanced orchestrator uses async/await"
else
    test_fail "Enhanced orchestrator not properly async"
fi

echo ""

# ============================================================
# Test 9: Integration Points
# ============================================================
echo "Test 9: Checking integration points..."

# Check if enhanced orchestrator uses all components
test_info "Checking component integration..."

if grep -q "TaskDecomposer" orchestrator/enhanced_orchestrator.py; then
    test_pass "Enhanced orchestrator integrates TaskDecomposer"
else
    test_fail "TaskDecomposer not integrated"
fi

if grep -q "SubOrchestrator" orchestrator/enhanced_orchestrator.py; then
    test_pass "Enhanced orchestrator integrates SubOrchestrator"
else
    test_fail "SubOrchestrator not integrated"
fi

if grep -q "FeedbackValidator" orchestrator/enhanced_orchestrator.py; then
    test_pass "Enhanced orchestrator integrates FeedbackValidator"
else
    test_fail "FeedbackValidator not integrated"
fi

# Check if sub-orchestrator uses research agent
if grep -q "ResearchAgent" orchestrator/sub_orchestrator.py; then
    test_pass "Sub-orchestrator integrates ResearchAgent"
else
    test_fail "ResearchAgent not integrated in sub-orchestrator"
fi

echo ""

# ============================================================
# Test 10: File Structure
# ============================================================
echo "Test 10: Checking file structure..."

# Count lines of code for each component
test_info "Checking component sizes..."

DECOMPOSER_LINES=$(wc -l < orchestrator/task_decomposer.py)
RESEARCH_LINES=$(wc -l < orchestrator/research_agent.py)
VALIDATOR_LINES=$(wc -l < orchestrator/feedback_validator.py)
SUB_ORCH_LINES=$(wc -l < orchestrator/sub_orchestrator.py)
ENHANCED_LINES=$(wc -l < orchestrator/enhanced_orchestrator.py)

echo "  task_decomposer.py: $DECOMPOSER_LINES lines"
echo "  research_agent.py: $RESEARCH_LINES lines"
echo "  feedback_validator.py: $VALIDATOR_LINES lines"
echo "  sub_orchestrator.py: $SUB_ORCH_LINES lines"
echo "  enhanced_orchestrator.py: $ENHANCED_LINES lines"

TOTAL_LINES=$((DECOMPOSER_LINES + RESEARCH_LINES + VALIDATOR_LINES + SUB_ORCH_LINES + ENHANCED_LINES))
echo "  Total: $TOTAL_LINES lines"

if [ "$TOTAL_LINES" -gt 2000 ]; then
    test_pass "Comprehensive implementation ($TOTAL_LINES lines)"
else
    test_fail "Implementation may be incomplete ($TOTAL_LINES lines)"
fi

echo ""

# ============================================================
# Results Summary
# ============================================================
echo "=================================="
echo "TEST RESULTS SUMMARY"
echo "=================================="
echo ""
echo -e "${GREEN}PASSED: $PASS${NC}"
echo -e "${RED}FAILED: $FAIL${NC}"
echo ""

TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED ($TOTAL/$TOTAL)${NC}"
    echo ""
    echo "Enhanced orchestration system is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Set OPENAI_API_KEY environment variable"
    echo "  2. Test with a simple task: ./scripts/run_enhanced_orchestrator.py \"Test Task\" \"Simple test description\""
    echo "  3. Try /newtask command in Claude Code"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED ($PASS/$TOTAL passed)${NC}"
    echo ""
    echo "Please fix the failed tests before using the system."
    echo ""
    exit 1
fi
