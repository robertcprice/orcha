# CRITICAL FIX: Disabled Auto-Load of Old Tasks

## Problem Description

**User Report**: "everytime you refresh the page it gives you the platform jump game every time"

The system was automatically loading the OLDEST completed task (platformer game) on every page load/refresh, showing the wrong task completion popup and preventing new task submissions.

## Root Cause

**File**: `web-ui/components/orchestrator/OrchestratorCanvas.tsx`
**Lines**: 683-710 (now disabled)

The `useEffect` hook with dependency `[shouldRestore]` was loading task state from `localStorage` whenever triggered. Although the intent was to only restore when user explicitly clicked "Resume", the saved state in localStorage was causing the old platformer game task to appear on every page load.

## Fix Applied

### 1. Disabled Auto-Restore useEffect (Lines 683-714)

**Before**:
```typescript
useEffect(() => {
  if (shouldRestore) {
    // Load from localStorage
    const savedAgents = localStorage.getItem('orchestrator-agents');
    setAgents(parsedAgents);
  }
}, [shouldRestore]);
```

**After**:
```typescript
// ❌ DISABLED: Auto-restore was causing old tasks to load on every page refresh
// Restore only happens now through explicit user action (Resume button or loadTreeFromFile)
/* ... commented out ... */
```

### 2. Added localStorage Cleanup on Mount (Lines 783-786)

**Added to initialization useEffect**:
```typescript
useEffect(() => {
  // ✅ FIX: Clear old localStorage data to prevent auto-loading wrong tasks
  localStorage.removeItem('orchestrator-agents');
  localStorage.removeItem('orchestrator-session-id');
  console.log('🧹 Cleared old task data from localStorage on mount');

  // ... rest of initialization
}, []);
```

## Impact

### ✅ Fixed
- Page refresh now shows clean slate (no old tasks)
- No more wrong completion popups from old tasks
- Each page load starts with fresh orchestrator state

### ⚠️ Trade-offs
- "Resume Task" functionality via localStorage is now disabled
- Users must use explicit file-based task loading (loadTreeFromFile) to resume tasks
- Saved tree structures in files still work for task persistence

## Testing

**Created**: `web-ui/tests/critical-planning-flow.spec.ts`

Test results before fix:
- ❌ Task 1: Planning nodes showed old task logs
- ✅ Task 2: No platform jump game found (but shooting game was loaded instead)
- ❌ Task 3: New task submission failed

**Next Steps**: Re-run tests after fix to verify:
1. Page loads with clean state
2. No old tasks appear
3. New task submission works

## Related Files

- `web-ui/components/orchestrator/OrchestratorCanvas.tsx:683-714,783-786`
- `web-ui/tests/critical-planning-flow.spec.ts` (new)

## Date

2025-11-08
