# Real-Time Agent Streaming Integration

## Overview

Complete integration of real-time agent thinking/output streaming into the web UI. Agents now broadcast their thinking process live via WebSocket, visible in dedicated monitoring interfaces.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Python Agents                            │
│                                                             │
│  Claude Code Agent          Codex MCP Agent                │
│  ├─ Async line-by-line      ├─ MCP progress events         │
│  ├─ publish_event()         ├─ publish_event()             │
│  └─ Real-time logging       └─ State broadcasting          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │   redis_publisher.py         │
    │   async publish_event()      │
    │   • Converts to WS format    │
    │   • HTTP POST to WS server   │
    └──────────────┬───────────────┘
                   │
                   ▼
       ┌───────────────────────────────┐
       │  WebSocket Server (port 4000) │
       │  • Receives events via HTTP   │
       │  • Stores in SQLite           │
       │  • Broadcasts to all clients  │
       └──────────────┬────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │      Web UI Components          │
        │                                 │
        │  AgentFeed    AgentTerminal    │
        │  • Real-time  • Session logs    │
        │  • Filtered   • Color coded     │
        │  • Auto-scroll• Timestamps      │
        └─────────────────────────────────┘
```

---

## Components Created

### 1. Backend: Event Publishing

**File:** `orchestrator/redis_publisher.py`

New `publish_event()` async function:
```python
async def publish_event(event: Dict[str, Any]):
    """
    Publish streaming agent events to WebSocket server.

    Converts agent events to WebSocket format and POSTs to server.
    """
```

**Features:**
- ✅ Async HTTP POST to WebSocket server
- ✅ Auto-adds timestamps
- ✅ Converts to WebSocket event format
- ✅ Non-blocking (won't interrupt agents)
- ✅ Handles timeouts gracefully

### 2. Frontend: Agent Feed Component

**File:** `app/components/AgentFeed.tsx`

Real-time agent thinking feed component.

**Features:**
- ✅ WebSocket connection to port 4000
- ✅ Filter by agent_id/session_id
- ✅ Color-coded by event type
- ✅ Auto-scroll to latest
- ✅ Timestamps
- ✅ Connection status indicator
- ✅ Max events limit (configurable)

**Usage:**
```tsx
<AgentFeed
  agentId="codex-abc123"  // Optional: filter by agent
  maxEvents={100}          // Max events to show
  showTimestamps={true}    // Show timestamps
  autoScroll={true}        // Auto-scroll
/>
```

**Event Colors:**
- 🔵 Blue: `claude_thinking`
- 🟢 Green: `codex_thinking` or `completed`
- 🟡 Yellow: `started`
- 🔴 Red: `failed` or `error`

### 3. Frontend: Agent Terminal Component

**File:** `app/components/AgentTerminal.tsx`

Terminal-style session log viewer.

**Features:**
- ✅ Full terminal UI (macOS-style)
- ✅ Real-time streaming output
- ✅ Color-coded by line type
- ✅ Timestamps with milliseconds
- ✅ Copy to clipboard
- ✅ Clear terminal
- ✅ Auto-scroll
- ✅ Connection status
- ✅ Animated cursor

**Usage:**
```tsx
<AgentTerminal
  sessionId="session-xyz789"
  title="Claude Code Session"
  height="600px"
/>
```

**Line Types:**
- 🔵 Cyan: `thinking` - Agent reasoning
- 🟢 Green: `output` - Standard output
- 🟡 Yellow: `system` - System messages
- 🔴 Red: `error` - Errors

### 4. Frontend: Monitor Page

**File:** `app/monitor/page.tsx`

Dedicated monitoring page with feed and terminal.

**Features:**
- ✅ Split view (Feed + Terminal)
- ✅ Feed-only view
- ✅ Terminal-only view
- ✅ Session/Agent ID filter
- ✅ View mode toggle
- ✅ Quick stats
- ✅ Help documentation

**Access:** http://localhost:3002/monitor

---

## Event Types

### Claude Code Events
- `claude_session_started` - Session begins
- `claude_thinking` - Each line of thinking (real-time)
- `claude_session_completed` - Session ends
- `claude_session_failed` - Error occurred

### Codex MCP Events
- `codex_session_started` - MCP connection initiated
- `codex_thinking` - Progress updates
- `codex_session_completed` - Task completed
- `codex_refinement_completed` - Iteration finished
- `codex_session_failed` - Error occurred

---

## How to Use

### 1. Start the System

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui"
npm run start:all
```

This starts:
- WebSocket server on port 4000
- Next.js UI on port 3002

### 2. Access the Monitor

Open http://localhost:3002

Click **"Live Monitor"** button in header (green button).

### 3. Submit a Task

Navigate to http://localhost:3002/tasks

Submit a task to trigger agents.

### 4. Watch Real-Time

The monitor page will show:
- **Agent Feed**: Real-time thinking events
- **Terminal**: Full session logs with timestamps
- **Auto-updating**: No refresh needed!

---

## Testing

### Option 1: Test Script

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
python3 test_streaming_agents.py
```

This will:
- Run a hybrid workflow
- Stream output to console
- Create log files
- Publish events to WebSocket
- You can watch in the UI simultaneously

### Option 2: Submit Via UI

1. Go to http://localhost:3002/tasks
2. Fill out task form
3. Submit task
4. Go to http://localhost:3002/monitor
5. Watch agents think in real-time!

### Option 3: Watch Logs

```bash
# Terminal 1: Watch agent logs
tail -f logs/claude_sessions/*.log

# Terminal 2: Monitor WebSocket
# (WebSocket server console will show events)

# Terminal 3: Run UI
npm run dev
```

---

## WebSocket Message Format

Events are sent in this format:

```json
{
  "source_app": "agent_id",
  "session_id": "session-123",
  "hook_event_type": "claude_thinking",
  "payload": {
    "content": "I'm analyzing the code...",
    "data": {
      "agent_id": "claude-abc",
      "session_id": "sess-xyz",
      "timestamp": "2025-10-23T22:30:15.123Z"
    }
  },
  "timestamp": "2025-10-23T22:30:15.123Z"
}
```

---

## Key Features

### Real-Time Streaming
- ✅ Line-by-line output as agents think
- ✅ No polling - true WebSocket push
- ✅ Sub-second latency

### Filtering
- ✅ Filter by agent ID
- ✅ Filter by session ID
- ✅ Show all agents (no filter)

### Auto-Scroll
- ✅ Always shows latest activity
- ✅ Can disable if needed

### Timestamps
- ✅ Precise to milliseconds
- ✅ Formatted for readability
- ✅ Can hide if desired

### Connection Status
- ✅ Live indicator (green = connected)
- ✅ Auto-reconnect on disconnect
- ✅ Error notifications

### Multiple Views
- ✅ Split (Feed + Terminal)
- ✅ Feed only
- ✅ Terminal only

---

## Files Modified/Created

### Backend
1. ✅ `orchestrator/claude_code_agent.py` - Real-time streaming
2. ✅ `orchestrator/codex_mcp_agent.py` - Progress events
3. ✅ `orchestrator/redis_publisher.py` - Async publish_event()

### Frontend
4. ✅ `app/components/AgentFeed.tsx` - NEW
5. ✅ `app/components/AgentTerminal.tsx` - NEW
6. ✅ `app/monitor/page.tsx` - NEW
7. ✅ `app/page.tsx` - Added monitor link

### Documentation
8. ✅ `STREAMING_FIX.md` - Technical details
9. ✅ `STREAMING_INTEGRATION.md` - This file
10. ✅ `test_streaming_agents.py` - Test script

---

## Troubleshooting

### Events Not Showing

1. **Check WebSocket Connection**
   - Look for green dot in feed/terminal header
   - Check browser console for errors

2. **Check WebSocket Server**
   ```bash
   lsof -ti:4000
   # Should show process ID
   ```

3. **Check Event Publishing**
   - Look at orchestrator console output
   - Check for `publish_event` calls

### Slow Performance

1. **Too Many Events**
   - Reduce `maxEvents` prop
   - Filter by specific agent

2. **WebSocket Lag**
   - Check network tab in browser
   - Restart WebSocket server

### Connection Drops

1. **Auto-Reconnect**
   - Components auto-reconnect on disconnect
   - Wait a few seconds

2. **Manual Fix**
   - Refresh browser page
   - Restart WebSocket server

---

## Next Steps

### Enhancements
- 📋 Add event filtering controls
- 📋 Add export to file feature
- 📋 Add search/highlight in feed
- 📋 Add playback controls (pause/resume)
- 📋 Add event rate limiting
- 📋 Add compression for large events

### Analytics
- 📋 Events per second chart
- 📋 Agent activity heatmap
- 📋 Session duration tracking
- 📋 Error rate monitoring

---

## Summary

✅ **Complete** - Real-time agent streaming fully integrated!

**What You Get:**
- Live agent thinking as it happens
- Terminal-style session logs
- WebSocket real-time updates
- Filterable by agent/session
- Color-coded events
- Auto-scrolling feeds
- Connection status
- Multiple view modes

**Access:**
- Main UI: http://localhost:3002
- Monitor Page: http://localhost:3002/monitor

**Status:** 🟢 READY TO USE

---

**Date:** October 23, 2025
**Integration Status:** ✅ Complete
**Testing Status:** 🟡 Ready for testing
