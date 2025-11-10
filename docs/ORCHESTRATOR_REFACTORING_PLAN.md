# Orchestrator Refactoring Plan

**Purpose:** Break monolithic `hybrid_orchestrator_v4_iterative.py` (1243 lines) into clean, organized modules

---

## Current State

**File:** `orchestrator/hybrid_orchestrator_v4_iterative.py` (1243 lines)

**Problems:**
- Single 1243-line file - hard to navigate
- All stages mixed together
- Difficult to test individual stages
- Hard to add new stages (like Stage 0 multi-AI planning)
- Poor separation of concerns

---

## Proposed Structure

```
orchestrator/
├── v4/                                 # V4 orchestrator package
│   ├── __init__.py                    # Export main orchestrator class
│   ├── orchestrator.py                # Main coordinator (~150 lines)
│   ├── types.py                       # DataClasses & Types (~100 lines)
│   ├── dialogue.py                    # Dialogue management (~100 lines)
│   │
│   ├── stages/                        # Individual stage modules
│   │   ├── __init__.py
│   │   ├── base_stage.py             # Base stage interface
│   │   ├── stage_0_multi_ai_planning.py    # NEW: Multi-AI planning layer
│   │   ├── stage_1_claude_analysis.py      # Claude initial analysis
│   │   ├── stage_2_chatgpt_planning.py     # ChatGPT execution plan (backup)
│   │   ├── stage_3_iterative_execution.py  # Iterative execution loop
│   │   ├── stage_3_5_code_review.py        # AR code review
│   │   └── stage_4_final_summary.py        # RD final summary
│   │
│   └── utils/                         # Utility functions
│       ├── __init__.py
│       ├── progress.py               # Progress callbacks
│       └── context.py                # Context management
│
├── hybrid_orchestrator_v4_iterative.py    # LEGACY (keep for compatibility)
└── run_hybrid_task_v4.py             # CLI entry point (update imports)
```

---

## Module Breakdown

### 1. `orchestrator/v4/types.py`
**Purpose:** All dataclasses and type definitions

**Contents:**
```python
"""Type definitions for Hybrid Orchestrator V4"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

@dataclass
class InformationRequest:
    """Request for information from Claude to ChatGPT"""
    request_id: str
    requested_by: str
    request_type: str
    query: str
    details: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@dataclass
class InformationResponse:
    """Response from ChatGPT to Claude's request"""
    request_id: str
    response_type: str
    content: str
    sources: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@dataclass
class DialogueStage:
    """Represents one stage in the iterative dialogue"""
    stage_id: str
    stage_type: str
    claude_action: str
    chatgpt_response: Optional[str] = None
    status: str = "pending"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class IterativeExecutionResult:
    """Result of iterative dialogue execution"""
    goal: str
    status: str
    stages: List[DialogueStage]
    total_dialogue_turns: int
    total_time: float
    final_summary: str
    artifacts: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
```

---

### 2. `orchestrator/v4/stages/base_stage.py`
**Purpose:** Base interface for all stages

**Contents:**
```python
"""Base stage interface for orchestrator stages"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult

class BaseStage(ABC):
    """Base class for orchestrator stages"""

    def __init__(
        self,
        stage_id: str,
        stage_type: str,
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None
    ):
        self.stage_id = stage_id
        self.stage_type = stage_type
        self.verbose = verbose
        self.agent_activity_callback = agent_activity_callback

    @abstractmethod
    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult
    ) -> DialogueStage:
        """Execute this stage and return stage result"""
        pass

    def _log(self, message: str):
        """Log message if verbose enabled"""
        if self.verbose:
            print(f"[{self.stage_id}] {message}")
```

---

### 3. `orchestrator/v4/stages/stage_0_multi_ai_planning.py`
**Purpose:** Multi-AI planning layer (NEW)

**Contents:**
```python
"""Stage 0: Multi-AI Planning Layer"""
import os
from datetime import datetime, timezone
from typing import Dict, Any
from orchestrator.v4.stages.base_stage import BaseStage
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult
from orchestrator.hybrid_planner import HybridPlanner, EnrichedPlan

class Stage0MultiAIPlanning(BaseStage):
    """
    Stage 0: Multi-AI Planning Layer

    Runs sequential AI enrichment pipeline:
    Claude → ChatGPT → DeepSeek → Grok → Gemini
    """

    def __init__(
        self,
        openai_api_key: str,
        gpt_model: str = "gpt-4o",
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None
    ):
        super().__init__(
            stage_id="stage-0-multi-ai-planning",
            stage_type="planning",
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )

        self.hybrid_planner = HybridPlanner(
            openai_api_key=openai_api_key,
            deepseek_api_key=os.getenv("DEEPSEEK_API_KEY"),
            grok_api_key=os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY"),
            gemini_api_key=os.getenv("GEMINI_API_KEY"),
            chatgpt_model=gpt_model,
            enable_best_practices=True,
            verbose=verbose
        )

    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult
    ) -> DialogueStage:
        """Execute multi-AI planning pipeline"""

        self._log("=" * 80)
        self._log("STAGE 0: Multi-AI Planning Layer")
        self._log("Sequential: Claude → ChatGPT → DeepSeek → Grok → Gemini")
        self._log("=" * 80)

        stage = DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Multi-AI collaborative planning",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        stage.status = "in_progress"

        # Run multi-AI enrichment pipeline
        enriched_plan = await self.hybrid_planner.enrich_plan(
            task_title=f"Task: {user_goal[:100]}",
            task_description=user_goal,
            claude_plan=f"# Initial Goal Analysis\n\n{user_goal}",
            context=context
        )

        stage.metadata["enriched_plan"] = {
            "plan_id": enriched_plan.plan_id,
            "ai_contributors": len(enriched_plan.enrichments),
            "confidence_score": enriched_plan.final_confidence_score,
            "risks_count": len(enriched_plan.risks_identified),
            "execution_plan": enriched_plan.execution_plan
        }

        stage.status = "completed"
        stage.end_time = datetime.now(timezone.utc).isoformat()

        self._log(f"✓ Multi-AI Planning Complete")
        self._log(f"  Contributors: {len(enriched_plan.enrichments)}")
        self._log(f"  Confidence: {enriched_plan.final_confidence_score}/10")

        return stage
```

---

### 4. `orchestrator/v4/orchestrator.py`
**Purpose:** Main coordinator (thin orchestration layer)

**Contents:**
```python
"""
Hybrid Orchestrator V4 - Main Coordinator

Thin orchestration layer that coordinates individual stages.
Each stage is a separate module for clean separation of concerns.
"""
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from orchestrator.v4.types import IterativeExecutionResult
from orchestrator.v4.stages.stage_0_multi_ai_planning import Stage0MultiAIPlanning
from orchestrator.v4.stages.stage_1_claude_analysis import Stage1ClaudeAnalysis
from orchestrator.v4.stages.stage_3_iterative_execution import Stage3IterativeExecution
from orchestrator.v4.stages.stage_3_5_code_review import Stage3_5CodeReview
from orchestrator.v4.stages.stage_4_final_summary import Stage4FinalSummary
from orchestrator.chatgpt_planner import ChatGPTPlanner
from orchestrator.claude_cli_executor import ClaudeCLIExecutor

class HybridOrchestratorV4:
    """
    Modular V4 orchestrator with clean stage separation.

    Architecture:
        Stage 0: Multi-AI Planning (Claude→ChatGPT→DeepSeek→Grok→Gemini)
        Stage 1: Claude Analysis (if needed)
        Stage 3: Iterative Execution (IM agent)
        Stage 3.5: Code Review (AR agent)
        Stage 4: Final Summary (RD agent)
    """

    def __init__(
        self,
        project_root: Path,
        openai_api_key: Optional[str] = None,
        gpt_model: str = "gpt-4o"
    ):
        self.project_root = project_root
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY required")

        # Initialize project context
        self._init_project_context()

        # Initialize core components
        self.chatgpt = ChatGPTPlanner(openai_api_key=self.openai_key, model=gpt_model)
        self.claude_cli = ClaudeCLIExecutor(project_root, working_directory=self.project_output_dir)

        # Initialize stages (lazy loading, only when needed)
        self.stages = {
            "stage_0": None,  # Multi-AI planning
            "stage_1": None,  # Claude analysis
            "stage_3": None,  # Iterative execution
            "stage_3.5": None,  # Code review
            "stage_4": None,  # Final summary
        }

    def _init_project_context(self):
        """Initialize project directories and context"""
        current_project_file = self.project_root / "current-project.txt"
        try:
            if current_project_file.exists():
                current_project_name = current_project_file.read_text().strip()
            else:
                current_project_name = "default"
        except Exception as e:
            print(f"Warning: Could not read current project: {e}")
            current_project_name = "default"

        self.project_name = current_project_name
        self.project_output_dir = self.project_root / "projects" / current_project_name / "outputs"
        self.project_output_dir.mkdir(parents=True, exist_ok=True)

    async def execute_goal_iterative(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None,
        max_dialogue_turns: int = 20,
        verbose: bool = True,
        progress_callback: Optional[callable] = None,
        agent_activity_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """Execute goal using modular stage architecture"""

        start_time = datetime.now(timezone.utc)

        execution_result = IterativeExecutionResult(
            goal=user_goal,
            status="running",
            stages=[],
            total_dialogue_turns=0,
            total_time=0.0,
            final_summary=""
        )

        # Stage 0: Multi-AI Planning Layer
        stage_0 = Stage0MultiAIPlanning(
            openai_api_key=self.openai_key,
            gpt_model="gpt-4o",
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        stage_0_result = await stage_0.execute(user_goal, context or {}, execution_result)
        execution_result.stages.append(stage_0_result)

        # Extract execution plan from Stage 0
        enriched_plan = stage_0_result.metadata["enriched_plan"]["execution_plan"]

        # Stage 3: Iterative Execution
        stage_3 = Stage3IterativeExecution(
            claude_cli=self.claude_cli,
            chatgpt=self.chatgpt,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        stage_3_result = await stage_3.execute(
            user_goal=user_goal,
            execution_plan=enriched_plan,
            context=context or {},
            execution_result=execution_result,
            max_turns=max_dialogue_turns
        )
        execution_result.stages.append(stage_3_result)

        # Stage 3.5: Code Review (AR agent)
        stage_3_5 = Stage3_5CodeReview(
            claude_cli=self.claude_cli,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        stage_3_5_result = await stage_3_5.execute(user_goal, context or {}, execution_result)
        execution_result.stages.append(stage_3_5_result)

        # Stage 4: Final Summary (RD agent)
        stage_4 = Stage4FinalSummary(
            claude_cli=self.claude_cli,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        stage_4_result = await stage_4.execute(user_goal, context or {}, execution_result)
        execution_result.stages.append(stage_4_result)

        # Finalize
        execution_result.status = "completed"
        execution_result.total_time = (datetime.now(timezone.utc) - start_time).total_seconds()
        execution_result.final_summary = stage_4_result.metadata.get("summary", "")

        return {
            "status": "success",
            "result": execution_result,
            "dialogue_history": []
        }
```

---

## Migration Strategy

### Option A: Refactor First, Then Add Multi-AI (RECOMMENDED)
**Steps:**
1. Create new modular structure
2. Extract existing stages into separate files
3. Test that existing functionality works
4. Add Stage 0 multi-AI planning to clean structure
5. Update tests

**Timeline:** 2-3 hours
**Risk:** Low (existing code still available as fallback)

### Option B: Add Multi-AI First, Then Refactor
**Steps:**
1. Add Stage 0 to monolithic file
2. Test multi-AI integration
3. Refactor everything together

**Timeline:** 4-5 hours (larger refactor later)
**Risk:** Medium (refactoring larger codebase)

### Option C: Parallel Refactoring
**Steps:**
1. Create modular structure alongside existing
2. Gradually migrate stages
3. Add Stage 0 as first new-structure stage
4. Continue migrating other stages

**Timeline:** 3-4 hours
**Risk:** Low (incremental migration)

---

## Benefits of Refactoring

✅ **Easier to Navigate**
- Each stage is ~100-200 lines
- Clear file names indicate purpose

✅ **Easier to Test**
- Test individual stages in isolation
- Mock stage dependencies easily

✅ **Easier to Extend**
- Add new stages without touching existing code
- Each stage has clear interface

✅ **Better Separation of Concerns**
- Types in one place
- Stages independent
- Main orchestrator is just coordinator

✅ **Team Development**
- Multiple developers can work on different stages
- Less merge conflicts

---

## Implementation Checklist

### Phase 0: Preparation
- [ ] Create `orchestrator/v4/` directory structure
- [ ] Create `__init__.py` files
- [ ] Create `types.py` with all dataclasses

### Phase 1: Base Infrastructure
- [ ] Create `base_stage.py` interface
- [ ] Create `orchestrator.py` main coordinator
- [ ] Write tests for base infrastructure

### Phase 2: Extract Existing Stages
- [ ] Extract Stage 1 (Claude analysis)
- [ ] Extract Stage 3 (Iterative execution)
- [ ] Extract Stage 3.5 (Code review)
- [ ] Extract Stage 4 (Final summary)
- [ ] Test each extracted stage

### Phase 3: Add New Stage 0
- [ ] Create `stage_0_multi_ai_planning.py`
- [ ] Integrate with HybridPlanner
- [ ] Test Stage 0 in isolation
- [ ] Test full pipeline with Stage 0

### Phase 4: Migration
- [ ] Update `run_hybrid_task_v4.py` to use new structure
- [ ] Keep old file as `hybrid_orchestrator_v4_iterative_legacy.py`
- [ ] Update documentation
- [ ] Update tests

---

## Backward Compatibility

Keep the old monolithic file as:
```
orchestrator/hybrid_orchestrator_v4_iterative_legacy.py
```

Add compatibility shim in current location:
```python
# orchestrator/hybrid_orchestrator_v4_iterative.py
"""
Compatibility shim for new modular orchestrator.
Import from v4 package for new code.
"""
from orchestrator.v4 import HybridOrchestratorV4
__all__ = ['HybridOrchestratorV4']
```

---

## Recommended Approach

**I recommend Option A: Refactor First**

**Reasons:**
1. Cleaner integration of multi-AI planning
2. Each stage properly isolated
3. Easier testing
4. Better foundation for future features
5. Only adds ~1-2 hours to timeline

**Timeline with Refactoring:**
- Phase 0-2 (Refactoring): 2 hours
- Phase 3 (Multi-AI integration): 1 hour
- Phase 4 (Frontend): 1 hour
- Phase 5 (Testing): 1 hour
- **Total: ~5 hours** (vs 3 hours without refactoring, but much better code quality)

---

**Next Steps:**

1. Confirm approach (A, B, or C)
2. Start refactoring if Option A
3. Continue with existing plan if Option B

What's your preference?
