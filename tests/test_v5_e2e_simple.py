#!/usr/bin/env python3
"""
Simple End-to-End Test for V5 Orchestrator

Tests the workflow without requiring real API keys by mocking external calls.
This verifies the workflow logic and integration between components.
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


async def test_v5_workflow_without_apis():
    """Test V5 workflow with mocked API calls."""
    print("\n" + "="*70)
    print("V5 END-TO-END WORKFLOW TEST (Mocked APIs)")
    print("="*70)

    from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5
    from orchestrator.hybrid_planner import EnrichedPlan, EnrichmentContribution
    from orchestrator.chatgpt_planner import ExecutionPlan

    # Mock the API-dependent components
    with patch('orchestrator.hybrid_planner.HybridPlanner') as MockPlanner, \
         patch('orchestrator.agent_dispatcher.CodexMCPAgent') as MockCodex, \
         patch('orchestrator.claude_code_agent.ClaudeCodeAgent') as MockClaude, \
         patch('orchestrator.gemini_agent.GeminiAgent') as MockGemini:

        # Setup mock planner
        mock_planner_instance = MockPlanner.return_value
        mock_enriched_plan = EnrichedPlan(
            plan_id="test-plan-001",
            original_plan="Test plan from Claude",
            execution_plan=ExecutionPlan(
                plan_id="exec-001",
                goal="Build test feature",
                reasoning="For testing purposes",
                tasks=[
                    {
                        "task_id": "task-1",
                        "agent": "CODE",
                        "description": "Implement test function",
                        "acceptance_criteria": ["Function works", "Tests pass"]
                    }
                ]
            ),
            enrichments=[
                EnrichmentContribution(ai_name="Claude", content="Initial plan"),
                EnrichmentContribution(ai_name="ChatGPT", content="Structured plan"),
                EnrichmentContribution(ai_name="DeepSeek", content="Technical insights"),
                EnrichmentContribution(ai_name="Grok", content="Creative review"),
                EnrichmentContribution(ai_name="Gemini", content="Final review"),
            ],
            final_confidence_score=8.5
        )
        mock_planner_instance.enrich_plan = AsyncMock(return_value=mock_enriched_plan)

        # Setup mock Codex
        from orchestrator.codex_mcp_agent import CodexResult
        from orchestrator.agent_dispatcher import AgentResult, AgentType
        mock_codex_result = CodexResult(
            success=True,
            conversation_id="conv-001",
            output="Implementation completed",
            files_created=["test_function.py"],
            iterations=1
        )

        # Setup mock Claude review
        from orchestrator.claude_code_agent import ReviewResult
        mock_review_result = ReviewResult(
            approved=True,
            feedback="Code looks good!",
            suggestions=["Add more edge case tests"],
            quality_score=8.5,
            issues_found=[]
        )
        mock_claude_instance = MockClaude.return_value
        mock_claude_instance.review = AsyncMock(return_value=mock_review_result)

        # Setup mock Gemini documentation
        from orchestrator.gemini_agent import DocumentationResult
        mock_doc_result = DocumentationResult(
            success=True,
            documentation="# Test Function Documentation\n\nThis is a test.",
            readme_content="# README\n\nTest project.",
            architecture_notes="## Architecture\n\nSimple test architecture."
        )
        mock_gemini_instance = MockGemini.return_value
        mock_gemini_instance.document = AsyncMock(return_value=mock_doc_result)

        # Create orchestrator with mocked components
        print("\n1. Initializing V5 Orchestrator...")
        orchestrator = HybridOrchestratorV5(
            project_root=PROJECT_ROOT,
            verbose=False
        )
        # Replace components with mocks
        orchestrator.hybrid_planner = mock_planner_instance

        # Mock the agent dispatcher's execute_task to return our mock results
        original_execute = orchestrator.agent_dispatcher.execute_task
        async def mock_execute_task(task, route=None):
            return AgentResult(
                agent_type=AgentType.CODEX,
                task_id=task.get('task_id', 'unknown'),
                success=True,
                output="Mock implementation",
                files_created=["test_function.py"],
                files_modified=[],
                tests_created=["test_test_function.py"]
            )
        orchestrator.agent_dispatcher.execute_task = mock_execute_task

        # Mock the script executor to avoid actually running tests
        original_run_tests = orchestrator._run_tests
        async def mock_run_tests(test_files):
            print(f"   [MOCK] Running {len(test_files)} test files...")
            return True
        orchestrator._run_tests = mock_run_tests

        # Mock file reading
        original_execute_review = orchestrator._execute_review
        async def mock_execute_review(implementation, enriched_plan):
            print("   [MOCK] Executing code review...")
            from orchestrator.hybrid_orchestrator_v5 import ReviewOutcome
            return ReviewOutcome(
                approved=True,
                quality_score=8.5,
                feedback="Mock review: Code quality is good",
                issues_found=[],
                suggestions=["Add more tests"],
                tests_passed=True
            )
        orchestrator._execute_review = mock_execute_review

        # Mock documentation generation
        original_gen_docs = orchestrator._generate_documentation
        async def mock_gen_docs(implementation, enriched_plan, review):
            print("   [MOCK] Generating documentation...")
            return "# Mock Documentation\n\nThis is mock documentation for testing."
        orchestrator._generate_documentation = mock_gen_docs

        print("   ✓ Orchestrator initialized")

        # Test the workflow
        claude_plan = """
        # Test Task
        1. Implement a simple test function
        2. Write unit tests
        3. Document the function
        """

        print("\n2. Executing V5 workflow...")
        result = await orchestrator.execute_goal(
            user_goal="Create a test function",
            claude_plan=claude_plan
        )

        print("\n3. Verifying results...")
        assert result.success, "Workflow should succeed"
        assert result.enriched_plan is not None, "Should have enriched plan"
        assert len(result.enriched_plan.enrichments) == 5, "Should have 5 AI enrichments"
        assert result.implementation.success, "Implementation should succeed"
        assert len(result.implementation.files_created) > 0, "Should create files"
        assert result.review.approved, "Review should approve"
        assert result.review.quality_score > 0, "Should have quality score"
        assert result.documentation is not None, "Should have documentation"

        print("   ✓ All assertions passed")

        print("\n4. Workflow Summary:")
        print(f"   - Enrichments: {len(result.enriched_plan.enrichments)}")
        print(f"   - Files Created: {len(result.implementation.files_created)}")
        print(f"   - Tests Created: {len(result.implementation.tests_created)}")
        print(f"   - Quality Score: {result.review.quality_score}/10")
        print(f"   - Approved: {result.review.approved}")
        print(f"   - Iterations: {result.total_iterations}")
        print(f"   - Execution Time: {result.total_execution_time:.2f}s")

        print("\n" + "="*70)
        print("✅ V5 END-TO-END TEST PASSED!")
        print("="*70)

        return True


async def main():
    """Run the end-to-end test."""
    try:
        success = await test_v5_workflow_without_apis()
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
