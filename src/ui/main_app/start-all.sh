#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Orchestration System...${NC}"

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo -e "${YELLOW}⚡ Starting Redis...${NC}"
    redis-server --daemonize yes
    sleep 2
    if pgrep -x "redis-server" > /dev/null; then
        echo -e "${GREEN}✅ Redis started${NC}"
    else
        echo -e "${RED}❌ Failed to start Redis${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Redis already running${NC}"
fi

# Start WebSocket server
echo -e "${YELLOW}⚡ Starting WebSocket server...${NC}"
npm run websocket:start &
WEBSOCKET_PID=$!
sleep 2

# Start Task Monitor
echo -e "${YELLOW}⚡ Starting Task Monitor (orchestrator service)...${NC}"
cd ..
source venv/bin/activate
python3 orchestrator/task_monitor.py &
TASK_MONITOR_PID=$!
cd web-ui
sleep 2

# Start Next.js dev server
echo -e "${YELLOW}⚡ Starting Next.js app...${NC}"
npm run dev &
NEXTJS_PID=$!

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Web UI:${NC}        http://localhost:3002"
echo -e "${YELLOW}🔌 WebSocket:${NC}     ws://localhost:4000"
echo -e "${YELLOW}📮 Event API:${NC}     http://localhost:4000/events"
echo -e "${YELLOW}🤖 Task Monitor:${NC}  Running (orchestrator service)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Trap SIGINT and cleanup
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    kill $WEBSOCKET_PID 2>/dev/null
    kill $TASK_MONITOR_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT

# Wait for processes
wait
