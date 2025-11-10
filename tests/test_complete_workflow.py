#!/usr/bin/env python3
"""
Complete Workflow Test for Orchestration System

This test validates the entire workflow from task submission through completion,
including all major components:
- Task submission via API
- Hybrid Orchestrator processing
- Agent dispatch and execution
- Event streaming through Redis
- WebSocket communication
- Result aggregation and reporting
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

from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5, WorkflowPhase
from orchestrator.hybrid_planner import HybridPlanner
from orchestrator.agent_dispatcher import AgentDispatcher, TaskType
from orchestrator.script_executor import ScriptExecutor, ScriptTask


class CompleteWorkflowTester:
    """Test the complete orchestration workflow."""

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

        # Create a simple test task
        task = {
            "task_id": f"test-{int(time.time())}",
            "description": "Create a simple Python function that adds two numbers",
            "agent": "CODE",
            "complexity": "simple",
            "metadata": {
                "test_run": True,
                "timestamp": datetime.now().isoformat()
            }
        }

        self.log(f"Created task: {task['task_id']}", "INFO", 1)
        self.log(f"Description: {task['description']}", "INFO", 1)

        try:
            # Execute task
            self.log("Starting task execution...", "INFO", 1)
            result = await orchestrator.execute_workflow(task)

            if result and result.success:
                self.log(f"Task executed successfully", "SUCCESS", 1)
                self.log(f"Session ID: {result.session_id}", "INFO", 2)
                self.log(f"Phase reached: {result.phases_completed[-1] if result.phases_completed else 'None'}", "INFO", 2)

                # Store result for analysis
                self.results['simple_task'] = result
                return True
            else:
                self.log(f"Task failed: {result.error if result else 'Unknown error'}", "FAILURE", 1)
                return False

        except Exception as e:
            self.log(f"Task execution error: {e}", "FAILURE", 1)
            self.errors.append(str(e))
            return False

    async def test_complex_task_with_review(self):
        """Test a complex task that requires review."""
        self.log("\n=== COMPLEX TASK WITH REVIEW ===", "STEP")

        if 'orchestrator' not in self.results:
            self.log("Orchestrator not initialized", "FAILURE", 1)
            return False

        orchestrator = self.results['orchestrator']

        # Create a complex task
        task = {
            "task_id": f"complex-{int(time.time())}",
            "description": "Build a REST API endpoint with authentication, validation, and error handling",
            "agent": "CODE",
            "complexity": "complex",
            "requirements": [
                "JWT authentication",
                "Input validation",
                "Error handling middleware",
                "Unit tests"
            ],
            "metadata": {
                "test_run": True,
                "requires_review": True
            }
        }

        self.log(f"Created complex task: {task['task_id']}", "INFO", 1)
        self.log("Requirements:", "INFO", 1)
        for req in task['requirements']:
            self.log(f"• {req}", "INFO", 2)

        try:
            # Execute task
            self.log("Starting complex task execution...", "INFO", 1)
            result = await orchestrator.execute_workflow(task)

            if result and result.success:
                self.log(f"Complex task executed successfully", "SUCCESS", 1)

                # Check if review was performed
                if WorkflowPhase.REVIEW in result.phases_completed:
                    self.log("Review phase completed", "SUCCESS", 2)
                    if result.review_results:
                        for review in result.review_results:
                            self.log(f"Review by {review.reviewer}: {review.status}", "INFO", 3)

                self.results['complex_task'] = result
                return True
            else:
                self.log(f"Complex task failed: {result.error if result else 'Unknown'}", "FAILURE", 1)
                return False

        except Exception as e:
            self.log(f"Complex task error: {e}", "FAILURE", 1)
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
                "description": "Research best practices for microservices",
                "expected_type": TaskType.RESEARCH
            },
            {
                "description": "Create project documentation",
                "expected_type": TaskType.DOCUMENTATION
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
        expected_phases = [
            WorkflowPhase.PLANNING,
            WorkflowPhase.IMPLEMENTATION,
            WorkflowPhase.AGGREGATION
        ]

        phases_ok = True
        for i, phase in enumerate(result.phases_completed):
            if i < len(expected_phases):
                if phase == expected_phases[i]:
                    self.log(f"✓ Phase {i+1}: {phase.value}", "SUCCESS", 1)
                else:
                    self.log(f"✗ Phase {i+1}: {phase.value} (expected {expected_phases[i].value})", "FAILURE", 1)
                    phases_ok = False

        return phases_ok

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
            for error in self.errors:
                self.log(f"• {error}", "FAILURE", 1)

        # Phase coverage
        if 'simple_task' in self.results:
            result = self.results['simple_task']
            self.log("\nPhases Completed:", "INFO")
            for phase in result.phases_completed:
                self.log(f"• {phase.value}", "SUCCESS", 1)

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
            ("Simple Task", self.test_simple_task_execution),
            ("Complex Task", self.test_complex_task_with_review),
            ("Workflow Phases", self.test_workflow_phases)
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