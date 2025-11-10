#!/bin/bash

echo "🚀 Starting Full System Test..."
echo ""

# Check Redis
echo "1️⃣ Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running!"
    echo "   Please start Redis with: brew services start redis"
    exit 1
fi
echo "✅ Redis is running"
echo ""

# Check if frontend is running
echo "2️⃣ Checking frontend..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend already running on port 3000"
else
    echo "⚠️  Frontend not running. Starting..."
    npm run dev > /dev/null 2>&1 &
    FRONTEND_PID=$!
    echo "   Waiting for frontend to start..."
    sleep 10
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "✅ Frontend started (PID: $FRONTEND_PID)"
    else
        echo "❌ Failed to start frontend"
        exit 1
    fi
fi
echo ""

# Run the test
echo "3️⃣ Running Playwright test..."
echo ""
node test-full-planning-sequence.js

echo ""
echo "✅ Test complete!"
