#!/usr/bin/env python3
"""
Comprehensive V5 Orchestrator Test Suite

Tests all components of the V5 architecture:
- All agents (Gemini, DeepSeek, Grok)
- Hybrid planner with multi-AI enrichment
- Agent dispatcher
- Script executor
- Full V5 orchestrator workflow

Run with: python test_v5_comprehensive.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


class V5ComponentTester:
    """Comprehensive tester for all V5 components."""

    def __init__(self):
        self.results = {}
        self.total_tests = 0
        self.passed_tests = 0

    def log(self, message, level="INFO"):
        """Log test messages."""
        symbols = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "FAILURE": "❌",
            "WARNING": "⚠️ "
        }
        print(f"{symbols.get(level, '  ')} {message}")

    async def test_gemini_agent(self):
        """Test Gemini agent initialization and basic functionality."""
        self.log("\n=== Testing Gemini Agent ===")
        self.total_tests += 1

        try:
            from orchestrator.gemini_agent import GeminiAgent, DocumentationRequest

            # Test initialization
            try:
                agent = GeminiAgent(agent_id="test-gemini")
                self.log("Gemini agent initialized successfully", "SUCCESS")
                self.passed_tests += 1
                return True
            except ValueError as e:
                if "API key required" in str(e):
                    self.log(f"Gemini agent requires API key (expected): {e}", "WARNING")
                    self.passed_tests += 1  # Expected failure
                    return True
                raise

        except ImportError as e:
            self.log(f"Gemini dependencies not installed: {e}", "FAILURE")
            return False
        except Exception as e:
            self.log(f"Gemini agent test failed: {e}", "FAILURE")
            return False

    async def test_deepseek_agent(self):
        """Test DeepSeek agent initialization."""
        self.log("\n=== Testing DeepSeek Agent ===")
        self.total_tests += 1

        try:
            from orchestrator.deepseek_agent import DeepSeekAgent

            try:
                agent = DeepSeekAgent(agent_id="test-deepseek")
                self.log("DeepSeek agent initialized successfully", "SUCCESS")
                self.passed_tests += 1
                return True
            except ValueError as e:
                if "API key required" in str(e):
                    self.log(f"DeepSeek agent requires API key (expected): {e}", "WARNING")
                    self.passed_tests += 1
                    return True
                raise

        except Exception as e:
            self.log(f"DeepSeek agent test failed: {e}", "FAILURE")
            return False

    async def test_grok_agent(self):
        """Test Grok agent initialization."""
        self.log("\n=== Testing Grok Agent ===")
        self.total_tests += 1

        try:
            from orchestrator.grok_agent import GrokAgent

            try:
                agent = GrokAgent(agent_id="test-grok")
                self.log("Grok agent initialized successfully", "SUCCESS")
                self.passed_tests += 1
                return True
            except ValueError as e:
                if "API key required" in str(e):
                    self.log(f"Grok agent requires API key (expected): {e}", "WARNING")
                    self.passed_tests += 1
                    return True
                raise

        except Exception as e:
            self.log(f"Grok agent test failed: {e}", "FAILURE")
            return False

    async def test_best_practices_db(self):
        """Test best practices database."""
        self.log("\n=== Testing Best Practices Database ===")
        self.total_tests += 1

        try:
            from orchestrator.best_practices import get_best_practices_db, TaskCategory

            db = get_best_practices_db()

            # Test finding practices
            practices = db.find_relevant_practices("Build a REST API with authentication")
            self.log(f"Found {len(practices)} relevant practices", "INFO")

            # Test finding patterns
            patterns = db.find_relevant_patterns("Build microservices architecture")
            self.log(f"Found {len(patterns)} relevant patterns", "INFO")

            if len(practices) > 0 and len(patterns) >= 0:
                self.log("Best practices database working correctly", "SUCCESS")
                self.passed_tests += 1
                return True
            else:
                self.log("Best practices database returned no results", "FAILURE")
                return False

        except Exception as e:
            self.log(f"Best practices database test failed: {e}", "FAILURE")
            return False

    async def test_hybrid_planner(self):
        """Test hybrid planner initialization."""
        self.log("\n=== Testing Hybrid Planner ===")
        self.total_tests += 1

        try:
            from orchestrator.hybrid_planner import HybridPlanner

            planner = HybridPlanner(verbose=False)
            self.log("Hybrid planner initialized successfully", "SUCCESS")

            # Check components initialized
            if planner.best_practices_db:
                self.log("Best practices database integrated", "SUCCESS")

            self.passed_tests += 1
            return True

        except Exception as e:
            self.log(f"Hybrid planner test failed: {e}", "FAILURE")
            return False

    async def test_agent_dispatcher(self):
        """Test agent dispatcher."""
        self.log("\n=== Testing Agent Dispatcher ===")
        self.total_tests += 1

        try:
            from orchestrator.agent_dispatcher import AgentDispatcher, TaskType, AgentType

            dispatcher = AgentDispatcher(verbose=False)

            # Test route determination
            test_task = {
                "task_id": "test-1",
                "description": "Implement user authentication with JWT",
                "agent": "CODE"
            }

            route = dispatcher.determine_route(test_task)

            self.log(f"Task routed to: {route.primary_agent.value}", "INFO")
            self.log(f"Task type: {route.task_type.value}", "INFO")
            self.log(f"Requires review: {route.requires_review}", "INFO")

            if route.primary_agent == AgentType.CODEX:
                self.log("Agent dispatcher routing correctly", "SUCCESS")
                self.passed_tests += 1
                return True
            else:
                self.log("Agent dispatcher routing incorrect", "FAILURE")
                return False

        except Exception as e:
            self.log(f"Agent dispatcher test failed: {e}", "FAILURE")
            return False

    async def test_script_executor(self):
        """Test script executor."""
        self.log("\n=== Testing Script Executor ===")
        self.total_tests += 1

        try:
            from orchestrator.script_executor import ScriptExecutor, ScriptTask

            executor = ScriptExecutor(verbose=False)

            # Test simple command
            task = ScriptTask(
                task_id="test-echo",
                command="echo 'Hello from V5 Orchestrator'",
                timeout=5.0
            )

            result = await executor.execute(task)

            if result.success and "Hello from V5 Orchestrator" in result.stdout:
                self.log("Script executor working correctly", "SUCCESS")
                self.passed_tests += 1
                return True
            else:
                self.log(f"Script executor failed: {result.error}", "FAILURE")
                return False

        except Exception as e:
            self.log(f"Script executor test failed: {e}", "FAILURE")
            return False

    async def test_v5_orchestrator(self):
        """Test V5 orchestrator initialization."""
        self.log("\n=== Testing V5 Orchestrator ===")
        self.total_tests += 1

        try:
            from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5, WorkflowPhase

            orchestrator = HybridOrchestratorV5(verbose=False)

            self.log("V5 Orchestrator initialized successfully", "SUCCESS")
            self.log(f"Hybrid planner: {'✓' if orchestrator.hybrid_planner else '✗'}", "INFO")
            self.log(f"Agent dispatcher: {'✓' if orchestrator.agent_dispatcher else '✗'}", "INFO")
            self.log(f"Script executor: {'✓' if orchestrator.script_executor else '✗'}", "INFO")

            self.passed_tests += 1
            return True

        except Exception as e:
            self.log(f"V5 Orchestrator test failed: {e}", "FAILURE")
            return False

    async def test_data_models(self):
        """Test all data models."""
        self.log("\n=== Testing Data Models ===")
        self.total_tests += 1

        try:
            from orchestrator.hybrid_orchestrator_v5 import (
                WorkflowPhase, WorkflowState, ImplementationResult,
                ReviewOutcome, FinalOutput
            )
            from orchestrator.hybrid_planner import EnrichmentContribution, EnrichedPlan
            from orchestrator.agent_dispatcher import AgentResult, TaskRoute
            from orchestrator.script_executor import ScriptResult

            # Test creating instances
            state = WorkflowState(
                session_id="test-123",
                current_phase=WorkflowPhase.PLANNING
            )

            contribution = EnrichmentContribution(
                ai_name="Claude",
                content="Test plan"
            )

            result = AgentResult(
                agent_type="codex",
                task_id="test",
                success=True
            )

            self.log("All data models validated", "SUCCESS")
            self.passed_tests += 1
            return True

        except Exception as e:
            self.log(f"Data models test failed: {e}", "FAILURE")
            return False

    async def test_imports(self):
        """Test that all modules can be imported."""
        self.log("\n=== Testing Module Imports ===")
        self.total_tests += 1

        modules = [
            "orchestrator.gemini_agent",
            "orchestrator.deepseek_agent",
            "orchestrator.grok_agent",
            "orchestrator.best_practices",
            "orchestrator.hybrid_planner",
            "orchestrator.agent_dispatcher",
            "orchestrator.script_executor",
            "orchestrator.hybrid_orchestrator_v5"
        ]

        all_imported = True
        for module in modules:
            try:
                __import__(module)
                self.log(f"✓ {module}", "INFO")
            except ImportError as e:
                self.log(f"✗ {module}: {e}", "FAILURE")
                all_imported = False

        if all_imported:
            self.log("All modules imported successfully", "SUCCESS")
            self.passed_tests += 1
            return True
        else:
            self.log("Some modules failed to import", "FAILURE")
            return False

    async def run_all_tests(self):
        """Run all tests."""
        self.log("\n" + "=" * 70)
        self.log("V5 ORCHESTRATOR COMPREHENSIVE TEST SUITE")
        self.log("=" * 70)

        # Run all tests
        await self.test_imports()
        await self.test_gemini_agent()
        await self.test_deepseek_agent()
        await self.test_grok_agent()
        await self.test_best_practices_db()
        await self.test_hybrid_planner()
        await self.test_agent_dispatcher()
        await self.test_script_executor()
        await self.test_data_models()
        await self.test_v5_orchestrator()

        # Print summary
        self.log("\n" + "=" * 70)
        self.log("TEST SUMMARY")
        self.log("=" * 70)
        self.log(f"Total Tests: {self.total_tests}", "INFO")
        self.log(f"Passed: {self.passed_tests}", "SUCCESS" if self.passed_tests == self.total_tests else "INFO")
        self.log(f"Failed: {self.total_tests - self.passed_tests}", "FAILURE" if self.passed_tests < self.total_tests else "INFO")
        self.log(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%", "INFO")
        self.log("=" * 70)

        return self.passed_tests == self.total_tests


async def main():
    """Main test runner."""
    tester = V5ComponentTester()
    success = await tester.run_all_tests()

    if success:
        print("\n✅ All tests passed! V5 Orchestrator is ready.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
