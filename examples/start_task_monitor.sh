#!/bin/bash
# Start Task Monitor Service

echo "Starting Autonomous Agent Task Monitor..."
echo "This service will continuously monitor and process tasks in orchestrator/tasks/pending/"
echo ""
echo "Press Ctrl+C to stop the monitor"
echo "============================================"
echo ""

# Activate venv if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Ensure logs directory exists
mkdir -p logs

# Run task monitor
python3 -u orchestrator/task_monitor.py 2>&1 | tee logs/task_monitor_$(date +%Y%m%d_%H%M%S).log
