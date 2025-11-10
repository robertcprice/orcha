#!/usr/bin/env python3
"""
Hybrid Orchestrator V5 - Complete Multi-AI Workflow

Implements the full workflow:
1. Claude plans in plan mode (initial comprehensive plan)
2. Multi-AI Hybrid Enrichment Pipeline:
   - Claude plan → ChatGPT → DeepSeek → Grok → Gemini
3. Agent Dispatcher routes tasks:
   - Codex: Heavy code lifting (cost-efficient)
   - Claude: Review, testing, refinement
   - Gemini: Final documentation
4. Script-based execution (no context-heavy subagents)
5. Iterative refinement loop
6. Final documentation and review

This is a complete refactor matching the specified architecture.
"""

import asyncio
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import all components
from orchestrator.hybrid_planner import HybridPlanner, EnrichedPlan
from orchestrator.agent_dispatcher import AgentDispatcher, AgentResult, TaskRoute, AgentType
from orchestrator.script_executor import ScriptExecutor, ScriptTask, ScriptResult, ExecutionMode
from orchestrator.claude_code_agent import ClaudeCodeAgent, ReviewRequest, ReviewResult
from orchestrator.gemini_agent import GeminiAgent, DocumentationRequest, ReviewRequest as GeminiReviewRequest

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


# ==================== Data Models ====================

class WorkflowPhase(Enum):
    """Phases of the V5 workflow"""
    PLANNING = "planning"  # Claude planning + multi-AI enrichment
    EXECUTION = "execution"  # Codex implementation
    REVIEW = "review"  # Claude review and testing
    REFINEMENT = "refinement"  # Iterative improvements
    DOCUMENTATION = "documentation"  # Gemini documentation
    FINALIZATION = "finalization"  # Final review and completion


@dataclass
class WorkflowState:
    """Tracks the current state of workflow execution"""
    session_id: str
    current_phase: WorkflowPhase
    phases_completed: List[WorkflowPhase] = field(default_factory=list)
    current_iteration: int = 0
    max_iterations: int = 3
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ImplementationResult:
    """Result from the implementation phase"""
    success: bool
    files_created: List[str] = field(default_factory=list)
    files_modified: List[str] = field(default_factory=list)
    tests_created: List[str] = field(default_factory=list)
    agent_results: List[AgentResult] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class ReviewOutcome:
    """Result from the review phase"""
    approved: bool
    quality_score: float
    feedback: str
    issues_found: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    tests_passed: bool = True


@dataclass
class FinalOutput:
    """Final output from the V5 orchestrator"""
    session_id: str
    success: bool
    enriched_plan: EnrichedPlan
    implementation: ImplementationResult
    review: ReviewOutcome
    documentation: Optional[str] = None
    total_iterations: int = 0
    total_execution_time: float = 0.0
    cost_breakdown: Dict[str, float] = field(default_factory=dict)
    workflow_log: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==================== Main Orchestrator ====================

class HybridOrchestratorV5:
    """
    V5 Orchestrator implementing the complete multi-AI workflow.

    Architecture:
    - Claude plans first (plan mode)
    - Hybrid planner enriches with multi-AI pipeline
    - Agent dispatcher routes to cost-efficient agents
    - Script executor runs agents without context overhead
    - Iterative refinement with Claude review
    - Gemini final documentation

    This is the main entry point for V5 workflow execution.
    """

    def __init__(
        self,
        project_root: Path = PROJECT_ROOT,
        openai_api_key: Optional[str] = None,
        deepseek_api_key: Optional[str] = None,
        grok_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        enable_cost_tracking: bool = True,
        max_iterations: int = 3,
        verbose: bool = True,
        agent_activity_callback: Optional[Callable] = None
    ):
        """
        Initialize Hybrid Orchestrator V5.

        Args:
            project_root: Project root directory
            openai_api_key: OpenAI API key for ChatGPT
            deepseek_api_key: DeepSeek API key
            grok_api_key: Grok/xAI API key
            gemini_api_key: Google Gemini API key
            enable_cost_tracking: Track costs per agent
            max_iterations: Maximum refinement iterations
            verbose: Enable verbose logging
            agent_activity_callback: Callback for agent activity updates
        """
        self.project_root = project_root
        self.max_iterations = max_iterations
        self.verbose = verbose
        self.agent_activity_callback = agent_activity_callback or self._default_agent_callback

        # Initialize components
        self.hybrid_planner = HybridPlanner(
            openai_api_key=openai_api_key,
            deepseek_api_key=deepseek_api_key,
            grok_api_key=grok_api_key,
            gemini_api_key=gemini_api_key,
            verbose=verbose
        )

        self.agent_dispatcher = AgentDispatcher(
            project_root=project_root,
            enable_cost_tracking=enable_cost_tracking,
            verbose=verbose
        )

        self.script_executor = ScriptExecutor(
            project_root=project_root,
            verbose=verbose
        )

        self._log("=" * 70)
        self._log("Hybrid Orchestrator V5 Initialized")
        self._log("=" * 70)

    def _log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            print(f"[OrchestratorV5] {message}")

    async def _default_agent_callback(self, agent_id: str, activity: str, message: str):
        """Default agent activity callback."""
        self._log(f"[{agent_id}] {activity}: {message}")

    async def execute_goal(
        self,
        user_goal: str,
        claude_plan: str,
        context: Optional[Dict[str, Any]] = None
    ) -> FinalOutput:
        """
        Execute a user goal through the complete V5 workflow.

        Args:
            user_goal: High-level user goal/task description
            claude_plan: Claude's initial plan from plan mode
            context: Additional context information

        Returns:
            FinalOutput with complete results
        """
        session_id = f"v5-session-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        start_time = datetime.now()

        self._log("\n" + "=" * 70)
        self._log(f"V5 WORKFLOW STARTED - Session: {session_id}")
        self._log(f"Goal: {user_goal[:100]}...")
        self._log("=" * 70)

        await publish_event({
            "type": "v5_workflow_started",
            "session_id": session_id,
            "goal": user_goal
        })

        # Initialize workflow state
        state = WorkflowState(
            session_id=session_id,
            current_phase=WorkflowPhase.PLANNING,
            max_iterations=self.max_iterations
        )

        workflow_log = []

        try:
            # ===== PHASE 1: PLANNING =====
            self._log("\n" + "=" * 70)
            self._log("PHASE 1: MULTI-AI PLANNING & ENRICHMENT")
            self._log("=" * 70)

            await self.agent_activity_callback("PP", "spawn", "Starting multi-AI planning pipeline")

            enriched_plan = await self.hybrid_planner.enrich_plan(
                task_title=user_goal,
                task_description=user_goal,
                claude_plan=claude_plan,
                context=context
            )

            state.phases_completed.append(WorkflowPhase.PLANNING)
            workflow_log.append(f"Planning completed with {len(enriched_plan.enrichments)} AI contributions")

            await self.agent_activity_callback("PP", "complete", "Planning pipeline finished")

            # ===== PHASE 2: EXECUTION =====
            self._log("\n" + "=" * 70)
            self._log("PHASE 2: IMPLEMENTATION WITH CODEX")
            self._log("=" * 70)

            state.current_phase = WorkflowPhase.EXECUTION

            await self.agent_activity_callback("IM", "spawn", "Starting implementation")

            implementation = await self._execute_implementation(enriched_plan)

            state.phases_completed.append(WorkflowPhase.EXECUTION)
            workflow_log.append(f"Implementation completed - Files: {len(implementation.files_created)}")

            await self.agent_activity_callback("IM", "complete", "Implementation finished")

            # ===== PHASE 3: REVIEW & REFINEMENT =====
            self._log("\n" + "=" * 70)
            self._log("PHASE 3: CLAUDE REVIEW & TESTING")
            self._log("=" * 70)

            state.current_phase = WorkflowPhase.REVIEW

            await self.agent_activity_callback("AR", "spawn", "Starting code review")

            review = await self._execute_review(implementation, enriched_plan)

            state.phases_completed.append(WorkflowPhase.REVIEW)
            workflow_log.append(f"Review completed - Approved: {review.approved}, Score: {review.quality_score}/10")

            await self.agent_activity_callback("AR", "complete", "Review finished")

            # ===== PHASE 4: ITERATIVE REFINEMENT (if needed) =====
            if not review.approved and state.current_iteration < state.max_iterations:
                self._log("\n" + "=" * 70)
                self._log("PHASE 4: ITERATIVE REFINEMENT")
                self._log("=" * 70)

                state.current_phase = WorkflowPhase.REFINEMENT

                while not review.approved and state.current_iteration < state.max_iterations:
                    state.current_iteration += 1

                    self._log(f"\nRefinement iteration {state.current_iteration}/{state.max_iterations}")

                    await self.agent_activity_callback("IM", "spawn", f"Refinement iteration {state.current_iteration}")

                    # Refine based on feedback
                    implementation = await self._refine_implementation(implementation, review)

                    await self.agent_activity_callback("AR", "spawn", "Re-reviewing changes")

                    # Re-review
                    review = await self._execute_review(implementation, enriched_plan)

                    workflow_log.append(f"Iteration {state.current_iteration}: Score {review.quality_score}/10")

                state.phases_completed.append(WorkflowPhase.REFINEMENT)

            # ===== PHASE 5: DOCUMENTATION =====
            self._log("\n" + "=" * 70)
            self._log("PHASE 5: GEMINI DOCUMENTATION")
            self._log("=" * 70)

            state.current_phase = WorkflowPhase.DOCUMENTATION

            await self.agent_activity_callback("RD", "spawn", "Generating final documentation")

            documentation = await self._generate_documentation(implementation, enriched_plan, review)

            state.phases_completed.append(WorkflowPhase.DOCUMENTATION)
            workflow_log.append("Documentation generated")

            await self.agent_activity_callback("RD", "complete", "Documentation finished")

            # ===== PHASE 6: FINALIZATION =====
            self._log("\n" + "=" * 70)
            self._log("PHASE 6: FINALIZATION")
            self._log("=" * 70)

            state.current_phase = WorkflowPhase.FINALIZATION

            # Calculate total time
            total_time = (datetime.now() - start_time).total_seconds()

            # Get cost breakdown
            cost_breakdown = self.agent_dispatcher.get_cost_summary()

            # Create final output
            final_output = FinalOutput(
                session_id=session_id,
                success=review.approved,
                enriched_plan=enriched_plan,
                implementation=implementation,
                review=review,
                documentation=documentation,
                total_iterations=state.current_iteration,
                total_execution_time=total_time,
                cost_breakdown=cost_breakdown,
                workflow_log=workflow_log
            )

            self._log("\n" + "=" * 70)
            self._log("V5 WORKFLOW COMPLETED SUCCESSFULLY")
            self._log("=" * 70)
            self._log(f"Total Time: {total_time:.2f}s")
            self._log(f"Total Iterations: {state.current_iteration}")
            self._log(f"Final Quality Score: {review.quality_score}/10")
            self._log(f"Approved: {review.approved}")
            self._log(f"Total Cost: ${cost_breakdown.get('total', 0.0):.3f}")
            self._log("=" * 70)

            await publish_event({
                "type": "v5_workflow_completed",
                "session_id": session_id,
                "success": True,
                "total_time": total_time,
                "quality_score": review.quality_score
            })

            return final_output

        except Exception as e:
            error_msg = f"V5 Workflow failed: {str(e)}"
            self._log(f"\nERROR: {error_msg}")

            state.errors.append(error_msg)

            await publish_event({
                "type": "v5_workflow_error",
                "session_id": session_id,
                "error": error_msg
            })

            # Return partial results
            return FinalOutput(
                session_id=session_id,
                success=False,
                enriched_plan=EnrichedPlan(
                    plan_id="failed",
                    original_plan=claude_plan,
                    execution_plan=None,
                    enrichments=[]
                ),
                implementation=ImplementationResult(
                    success=False,
                    error=error_msg
                ),
                review=ReviewOutcome(
                    approved=False,
                    quality_score=0.0,
                    feedback=error_msg
                ),
                workflow_log=workflow_log
            )

    async def _execute_implementation(self, enriched_plan: EnrichedPlan) -> ImplementationResult:
        """Execute implementation phase using Codex agents."""
        self._log("Starting implementation with Codex...")

        if not enriched_plan.execution_plan:
            return ImplementationResult(
                success=False,
                error="No execution plan available"
            )

        agent_results = []
        all_files_created = []
        all_files_modified = []
        all_tests_created = []

        # Route and execute each task
        for task in enriched_plan.execution_plan.tasks:
            route = self.agent_dispatcher.determine_route(task)

            # Execute task
            result = await self.agent_dispatcher.execute_task(task, route)
            agent_results.append(result)

            if result.success:
                all_files_created.extend(result.files_created)
                all_files_modified.extend(result.files_modified)
                all_tests_created.extend(result.tests_created)

        # Check if all tasks succeeded
        success = all(r.success for r in agent_results)

        return ImplementationResult(
            success=success,
            files_created=all_files_created,
            files_modified=all_files_modified,
            tests_created=all_tests_created,
            agent_results=agent_results
        )

    async def _execute_review(self, implementation: ImplementationResult, enriched_plan: EnrichedPlan) -> ReviewOutcome:
        """Execute review phase using Claude agent - FULL IMPLEMENTATION."""
        self._log("Starting review with Claude...")

        if not implementation.success:
            return ReviewOutcome(
                approved=False,
                quality_score=0.0,
                feedback="Implementation failed - cannot review",
                tests_passed=False
            )

        try:
            # Initialize Claude agent
            claude_agent = ClaudeCodeAgent(
                agent_id="claude-reviewer",
                project_root=self.project_root
            )

            # Read actual file contents for review
            code_content = ""
            for file_path in implementation.files_created[:10]:  # Review up to 10 files
                try:
                    full_path = self.project_root / file_path
                    if full_path.exists():
                        with open(full_path, 'r') as f:
                            code_content += f"\n\n=== {file_path} ===\n{f.read()}\n"
                except Exception as e:
                    self._log(f"Could not read {file_path}: {e}")

            # Run tests if they exist
            tests_passed = await self._run_tests(implementation.tests_created)

            # Create comprehensive review request
            review_request = ReviewRequest(
                task_title=enriched_plan.execution_plan.goal if enriched_plan.execution_plan else "Code Review",
                task_description=enriched_plan.original_plan,
                requirements=enriched_plan.execution_plan.tasks[0].get('acceptance_criteria', []) if enriched_plan.execution_plan and enriched_plan.execution_plan.tasks else [],
                code=code_content if code_content else f"Files: {', '.join(implementation.files_created)}",
                output=f"Implementation completed. Tests: {'PASSED' if tests_passed else 'FAILED'}",
                iteration=0
            )

            # Execute review
            review_result = await claude_agent.review(review_request)

            # Adjust approval based on test results
            final_approved = review_result.approved and tests_passed

            return ReviewOutcome(
                approved=final_approved,
                quality_score=review_result.quality_score if tests_passed else review_result.quality_score * 0.7,
                feedback=review_result.feedback,
                issues_found=review_result.issues_found,
                suggestions=review_result.suggestions,
                tests_passed=tests_passed
            )

        except Exception as e:
            self._log(f"Review failed: {e}")
            return ReviewOutcome(
                approved=False,
                quality_score=5.0,
                feedback=f"Review error: {str(e)}",
                tests_passed=False
            )

    async def _refine_implementation(self, implementation: ImplementationResult, review: ReviewOutcome) -> ImplementationResult:
        """Refine implementation based on review feedback - FULL IMPLEMENTATION."""
        self._log(f"Refining implementation based on {len(review.issues_found)} issues and {len(review.suggestions)} suggestions...")

        # Parse review feedback into actionable tasks
        refinement_tasks = []

        # Create tasks for each issue found
        for i, issue in enumerate(review.issues_found):
            task = {
                "task_id": f"refinement-issue-{i+1}",
                "agent": "CODE",
                "description": f"Fix issue: {issue}",
                "acceptance_criteria": ["Issue resolved", "Tests still pass"]
            }
            refinement_tasks.append(task)

        # Create tasks for suggestions
        for i, suggestion in enumerate(review.suggestions[:3]):  # Top 3 suggestions
            task = {
                "task_id": f"refinement-suggestion-{i+1}",
                "agent": "CODE",
                "description": f"Implement suggestion: {suggestion}",
                "acceptance_criteria": ["Suggestion implemented", "Code quality improved"]
            }
            refinement_tasks.append(task)

        if not refinement_tasks:
            self._log("No refinement tasks needed")
            return implementation

        self._log(f"Created {len(refinement_tasks)} refinement tasks")

        # Execute refinement tasks with Codex
        refinement_results = []
        new_files_created = list(implementation.files_created)
        new_files_modified = list(implementation.files_modified)
        new_tests_created = list(implementation.tests_created)

        for task in refinement_tasks:
            route = self.agent_dispatcher.determine_route(task)
            route.primary_agent = AgentType.CODEX  # Force Codex for refinements

            result = await self.agent_dispatcher.execute_task(task, route)
            refinement_results.append(result)

            if result.success:
                new_files_created.extend(result.files_created)
                new_files_modified.extend(result.files_modified)
                new_tests_created.extend(result.tests_created)

        # Check if refinements succeeded
        success = all(r.success for r in refinement_results) and len(refinement_results) > 0

        return ImplementationResult(
            success=success,
            files_created=list(set(new_files_created)),  # Deduplicate
            files_modified=list(set(new_files_modified)),
            tests_created=list(set(new_tests_created)),
            agent_results=implementation.agent_results + refinement_results
        )

    async def _generate_documentation(
        self,
        implementation: ImplementationResult,
        enriched_plan: EnrichedPlan,
        review: ReviewOutcome
    ) -> str:
        """Generate final documentation using Gemini - FULL IMPLEMENTATION."""
        self._log("Generating documentation with Gemini...")

        try:
            # Initialize Gemini agent
            gemini_agent = GeminiAgent(agent_id="gemini-documenter")

            # Read actual code files
            code_files = {}
            for file_path in implementation.files_created[:10]:
                try:
                    full_path = self.project_root / file_path
                    if full_path.exists():
                        with open(full_path, 'r') as f:
                            code_files[file_path] = f.read()
                except Exception as e:
                    self._log(f"Could not read {file_path} for documentation: {e}")
                    code_files[file_path] = f"[Error reading file: {e}]"

            # Read test files
            test_files = {}
            for file_path in implementation.tests_created[:5]:
                try:
                    full_path = self.project_root / file_path
                    if full_path.exists():
                        with open(full_path, 'r') as f:
                            test_files[file_path] = f.read()
                except Exception as e:
                    self._log(f"Could not read test {file_path}: {e}")
                    test_files[file_path] = f"[Error reading file: {e}]"

            # Build comprehensive implementation notes
            implementation_notes = f"""
# Implementation Summary

## Quality Metrics
- Quality Score: {review.quality_score}/10
- Approved: {review.approved}
- Tests Passed: {review.tests_passed}

## Files Created
{chr(10).join([f'- {f}' for f in implementation.files_created])}

## Files Modified
{chr(10).join([f'- {f}' for f in implementation.files_modified])}

## Tests Created
{chr(10).join([f'- {f}' for f in implementation.tests_created])}

## Review Feedback
{review.feedback}

## Issues Found
{chr(10).join([f'- {issue}' for issue in review.issues_found])}

## Suggestions
{chr(10).join([f'- {suggestion}' for suggestion in review.suggestions])}
"""

            # Create comprehensive documentation request
            doc_request = DocumentationRequest(
                task_title=enriched_plan.execution_plan.goal if enriched_plan.execution_plan else "Documentation",
                task_description=enriched_plan.original_plan,
                code_files=code_files,
                test_files=test_files,
                implementation_notes=implementation_notes,
                review_feedback=review.feedback
            )

            # Generate documentation
            doc_result = await gemini_agent.document(doc_request)

            if doc_result.success:
                # Save documentation to files if possible
                try:
                    # Save main documentation
                    if doc_result.documentation:
                        doc_path = self.project_root / "DOCUMENTATION.md"
                        with open(doc_path, 'w') as f:
                            f.write(doc_result.documentation)
                        self._log(f"Documentation saved to {doc_path}")

                    # Save README if generated
                    if doc_result.readme_content:
                        readme_path = self.project_root / "README.md"
                        with open(readme_path, 'w') as f:
                            f.write(doc_result.readme_content)
                        self._log(f"README saved to {readme_path}")

                    # Save architecture notes if generated
                    if doc_result.architecture_notes:
                        arch_path = self.project_root / "ARCHITECTURE.md"
                        with open(arch_path, 'w') as f:
                            f.write(doc_result.architecture_notes)
                        self._log(f"Architecture notes saved to {arch_path}")

                except Exception as e:
                    self._log(f"Warning: Could not save documentation files: {e}")

                return doc_result.documentation or "Documentation generated"
            else:
                return f"Documentation generation failed: {doc_result.error}"

        except Exception as e:
            self._log(f"Documentation failed: {e}")
            return f"Documentation error: {str(e)}"

    async def _run_tests(self, test_files: List[str]) -> bool:
        """Run tests and return whether they passed - FULL IMPLEMENTATION."""
        if not test_files:
            self._log("No tests to run")
            return True

        self._log(f"Running {len(test_files)} test files...")

        try:
            # Determine test command based on file types
            python_tests = [f for f in test_files if f.endswith('.py')]
            js_tests = [f for f in test_files if f.endswith(('.js', '.ts'))]

            all_passed = True

            # Run Python tests with pytest
            if python_tests:
                task = ScriptTask(
                    task_id="pytest",
                    command=f"pytest {' '.join(python_tests)} -v",
                    cwd=self.project_root,
                    timeout=120.0
                )
                result = await self.script_executor.execute(task)
                if not result.success or result.exit_code != 0:
                    self._log(f"Python tests failed: {result.stderr}")
                    all_passed = False
                else:
                    self._log("Python tests passed")

            # Run JavaScript tests with npm/jest
            if js_tests:
                task = ScriptTask(
                    task_id="jest",
                    command="npm test",
                    cwd=self.project_root,
                    timeout=120.0
                )
                result = await self.script_executor.execute(task)
                if not result.success or result.exit_code != 0:
                    self._log(f"JavaScript tests failed: {result.stderr}")
                    all_passed = False
                else:
                    self._log("JavaScript tests passed")

            return all_passed

        except Exception as e:
            self._log(f"Test execution failed: {e}")
            return False


# Example usage
async def main():
    """Example usage of Hybrid Orchestrator V5."""
    orchestrator = HybridOrchestratorV5(verbose=True)

    # Example Claude plan
    claude_plan = """
    # Build User Authentication System

    ## Overview
    Create a secure JWT-based authentication system with the following components:

    ## Implementation Steps
    1. Database Schema
       - Users table with secure password storage
       - Sessions table for refresh tokens

    2. Authentication Logic
       - JWT token generation
       - Token validation middleware
       - Password hashing with bcrypt

    3. API Endpoints
       - POST /register - User registration
       - POST /login - User login
       - POST /refresh - Token refresh
       - POST /logout - User logout

    4. Security Measures
       - Refresh token rotation
       - Rate limiting
       - Input validation

    5. Testing
       - Unit tests for auth functions
       - Integration tests for endpoints
       - Security testing

    6. Documentation
       - API documentation
       - Setup guide
       - Security notes
    """

    # Execute workflow
    result = await orchestrator.execute_goal(
        user_goal="Build a secure user authentication system with JWT tokens",
        claude_plan=claude_plan
    )

    print(f"\n{'=' * 70}")
    print(f"FINAL RESULTS")
    print(f"{'=' * 70}")
    print(f"Success: {result.success}")
    print(f"Quality Score: {result.review.quality_score}/10")
    print(f"Total Iterations: {result.total_iterations}")
    print(f"Execution Time: {result.total_execution_time:.2f}s")
    print(f"Total Cost: ${result.cost_breakdown.get('total', 0.0):.3f}")
    print(f"Files Created: {len(result.implementation.files_created)}")
    print(f"Tests Created: {len(result.implementation.tests_created)}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    asyncio.run(main())
