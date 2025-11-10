# SAFE Refactoring Execution Plan

**CRITICAL RULES:**
- ✅ Keep old file as `hybrid_orchestrator_v4_iterative_LEGACY.py`
- ✅ Test each extracted stage independently
- ✅ Don't delete ANYTHING until new version works
- ✅ Add iterative cycles for code-test-debug and design
- ✅ Git commit after each successful stage

---

## Iterative/Cyclic Patterns to Implement

### 1. Code-Test-Debug Cycle (Stage 3)
```
Execute Code
    ↓
Run Tests
    ↓
Tests Pass? → YES → Continue
    ↓ NO
Debug & Fix
    ↓
Execute Code (retry)
    ↓
Run Tests (retry)
    ↓
(Max 3 cycles)
```

### 2. Design Iteration Cycle (Stage 0)
```
Initial Design (Claude)
    ↓
ChatGPT Review
    ↓
DeepSeek Enrich
    ↓
Grok Critique
    ↓
Refinement Needed? → YES → Iterate
    ↓ NO
Gemini Final Approval
```

### 3. Review-Fix Cycle (Stage 3.5)
```
Code Review (AR)
    ↓
Issues Found? → YES → Fix → Review Again
    ↓ NO
Approved
```

---

## Step-by-Step Safe Execution

### Step 1: Create Directory Structure (NO RISK)

```bash
mkdir -p orchestrator/v4/stages
mkdir -p orchestrator/v4/utils
touch orchestrator/v4/__init__.py
touch orchestrator/v4/stages/__init__.py
touch orchestrator/v4/utils/__init__.py
```

**Test:** Verify directories created ✅

---

### Step 2: Copy Original File as Backup (SAFETY)

```bash
cp orchestrator/hybrid_orchestrator_v4_iterative.py \
   orchestrator/hybrid_orchestrator_v4_iterative_LEGACY.py
```

**Test:** Verify backup exists ✅
**Git:** `git add orchestrator/hybrid_orchestrator_v4_iterative_LEGACY.py && git commit -m "backup: Save v4 orchestrator before refactoring"`

---

### Step 3: Extract Types (NO RISK - Just copying)

Create `orchestrator/v4/types.py` by copying dataclasses from original:
- InformationRequest
- InformationResponse
- DialogueStage
- IterativeExecutionResult

**Test:** `python3 -c "from orchestrator.v4.types import DialogueStage; print('✅ Types import works')"`

**Git:** `git add orchestrator/v4/types.py && git commit -m "refactor: Extract types to v4/types.py"`

---

### Step 4: Create Base Stage Interface (NEW CODE)

Create `orchestrator/v4/stages/base_stage.py`

**Test:** `python3 -c "from orchestrator.v4.stages.base_stage import BaseStage; print('✅ BaseStage import works')"`

**Git:** `git add orchestrator/v4/stages/base_stage.py && git commit -m "refactor: Add base stage interface"`

---

### Step 5: Extract Stage 1 - Claude Analysis (CAREFUL)

**Strategy:** Copy stage 1 logic (lines 190-238) into new file

Create `orchestrator/v4/stages/stage_1_claude_analysis.py`

**Test:**
```python
# Test script: test_stage_1.py
from orchestrator.v4.stages.stage_1_claude_analysis import Stage1ClaudeAnalysis
# Run stage in isolation
```

**Git:** `git add orchestrator/v4/stages/stage_1_claude_analysis.py && git commit -m "refactor: Extract Stage 1 Claude Analysis"`

---

### Step 6: Extract Stage 3 - Iterative Execution WITH Cycles (CRITICAL)

**Strategy:** Copy stage 3 logic (lines 299-432) + ADD code-test-debug cycle

Create `orchestrator/v4/stages/stage_3_iterative_execution.py`

**NEW: Add Code-Test-Debug Cycle:**

```python
class Stage3IterativeExecution(BaseStage):
    async def _execute_with_test_cycle(self, code_task, max_cycles=3):
        """Execute code with automatic test-debug cycle"""
        for cycle in range(max_cycles):
            self._log(f"Code-Test-Debug Cycle {cycle + 1}/{max_cycles}")

            # Execute code
            result = await self.claude_cli.execute_task(code_task)

            # Run tests if available
            test_result = await self._run_tests()

            if test_result.passed:
                self._log("✅ Tests passed!")
                return result
            else:
                self._log(f"❌ Tests failed: {test_result.failures}")
                if cycle < max_cycles - 1:
                    # Add debug feedback for next iteration
                    code_task += f"\n\nDEBUG: Previous attempt failed tests:\n{test_result.failures}"
                    self._log("Retrying with debug info...")
                else:
                    self._log("⚠️ Max test cycles reached")
                    return result

        return result
```

**Test:** Run stage with sample task that has tests

**Git:** `git add orchestrator/v4/stages/stage_3_iterative_execution.py && git commit -m "refactor: Extract Stage 3 with code-test-debug cycle"`

---

### Step 7: Extract Stage 3.5 - Code Review WITH Fix Cycle (CAREFUL)

Create `orchestrator/v4/stages/stage_3_5_code_review.py`

**NEW: Add Review-Fix Cycle:**

```python
class Stage3_5CodeReview(BaseStage):
    async def _review_with_fix_cycle(self, code, max_cycles=2):
        """Review code with automatic fix cycle"""
        for cycle in range(max_cycles):
            self._log(f"Review-Fix Cycle {cycle + 1}/{max_cycles}")

            # AR reviews code
            review = await self.claude_cli.review_code(code)

            if review.issues_found == 0:
                self._log("✅ Code review passed!")
                return review
            else:
                self._log(f"⚠️ Found {review.issues_found} issues")
                if cycle < max_cycles - 1:
                    # Fix issues
                    self._log("Applying fixes...")
                    code = await self.claude_cli.fix_issues(code, review.issues)
                else:
                    self._log("⚠️ Max review cycles reached, some issues remain")
                    return review

        return review
```

**Test:** Run review stage with code that has issues

**Git:** `git add orchestrator/v4/stages/stage_3_5_code_review.py && git commit -m "refactor: Extract Stage 3.5 with review-fix cycle"`

---

### Step 8: Extract Stage 4 - Final Summary (SIMPLE)

Create `orchestrator/v4/stages/stage_4_final_summary.py`

**Test:** Run summary stage

**Git:** `git add orchestrator/v4/stages/stage_4_final_summary.py && git commit -m "refactor: Extract Stage 4 Final Summary"`

---

### Step 9: Create Stage 0 - Multi-AI Planning WITH Design Iteration (NEW)

Create `orchestrator/v4/stages/stage_0_multi_ai_planning.py`

**NEW: Add Design Iteration Cycle:**

```python
class Stage0MultiAIPlanning(BaseStage):
    async def _run_with_design_iteration(self, user_goal, context, max_iterations=2):
        """Run multi-AI planning with design refinement iteration"""

        enriched_plan = None

        for iteration in range(max_iterations):
            self._log(f"Design Iteration {iteration + 1}/{max_iterations}")

            # Run multi-AI enrichment
            enriched_plan = await self.hybrid_planner.enrich_plan(
                task_title=f"Task: {user_goal[:100]}",
                task_description=user_goal,
                claude_plan=f"# Goal\n{user_goal}",
                context=context
            )

            # Check if refinement needed (low confidence or high risks)
            needs_refinement = (
                enriched_plan.final_confidence_score < 7.0 or
                len(enriched_plan.risks_identified) > 5
            )

            if not needs_refinement or iteration == max_iterations - 1:
                self._log(f"✅ Design approved (confidence: {enriched_plan.final_confidence_score}/10)")
                break
            else:
                self._log(f"⚠️ Design needs refinement (confidence: {enriched_plan.final_confidence_score}/10)")
                # Add refinement context for next iteration
                context["refinement_feedback"] = enriched_plan.risks_identified

        return enriched_plan
```

**Test:** Run Stage 0 with test goal

**Git:** `git add orchestrator/v4/stages/stage_0_multi_ai_planning.py && git commit -m "refactor: Add Stage 0 with design iteration cycle"`

---

### Step 10: Create Main Orchestrator (COORDINATOR ONLY)

Create `orchestrator/v4/orchestrator.py` - thin coordinator that calls stages

**IMPORTANT:** This is just a coordinator, doesn't do heavy lifting

**Test:**
```python
from orchestrator.v4.orchestrator import HybridOrchestratorV4
# Initialize and verify
```

**Git:** `git add orchestrator/v4/orchestrator.py && git commit -m "refactor: Add main orchestrator coordinator"`

---

### Step 11: Update v4/__init__.py (EXPORTS)

```python
"""
Hybrid Orchestrator V4 - Modular Architecture

Usage:
    from orchestrator.v4 import HybridOrchestratorV4
"""

from orchestrator.v4.orchestrator import HybridOrchestratorV4
from orchestrator.v4.types import (
    DialogueStage,
    IterativeExecutionResult,
    InformationRequest,
    InformationResponse
)

__all__ = [
    'HybridOrchestratorV4',
    'DialogueStage',
    'IterativeExecutionResult',
    'InformationRequest',
    'InformationResponse'
]
```

**Test:** `python3 -c "from orchestrator.v4 import HybridOrchestratorV4; print('✅ V4 package imports work')"`

**Git:** `git add orchestrator/v4/__init__.py && git commit -m "refactor: Add v4 package exports"`

---

### Step 12: Update run_hybrid_task_v4.py (ENTRY POINT)

**CAREFUL:** Change imports but keep same CLI interface

```python
# OLD:
# from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4

# NEW:
from orchestrator.v4 import HybridOrchestratorV4
```

**Test:** Run actual task: `python3 orchestrator/run_hybrid_task_v4.py --task-id test-001 --goal "Create a simple hello world script"`

**Git:** `git add orchestrator/run_hybrid_task_v4.py && git commit -m "refactor: Update CLI to use modular v4"`

---

### Step 13: Create Compatibility Shim (BACKWARD COMPAT)

Replace content of `orchestrator/hybrid_orchestrator_v4_iterative.py`:

```python
"""
DEPRECATED: Use orchestrator.v4 instead

This file is kept for backward compatibility.
New code should import from orchestrator.v4
"""

import warnings
from orchestrator.v4 import HybridOrchestratorV4

warnings.warn(
    "hybrid_orchestrator_v4_iterative is deprecated. "
    "Use 'from orchestrator.v4 import HybridOrchestratorV4' instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ['HybridOrchestratorV4']
```

**Test:** Import from old location still works: `from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4`

**Git:** `git add orchestrator/hybrid_orchestrator_v4_iterative.py && git commit -m "refactor: Add compatibility shim for v4 orchestrator"`

---

## TESTING CHECKLIST (Before Frontend Work)

### Unit Tests (Each Stage)
- [ ] Stage 0: Multi-AI Planning runs successfully
- [ ] Stage 0: Design iteration cycle works (refinement when confidence < 7)
- [ ] Stage 1: Claude Analysis extracts requirements
- [ ] Stage 3: Code execution works
- [ ] Stage 3: Code-test-debug cycle works (retries on test failure)
- [ ] Stage 3.5: Code review identifies issues
- [ ] Stage 3.5: Review-fix cycle works (fixes and re-reviews)
- [ ] Stage 4: Final summary generates

### Integration Tests (Full Pipeline)
- [ ] Import from `orchestrator.v4` works
- [ ] Import from old location (with deprecation warning) works
- [ ] CLI runs full task end-to-end
- [ ] Events are published correctly
- [ ] Agent activity callbacks work
- [ ] Output files created in correct directory

### Regression Tests (Don't Break Existing)
- [ ] Web UI can still connect
- [ ] Redis events publish correctly
- [ ] Agent spawning shows in UI
- [ ] Terminal panel shows logs

---

## SAFETY CHECKLIST

Before proceeding to frontend:
- [ ] ✅ Old file backed up as `_LEGACY.py`
- [ ] ✅ All stages extracted and tested independently
- [ ] ✅ Full pipeline runs successfully
- [ ] ✅ No functionality lost (100% feature parity)
- [ ] ✅ Git commits after each stage
- [ ] ✅ Iterative cycles implemented and tested
- [ ] ✅ Can rollback to LEGACY if needed

---

## What NOT to Delete

**KEEP THESE FILES:**
- ✅ `orchestrator/chatgpt_planner.py` (used by Stage 0)
- ✅ `orchestrator/claude_cli_executor.py` (used by Stage 3, 3.5, 4)
- ✅ `orchestrator/hybrid_planner.py` (used by Stage 0)
- ✅ `orchestrator/multi_ai_research.py` (used by HybridPlanner)
- ✅ `orchestrator/deepseek_agent.py` (used by HybridPlanner)
- ✅ `orchestrator/grok_agent.py` (used by HybridPlanner)
- ✅ `orchestrator/gemini_agent.py` (used by HybridPlanner)
- ✅ `orchestrator/redis_publisher.py` (used for events)
- ✅ `orchestrator/best_practices.py` (used by HybridPlanner)
- ✅ `orchestrator/agent_registry.py` (might be used)
- ✅ `orchestrator/agent_sdk_manager.py` (might be used)
- ✅ `orchestrator/run_hybrid_task_v4.py` (CLI entry point)

**KEEP ALL `web-ui/` FILES** - Frontend untouched in refactoring

---

## Rollback Plan (If Something Breaks)

```bash
# Restore original file
cp orchestrator/hybrid_orchestrator_v4_iterative_LEGACY.py \
   orchestrator/hybrid_orchestrator_v4_iterative.py

# Revert run_hybrid_task_v4.py
git checkout HEAD -- orchestrator/run_hybrid_task_v4.py

# Test original still works
python3 orchestrator/run_hybrid_task_v4.py --task-id test --goal "test"
```

---

## Timeline

**Refactoring with Iterative Cycles:**
- Step 1-2: Directory setup & backup (10 min)
- Step 3-4: Types & base interface (20 min)
- Step 5: Stage 1 extraction (20 min)
- Step 6: Stage 3 with code-test-debug cycle (30 min) ⭐
- Step 7: Stage 3.5 with review-fix cycle (25 min) ⭐
- Step 8: Stage 4 extraction (15 min)
- Step 9: Stage 0 with design iteration (30 min) ⭐
- Step 10-13: Main orchestrator & integration (30 min)
- Testing: (30 min)

**Total: ~3.5 hours**

---

**Ready to start? I'll be EXTREMELY CAREFUL and test after every step.**
