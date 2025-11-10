# ID Mapping Fix Summary

**Date:** November 8, 2025
**Issue:** Frontend nodes not displaying logs despite backend AI planners successfully communicating via Redis

---

## Problem Identified

### Functional Test Results
Created `tests/real-functional-test.spec.ts` that verified ACTUAL system operation:
- ✅ Redis running and receiving messages (41 total)
- ✅ AI planners communicating (deepseek, grok, gemini)
- ✅ Planning pipeline completing successfully
- ❌ UI panels showing "No logs received"

### Root Cause: ID Mismatch

**Backend Agent IDs** (from Redis messages):
```
- deepseek-planner
- grok-reviewer
- gemini-reviewer
- claude-planner
- chatgpt-planner
- hybrid_orchestrator_v4
```

**Frontend Node IDs** (from OrchestratorCanvas):
```
- planning-claude
- planning-chatgpt
- planning-deepseek
- planning-grok
- planning-gemini
- orchestrator-root
```

**Problem:** Events from backend couldn't be routed to frontend panels because IDs didn't match.

---

## Solution Implemented

### File Modified: `server/websocket-server.ts`

#### 1. Added ID Normalization Function (lines 9-36)

Maps backend agent IDs to frontend node IDs:

```typescript
function normalizeAgentId(backendId: string | undefined): string {
  if (!backendId) return 'unknown';

  const idStr = String(backendId).toLowerCase();

  // Backend IDs like "deepseek-planner" → Frontend IDs like "planning-deepseek"
  if (idStr.includes('deepseek') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-deepseek';
  }
  if (idStr.includes('grok') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-grok';
  }
  if (idStr.includes('gemini') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-gemini';
  }
  if (idStr.includes('claude') && (idStr.includes('planner') || idstr.includes('reviewer'))) {
    return 'planning-claude';
  }
  if (idStr.includes('chatgpt') && (idStr.includes('planner') || idStr.includes('reviewer'))) {
    return 'planning-chatgpt';
  }
  if (idStr.includes('orchestrator') || idStr.includes('hybrid')) {
    return 'orchestrator-root';
  }

  return idStr;
}
```

#### 2. Modified Event Normalization (lines 38-89)

Updated `normalizeEvent()` to:
- Extract raw agent_id from payload
- Normalize it using the mapping function
- Use normalized ID for sessionId routing
- Enrich payload with both normalized and original IDs

```typescript
// Get agent_id and normalize it for frontend
const rawAgentId = payload.agent_id || data.agent_id;
const normalizedAgentId = normalizeAgentId(rawAgentId);

const sessionId =
  normalizedAgentId ||  // Use normalized agent ID first
  payload.session_id ||
  payload.task_id ||
  data.session_id ||
  data.task_id ||
  sourceApp;

// Add normalized agent_id to payload for frontend routing
const enrichedPayload = {
  ...payload,
  agent_id: normalizedAgentId,  // Override with normalized ID
  original_agent_id: rawAgentId  // Keep original for debugging
};
```

#### 3. WebSocket Server Restarted

Killed old process and started new server with changes:
```bash
npx tsx server/websocket-server.ts
```

Server confirmed:
```
✅ Connected to Redis
📡 Subscribed to Redis channel: algomind.agent.events
🚀 WebSocket server running on http://localhost:4000
```

---

## Expected Behavior After Fix

### Before Fix
1. Backend sends: `{"type": "agent_started", "agent_id": "deepseek-planner", ...}`
2. WebSocket broadcasts unchanged
3. Frontend looks for node with ID `deepseek-planner`
4. No match found → logs don't display → "No logs received"

### After Fix
1. Backend sends: `{"type": "agent_started", "agent_id": "deepseek-planner", ...}`
2. WebSocket normalizes: `agent_id: "planning-deepseek"`, `original_agent_id: "deepseek-planner"`
3. Frontend looks for node with ID `planning-deepseek`
4. Match found → logs routed to correct panel → logs display

---

## Verification Steps

To verify the fix is working:

1. **Submit a task** through the UI
2. **Monitor WebSocket server logs** for normalized IDs:
   ```
   📨 Received Redis event: agent_started from deepseek-planner
   ```
3. **Click each planning node** in the UI canvas
4. **Check panel content** - should now show actual logs instead of "No logs received"
5. **Verify all AI planners** (Claude, ChatGPT, DeepSeek, Grok, Gemini) display logs

### Success Criteria
- ✅ Logs appear in planning node panels
- ✅ Events from `deepseek-planner` route to `planning-deepseek` node
- ✅ Events from `grok-reviewer` route to `planning-grok` node
- ✅ Events from `gemini-reviewer` route to `planning-gemini` node
- ✅ Panel shows actual planning content, not error messages

---

## Remaining Issues

### Orchestrator Manager Failure
After successful planning, the orchestrator manager fails:

**Evidence from Redis:**
```json
{
  "type": "planning_complete",
  "plan_id": "plan-20251108-184504",
  ...
}
// Followed by:
{
  "type": "manager_failed",
  "task_id": "hybrid_1762645391880_pytmkm9nw",
  ...
}
```

**Timeline:**
1. ✅ Manager starts
2. ✅ Enrichment pipeline runs (2x)
3. ✅ All AI planners complete
4. ✅ Planning marked complete
5. ❌ Manager fails during execution

**Next Steps for Investigation:**
1. Check Python orchestrator logs for error details
2. Verify Claude Code CLI is accessible
3. Check file permissions for output directory
4. Test orchestrator with simple task manually
5. Add detailed error logging to manager_failed events

---

## Files Modified

1. **`server/websocket-server.ts`** - Added ID normalization layer
2. **`tests/real-functional-test.spec.ts`** - Created functional test
3. **`claudedocs/REAL_FUNCTIONAL_TEST_FINDINGS.md`** - Documented test results
4. **`claudedocs/ID_MAPPING_FIX_SUMMARY.md`** - This summary

---

## Test Evidence

**Redis Messages Captured:** 41 messages showing active AI communication

**Message Types Observed:**
- `manager_started`
- `enrichment_pipeline_started`
- `ai_enrichment_request` (multiple)
- `ai_enrichment_response` (multiple)
- `agent_started` (deepseek-planner, grok-reviewer, gemini-reviewer)
- `agent_completed` (all agents)
- `enrichment_pipeline_completed`
- `planning_complete` (2 plans generated)
- `manager_failed` (orchestrator issue)

**Conclusion:** Backend communication is working perfectly. The ID mapping fix should now allow frontend to display these logs correctly.
