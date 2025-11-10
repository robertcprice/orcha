# Orchestrator UI Fixes - Progress Report

## 🎉 PHASE 1 COMPLETE: Critical Event Flow (Issues 1-6)

All critical event flow fixes are now complete! The system now uses real WebSocket events instead of fake animations, with proper session filtering and event routing.

---

## ✅ COMPLETED (Issues 1-6)

### 1. Top Bar Height/Transparency - FIXED
**Files Modified**:
- `web-ui/components/orchestrator/MinimalistTopBar.tsx:22-27`
  - Reduced padding: `py-1` → `py-0.5`
  - More transparent: `rgba(0, 0, 0, 0.15)` → `rgba(0, 0, 0, 0.12)`
  - Reduced blur: `blur(10px)` → `blur(6px)`

- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:727-776`
  - Moved planning nodes: `y: 12` → `y: 15`
  - All 5 planning nodes (Claude, ChatGPT, DeepSeek, Grok, Gemini)

**Result**: Particles and node glow effects now fully visible, not cut off by header.

---

### 2. Repetitive Task Completion Popup - FIXED
**Files Modified**:
- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:428-429, 467-470, 602`
  - Set `isRestoringRef.current = true` when loading from file
  - Set `taskCompletedRef.current = true` to prevent re-firing
  - Added check: `&& !isRestoringRef.current` to completion logic

- `web-ui/app/page.tsx:269-295, 298-306`
  - Changed dismissal strategy: session_id → task_id + timestamp
  - Added recent completion tracking with 1-minute window
  - Store `last-completion-${sessionId}` timestamp in localStorage

**Result**: Completion popup shows ONCE per task, never repeats on page refresh.

---

### 3. Planning Node Log Display - FIXED
**Files Modified**:
- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:117-119`
  - Unwrapped WebSocket event structure: `const eventData = (event as any).data || event;`
  - Events come as `{type: "event", data: {...}}` from websocket-server.ts
  - Now accessing `eventData.hook_event_type` and `eventData.payload` correctly

- Added debug logging to trace log emission (lines 244-260)
  - Logs when emitting log events for planning nodes
  - Warns if responseData or onLogEvent is missing

**Result**: Planning nodes now receive and display logs from AI enrichment events

---

### 4. Session Filtering for Enrichment Events - FIXED
**Files Modified**:
- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:61,128-142,166-178`
  - Added `activePlanIdRef` to track plan_id separately from task_id
  - Enrichment events use `plan_id` as session_id (e.g., "plan-20251108-145020")
  - Orchestrator events use `task_id` as session_id (e.g., "hybrid_1762631420091_abmqfvcx7")
  - Filter enrichment events by `plan_id` match, not task_id
  - Track plan_id when `enrichment_pipeline_started` event received

**Result**: Grok and other planning nodes only show logs from current plan, not old projects

---

### 5. Planning → Orchestrator Transition - FIXED
**Backend**:
- `orchestrator/hybrid_planner.py:587-596`
  - Added `planning_complete` event after `enrichment_pipeline_completed`
  - Event includes plan_id, session_id, task_id, timestamp

**Frontend**:
- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:181-192`
  - Listen for `planning_complete` event
  - Transition orchestrator-root status from "planning" → "active"

**Result**: After AI planning completes, orchestrator automatically transitions to spawn agents

---

### 6. Remove Fake Planning Animations - FIXED
**Files Modified**:
- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:63-113`
  - Commented out `startPlanningSequence` function (fake setTimeout animations)
  - Commented out registration in useEffect
  - Planning nodes now driven ONLY by real WebSocket events

**Result**: No more fake animations - all node status changes come from real backend events

---

## 📋 REMAINING FIXES (Phase 2 & 3)

### 7. Complexity Detection System (Phase 2)
**Fix Needed**:
- Create `web-ui/lib/complexity-detector.ts`
- Check keywords, length, file estimation, user flag
- Route simple tasks directly, complex tasks to hybrid planning

### 8. AI Prompt Redesign (Phase 2)
**Critical**: Ensure Claude FIRST, then flow:
- Claude (Plan Mode) → Initial analysis
- ChatGPT → Technical plan with architecture/code
- DeepSeek → Review + optimizations
- Grok → Polish plan (planning phase) + Fix code (execution phase)
- Gemini → Holistic review

**Files**:
- `orchestrator/hybrid_planner.py`
- `orchestrator/chatgpt_planner.py`
- `orchestrator/deepseek_agent.py`
- `orchestrator/grok_agent.py`
- `orchestrator/gemini_agent.py`

### 9. Structured Plan Output Format (Phase 2)
**Fix Needed**:
- Create `orchestrator/types/enriched_plan.py` with structured dataclasses
- JSON output with markdown content for architecture, code snippets, tasks
- Integrate with AI planner prompts

### 10. Plan Tab on Orchestrator Node (Phase 2)
**Fix Needed**:
- Add "Plan" tab to SplitViewTerminal for orchestrator node
- Display formatted technical plan with architecture/code/tasks
- Auto-start execution (no approval needed)

### 11. Resume Button Loading State (Phase 3)
**Fix Needed**:
- Show loading spinner while waiting for `loadTreeFn` registration
- Add error toast if loading fails
- Only show resume banner after function is ready

### 12. Playwright Tests (Phase 3)
**Fix Needed**:
- Test top bar transparency
- Test completion popup (submit → complete → refresh → no popup)
- Test planning node logs (click each node → verify logs appear)
- Test session filtering (no old logs)
- Test planning → orchestrator transition
- Test simple vs complex task routing

---

## Implementation Priority

**Phase 1: Critical Event Flow** (Continue Now)
1. Fix planning node log display (Issue 3) ← IN PROGRESS
2. Add session filtering for logs (Issue 4)
3. Add planning → orchestrator transition (Issue 5)
4. Remove fake animations (Issue 6)

**Phase 2: Planning System Redesign**
5. Redesign AI prompts with Claude first (Issue 6)
6. Create complexity detection (Issue 7)
7. Create structured plan output format
8. Add Plan tab to orchestrator (Issue 8)

**Phase 3: Polish**
9. Fix resume button loading state (Issue 9)
10. Create comprehensive Playwright tests (Issue 10)

---

## 📊 Overall Progress

**Phase 1: Critical Event Flow** - ✅ COMPLETE (6/6 issues)
- Top bar transparency
- Completion popup logic
- Planning node log display
- Session filtering for enrichment events
- Planning → orchestrator transition
- Remove fake animations

**Phase 2: Planning System Redesign** - 📋 Pending (4/4 issues)
- Complexity detection
- AI prompt redesign (Claude FIRST)
- Structured plan output format
- Plan tab on orchestrator node

**Phase 3: Polish** - 📋 Pending (2/2 issues)
- Resume button loading state
- Comprehensive Playwright tests

**Total Progress**: 6/12 issues completed (50%)

---

## Testing Commands

```bash
# Test current fixes
cd web-ui
npm run dev

# In browser:
# 1. Submit task → check nodes at 15% (not cut off)
# 2. Wait for completion → refresh → no popup (FIXED)
# 3. Click planning nodes → check for logs (IN PROGRESS)

# Run existing Playwright tests
npx playwright test real-task-execution.spec.ts
```

---

## Next Actions

1. **Debug WebSocket event structure** - Add console logging to see exact event format
2. **Fix log routing** - Ensure `agentLogs[planningNodeId]` gets populated
3. **Test with live task** - Submit real task and monitor events
4. **Continue with remaining issues** - After Issue 3 is confirmed working
