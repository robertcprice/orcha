#!/bin/bash

# =========================================================================
# Start All Servers for Orchestration System UI Testing
# =========================================================================

set -e  # Exit on error

echo "🔧 Starting Orchestration System Servers..."
echo ""

# Get the project root
PROJECT_ROOT="/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
UI_DIR="$PROJECT_ROOT/src/ui/main_app"

# Kill any existing servers
echo "🧹 Cleaning up existing processes..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 2

# Check Redis
echo "✅ Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running! Please start it with: redis-server"
    exit 1
fi

# Start REST API (port 8000)
echo "🚀 Starting REST API (port 8000)..."
cd "$PROJECT_ROOT"
source venv/bin/activate
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
python -m uvicorn rest-api.src.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/rest-api.log 2>&1 &
REST_API_PID=$!
echo "   PID: $REST_API_PID"

# Wait for REST API to start
sleep 3
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ REST API failed to start! Check /tmp/rest-api.log"
    exit 1
fi

# Start WebSocket Server (port 4000)
echo "🔌 Starting WebSocket Server (port 4000)..."
cd "$UI_DIR"
npx tsx server/websocket-server.ts > /tmp/ws-server.log 2>&1 &
WS_PID=$!
echo "   PID: $WS_PID"

# Wait for WebSocket server
sleep 3

# Start Next.js Dev Server (port 3002)
echo "⚛️  Starting Next.js Dev Server (port 3002)..."
cd "$UI_DIR"
npm run dev > /tmp/dev-server.log 2>&1 &
DEV_PID=$!
echo "   PID: $DEV_PID"

# Wait for dev server
sleep 5

echo ""
echo "✅ All servers started successfully!"
echo ""
echo "📊 Server Status:"
echo "   REST API:      http://localhost:8000/health"
echo "   WebSocket:     ws://localhost:4000"
echo "   Frontend UI:   http://localhost:3002"
echo ""
echo "📝 Logs:"
echo "   REST API:      tail -f /tmp/rest-api.log"
echo "   WebSocket:     tail -f /tmp/ws-server.log"
echo "   Dev Server:    tail -f /tmp/dev-server.log"
echo ""
echo "🧪 To test AI nodes:"
echo "   cd \"$UI_DIR\""
echo "   npx playwright test tests/test-ai-nodes-appear.spec.ts --headed"
echo ""
echo "🛑 To stop all servers:"
echo "   kill $REST_API_PID $WS_PID $DEV_PID"
echo ""
