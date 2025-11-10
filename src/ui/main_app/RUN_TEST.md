# Running the Full Planning Sequence Test

## Prerequisites

### 1. Start Redis
```bash
# Start Redis server
brew services start redis

# Or run manually:
redis-server
```

### 2. Start the Frontend
```bash
cd web-ui
npm run dev
```

This will start the Next.js frontend on http://localhost:3000

### 3. Backend is Embedded
The backend Python orchestrator runs within the Next.js API routes, so no separate backend process is needed.

## Running the Test

Once Redis and the frontend are running:

```bash
cd web-ui
node test-full-planning-sequence.js
```

## What the Test Does

1. ✅ Submits a task (calculator app)
2. ✅ Waits for all 5 AI planning nodes to appear:
   - Claude
   - ChatGPT
   - DeepSeek
   - Grok
   - Gemini
3. ✅ Verifies each node receives FULL (non-truncated) input
4. ✅ Checks DeepSeek specifically receives both Claude AND ChatGPT output
5. ✅ Waits for planning to complete
6. ✅ Verifies orchestrator transitions to active
7. ✅ Checks for spawned agent nodes
8. ✅ Verifies task tree is created

## Expected Results

- All 5 AI nodes should appear within 2 minutes
- Each node's Input tab should show full content (>200 chars, not truncated)
- DeepSeek should show both Claude's analysis AND ChatGPT's execution plan
- Orchestrator should transition from "planning" to "active"
- Agent nodes should be spawned after planning completes
- Screenshots will be saved to `test-screenshots/`

## Troubleshooting

**Redis not running:**
```bash
brew services start redis
```

**Frontend not starting:**
```bash
cd web-ui
rm -rf .next
npm install
npm run dev
```

**Test fails to find nodes:**
- Check browser console for errors
- Verify WebSocket connection is established
- Check Redis is publishing events: `redis-cli SUBSCRIBE algomind.agent.events`
