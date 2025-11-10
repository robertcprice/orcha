# WebSocket Infinite Loop - Complete Root Cause Analysis

## Executive Summary

**Problem**: 148 WebSocket connections created and destroyed in 3 seconds, causing browser resource exhaustion.

**Root Cause**: React render loop caused by unstable function reference passed to `useWebSocket` hook.

**Impact**:
- Browser shows "Connection failed: Insufficient resources"
- Agent visualization doesn't work
- System appears completely broken

## The Technical Chain of Failure

### 1. OrchestratorCanvas.tsx - Unstable Callback

**File**: `web-ui/components/orchestrator/OrchestratorCanvas.tsx`
**Lines**: 37-156

```typescript
export default function OrchestratorCanvas({ onNodeClick, onActiveNodesChange, onTaskComplete }: OrchestratorCanvasProps) {
  const [agents, setAgents] = useState<Record<string, Agent>>({});

  // ❌ PROBLEM: Function defined in component body
  const handleWebSocketMessage = (event: WebSocketEvent) => {
    // Uses `agents` state directly on lines 83, 113-121, 134-140, 146-152
    const parent = agents[parentId];  // Line 83 - reads from agents state

    setAgents(prev => ({  // Lines 113-121 - updates agents state
      ...prev,
      [agentId]: newAgent,
    }));
  };

  // ❌ PROBLEM: Passes unstable function reference
  useWebSocket({ onMessage: handleWebSocketMessage });  // Line 156
}
```

**Why This Is Bad**:
- `handleWebSocketMessage` is recreated on EVERY render
- It closes over the `agents` state variable
- When `agents` changes → function reference changes
- New function reference → triggers WebSocket reconnection

### 2. useWebSocket.ts - Dependency Chain

**File**: `web-ui/lib/useWebSocket.ts`
**Lines**: 36-138

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, ... } = options;

  // connect function depends on onMessage
  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      // Calls the onMessage callback
      onMessage?.(evt);  // Line 74
    };

    // ❌ PROBLEM: onMessage in dependency array
  }, [onMessage, onConnect, onDisconnect, reconnectDelay, maxReconnectAttempts]);  // Line 125

  // useEffect depends on connect
  useEffect(() => {
    connect();  // Creates new WebSocket

    return () => {
      // Cleanup closes old WebSocket
      if (wsRef.current) {
        wsRef.current.close();  // Line 135
      }
    };
  }, [connect]);  // ❌ PROBLEM: connect in dependency array (Line 138)
}
```

**The Dependency Chain**:
```
onMessage changes
  → connect is recreated (useCallback dependency)
    → useEffect re-runs (useEffect dependency)
      → New WebSocket created
      → Old WebSocket closed
```

### 3. The Infinite Loop

```
Render 1:
├─ agents = {}
├─ handleWebSocketMessage created (ref #1)
├─ useWebSocket receives onMessage (ref #1)
├─ connect created (ref #A)
├─ useEffect runs → WebSocket #1 created
└─ Server logs: "✅ New WebSocket client connected"

WebSocket message arrives:
├─ calls onMessage (ref #1)
├─ handleWebSocketMessage runs
├─ setAgents called
└─ agents = { "orchestrator-root": {...} }

Render 2:
├─ agents = { "orchestrator-root": {...} }  ← STATE CHANGED
├─ handleWebSocketMessage created (ref #2)  ← NEW REFERENCE
├─ useWebSocket receives onMessage (ref #2) ← CHANGED
├─ connect created (ref #B)                 ← NEW REFERENCE
├─ useEffect runs:
│  ├─ Cleanup: WebSocket #1.close()
│  └─ WebSocket #2 created
├─ Server logs: "❌ WebSocket client disconnected"
└─ Server logs: "✅ New WebSocket client connected"

... LOOP CONTINUES FOREVER ...
```

### 4. Why 148 Connections?

**Observations**:
- Test showed 84+ reconnection attempts in ~3 seconds
- Server logs show 148 connects, then 148 disconnects

**Explanation**:
1. Component renders initially → 1 connection
2. WebSocket connects and sends batch of initial events → triggers setAgents
3. Each setAgents call → new render → new connection
4. If there are ~10 initial events, that's 10 rapid renders
5. Each render's cleanup closes previous connection
6. Closed connections trigger reconnect logic
7. Reconnects create more connections
8. With 3-second reconnect delays and exponential backoff, connections pile up
9. After 30 seconds, 148 connections accumulated

## The Solution

### Fix OrchestratorCanvas.tsx

**Change handleWebSocketMessage to use useCallback**:

```typescript
import { useEffect, useState, useRef, useCallback } from 'react';

export default function OrchestratorCanvas({ onNodeClick, onActiveNodesChange, onTaskComplete }: OrchestratorCanvasProps) {
  const [agents, setAgents] = useState<Record<string, Agent>>({});

  // ✅ SOLUTION: Wrap in useCallback with empty dependencies
  const handleWebSocketMessage = useCallback((event: WebSocketEvent) => {
    const { hook_event_type, payload, source_app, session_id } = event;

    // ✅ CRITICAL: Use functional setState to avoid dependency on agents
    setAgents(prev => {
      // All logic uses `prev` instead of `agents`
      const parent = prev[parentId];  // Read from prev, not agents

      if (hook_event_type === 'agent_spawned') {
        return {
          ...prev,
          [agentId]: newAgent,
          [parentId]: {
            ...prev[parentId],
            children: [...prev[parentId].children, agentId],
          },
        };
      }

      // ... all other cases use `prev`
      return prev;
    });
  }, []);  // ✅ Empty dependencies because we use functional setState

  useWebSocket({ onMessage: handleWebSocketMessage });
}
```

### Key Changes Required

1. **Import useCallback**: `import { useCallback } from 'react';`

2. **Wrap handleWebSocketMessage**:
   ```typescript
   const handleWebSocketMessage = useCallback((event) => { ... }, []);
   ```

3. **Change ALL setAgents calls to functional form**:
   ```typescript
   // ❌ OLD - depends on external agents variable
   setAgents({ ...agents, [id]: newAgent });

   // ✅ NEW - uses prev parameter
   setAgents(prev => ({ ...prev, [id]: newAgent }));
   ```

4. **Change ALL agents state reads inside handleWebSocketMessage**:
   ```typescript
   // ❌ OLD - reads external agents variable
   const parent = agents[parentId];

   // ✅ NEW - only use `prev` parameter from setState
   setAgents(prev => {
     const parent = prev[parentId];  // Read from prev
     // ... rest of logic
   });
   ```

## Testing The Fix

After applying the fix:

1. **Expected Behavior**:
   - One WebSocket connection created on mount
   - Connection persists across renders
   - No reconnection loop
   - Server logs: One "✅ Connected", no rapid disconnects

2. **How to Verify**:
   ```bash
   # Watch WebSocket server logs
   tail -f /Users/bobbyprice/projects/Smart\ Market\ Solutions/Orchestration-System/web-ui/server/logs/websocket.log

   # Should see:
   # ✅ New WebSocket client connected
   # (and nothing else for 30+ seconds)
   ```

3. **Browser Console Check**:
   - Should see "WebSocket connected" once
   - No "Attempting reconnect" messages unless server actually goes down

## Additional Improvements (Optional)

### 1. Move activeSessionId to useRef
```typescript
// Prevent re-renders when session ID changes
const activeSessionIdRef = useRef<string | null>(null);
```

### 2. Debounce setAgents calls
```typescript
// If receiving many rapid events, batch the updates
const updateAgentsDebounced = useMemo(
  () => debounce((updates) => setAgents(updates), 100),
  []
);
```

### 3. Add connection state logging
```typescript
useEffect(() => {
  console.log(`🔄 Component rendered. Agents count: ${Object.keys(agents).length}`);
}, [agents]);
```

## Files That Need Changes

1. **web-ui/components/orchestrator/OrchestratorCanvas.tsx** (CRITICAL - must fix)
2. **web-ui/lib/useWebSocket.ts** (Already correct, no changes needed)

## Why My Previous "Fixes" Didn't Work

### What I Did Wrong:
1. **Added reconnection limits** - Treated symptom (too many connections) not cause (render loop)
2. **Fixed AgentNode centering** - Agent nodes weren't even rendering due to WebSocket failure
3. **Fixed Redis stub** - This WAS correct, but didn't solve the WebSocket loop

### What Actually Needed Fixing:
- **Stabilize the callback function** using useCallback with functional setState

The reconnection limit code is still useful (prevents resource exhaustion if server actually goes down), but it doesn't fix the root cause of connections being created on every render.

## Conclusion

This is a classic React anti-pattern:

**Anti-pattern**: Passing unstable callbacks to hooks that create effects
**Solution**: Memoize callbacks with useCallback and use functional setState

The fix is straightforward but requires careful refactoring of all state updates inside `handleWebSocketMessage` to use the functional `prev => {}` form instead of reading from the external `agents` variable.
