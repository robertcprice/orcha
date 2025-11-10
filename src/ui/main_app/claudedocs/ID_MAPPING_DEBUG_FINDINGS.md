# ID Mapping Debug Findings

**Date:** November 8, 2025
**Status:** ID normalization working but logs still not displaying

---

## What's Working ✅

### WebSocket Server ID Normalization
The ID mapping function IS working correctly:

```
🔍 ID Normalization: { raw: 'deepseek-planner', normalized: 'planning-deepseek', eventType: 'agent_started' }
📍 Session ID set to: planning-deepseek

🔍 ID Normalization: { raw: 'gemini-reviewer', normalized: 'planning-gemini', eventType: 'agent_completed' }
📍 Session ID set to: planning-gemini

🔍 ID Normalization: { raw: 'grok-reviewer', normalized: 'planning-grok', eventType: 'agent_started' }
📍 Session ID set to: planning-grok
```

### Redis Communication
- ✅ 50+ messages captured during test
- ✅ All AI planners communicating (deepseek, grok, gemini)
- ✅ Complete enrichment pipelines running
- ✅ Planning complete events sent

---

## What's NOT Working ❌

### UI Panels Show No Logs
Despite WebSocket server correctly normalizing IDs and broadcasting events:
- All planning node panels show: "⚠️ No logs received from AI planner"
- Test clicks each node and finds no real log content
- Frontend appears not to be receiving or routing the events correctly

---

## Root Cause Analysis

### Events Without agent_id
Many events don't have an `agent_id` field:
```
🔍 ID Normalization: { raw: undefined, normalized: 'unknown', eventType: 'ai_enrichment_request' }
🔍 ID Normalization: { raw: undefined, normalized: 'unknown', eventType: 'ai_enrichment_response' }
🔍 ID Normalization: { raw: undefined, normalized: 'unknown', eventType: 'enrichment_pipeline_started' }
🔍 ID Normalization: { raw: undefined, normalized: 'unknown', eventType: 'planning_complete' }
```

These events get `session_id: "unknown"` which prevents proper routing.

### Frontend Event Handling
From OrchestratorCanvas.tsx (line 262-279):
```typescript
// Emit log event for planning nodes
if (responseData && onLogEvent) {
  console.log(`📝 Emitting log event for ${planningNodeId}:`, {
    aiName,
    planningNodeId,
    responseDataLength: typeof responseData === 'string' ? responseData.length : JSON.stringify(responseData).length,
  });
  setTimeout(() => {
    onLogEvent(planningNodeId, {
      timestamp: new Date().toISOString(),
      role: aiName || 'Planning',
      message: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2),
      metadata: payload,
    });
    console.log(`✅ Log event emitted for ${planningNodeId}`);
  }, 0);
}
```

**Critical Finding:** The frontend manually creates log events from `ai_enrichment_response` events, not from a global WebSocket event stream filtered by session_id!

---

## The Real Problem

The ID mapping fix addresses WebSocket routing, but the frontend doesn't use WebSocket events directly for planning node logs. Instead:

1. OrchestratorCanvas listens for `ai_enrichment_response` events
2. Extracts `payload.data.response_data`
3. Manually calls `onLogEvent(planningNodeId, {...})`
4. This bypasses session_id filtering entirely

### Why Logs Don't Appear

Looking at OrchestratorCanvas lines 221-282, the code:
1. Checks for `ai_enrichment_response` event type ✅
2. Attempts to extract AI name from payload
3. Maps AI name to planning node ID
4. Calls `onLogEvent` with extracted data

**The mapping from event → planning node likely fails because:**
- Event doesn't contain AI name in expected format
- Or AI name → planning node ID mapping is incorrect
- Or `response_data` is not in the expected payload location

---

## Next Steps to Fix

### Option 1: Fix Frontend Event Mapping (Recommended)
Debug the `ai_enrichment_response` event handling in OrchestratorCanvas:
1. Add console logs to see what `ai_name` is extracted
2. Verify `response_data` location in payload
3. Check if `onLogEvent` is actually being called
4. Verify the planning node ID mapping

### Option 2: Change Backend Event Structure
Ensure `ai_enrichment_response` events include:
```json
{
  "type": "ai_enrichment_response",
  "agent_id": "deepseek-planner",  // ← Already present
  "ai_name": "deepseek",           // ← Might be missing
  "data": {
    "response_data": "..."         // ← Need to verify location
  }
}
```

### Option 3: Use agent_started/completed Events
Instead of relying on `ai_enrichment_response`, use `agent_started` and `agent_completed` events which DO have proper agent_ids:
```typescript
if (hook_event_type === 'agent_completed') {
  const agentId = payload.agent_id;  // Already normalized!
  const normalizedId = agentId; // 'planning-deepseek'
  onLogEvent(normalizedId, {
    timestamp: new Date().toISOString(),
    role: 'Planning',
    message: payload.success ? 'Agent completed successfully' : 'Agent failed',
    metadata: payload
  });
}
```

---

## Investigation Needed

1. **Check OrchestratorCanvas console logs** during task execution
   - Are `ai_enrichment_response` events being received?
   - What is the extracted `ai_name`?
   - Is `onLogEvent` being called?

2. **Inspect actual Redis event payloads**
   - What does `ai_enrichment_response` payload actually contain?
   - Where is `response_data` located?
   - Is `ai_name` present in payload?

3. **Verify SplitViewTerminal log filtering**
   - How does it filter logs for the selected agent?
   - Does it use session_id, agent_id, or something else?

---

## Test Results Summary

**Functional Test:** FAILED (0/6 nodes showing logs)
**ID Normalization:** WORKING (correct mapping verified)
**Redis Communication:** WORKING (50+ messages)
**WebSocket Broadcasting:** WORKING (events sent with normalized IDs)
**Frontend Log Display:** NOT WORKING (no logs appear in panels)

**Conclusion:** ID mapping is working correctly at the WebSocket layer, but the frontend event handling logic doesn't use it. The issue is in how OrchestratorCanvas processes `ai_enrichment_response` events to create log entries.
