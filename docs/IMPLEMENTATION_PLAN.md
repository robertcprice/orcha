# Complete Orchestrator Fix Implementation Plan

## USER REQUIREMENTS (CRITICAL - DO NOT FORGET)

### AI Planning Flow Order (MUST PRESERVE)
**Claude is FIRST** - This is already implemented and must stay:
1. **Claude (Plan Mode)** - Initial analysis + approach (FIRST)
2. **ChatGPT** - Create detailed technical plan based on Claude's analysis
3. **DeepSeek** - Review + suggest improvements
4. **Grok** - Polish technical plan (planning phase) + Fix code (execution phase) - HYBRID ROLE
5. **Gemini** - Final holistic review

### Complexity Detection Criteria (ALL MUST BE USED)
- Keywords: 'build', 'create', 'make', 'app', 'game', 'system', 'architecture'
- Length: < 10 words = simple, ≥ 10 words = complex
- File estimation: 3+ files = complex
- User flag: UI checkbox "Use Full AI Planning"
- Logic: If ≥ 2 criteria say "Complex" → Use hybrid planning

### Plan Tab Behavior
- Add "Plan" tab to orchestrator node ONLY
- Show formatted plan (no approval needed)
- Auto-start execution immediately after planning

### Output Format
- "Whatever is most efficient for modularity and AI communication"
- Decision: JSON structure with markdown content (hybrid approach)

---

## ✅ COMPLETED FIXES

### 1. Top Bar Transparency
**Files**: `web-ui/components/orchestrator/MinimalistTopBar.tsx:22-27`, `OrchestratorCanvas.tsx:727-776`
- Reduced padding `py-1` → `py-0.5`
- More transparent `rgba(0,0,0,0.15)` → `rgba(0,0,0,0.12)`
- Reduced blur `blur(10px)` → `blur(6px)`
- Moved planning nodes from y:12 → y:15

### 2. Repetitive Completion Popup
**Files**: `OrchestratorCanvas.tsx:428-429,467-470,602`, `page.tsx:269-295,298-306`
- Set `isRestoringRef` when loading from file
- Check `!isRestoringRef.current` in completion logic
- Changed dismissal: `last-completion-${sessionId}` with 1-min window

---

## 🚧 REMAINING FIXES (IN ORDER)

### 3. Planning Node Log Display (IN PROGRESS)
**Problem**: Nodes show "⚠️ No logs received from AI planner"

**Root Causes**:
1. WebSocket events wrapped: `{ type: "event", data: {actual event} }`
2. Need to unwrap and access `data.ai_name` not `payload.ai_name`
3. AI name normalization inconsistent

**Fix Strategy**:
```typescript
// In OrchestratorCanvas.tsx handleWebSocketMessage:

// BEFORE checking payload, unwrap WebSocket structure
const unwrappedData = event.data || event; // Handle {type: "event", data: {...}}
const actualPayload = unwrappedData.payload || unwrappedData;

// Then normalize AI name
const aiName = (actualPayload?.ai_name || actualPayload?.aiName)?.toLowerCase();
const planningNodeId = `planning-${aiName}`;

// Pass normalized ID to onLogEvent
onLogEvent(planningNodeId, {...});
```

**Files**: `OrchestratorCanvas.tsx` lines 116-230

---

### 4. Session Filtering for Enrichment Events
**Problem**: Grok shows old project logs

**Fix**:
```typescript
// In OrchestratorCanvas.tsx line 122:
// REMOVE bypass for enrichment events
// ADD session check:
const isEnrichmentEvent = hook_event_type?.includes('enrichment');
if (isEnrichmentEvent && session_id !== activeSessionIdRef.current) {
  return; // Ignore enrichment from other sessions
}

// Clear logs when new task starts:
// In handleWebSocketMessage when manager_started:
if (hook_event_type === 'manager_started') {
  setAgentLogs({}); // Clear all logs
  activeSessionIdRef.current = session_id;
}
```

---

### 5. Planning Complete Event + Orchestrator Transition
**Backend**: `orchestrator/hybrid_planner.py`
```python
# After line 579 (enrichment_pipeline_completed):
await publish_event({
    "type": "planning_complete",
    "event_type": "planning_complete",
    "plan_id": plan_id,
    "session_id": plan_id,
    "task_id": task_id,
    "timestamp": datetime.now(timezone.utc).isoformat()
})
```

**Frontend**: `OrchestratorCanvas.tsx`
```typescript
// In handleWebSocketMessage, add:
if (hook_event_type === 'planning_complete') {
  setAgents(prev => ({
    ...prev,
    'orchestrator-root': {
      ...prev['orchestrator-root'],
      status: 'active', // Transition from planning to active
    },
  }));
  return;
}
```

---

### 6. Remove Fake Planning Animations
**File**: `OrchestratorCanvas.tsx` lines 63-105

```typescript
// COMMENT OUT or DELETE startPlanningSequence function
// REMOVE registration in useEffect lines 108-112
// Let REAL events drive node status changes
```

---

### 7. Complexity Detection System
**New File**: `web-ui/lib/complexity-detector.ts`
```typescript
export function detectTaskComplexity(goal: string, userFlag?: boolean): 'simple' | 'complex' {
  if (userFlag !== undefined) return userFlag ? 'complex' : 'simple';

  let complexityScore = 0;

  // Keywords check
  const keywords = ['build', 'create', 'make', 'app', 'game', 'system', 'architecture'];
  if (keywords.some(k => goal.toLowerCase().includes(k))) complexityScore++;

  // Length check
  const wordCount = goal.split(/\s+/).length;
  if (wordCount >= 10) complexityScore++;

  // File estimation (heuristic)
  const multiFileIndicators = ['component', 'module', 'service', 'api', 'database'];
  if (multiFileIndicators.filter(i => goal.toLowerCase().includes(i)).length >= 2) {
    complexityScore++;
  }

  return complexityScore >= 2 ? 'complex' : 'simple';
}
```

**Integrate**: `web-ui/app/api/hybrid-orchestrator/submit/route.ts`
```typescript
import { detectTaskComplexity } from '@/lib/complexity-detector';

// Before spawning orchestrator:
const complexity = detectTaskComplexity(goal);
if (complexity === 'simple') {
  // Skip hybrid planning, run direct execution
  process = spawn('python3', ['orchestrator/run_direct_claude_task.py', ...]);
} else {
  // Use full hybrid planning
  process = spawn('python3', ['orchestrator/run_hybrid_task_v4.py', ...]);
}
```

---

### 8. Redesign AI Planning Prompts

**Files to Modify**:
- `orchestrator/chatgpt_planner.py`
- `orchestrator/deepseek_agent.py`
- `orchestrator/grok_agent.py`
- `orchestrator/gemini_agent.py`

**ChatGPT Prompt** (chatgpt_planner.py):
```python
system_prompt = """You are an expert technical planner. Based on Claude's initial analysis, create a COMPLETE technical implementation plan.

Required Output Sections:
1. ARCHITECTURE (use mermaid diagrams)
2. FOLDER STRUCTURE (complete tree)
3. CODE SNIPPETS for all key components
4. DETAILED TASK BREAKDOWN with subtasks
5. DEPENDENCIES & integration points
6. DATA MODELS & schemas

Output as JSON with markdown content:
{
  "architecture": "# Architecture\n\n```mermaid\n...",
  "folderStructure": ["src/", "src/components/", ...],
  "codeSnippets": [{"file": "src/main.ts", "content": "..."}],
  "tasks": [{"name": "...", "subtasks": [...], "assignedAgent": "..."}],
  ...
}

Task: {task}
Claude's Analysis: {claude_plan}
"""
```

**DeepSeek Prompt** (deepseek_agent.py):
```python
"""Review this technical plan and provide:
- Performance optimization suggestions
- Security vulnerability analysis
- Edge cases not covered
- Alternative architectural approaches

Current Plan: {chatgpt_plan}
"""
```

**Grok Prompt** (grok_agent.py) - TWO PHASES:
```python
# PLANNING PHASE:
"""Polish this technical plan by adding:
- Implementation best practices for each component
- Recommended code patterns & design patterns
- Error handling & resilience strategies
- Testing approach (unit, integration, e2e)

Technical Plan: {deepseek_plan}
"""

# EXECUTION PHASE (new - call during agent execution):
"""Review this generated code and:
- Fix any bugs or issues
- Improve code quality & readability
- Add missing error handling
- Optimize performance

Code: {agent_code}
"""
```

**Gemini Prompt** (gemini_agent.py):
```python
"""Final holistic review:
- Are requirements fully addressed?
- Any gaps or inconsistencies in the plan?
- Potential bugs or issues to watch for?
- Final recommendations before execution

Complete Plan: {all_enrichments}
"""
```

---

### 9. Structured Plan Output Format

**New File**: `orchestrator/types/enriched_plan.py`
```python
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class CodeSnippet:
    file: str
    content: str
    description: str

@dataclass
class Task:
    name: str
    subtasks: List[str]
    assignedAgent: str
    estimatedTime: str

@dataclass
class StructuredPlan:
    architecture: str  # Markdown with mermaid
    folderStructure: List[str]
    codeSnippets: List[CodeSnippet]
    tasks: List[Task]
    risks: List[str]
    testingStrategy: str
    deploymentNotes: str

    def to_json(self) -> dict:
        return {
            "architecture": self.architecture,
            "folderStructure": self.folderStructure,
            "codeSnippets": [{"file": s.file, "content": s.content, "description": s.description} for s in self.codeSnippets],
            "tasks": [{"name": t.name, "subtasks": t.subtasks, "assignedAgent": t.assignedAgent, "estimatedTime": t.estimatedTime} for t in self.tasks],
            "risks": self.risks,
            "testingStrategy": self.testingStrategy,
            "deploymentNotes": self.deploymentNotes
        }
```

---

### 10. Plan Tab on Orchestrator Node

**File**: `web-ui/components/orchestrator/SplitViewTerminal.tsx`

Add tab selection:
```typescript
const [activeTab, setActiveTab] = useState<'logs' | 'code' | 'output' | 'plan'>('logs');

// Only show Plan tab for orchestrator node
const isOrchestrator = agentId === 'orchestrator-root';

// Tab buttons:
{isOrchestrator && (
  <button onClick={() => setActiveTab('plan')}>Plan</button>
)}

// Tab content:
{activeTab === 'plan' && isOrchestrator && (
  <PlanViewer plan={nodeMetadata?.plan} />
)}
```

**New Component**: `web-ui/components/orchestrator/PlanViewer.tsx`
```typescript
export default function PlanViewer({ plan }: { plan?: StructuredPlan }) {
  if (!plan) return <div>No plan available</div>;

  return (
    <div className="plan-viewer">
      <section>
        <h3>Architecture</h3>
        <ReactMarkdown>{plan.architecture}</ReactMarkdown>
      </section>

      <section>
        <h3>Folder Structure</h3>
        <pre>{plan.folderStructure.join('\n')}</pre>
      </section>

      <section>
        <h3>Code Snippets</h3>
        {plan.codeSnippets.map(snippet => (
          <div key={snippet.file}>
            <h4>{snippet.file}</h4>
            <SyntaxHighlighter>{snippet.content}</SyntaxHighlighter>
          </div>
        ))}
      </section>

      <section>
        <h3>Tasks</h3>
        <TaskTree tasks={plan.tasks} />
      </section>
    </div>
  );
}
```

---

### 11. Resume Button Loading State

**File**: `web-ui/app/page.tsx`

```typescript
const [resumeLoading, setResumeLoading] = useState(false);
const [loadTreeReady, setLoadTreeReady] = useState(false);

// Track when loadTreeFn is ready
useEffect(() => {
  if (loadTreeFn) {
    setLoadTreeReady(true);
  }
}, [loadTreeFn]);

// Only show resume banner when function is ready
const showResumeBanner = hasSavedTask && loadTreeReady;

// Update resume handler
const handleResumeTask = useCallback(async () => {
  setResumeLoading(true);
  try {
    await loadTreeFn(mostRecentTask.task_id);
  } catch (error) {
    toast.error('Failed to load task');
  } finally {
    setResumeLoading(false);
  }
}, [loadTreeFn]);

// Resume button
<button disabled={resumeLoading}>
  {resumeLoading ? 'Loading...' : 'Resume Task'}
</button>
```

---

### 12. Playwright Tests

**New File**: `web-ui/tests/orchestrator-complete-flow.spec.ts`

```typescript
test.describe('Complete Orchestrator Fixes', () => {
  test('top bar does not cut off node glow', async ({ page }) => {
    await page.goto('http://localhost:3002');

    // Submit task
    await page.fill('input[placeholder*="Describe"]', 'Build a todo app');
    await page.press('input[placeholder*="Describe"]', 'Enter');

    // Take screenshot of planning nodes
    const claudeNode = page.locator('text=Claude').first();
    const box = await claudeNode.boundingBox();

    // Verify node is at y: 15% (not cut off by header)
    expect(box.y).toBeGreaterThan(100); // Should be well below header

    await page.screenshot({ path: 'node-glow-visible.png' });
  });

  test('completion popup shows once, not on refresh', async ({ page }) => {
    // Submit and complete task
    // ... wait for completion

    // Verify popup shows
    await expect(page.locator('text=/Task completed/i')).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify popup does NOT show again
    await expect(page.locator('text=/Task completed/i')).not.toBeVisible();
  });

  test('planning nodes show logs', async ({ page }) => {
    // Submit task
    // Wait for enrichment events

    // Click Claude node
    await page.click('text=Claude');

    // Verify logs appear (not "No logs received")
    await expect(page.locator('text=/No logs received/i')).not.toBeVisible();
    await expect(page.locator('[class*="log"]')).toHaveCount(greaterThan(0));
  });

  test('simple task bypasses hybrid planning', async ({ page }) => {
    // Submit simple task
    await page.fill('input', 'Fix typo in README');
    await page.press('input', 'Enter');

    // Verify planning nodes do NOT activate
    await page.waitForTimeout(3000);
    const claudeNode = page.locator('text=Claude');
    await expect(claudeNode).toHaveCSS('status', 'idle'); // Should stay idle
  });

  test('complex task uses hybrid planning', async ({ page }) => {
    // Submit complex task
    await page.fill('input', 'Build a real-time chat application with authentication');
    await page.press('input', 'Enter');

    // Verify ALL planning nodes activate
    await expect(page.locator('text=Claude')).toHaveCSS('status', 'planning');
    await expect(page.locator('text=ChatGPT')).toHaveCSS('status', 'planning');
    // ... etc
  });
});
```

---

## CRITICAL NOTES FOR POST-COMPACT

1. **Claude is FIRST in planning** - Never change this order
2. **Grok has HYBRID role** - Planning phase + Execution phase
3. **No approval needed** - Auto-execute after planning
4. **Complexity detection uses ALL criteria** - Keywords, length, file count, user flag
5. **Output format**: JSON with markdown content
6. **Session filtering MUST include enrichment events** - Stop old logs from appearing

---

## File Change Summary

**Frontend (11 files)**:
1-2. ✅ MinimalistTopBar.tsx, OrchestratorCanvas.tsx - Completed
3. ✅ page.tsx - Completed
4. OrchestratorCanvas.tsx - Need log display fix
5. page.tsx - Need session log clearing
6. OrchestratorCanvas.tsx - Need planning_complete handler
7. lib/complexity-detector.ts - NEW
8. app/api/hybrid-orchestrator/submit/route.ts - Add complexity check
9. SplitViewTerminal.tsx - Add Plan tab
10. PlanViewer.tsx - NEW
11. orchestrator-complete-flow.spec.ts - NEW

**Backend (6 files)**:
12. hybrid_planner.py - Add planning_complete event
13. chatgpt_planner.py - New detailed prompt
14. deepseek_agent.py - Review prompt
15. grok_agent.py - Planning + execution prompts
16. gemini_agent.py - Holistic review prompt
17. types/enriched_plan.py - NEW

Total: **17 files** (3 completed, 14 remaining)
