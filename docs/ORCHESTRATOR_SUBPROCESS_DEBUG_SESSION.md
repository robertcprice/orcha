# Orchestrator Subprocess Debugging Session

**Date**: 2025-11-10
**Issue**: Python orchestrator subprocess not starting from Next.js API endpoint
**Status**: ✅ RESOLVED

## Problem Summary

The Next.js API endpoint at `/api/orchestrator/submit` was spawning a Python subprocess to run the orchestrator, but the subprocess was failing silently with empty log files (0 bytes). This prevented AI agent nodes from appearing in the UI visualization.

## Root Causes Identified

### 1. **Complexity Detection Logic Flaw** ⚠️ CRITICAL
**File**: `src/orchestrator/run_hybrid_task_v4.py:503-554`

**Problem**:
- Length heuristic (`< 50` chars = simple) was checked BEFORE keyword matching
- "Build a todo list app" contains "build" (complex keyword) but is only 21 characters
- Result: Task incorrectly classified as SIMPLE, skipping multi-AI planning (Stage 0)

**Fix**:
```python
# ❌ OLD: Length check first
if len(task_description.strip()) < 50:
    return False
# Then check keywords...

# ✅ NEW: Keywords first
complex_keywords = ['build', 'create app', 'todo app', 'todo list', ...]
for keyword in complex_keywords:
    if keyword in task_lower:
        return True  # Return immediately

# Length check only applies if no keywords matched
if len(task_description.strip()) < 30:  # Reduced threshold
    return False
```

**Impact**: Without this fix, Stage 0 (multi-AI planning) never runs, so no AI nodes spawn.

---

### 2. **Incorrect Script Path** ⚠️ CRITICAL
**File**: `src/ui/main_app/app/api/orchestrator/submit/route.ts:47-53`

**Problem**:
- Used `../../` (2 levels up) instead of `../../..` (3 levels up)
- Path from `main_app/` to project root is 3 levels: `main_app/ → src/ui/ → src/ → root/`

**Fix**:
```typescript
// ❌ OLD
const orchestratorScript = path.join(process.cwd(), '../..', 'src', 'orchestrator', 'run_hybrid_task_v4.py');

// ✅ NEW
const orchestratorScript = path.join(process.cwd(), '../../..', 'src', 'orchestrator', 'run_hybrid_task_v4.py');
```

**Verification**: `ls ../../../src/orchestrator/run_hybrid_task_v4.py` confirmed correct path.

---

### 3. **Async File Stream in spawn()** ⚠️ CRITICAL
**File**: `src/ui/main_app/app/api/orchestrator/submit/route.ts:59-70`

**Problem**:
- Used `fs.createWriteStream()` which returns a stream BEFORE the file descriptor opens
- `spawn()` received `fd: null`, causing `ERR_INVALID_ARG_VALUE`

**Error**:
```
TypeError [ERR_INVALID_ARG_VALUE]: The argument 'stdio' is invalid.
Received WriteStream { fd: null, ... }
```

**Fix**:
```typescript
// ❌ OLD: Async stream creation
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
spawn(venvPython, [...], { stdio: ['ignore', logStream, logStream] });

// ✅ NEW: Synchronous fd creation
const logFd = fs.openSync(logFile, 'a');
spawn(venvPython, [...], { stdio: ['ignore', logFd, logFd] });
```

---

### 4. **System Python Instead of Virtual Environment** ⚠️ HIGH
**File**: `src/ui/main_app/app/api/orchestrator/submit/route.ts:55-62`

**Problem**:
- Called system `python3` which lacks `openai` package in externally-managed environment
- Got error: `The 'openai' package is required to use ChatGPTPlanner`

**Fix**:
```typescript
// ❌ OLD
const pythonProcess = spawn('python3', [...]);

// ✅ NEW
const venvPython = path.join(process.cwd(), '../../..', 'venv', 'bin', 'python');
const pythonProcess = spawn(venvPython, [...]);
```

---

### 5. **Missing Working Directory & PYTHONPATH** ⚠️ HIGH
**File**: `src/ui/main_app/app/api/orchestrator/submit/route.ts:72-91`

**Problem**:
- Subprocess ran from Next.js working directory
- Python couldn't find modules in `src/orchestrator/`

**Fix**:
```typescript
const projectRoot = path.join(process.cwd(), '../../..');

const pythonProcess = spawn(venvPython, [...], {
  cwd: projectRoot,  // Set working directory
  env: {
    ...process.env,
    PYTHONPATH: projectRoot  // Add to Python path
  }
});
```

---

### 6. **Python Output Buffering** ⚠️ CRITICAL (KEY FIX!)
**File**: `src/ui/main_app/app/api/orchestrator/submit/route.ts:75`

**Problem**:
- Python buffers stdout/stderr by default when running in subprocess
- Logs never appeared in log files (remained 0 bytes)
- Made debugging impossible

**Fix**:
```typescript
// ✅ NEW: Add -u flag for unbuffered output
const pythonProcess = spawn(venvPython, [
  '-u',  // Force unbuffered stdout/stderr
  orchestratorScript,
  ...
]);
```

**This was the KEY fix that made logs appear immediately!**

---

## Testing & Verification

### API Test (Success ✅)
```bash
curl -X POST http://localhost:3002/api/orchestrator/submit \
  -H "Content-Type: application/json" \
  -d '{"task": "Build a todo list app"}'

# Response: {"ok":true,"task_id":"orch_1762816283872_fy1pf8hrf","status":"planning"}
```

### Log Verification (Success ✅)
```bash
cat /tmp/orchestrator-orch_1762816283872_fy1pf8hrf.log
```

**Output**:
```
🔊 VERBOSE MODE ENABLED
📋 Task ID: orch_1762816283872_fy1pf8hrf
🎯 Goal: Build a todo list app
✅ Complex keyword detected: 'build' in task
📊 Task Complexity: COMPLEX (multi-AI planning)

================================================================================
STAGE 0: Multi-AI Planning Layer with Design Iteration
Sequential: Claude → ChatGPT → DeepSeek → Grok → Gemini
================================================================================
🤖 Calling Claude for creative analysis...
```

**All infrastructure working!** ✅

---

## Known Remaining Issue

### Agent Node Events Not Published ⚠️

**Problem**: The `hybrid_planner.py` publishes `enrichment_pipeline_started` but does NOT publish individual `agent_node_created` events for each AI (Claude, ChatGPT, DeepSeek, Grok, Gemini).

**Impact**: Frontend doesn't receive node creation events, so nodes don't appear in visualization.

**Location**: `src/orchestrator/hybrid_planner.py` - needs to publish:
```python
await publish_event({
    "type": "agent_node_created",
    "node_id": f"claude-{task_id}",
    "agent_name": "Claude",
    "session_id": task_id,
    ...
})
```

**Status**: Infrastructure fixed, orchestrator running correctly. Only missing individual agent node events.

---

## Files Modified

1. `src/orchestrator/run_hybrid_task_v4.py` - Fixed complexity detection logic
2. `src/ui/main_app/app/api/orchestrator/submit/route.ts` - Fixed all subprocess issues

## Key Learnings

### 1. **Node.js spawn() File Descriptor Requirements**
- `stdio` parameter requires file descriptors that are ALREADY OPEN
- Async streams (`createWriteStream`) don't work - fd is `null` initially
- Use `fs.openSync()` to get fd synchronously

### 2. **Python Output Buffering in Subprocesses**
- Python buffers output when not connected to a TTY
- Always use `-u` flag for subprocess logging
- Without it, logs can be delayed indefinitely or lost

### 3. **Virtual Environment Path Resolution**
- Relative paths in Node.js are relative to `process.cwd()`
- Use `path.join(process.cwd(), '../../..', ...)` not `'../..'`
- Verify with `ls` before assuming paths are correct

### 4. **Python Module Resolution**
- Set both `cwd` and `PYTHONPATH` for subprocess
- `cwd` determines where process runs
- `PYTHONPATH` determines where Python finds modules

### 5. **Task Complexity Heuristics**
- Keywords should ALWAYS be checked before length heuristics
- Short tasks like "Build X" are often complex
- Return immediately when keyword matches (don't fall through to length check)

### 6. **Debugging Subprocess Issues**
- Test command directly in shell first: `venv/bin/python script.py ...`
- Check file descriptors are valid before spawn
- Use unbuffered output for real-time logs
- Verify all paths are absolute and correct

---

## Timeline

1. **Initial Investigation**: Logs were empty (0 bytes)
2. **Fix 1**: Corrected complexity detection logic
3. **Fix 2**: Fixed script path from `../../` to `../../..`
4. **Fix 3**: Changed to synchronous file descriptor creation
5. **Fix 4**: Used virtual environment Python instead of system
6. **Fix 5**: Added working directory and PYTHONPATH
7. **Fix 6**: Added `-u` flag for unbuffered output ← **KEY FIX**
8. **Verification**: Orchestrator now runs successfully, logs appear

**Total Session Time**: ~2 hours
**Final Status**: Infrastructure fully fixed, orchestrator operational ✅

---

## Next Steps

To complete the agent node visualization:

1. Add individual `agent_node_created` event publishing in `hybrid_planner.py`
2. Publish event when each AI agent starts (Claude, ChatGPT, DeepSeek, Grok, Gemini)
3. Include `node_id`, `agent_name`, `session_id` in event payload
4. Test with Playwright to verify nodes appear in UI

**Infrastructure is 100% working - only needs event publishing for visualization.**
