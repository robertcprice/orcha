#!/bin/bash

# Test script to verify agent activity is visible on agents page

echo "========================================"
echo "Agent Visibility Test"
echo "========================================"
echo

echo "This test verifies that agent activity shows up on the agents page"
echo "when you submit a task through the hybrid orchestrator."
echo

echo "Testing prerequisites..."
echo

# Check Redis
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Redis is running"
else
    echo "✗ Redis is NOT running - please start Redis first"
    exit 1
fi

# Check web app
curl -s http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Web app is running on localhost:3000"
else
    echo "✗ Web app is NOT running - please start it first"
    exit 1
fi

echo
echo "========================================"
echo "Manual Test Instructions"
echo "========================================"
echo
echo "Step 1: Open http://localhost:3000 in your browser"
echo ""
echo "Step 2: Submit a test task (example):"
echo "  Goal: 'Create a simple Python hello world script in test_output/'"
echo ""
echo "Step 3: Watch the main dashboard:"
echo "  ✓ Activity Feed should show progress updates"
echo "  ✓ Agent Network should show agents becoming active"
echo ""
echo "Step 4: Navigate to http://localhost:3000/agents"
echo ""
echo "Step 5: Verify agents page shows:"
echo "  ✓ PP (Product Planner) - Status: completed"
echo "    - Task: 'Goal analysis'"
echo "    - Activity: Analysis and information gathering"
echo ""
echo "  ✓ IM (Implementer) - Status: running or completed"
echo "    - Task: 'Execution turn X'"
echo "    - Activity: Code implementation and file creation"
echo ""
echo "  ✓ RD (Researcher/Documenter) - Status: completed"
echo "    - Task: 'Final summary'"
echo "    - Activity: Summary generation"
echo ""
echo "Step 6: Check Agent Activity Logs section:"
echo "  ✓ Should show spawn events for each agent"
echo "  ✓ Should show output from each agent's work"
echo "  ✓ Should show completion status"
echo ""
echo "Step 7: Refresh the agents page:"
echo "  ✓ All agent data should persist"
echo ""
echo "========================================"
echo "Redis Verification Commands"
echo "========================================"
echo
echo "To check if agents are being logged to Redis:"
echo ""
echo "  # Check PP agent logs:"
echo "  redis-cli lrange algomind.agent.PP.logs 0 -1"
echo ""
echo "  # Check IM agent logs:"
echo "  redis-cli lrange algomind.agent.IM.logs 0 -1"
echo ""
echo "  # Check RD agent logs:"
echo "  redis-cli lrange algomind.agent.RD.logs 0 -1"
echo ""
echo "  # Check PP agent status:"
echo "  redis-cli hgetall algomind.agent.PP.current"
echo ""
echo "  # Check IM agent status:"
echo "  redis-cli hgetall algomind.agent.IM.current"
echo ""
echo "  # Check RD agent status:"
echo "  redis-cli hgetall algomind.agent.RD.current"
echo ""
echo "========================================"
echo "Expected Agent Flow"
echo "========================================"
echo
echo "1. PP (Product Planner):"
echo "   - Spawns first"
echo "   - Analyzes the goal"
echo "   - Identifies information needs"
echo "   - Completes analysis"
echo ""
echo "2. ChatGPT Planner (not an agent):"
echo "   - Creates comprehensive execution plan"
echo ""
echo "3. IM (Implementer):"
echo "   - Spawns for execution"
echo "   - Executes work over multiple turns"
echo "   - Creates files and implements solution"
echo "   - Completes or continues until done"
echo ""
echo "4. RD (Researcher/Documenter):"
echo "   - Spawns for summary"
echo "   - Generates final documentation"
echo "   - Completes summary"
echo ""
echo "========================================"
echo "Debugging Tips"
echo "========================================"
echo
echo "If agents don't show up:"
echo ""
echo "1. Check Redis logs:"
echo "   redis-cli keys 'algomind.agent.*'"
echo ""
echo "2. Check orchestrator logs:"
echo "   Check terminal where you started the web app"
echo ""
echo "3. Check browser console:"
echo "   Open DevTools (F12) and check for errors"
echo ""
echo "4. Verify API endpoints:"
echo "   curl http://localhost:3000/api/agents/activity"
echo "   curl http://localhost:3000/api/agents/unified-logs"
echo ""
echo "✅ Run the manual tests above to verify agent visibility!"
echo
