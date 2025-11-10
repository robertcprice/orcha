# Streaming Agent Output Fix

## Problem

The logs were only showing **final output** instead of **active thinking** from the agents. This happened because:

### Root Cause: `process.communicate()`

In `claude_code_agent.py` line 199:
```python
stdout, stderr = await process.communicate(input=prompt.encode())
```

**The Issue:**
- `communicate()` is a **blocking call** that waits for the entire process to complete
- It buffers all output and only returns it at the end
- No intermediate/streaming output is visible
- Logs only showed final results, not the thinking process

## Solution

### 1. Claude Code Agent - Real-Time Streaming

**File:** `orchestrator/claude_code_agent.py`

**Changes:**
- ✅ Open log file for **real-time writing** with `flush()`
- ✅ Stream stdout **line by line** with `async for line in process.stdout`
- ✅ Write each line to log **immediately** as it arrives
- ✅ Print to console for **live visibility**
- ✅ Publish `claude_thinking` events to **Redis for WebSocket clients**

**New Implementation:**
```python
# Open log file for real-time writing
log_file = open(session_file, 'w')
log_file.write(f"=== STREAMING OUTPUT ===\n")
log_file.flush()

# Stream output line by line
async def stream_stdout():
    if process.stdout:
        async for line in process.stdout:
            decoded_line = line.decode('utf-8', errors='replace')

            # Write to log immediately
            log_file.write(decoded_line)
            log_file.flush()

            # Print to console
            print(f"[Claude-{session_id}] {decoded_line.rstrip()}")

            # Publish to Redis for WebSocket
            await publish_event({
                "type": "claude_thinking",
                "session_id": session_id,
                "content": decoded_line.rstrip(),
                "timestamp": datetime.now().isoformat()
            })
```

**Benefits:**
- 🟢 See Claude's thinking process **as it happens**
- 🟢 Logs update in **real-time** (tail -f works!)
- 🟢 WebSocket clients receive **streaming updates**
- 🟢 Better debugging and monitoring

### 2. Codex MCP Agent - Progress Events

**File:** `orchestrator/codex_mcp_agent.py`

**Changes:**
- ✅ Added event publishing at key stages
- ✅ Console logging with emojis for visibility
- ✅ Progress tracking for MCP operations

**Events Published:**
```python
# Session start
publish_event({
    "type": "codex_session_started",
    "agent_id": self.agent_id,
    "task": self.task.title
})

# Thinking/progress
publish_event({
    "type": "codex_thinking",
    "content": "Initializing Codex MCP session..."
})

# Completion
publish_event({
    "type": "codex_session_completed",
    "success": result.success,
    "conversation_id": result.conversation_id
})
```

**Note:** MCP protocol doesn't support true streaming (it's request/response), but we now show:
- 🟢 Connection status
- 🟢 Tool invocation
- 🟢 Completion status
- 🟢 Progress indicators

## What You'll See Now

### Console Output
```
[Codex-MCP-abc123] 🔌 Connecting to MCP server...
[Codex-MCP-abc123] ✓ MCP session initialized
[Codex-MCP-abc123] 🤖 Calling 'codex' tool...
[Claude-def456] I'll help you create the greeting function.
[Claude-def456] First, let me write the main function...
[Claude-def456] Now I'll add validation...
[Claude-def456] Creating unit tests...
[Codex-MCP-abc123] ✓ Codex execution completed
[Claude-def456] APPROVED: The code looks good!
[Claude-def456] QUALITY_SCORE: 9/10
```

### Log Files (Real-Time)
```bash
# Watch logs in real-time
tail -f logs/claude_sessions/review_*.log

# You'll see:
=== STREAMING OUTPUT ===
I'll help you create the greeting function.

Let me start by creating the main function file...

<thinking>
The user wants a simple greeting function with:
1. Parameter for name
2. Input validation
3. Docstring
4. Tests
</thinking>

Creating greet.py...
```

### WebSocket Events
```json
{
  "type": "claude_thinking",
  "session_id": "abc12345",
  "content": "Creating greet.py...",
  "timestamp": "2025-10-23T22:30:15.123Z"
}
```

## Testing the Fix

### Method 1: Run Test Script
```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
python3 test_streaming_agents.py
```

This will:
- Start a hybrid workflow
- Show real-time streaming in console
- Create logs with streaming output
- Publish events to Redis

### Method 2: Watch Logs in Real-Time
```bash
# Terminal 1: Run orchestrator
cd orchestrator
python3 hybrid_codex_claude_mcp.py

# Terminal 2: Watch logs
tail -f logs/claude_sessions/*.log

# Terminal 3: Monitor Redis events
redis-cli SUBSCRIBE agent_events
```

### Method 3: Web UI
1. Open http://localhost:3002/tasks
2. Submit a task
3. Watch dashboard for real-time updates
4. WebSocket will receive streaming events

## Key Events Published

### Claude Code Events
- `claude_session_started` - Session begins
- `claude_thinking` - Each line of output (real-time)
- `claude_session_completed` - Session ends
- `claude_session_failed` - Error occurred

### Codex MCP Events
- `codex_session_started` - MCP connection initiated
- `codex_thinking` - Progress updates
- `codex_session_completed` - Task completed
- `codex_refinement_completed` - Iteration finished
- `codex_session_failed` / `codex_refinement_failed` - Errors

## Files Changed

1. ✅ `orchestrator/claude_code_agent.py` (lines 185-266)
   - Added real-time streaming with async generators
   - Event publishing for each line
   - Live log file writing

2. ✅ `orchestrator/codex_mcp_agent.py` (lines 1-38, 177-322)
   - Added redis_publisher import
   - Progress event publishing
   - Better console logging

3. ✅ `test_streaming_agents.py` (new file)
   - Test script to demonstrate streaming
   - Shows log tail output

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Claude Code CLI Process                │
│                                                 │
│  stdout ───────────────┐                       │
│                        │                        │
└────────────────────────┼────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Async Stream Reader          │
         │  (async for line in stdout)   │
         └───────┬───────────────────────┘
                 │
          ┌──────┴──────┬──────────┬──────────┐
          │             │          │          │
          ▼             ▼          ▼          ▼
    ┌─────────┐  ┌──────────┐  ┌─────┐  ┌─────────┐
    │   Log   │  │  Console │  │Redis│  │ Collect │
    │  File   │  │   Print  │  │Event│  │  Array  │
    │ (flush) │  │          │  │Pub  │  │         │
    └─────────┘  └──────────┘  └─────┘  └─────────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │  WebSocket   │
                          │   Clients    │
                          │   (Web UI)   │
                          └──────────────┘
```

## Before vs After

### BEFORE ❌
```
=== OUTPUT ===
[Final response only - all thinking was hidden]

APPROVED: The code looks good.
QUALITY_SCORE: 9/10
```

### AFTER ✅
```
=== STREAMING OUTPUT ===
I'll help you create the greeting function.

<thinking>
The user wants a simple greeting function...
</thinking>

Let me create greet.py...

def greet(name):
    """Returns a personalized greeting."""
    if not name:
        raise ValueError("Name cannot be empty")
    return f"Hello, {name}!"

Now creating tests...

APPROVED: The code looks good.
QUALITY_SCORE: 9/10
```

## Performance Impact

- ✅ **Minimal overhead** - Writing to file/Redis is async
- ✅ **Better UX** - Users see progress immediately
- ✅ **Easier debugging** - Real-time visibility into agent thinking
- ✅ **No blocking** - Streams don't block the event loop

## Next Steps

1. ✅ Test with actual tasks via web UI
2. 📋 Update WebSocket client to display streaming events
3. 📋 Add streaming visualization to dashboard
4. 📋 Implement log rotation for large outputs
5. 📋 Add filtering for verbose output

---

**Status:** ✅ FIXED
**Date:** October 23, 2025
**Impact:** High - Major UX improvement
