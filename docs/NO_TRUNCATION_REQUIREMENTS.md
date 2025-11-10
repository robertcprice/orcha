# NO TRUNCATION REQUIREMENTS

**Critical Requirement:** All agent input, thinking, streaming, logging, and output must be FULLY VERBOSE with NO TRUNCATION.

## User Requirement Statement
> "make sure any input, thinking streaming, and logging, anything, make sure there is NO TRUNCATION! allow everything to be verbose. it is not beneficial to any user for the output of agents to be truncated"

---

## Truncation Issues Found in Codebase

### 1. TaskHistoryDropdown.tsx ⚠️ TRUNCATES
**File:** `/web-ui/components/orchestrator/TaskHistoryDropdown.tsx`

**Lines 99-102:**
```typescript
const truncateGoal = (goal: string, maxLength: number = 40) => {
  if (goal.length <= maxLength) return goal;
  return goal.substring(0, maxLength) + '...';
};
```

**Impact:** Task goals truncated to 40 characters in dropdown

**Fix Required:**
- Remove truncation function or increase to reasonable limit (e.g., 200 chars)
- Use CSS `text-overflow` with tooltip for long text instead of hard truncation
- Show full text on hover

**Line 40:**
```typescript
setRecentTasks((tasksData.tasks || []).slice(0, 10));
```

**Impact:** Only shows last 10 tasks

**Fix Required:**
- Increase limit or make it configurable
- Add pagination/infinite scroll if many tasks exist

---

### 2. Backend Streaming - NO TRUNCATION FOUND ✅

**Checked Files:**
- `orchestrator/chatgpt_planner.py` - No max_length limits
- `orchestrator/redis_publisher.py` - No truncation in event publishing
- `orchestrator/hybrid_planner.py` - Full content passed between AIs
- `orchestrator/multi_ai_research.py` - Complete responses returned

**Status:** Backend appears to handle full content without truncation

---

### 3. Frontend Terminal Panel - NO TRUNCATION FOUND ✅

**File:** `/web-ui/components/orchestrator/SplitViewTerminal.tsx`

**Analysis:**
- No `.slice()`, `.substring()`, or character limits in log display
- Full content rendered in tabs (Logs, Thoughts, Code, Output)
- Uses scrolling for long content

**Status:** Terminal panel displays full content

---

## Implementation Requirements

### Backend Requirements

1. **Planning AI Output - MUST BE FULL**
   - Claude thinking/reasoning: NO truncation
   - ChatGPT planning: NO truncation
   - DeepSeek enrichment: NO truncation
   - Grok review: NO truncation
   - Gemini documentation: NO truncation

2. **Event Publishing - MUST BE FULL**
   - `ai_enrichment_request` events: Full input data
   - `ai_enrichment_response` events: Full AI responses
   - `agent_output` events: Complete streaming output
   - No character limits in Redis events

3. **Metadata Capture - MUST BE COMPLETE**
   ```python
   # CORRECT: Full content
   metadata = {
       "input": original_request,  # FULL REQUEST
       "thinking": reasoning_process,  # COMPLETE REASONING
       "output": final_enrichment  # ENTIRE OUTPUT
   }

   # WRONG: Truncated content
   metadata = {
       "input": original_request[:500],  # ❌ TRUNCATED
       "thinking": reasoning_process[:1000],  # ❌ TRUNCATED
       "output": final_enrichment[:2000]  # ❌ TRUNCATED
   }
   ```

4. **Streaming Output - MUST BE CONTINUOUS**
   - All chunks from AI responses must be captured
   - No dropping of intermediate chunks
   - Accumulate all streaming data

---

### Frontend Requirements

1. **Terminal Panel Display - MUST SHOW ALL**
   - Input tab: Full input data (no ellipsis)
   - Thinking tab: Complete reasoning stream
   - Output tab: Entire result
   - Logs tab: All log entries with scrolling

2. **Node Metadata - MUST STORE ALL**
   ```typescript
   // CORRECT: Full content storage
   interface Agent {
     metadata?: {
       input?: string;      // FULL INPUT
       thoughts?: string;   // COMPLETE THOUGHTS
       output?: string;     // ENTIRE OUTPUT
       content?: string;    // ALL CONTENT
     };
   }

   // NO character limits, NO truncation functions
   ```

3. **UI Display Pattern**
   - Use scrollable containers for long content
   - CSS: `overflow-y: auto; max-height: 80vh;` (NOT `text-overflow: ellipsis`)
   - Show full content with scroll, not truncated with "..."
   - Optional: Expandable sections for very long content

4. **Fix TaskHistoryDropdown.tsx**
   ```typescript
   // BEFORE (WRONG):
   const truncateGoal = (goal: string, maxLength: number = 40) => {
     return goal.substring(0, maxLength) + '...';
   };

   // AFTER (CORRECT):
   const displayGoal = (goal: string) => {
     // Show full text with CSS ellipsis + tooltip
     return goal;  // NO TRUNCATION
   };
   ```

---

## Testing Requirements

### Playwright Tests Must Verify

1. **Long Content Handling**
   - Submit task with very long description (5000+ chars)
   - Verify full description visible in terminal panel
   - Verify no "..." truncation markers

2. **Planning AI Output**
   - Verify each AI's full reasoning is captured
   - Check Input tab shows complete user goal
   - Check Thinking tab shows all reasoning steps
   - Check Output tab shows entire enrichment

3. **Streaming Capture**
   - Verify all streaming chunks accumulate
   - No dropped content during streaming
   - Final output matches expected full length

4. **Error Messages**
   - Long error messages must be fully visible
   - Stack traces must be complete
   - No truncation of diagnostic info

---

## Code Review Checklist

Before merging, verify:

- [ ] No `.slice(0, n)` on agent output
- [ ] No `.substring(0, n)` on thinking/logs
- [ ] No `maxLength` parameters on content fields
- [ ] No character count limits in event payloads
- [ ] No "..." ellipsis added to text content
- [ ] TaskHistoryDropdown truncation removed/fixed
- [ ] Terminal panel shows full scrollable content
- [ ] Metadata stores complete data
- [ ] Tests verify long content (5000+ chars) works

---

## Summary

**Principle:** USER NEEDS TO SEE EVERYTHING

- Agent reasoning is valuable - show it all
- Truncation hides context - unacceptable
- Storage is cheap - verbosity is valuable
- Let the user scroll - don't decide what to hide

**Implementation:**
1. Remove truncateGoal() function from TaskHistoryDropdown
2. Ensure all metadata captures full content
3. Use scrollable containers, not truncation
4. Test with very long content (5000+ characters)
5. Verify in Playwright that no truncation occurs

---

**Status:** Requirements documented ✅
**Next:** Implement with NO TRUNCATION guarantee
