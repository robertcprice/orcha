# Gemini Structured JSON Output - Implementation Plan

**Goal:** Have Gemini (5th AI) create final structured JSON with all tasks/subtasks for orchestrator execution

---

## Requirements

1. **Gemini's Final Output Must:**
   - Be in structured JSON format
   - NOT remove, summarize, or truncate ANY content from previous AIs
   - ONLY add improvements or fix issues
   - Include ALL tasks and subtasks from ChatGPT's plan
   - Emphasize parallelization where possible
   - Include documentation agents
   - Include testing/debugging agents
   - Include security agents
   - Assign tasks to appropriate agent types

2. **All AI Prompts Must Emphasize:**
   - Parallelization opportunities
   - Documentation requirements
   - Testing requirements
   - Security considerations

---

## Implementation Steps

### Step 1: Update Claude's Prompt
**File:** `orchestrator/hybrid_planner.py`
**Location:** Lines 195-235

**Add to Claude's analysis:**
```markdown
## Critical Requirements for This Project
- **Parallelization**: Identify which tasks can run in parallel
- **Documentation**: Plan for documentation agent involvement
- **Testing**: Plan for comprehensive testing strategy
- **Security**: Identify security considerations early
```

### Step 2: Update ChatGPT's Prompt
**File:** `orchestrator/chatgpt_planner.py`
**Location:** Lines 337-401

**Add emphasis on:**
```markdown
### CRITICAL REQUIREMENTS

#### Parallelization
For each task, specify if it can run in parallel with others:
- Mark tasks as "parallel_group": "group_1", "group_2", etc.
- Tasks in same group can run simultaneously
- Dependencies must complete before dependent tasks

#### Required Agent Types
EVERY plan must include these agent types:
- **Documentation Agent**: For README, API docs, architecture docs
- **Testing Agent**: For unit tests, integration tests, E2E tests
- **Security Agent**: For vulnerability scanning, auth review, input validation
- **Code Quality Agent**: For linting, type checking, best practices

Include these agents at appropriate points in the workflow.
```

### Step 3: Create Gemini Structured JSON Method
**File:** `orchestrator/gemini_agent.py`
**New Method:** `organize_final_tasks()`

**Purpose:** Take all enrichments and create final structured JSON

**JSON Structure:**
```json
{
  "task_title": "Original user request",
  "final_plan_version": "v1.0",
  "total_tasks": 15,
  "parallelization_score": 8.5,
  "task_groups": [
    {
      "group_id": "setup",
      "parallel": false,
      "tasks": [
        {
          "task_id": "task_1",
          "title": "Initialize Project Structure",
          "assigned_agent": "code_agent",
          "subtasks": [
            "Create directory structure",
            "Initialize package.json",
            "Setup TypeScript config"
          ],
          "dependencies": [],
          "can_parallelize": false,
          "estimated_time": "5 minutes"
        }
      ]
    },
    {
      "group_id": "implementation",
      "parallel": true,
      "tasks": [
        {
          "task_id": "task_2",
          "title": "Implement Core Logic",
          "assigned_agent": "code_agent",
          "subtasks": [...],
          "dependencies": ["task_1"],
          "can_parallelize": true,
          "parallel_with": ["task_3", "task_4"]
        },
        {
          "task_id": "task_3",
          "title": "Create UI Components",
          "assigned_agent": "ui_agent",
          ...
        }
      ]
    },
    {
      "group_id": "quality_assurance",
      "parallel": true,
      "tasks": [
        {
          "task_id": "task_10",
          "title": "Write Unit Tests",
          "assigned_agent": "testing_agent",
          ...
        },
        {
          "task_id": "task_11",
          "title": "Security Audit",
          "assigned_agent": "security_agent",
          ...
        },
        {
          "task_id": "task_12",
          "title": "Generate Documentation",
          "assigned_agent": "documentation_agent",
          ...
        }
      ]
    }
  ],
  "agent_allocations": {
    "code_agent": ["task_1", "task_2", ...],
    "ui_agent": ["task_3", ...],
    "testing_agent": ["task_10", ...],
    "security_agent": ["task_11", ...],
    "documentation_agent": ["task_12", ...]
  },
  "execution_order": [
    {
      "stage": 1,
      "tasks": ["task_1"],
      "note": "Setup phase - sequential"
    },
    {
      "stage": 2,
      "tasks": ["task_2", "task_3", "task_4"],
      "note": "Implementation phase - parallel"
    },
    {
      "stage": 3,
      "tasks": ["task_10", "task_11", "task_12"],
      "note": "QA phase - parallel"
    }
  ]
}
```

### Step 4: Update Hybrid Planner to Call Gemini's JSON Organizer
**File:** `orchestrator/hybrid_planner.py`
**Location:** After Gemini review (line 590+)

**Add:**
```python
# After Gemini's review, have it organize everything into structured JSON
if self.gemini and gemini_result.success:
    structured_json = await self.gemini.organize_final_tasks(
        all_enrichments=enrichments,
        task_title=task_title,
        task_description=task_description
    )

    # Store this in enriched_plan
    enriched_plan.structured_tasks = structured_json
```

### Step 5: Create Playwright Test
**File:** `web-ui/tests/ai-planning-workflow-test.spec.ts`

**Test Coverage:**
1. Submit minimal task
2. Wait for all 5 AI nodes to appear
3. Click Claude - verify creative analysis
4. Click ChatGPT - verify detailed plan with parallelization
5. Click DeepSeek - verify technical review
6. Click Grok - verify creative suggestions
7. Click Gemini - verify structured JSON output
8. Verify JSON contains:
   - All required agent types (documentation, testing, security)
   - Parallelization markers
   - Complete task breakdown
   - No truncation

---

## Implementation Order

1. ✅ Update Claude prompt (hybrid_planner.py)
2. ✅ Update ChatGPT prompt (chatgpt_planner.py)
3. ✅ Add Gemini organize_final_tasks() method
4. ✅ Integrate into hybrid_planner
5. ⏳ Create Playwright test
6. ⏳ Run test and verify

## Implementation Complete

### What Was Built

**Files Modified:**
1. `orchestrator/gemini_agent.py` - Added complete task organization system
2. `orchestrator/hybrid_planner.py` - Integrated JSON output after Gemini review
3. Task persistence already completed in previous session

**New Capabilities:**
- Gemini now creates structured JSON with parallelization markers
- All agent types required (documentation, testing, security, code_quality)
- NO truncation or summarization - preserves ALL AI contributions
- Task groups with execution order
- Agent allocations by type

### Current System Behavior

The hybrid planner runs **ONE PASS** through 5 AIs:
1. Claude - Creative analysis
2. ChatGPT - Detailed plan
3. DeepSeek - Technical review
4. Grok - Competitive/creative review
5. Gemini - Final review + JSON organization

No looping logic found in the codebase. System processes task once.

---

## Testing Criteria

### Manual Test
Submit: "Create a todo app"

**Expected Output:**

**Claude:** Thorough analysis mentioning parallelization, testing, docs, security

**ChatGPT:** Detailed plan with:
- Tasks grouped by parallelization
- Documentation agent task
- Testing agent task
- Security agent task
- Clear dependencies

**Gemini:** Structured JSON with:
- ALL tasks from ChatGPT (no truncation)
- Parallel groups identified
- documentation_agent, testing_agent, security_agent present
- Execution order specified

### Playwright Test
- Automated verification of above
- Screenshots at each AI node
- JSON validation
- Agent type verification
