# Real Functional Test Findings
**Date:** November 8, 2025
**Test:** Real integration test verifying actual AI planner communication

---

## Executive Summary

Created and ran a REAL functional test that verifies actual system operation, not just UI elements. **The test revealed that the system IS working but logs aren't displaying due to ID mismatch between backend and frontend.**

### Key Discovery
✅ **System IS working:** Redis captured 41 messages showing AI planners communicating
❌ **UI not showing logs:** Frontend node IDs don't match backend agent IDs
❌ **Orchestrator failing:** Manager completes planning but fails during execution

---

## What We Tested

Unlike previous tests that only verified UI elements (buttons, panels), this test verified:
1. ✅ Redis server running and receiving messages
2. ✅ Python backend processes communicating
3. ✅ AI planners producing actual logs (not just "no logs" messages)
4. ✅ Planning communication via Redis
5. ❌ Plans being sent to orchestrator (mapping issue)
6. ❌ Code execution happening (orchestrator manager failure)

---

## Test Results

### ✅ What's WORKING

**1. Redis Communication: 41 Messages Captured**
```
✅ manager_started
✅ enrichment_pipeline_started
✅ ai_enrichment_request (multiple)
✅ ai_enrichment_response (multiple)
✅ agent_started (deepseek-planner, grok-reviewer, gemini-reviewer)
✅ agent_completed (all agents)
✅ enrichment_pipeline_completed
✅ planning_complete (2 plans generated!)
```

**2. AI Planners ARE Communicating:**
- DeepSeek planner: Started → Completed ✅
- Grok reviewer: Started → Completed ✅
- Gemini reviewer: Started → Completed ✅
- Plans generated TWICE: `plan-20251108-184312` and `plan-20251108-184504`

**3. WebSocket Server Working:**
```log
📨 Received Redis event: agent_started from deepseek-planner
📨 Received Redis event: agent_completed from deepseek-planner
📨 Received Redis event: agent_started from grok-reviewer
📨 Received Redis event: agent_completed from grok-reviewer
📨 Received Redis event: agent_started from gemini-reviewer
📨 Received Redis event: agent_completed from gemini-reviewer
📨 Received Redis event: planning_complete from hybrid_planner
```

### ❌ What's BROKEN

**1. UI Not Showing Logs (ID Mismatch)**

**Frontend Node IDs:**
```typescript
- planning-claude
- planning-chatgpt
- planning-deepseek
- planning-grok
- planning-gemini
- orchestrator-root
```

**Backend Agent IDs (from Redis):**
```
- deepseek-planner
- grok-reviewer
- gemini-reviewer
- claude-planner (not seen)
- chatgpt-planner (not seen)
- hybrid_orchestrator_v4
```

**Problem:** Frontend creates nodes with IDs like `planning-claude` but backend sends events with IDs like `deepseek-planner`. **IDs don't match so logs can't be routed to the correct panels.**

**2. Orchestrator Manager Failure**

Last Redis message:
```json
{
  "type": "manager_failed",
  "task_id": "hybrid_1762645391880_pytmkm9nw",
  "...": "..."
}
```

- Planning completes successfully (2 full enrichment pipelines)
- But orchestrator manager fails after receiving the plan
- Execution never happens

---

## Detailed Analysis

### WebSocket Flow (What Should Happen)

```
1. User submits task in UI
   ↓
2. API endpoint /hybrid-orchestrator/submit receives task
   ↓
3. Python backend starts orchestration
   ↓
4. Backend publishes events to Redis: algomind.agent.events
   ↓
5. WebSocket server subscribes to Redis and receives events
   ↓
6. WebSocket broadcasts events to frontend
   ↓
7. OrchestratorCanvas receives events and updates nodes
   ↓
8. User clicks node → Panel shows logs for that agent
```

### Where It's Breaking

**Step 7-8:** Events reach frontend BUT can't be mapped to nodes due to ID mismatch.

**Frontend code creates these nodes:**
```typescript
initialPlanning: {
  'planning-claude': { id: 'planning-claude', ... },
  'planning-chatgpt': { id: 'planning-chatgpt', ... },
  'planning-deepseek': { id: 'planning-deepseek', ... },
  'planning-grok': { id: 'planning-grok', ... },
  'planning-gemini': { id: 'planning-gemini', ... },
}
```

**Backend sends events with these IDs:**
```json
{"type": "agent_started", "agent_id": "deepseek-planner", ...}
{"type": "agent_completed", "agent_id": "grok-reviewer", ...}
{"type": "agent_completed", "agent_id": "gemini-reviewer", ...}
```

**No match** = logs don't appear in UI panels.

---

## Root Causes

### Issue 1: ID Naming Convention Mismatch

**Frontend convention:** `{phase}-{ai_name}`
- Example: `planning-claude`, `planning-deepseek`

**Backend convention:** `{ai_name}-{role}`
- Example: `deepseek-planner`, `grok-reviewer`

**Fix needed:** Add ID mapping layer in WebSocket server or frontend to translate backend IDs to frontend IDs.

### Issue 2: Orchestrator Manager Failure

**Symptoms:**
- Planning completes successfully
- Enrichment pipeline runs twice
- All planners and reviewers complete
- Then `manager_failed` event

**Possible causes:**
1. Claude Code executor not found/configured
2. File system permissions issue
3. Missing dependencies for code execution
4. Error in task execution logic

**Fix needed:** Check orchestrator logs for specific error, debug manager failure.

---

## Evidence from Test

### Task Submitted
```
Task: "Create a Python script that calculates fibonacci numbers and saves them to a file"
Task ID: hybrid_1762645391880_pytmkm9nw
API Response: 200 OK
```

### Redis Messages Timeline
```
T+0s:  manager_started
T+1s:  enrichment_pipeline_started
T+2s:  ai_enrichment_request → ai_enrichment_response (multiple rounds)
T+5s:  agent_started: deepseek-planner
T+6s:  agent_completed: deepseek-planner
T+7s:  agent_started: grok-reviewer
T+8s:  agent_completed: grok-reviewer
T+9s:  agent_started: gemini-reviewer
T+10s: agent_completed: gemini-reviewer
T+11s: enrichment_pipeline_completed
T+12s: planning_complete

T+13s: enrichment_pipeline_started (2nd iteration)
T+14-25s: (same pattern repeats)
T+26s: planning_complete (2nd time)

T+27s: manager_failed ❌
```

### UI Panel Status
```
All 6 nodes appeared: ✅
All 6 nodes clickable: ✅
Panel opens when clicked: ✅
Tabs visible (Logs, Input, Thoughts, Code, Output): ✅

BUT:
Logs tab content: "⚠️ No logs received from AI planner"
Reason: Agent ID mismatch prevents routing
```

---

## Solutions Required

### 1. Fix ID Mapping (HIGH PRIORITY)

**Option A: Backend changes agent IDs**
```python
# In backend agent initialization
agent_id = f"planning-{ai_name}"  # planning-deepseek
reviewer_id = f"reviewing-{ai_name}"  # reviewing-grok
```

**Option B: Frontend adds ID mapping**
```typescript
const ID_MAP = {
  'deepseek-planner': 'planning-deepseek',
  'grok-reviewer': 'planning-grok',
  'gemini-reviewer': 'planning-gemini',
  'claude-planner': 'planning-claude',
  'chatgpt-planner': 'planning-chatgpt',
};
```

**Option C: WebSocket server transforms IDs**
```typescript
function normalizeAgentId(backendId: string): string {
  if (backendId.endsWith('-planner')) {
    const aiName = backendId.replace('-planner', '');
    return `planning-${aiName}`;
  }
  if (backendId.endsWith('-reviewer')) {
    const aiName = backendId.replace('-reviewer', '');
    return `planning-${aiName}`;
  }
  return backendId;
}
```

**Recommended:** Option C (WebSocket server) - centralizes mapping, no frontend/backend changes needed.

### 2. Debug Orchestrator Manager Failure (HIGH PRIORITY)

**Steps:**
1. Check Python orchestrator logs for error details
2. Verify Claude Code CLI is installed and accessible
3. Check file system permissions for output directory
4. Test orchestrator manually with simple task
5. Add error logging to manager failure events

---

## Next Steps

### Immediate (Fix Log Display)
1. ✅ Add ID mapping function to WebSocket server
2. ✅ Test that logs now appear in UI panels
3. ✅ Verify all 6 planning nodes show actual logs

### Short Term (Fix Execution)
4. ✅ Investigate orchestrator manager failure
5. ✅ Debug why execution fails after planning
6. ✅ Test end-to-end task completion

### Long Term (Prevent Future Issues)
7. Document ID naming conventions
8. Add integration tests for ID mapping
9. Add error reporting to UI for manager failures
10. Create monitoring dashboard for system health

---

## Test Script Location

**File:** `web-ui/tests/real-functional-test.spec.ts`

**What it does:**
- Verifies Redis running
- Subscribes to Redis messages
- Submits real task via UI
- Monitors AI planner communication
- Checks for actual logs (not just UI elements)
- Reports on system functionality

**To run:**
```bash
cd web-ui
npx playwright test tests/real-functional-test.spec.ts
```

---

## Comparison: UI Test vs Functional Test

### Previous UI Test (improved-node-clicking.spec.ts)
```
✅ Verified: Panels open, tabs exist, buttons work
❌ Did NOT verify: Actual AI communication, real logs, system function
Result: 100% pass but tells us nothing about system operation
```

### New Functional Test (real-functional-test.spec.ts)
```
✅ Verified: Redis messages, AI planner communication, actual system operation
✅ Identified: ID mismatch issue preventing log display
✅ Identified: Orchestrator manager failure after planning
Result: Revealed real issues that need fixing
```

---

**Report completed:** November 8, 2025
**System status:** Partially functional - planning works, display and execution broken
**Priority fixes:** 1) ID mapping, 2) Orchestrator manager debugging
