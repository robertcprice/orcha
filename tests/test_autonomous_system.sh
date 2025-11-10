#!/bin/bash
# Comprehensive Test Suite for Autonomous Agent System

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   AUTONOMOUS AGENT SYSTEM - COMPREHENSIVE TEST SUITE      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${BLUE}[TEST $TESTS_RUN]${NC} $test_name"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    echo ""
}

# Test 1: Directory Structure
echo -e "\n${YELLOW}═══ TEST SECTION 1: Infrastructure Setup ═══${NC}\n"

run_test "Task directories exist" \
    "[ -d orchestrator/tasks/pending ] && [ -d orchestrator/tasks/active ] && [ -d orchestrator/tasks/completed ] && [ -d orchestrator/tasks/failed ]"

run_test "Task schema exists" \
    "[ -f orchestrator/task_schema.json ]"

run_test "Task monitor exists" \
    "[ -f orchestrator/task_monitor.py ]"

run_test "Auto orchestrator exists" \
    "[ -f orchestrator/auto_orchestrator.py ]"

run_test "Hierarchical agent framework exists" \
    "[ -f orchestrator/hierarchical_agent.py ]"

# Test 2: Scripts
echo -e "\n${YELLOW}═══ TEST SECTION 2: Command Line Scripts ═══${NC}\n"

run_test "Submit task script exists" \
    "[ -f scripts/submit_task.py ] && [ -x scripts/submit_task.py ]"

run_test "Check task script exists" \
    "[ -f scripts/check_task.py ] && [ -x scripts/check_task.py ]"

run_test "List tasks script exists" \
    "[ -f scripts/list_tasks.py ] && [ -x scripts/list_tasks.py ]"

run_test "Task monitor startup script exists" \
    "[ -f start_task_monitor.sh ] && [ -x start_task_monitor.sh ]"

# Test 3: API Endpoints
echo -e "\n${YELLOW}═══ TEST SECTION 3: Web API Endpoints ═══${NC}\n"

run_test "Task submission API exists" \
    "[ -f ui-agent-console/app/api/tasks/submit/route.ts ]"

run_test "Task status API exists" \
    "[ -f ui-agent-console/app/api/tasks/status/route.ts ]"

run_test "Task list API exists" \
    "[ -f ui-agent-console/app/api/tasks/list/route.ts ]"

# Test 4: Python Syntax
echo -e "\n${YELLOW}═══ TEST SECTION 4: Python Syntax Validation ═══${NC}\n"

run_test "Task monitor syntax" \
    "python3 -m py_compile orchestrator/task_monitor.py"

run_test "Auto orchestrator syntax" \
    "python3 -m py_compile orchestrator/auto_orchestrator.py"

run_test "Hierarchical agent syntax" \
    "python3 -m py_compile orchestrator/hierarchical_agent.py"

run_test "Submit task script syntax" \
    "python3 -m py_compile scripts/submit_task.py"

# Test 5: Task Submission
echo -e "\n${YELLOW}═══ TEST SECTION 5: Task Submission (Dry Run) ═══${NC}\n"

echo "Submitting test task..."
TEST_TASK_ID=$(python3 scripts/submit_task.py \
    "Test Task" \
    "This is a test task to verify the autonomous agent system works correctly" \
    --priority normal 2>&1 | grep "Task ID:" | awk '{print $NF}')

if [ -n "$TEST_TASK_ID" ]; then
    echo -e "${GREEN}✓ Task submitted successfully${NC}"
    echo "Task ID: $TEST_TASK_ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ Task submission failed${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test 6: Task File Validation
if [ -n "$TEST_TASK_ID" ]; then
    echo -e "\n${YELLOW}═══ TEST SECTION 6: Task File Validation ═══${NC}\n"
    
    TASK_FILE="orchestrator/tasks/pending/${TEST_TASK_ID}.json"
    
    run_test "Task file created" \
        "[ -f $TASK_FILE ]"
    
    run_test "Task file is valid JSON" \
        "python3 -c 'import json; json.load(open(\"$TASK_FILE\"))'"
    
    run_test "Task has required fields" \
        "python3 -c 'import json; d=json.load(open(\"$TASK_FILE\")); assert all(k in d for k in [\"task_id\",\"title\",\"description\",\"priority\"])'"
fi

# Test 7: Task Listing
echo -e "\n${YELLOW}═══ TEST SECTION 7: Task Management ═══${NC}\n"

run_test "List pending tasks" \
    "python3 scripts/list_tasks.py --status pending > /dev/null"

if [ -n "$TEST_TASK_ID" ]; then
    run_test "Check task status" \
        "python3 scripts/check_task.py $TEST_TASK_ID > /dev/null"
fi

# Cleanup test task
if [ -n "$TEST_TASK_ID" ] && [ -f "orchestrator/tasks/pending/${TEST_TASK_ID}.json" ]; then
    echo -e "\nCleaning up test task..."
    rm "orchestrator/tasks/pending/${TEST_TASK_ID}.json"
    echo -e "${GREEN}✓ Test task removed${NC}"
fi

# Test Summary
echo -e "\n╔═══════════════════════════════════════════════════════════╗"
echo -e "║                     TEST SUMMARY                          ║"
echo -e "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Tests:  $TESTS_RUN"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ALL TESTS PASSED! ✓                          ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "The autonomous agent system is ready to use!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the task monitor: ./start_task_monitor.sh"
    echo "  2. Submit tasks: ./scripts/submit_task.py \"Title\" \"Description\""
    echo "  3. Check task status: ./scripts/check_task.py TASK_ID"
    echo "  4. List all tasks: ./scripts/list_tasks.py"
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║            SOME TESTS FAILED ✗                            ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the failed tests above and fix the issues."
    exit 1
fi
