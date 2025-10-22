#!/bin/bash

# Test script to verify real-time synchronization across page refreshes

echo "========================================"
echo "Real-Time Synchronization Test"
echo "========================================"
echo

echo "This test will verify that:"
echo "1. Active tasks persist across page refreshes"
echo "2. Orchestrator status shows as 'running' when active"
echo "3. Terminal logs are synchronized"
echo "4. All pages show the same state"
echo

echo "Testing Redis connection..."
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Redis is running"
else
    echo "✗ Redis is NOT running - please start Redis first"
    exit 1
fi

echo
echo "Testing API endpoints..."

# Test active task endpoint
echo -n "  /api/hybrid-orchestrator/active ... "
curl -s http://localhost:3000/api/hybrid-orchestrator/active > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓"
else
    echo "✗"
fi

echo
echo "========================================"
echo "Manual Test Steps:"
echo "========================================"
echo
echo "1. Open http://localhost:3000 in your browser"
echo "2. Submit a test task (e.g., 'Create a simple hello world script')"
echo "3. Watch the Activity Feed populate with logs"
echo "4. Check Agent Network shows ORCHESTRATOR as 'running'"
echo "5. Refresh the page (Cmd+R or F5)"
echo "6. Verify:"
echo "   - Task is still visible"
echo "   - Activity Feed still shows logs"
echo "   - ORCHESTRATOR still shows as 'running'"
echo "7. Open a new tab to http://localhost:3000"
echo "8. Verify the new tab shows the same active task"
echo
echo "✅ If all steps pass, real-time sync is working!"
echo
