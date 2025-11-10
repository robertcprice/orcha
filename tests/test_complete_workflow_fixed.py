#!/usr/bin/env python3
"""
Complete Workflow Test for V5 Orchestration System
Tests the entire workflow from task submission through completion.
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5, WorkflowPhase, WorkflowState
from orchestrator.hybrid_planner import HybridPlanner
from orchestrator.agent_dispatcher import AgentDispatcher, TaskType, AgentType
from orchestrator.script_executor import ScriptExecutor, ScriptTask


class CompleteWorkflowTester:
    """Test the complete V5 orchestration workflow."""

    def __init__(self):
        self.results = {}
        self.test_steps = []
        self.errors = []
        self.start_time = None
        self.end_time = None

    def log(self, message: str, level: str = "INFO", indent: int = 0):
        """Log formatted messages with timestamps."""
        symbols = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "FAILURE": "❌",
            "WARNING": "⚠️ ",
            "STEP": "📋",
            "AGENT": "🤖",
            "EVENT": "📨",
            "TIME": "⏱️ "
        }

        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        prefix = "  " * indent + symbols.get(level, "  ")
        print(f"[{timestamp}] {prefix} {message}")

        # Track test steps
        if level in ["SUCCESS", "FAILURE"]:
            self.test_steps.append({
                "time": timestamp,
                "level": level,
                "message": message
            })

    async def test_component_initialization(self):
        """Test that all components can be initialized."""
        self.log("\n=== COMPONENT INITIALIZATION ===", "STEP")

        components_ok = True

        # Test HybridPlanner
        try:
            planner = HybridPlanner(verbose=False)
            self.log("HybridPlanner initialized", "SUCCESS", 1)
        except Exception as e:
            self.log(f"HybridPlanner failed: {e}", "FAILURE", 1)
            components_ok = False
            self.errors.append(str(e))

        # Test AgentDispatcher
        try:
            dispatcher = AgentDispatcher(verbose=False)
            self.log("AgentDispatcher initialized", "SUCCESS", 1)
        except Exception as e:
            self.log(f"AgentDispatcher failed: {e}", "FAILURE", 1)
            components_ok = False
            self.errors.append(str(e))

        # Test ScriptExecutor
        try:
            executor = ScriptExecutor(verbose=False)
            self.log("ScriptExecutor initialized", "SUCCESS", 1)
        except Exception as e:
            self.log(f"ScriptExecutor failed: {e}", "FAILURE", 1)
            components_ok = False
            self.errors.append(str(e))

        # Test V5 Orchestrator
        try:
            orchestrator = HybridOrchestratorV5(verbose=False)
            self.log("HybridOrchestratorV5 initialized", "SUCCESS", 1)
            self.results['orchestrator'] = orchestrator
        except Exception as e:
            self.log(f"HybridOrchestratorV5 failed: {e}", "FAILURE", 1)
            components_ok = False
            self.errors.append(str(e))

        return components_ok

    async def test_simple_task_execution(self):
        """Test executing a simple task through the orchestrator."""
        self.log("\n=== SIMPLE TASK EXECUTION ===", "STEP")

        if 'orchestrator' not in self.results:
            self.log("Orchestrator not initialized", "FAILURE", 1)
            return False

        orchestrator = self.results['orchestrator']

        # Create a simple test goal
        goal = "Create a simple Python function that adds two numbers"
        session_id = f"test-{int(time.time())}"

        self.log(f"Session ID: {session_id}", "INFO", 1)
        self.log(f"Goal: {goal}", "INFO", 1)

        try:
            # Execute goal
            self.log("Starting goal execution...", "INFO", 1)
            result = await orchestrator.execute_goal(goal, session_id=session_id)

            if result and result.success:
                self.log(f"Goal executed successfully", "SUCCESS", 1)
                self.log(f"Session ID: {result.session_id}", "INFO", 2)
                self.log(f"Phases completed: {len(result.phases_completed)}", "INFO", 2)
                for phase in result.phases_completed:
                    self.log(f"• {phase.value}", "INFO", 3)

                # Store result for analysis
                self.results['simple_task'] = result
                return True
            else:
                error_msg = result.error if result else 'Unknown error'
                self.log(f"Goal failed: {error_msg}", "FAILURE", 1)
                if result and result.errors:
                    for err in result.errors:
                        self.log(f"• {err}", "FAILURE", 2)
                return False

        except Exception as e:
            self.log(f"Goal execution error: {e}", "FAILURE", 1)
            self.errors.append(str(e))
            return False

    async def test_complex_task_with_review(self):
        """Test a complex task that requires review."""
        self.log("\n=== COMPLEX TASK WITH REVIEW ===", "STEP")

        if 'orchestrator' not in self.results:
            self.log("Orchestrator not initialized", "FAILURE", 1)
            return False

        orchestrator = self.results['orchestrator']

        # Create a complex goal
        goal = """Build a REST API endpoint with the following requirements:
        - JWT authentication
        - Input validation for user registration
        - Error handling middleware
        - Unit tests for all endpoints"""

        session_id = f"complex-{int(time.time())}"

        self.log(f"Session ID: {session_id}", "INFO", 1)
        self.log("Goal: Build REST API with authentication", "INFO", 1)

        try:
            # Execute goal
            self.log("Starting complex goal execution...", "INFO", 1)
            result = await orchestrator.execute_goal(goal, session_id=session_id)

            if result and result.success:
                self.log(f"Complex goal executed successfully", "SUCCESS", 1)

                # Check phases completed
                if WorkflowPhase.REVIEW in result.phases_completed:
                    self.log("Review phase completed", "SUCCESS", 2)
                if WorkflowPhase.DOCUMENTATION in result.phases_completed:
                    self.log("Documentation phase completed", "SUCCESS", 2)

                self.results['complex_task'] = result
                return True
            else:
                error_msg = result.error if result else 'Unknown'
                self.log(f"Complex goal failed: {error_msg}", "FAILURE", 1)
                return False

        except Exception as e:
            self.log(f"Complex goal error: {e}", "FAILURE", 1)
            self.errors.append(str(e))
            return False

    async def test_script_execution(self):
        """Test script execution capabilities."""
        self.log("\n=== SCRIPT EXECUTION TEST ===", "STEP")

        executor = ScriptExecutor(verbose=False)

        # Test simple command
        task = ScriptTask(
            task_id="test-script",
            command="echo 'Testing script execution'",
            timeout=5.0
        )

        self.log(f"Executing: {task.command}", "INFO", 1)

        try:
            result = await executor.execute(task)

            if result.success:
                self.log("Script executed successfully", "SUCCESS", 1)
                self.log(f"Output: {result.stdout.strip()}", "INFO", 2)
                return True
            else:
                self.log(f"Script failed: {result.error}", "FAILURE", 1)
                return False

        except Exception as e:
            self.log(f"Script execution error: {e}", "FAILURE", 1)
            self.errors.append(str(e))
            return False

    async def test_agent_routing(self):
        """Test agent routing logic."""
        self.log("\n=== AGENT ROUTING TEST ===", "STEP")

        dispatcher = AgentDispatcher(verbose=False)

        test_cases = [
            {
                "description": "Build a web application",
                "expected_type": TaskType.IMPLEMENTATION
            },
            {
                "description": "Analyze code patterns and architecture",
                "expected_type": TaskType.ANALYSIS
            },
            {
                "description": "Create project documentation",
                "expected_type": TaskType.DOCUMENTATION
            },
            {
                "description": "Debug and fix the authentication system",
                "expected_type": TaskType.DEBUGGING
            }
        ]

        all_correct = True

        for test in test_cases:
            task = {
                "task_id": f"routing-test-{test['expected_type'].value}",
                "description": test['description'],
                "agent": "AUTO"
            }

            route = dispatcher.determine_route(task)

            if route.task_type == test['expected_type']:
                self.log(f"✓ '{test['description']}' → {route.task_type.value}", "SUCCESS", 1)
            else:
                self.log(f"✗ '{test['description']}' → {route.task_type.value} (expected {test['expected_type'].value})", "FAILURE", 1)
                all_correct = False

        return all_correct

    async def test_workflow_phases(self):
        """Test that workflow phases are executed in correct order."""
        self.log("\n=== WORKFLOW PHASE ORDERING ===", "STEP")

        if 'simple_task' not in self.results:
            self.log("No simple task result to analyze", "WARNING", 1)
            return True

        result = self.results['simple_task']

        # Check phase order
        phases_ok = True
        previous_phase = None
        for phase in result.phases_completed:
            self.log(f"Phase executed: {phase.value}", "SUCCESS", 1)
            # Basic ordering validation
            if previous_phase:
                # Planning should come before execution
                if previous_phase == WorkflowPhase.PLANNING and phase not in [WorkflowPhase.EXECUTION, WorkflowPhase.REVIEW]:
                    self.log(f"Invalid phase transition: {previous_phase.value} → {phase.value}", "FAILURE", 2)
                    phases_ok = False
            previous_phase = phase

        return phases_ok

    async def test_multi_ai_enrichment(self):
        """Test multi-AI enrichment in planning phase."""
        self.log("\n=== MULTI-AI ENRICHMENT TEST ===", "STEP")

        planner = HybridPlanner(verbose=False)

        test_goal = "Build a microservices architecture"

        try:
            self.log("Planning with multi-AI enrichment...", "INFO", 1)
            enriched_plan = await planner.create_enriched_plan(test_goal)

            if enriched_plan:
                self.log("Enriched plan created successfully", "SUCCESS", 1)

                # Check contributions
                if enriched_plan.contributions:
                    self.log(f"AI contributions: {len(enriched_plan.contributions)}", "INFO", 2)
                    for contrib in enriched_plan.contributions:
                        self.log(f"• {contrib.ai_name}", "INFO", 3)

                # Check best practices
                if enriched_plan.best_practices:
                    self.log(f"Best practices integrated: {len(enriched_plan.best_practices)}", "SUCCESS", 2)

                return True
            else:
                self.log("Failed to create enriched plan", "FAILURE", 1)
                return False

        except Exception as e:
            self.log(f"Multi-AI enrichment error: {e}", "FAILURE", 1)
            self.errors.append(str(e))
            return False

    async def test_error_handling(self):
        """Test error handling and recovery."""
        self.log("\n=== ERROR HANDLING TEST ===", "STEP")

        if 'orchestrator' not in self.results:
            self.log("Orchestrator not initialized", "FAILURE", 1)
            return False

        orchestrator = self.results['orchestrator']

        # Test with invalid goal
        invalid_goal = ""
        session_id = f"error-test-{int(time.time())}"

        try:
            self.log("Testing with invalid goal...", "INFO", 1)
            result = await orchestrator.execute_goal(invalid_goal, session_id=session_id)

            if not result.success:
                self.log("Error handled correctly", "SUCCESS", 1)
                if result.error:
                    self.log(f"Error message: {result.error}", "INFO", 2)
                return True
            else:
                self.log("Should have failed with empty goal", "FAILURE", 1)
                return False

        except Exception as e:
            # Exception caught correctly
            self.log(f"Exception caught: {e}", "SUCCESS", 1)
            return True

    def generate_report(self):
        """Generate final test report."""
        self.log("\n" + "=" * 70, "INFO")
        self.log("COMPLETE WORKFLOW TEST REPORT", "INFO")
        self.log("=" * 70, "INFO")

        # Time stats
        if self.start_time and self.end_time:
            duration = self.end_time - self.start_time
            self.log(f"Total Duration: {duration:.2f} seconds", "TIME")

        # Test results
        self.log("\nTest Results:", "INFO")
        success_count = sum(1 for step in self.test_steps if step['level'] == 'SUCCESS')
        failure_count = sum(1 for step in self.test_steps if step['level'] == 'FAILURE')

        self.log(f"✅ Passed: {success_count}", "SUCCESS", 1)
        self.log(f"❌ Failed: {failure_count}", "FAILURE", 1)

        # Success rate
        total = success_count + failure_count
        if total > 0:
            success_rate = (success_count / total) * 100
            self.log(f"Success Rate: {success_rate:.1f}%", "INFO", 1)

        # Errors summary
        if self.errors:
            self.log("\nErrors Encountered:", "WARNING")
            for error in self.errors[:5]:  # Limit to first 5 errors
                self.log(f"• {error[:100]}...", "FAILURE", 1)

        # Component Status
        self.log("\nComponent Status:", "INFO")
        components = [
            "HybridPlanner",
            "AgentDispatcher",
            "ScriptExecutor",
            "HybridOrchestratorV5"
        ]
        for comp in components:
            status = "✓" if any(s['message'].startswith(comp) and s['level'] == 'SUCCESS'
                                for s in self.test_steps) else "✗"
            self.log(f"{status} {comp}", "INFO", 1)

        # Final verdict
        self.log("\n" + "=" * 70, "INFO")
        if failure_count == 0:
            self.log("🎉 ALL TESTS PASSED! Workflow is functioning correctly.", "SUCCESS")
            return True
        else:
            self.log("⚠️  Some tests failed. Review the errors above.", "WARNING")
            return False

    async def run_all_tests(self):
        """Run complete workflow test suite."""
        self.start_time = time.time()

        self.log("\n" + "=" * 70, "INFO")
        self.log("STARTING COMPLETE WORKFLOW TEST", "INFO")
        self.log("=" * 70, "INFO")

        # Run tests in sequence
        tests = [
            ("Component Initialization", self.test_component_initialization),
            ("Script Execution", self.test_script_execution),
            ("Agent Routing", self.test_agent_routing),
            ("Multi-AI Enrichment", self.test_multi_ai_enrichment),
            ("Simple Task", self.test_simple_task_execution),
            ("Complex Task", self.test_complex_task_with_review),
            ("Workflow Phases", self.test_workflow_phases),
            ("Error Handling", self.test_error_handling)
        ]

        for test_name, test_func in tests:
            try:
                await test_func()
            except Exception as e:
                self.log(f"Test '{test_name}' crashed: {e}", "FAILURE")
                self.errors.append(f"{test_name}: {e}")

        self.end_time = time.time()

        # Generate report
        return self.generate_report()


async def main():
    """Main test runner."""
    tester = CompleteWorkflowTester()
    success = await tester.run_all_tests()

    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)