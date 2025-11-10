#!/usr/bin/env python3
"""
Complete Workflow Test for Orchestration System
Tests the entire workflow from planning through execution and documentation
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))


class WorkflowTestSuite:
    """Comprehensive test suite for the complete orchestration workflow."""

    def __init__(self):
        self.test_results = []
        self.test_count = 0
        self.passed_count = 0
        self.failed_count = 0
        self.start_time = None
        self.end_time = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with proper formatting."""
        symbols = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "FAILURE": "❌",
            "WARNING": "⚠️ ",
            "TEST": "🧪",
            "PHASE": "📍"
        }
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {symbols.get(level, '  ')} {message}")

    def record_test(self, test_name: str, passed: bool, details: str = ""):
        """Record a test result."""
        self.test_count += 1
        if passed:
            self.passed_count += 1
            self.log(f"Test '{test_name}' PASSED {details}", "SUCCESS")
        else:
            self.failed_count += 1
            self.log(f"Test '{test_name}' FAILED {details}", "FAILURE")

        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    async def test_environment_setup(self) -> bool:
        """Test environment and dependencies."""
        self.log("Testing environment setup...", "PHASE")

        # Check Python version
        import sys
        python_version = sys.version_info
        if python_version.major >= 3 and python_version.minor >= 8:
            self.record_test("Python version", True, f"(v{python_version.major}.{python_version.minor})")
        else:
            self.record_test("Python version", False, f"(requires 3.8+, got {python_version.major}.{python_version.minor})")
            return False

        # Check required directories
        required_dirs = [
            "orchestrator",
            "web-ui",
            "obsidian-vault"
        ]

        for dir_name in required_dirs:
            dir_path = PROJECT_ROOT / dir_name
            if dir_path.exists():
                self.record_test(f"Directory {dir_name}", True)
            else:
                self.record_test(f"Directory {dir_name}", False, "(missing)")

        # Check environment variables
        from dotenv import load_dotenv
        load_dotenv()

        env_vars = {
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        }

        for var_name, value in env_vars.items():
            if value and len(value) > 0:
                self.record_test(f"Environment variable {var_name}", True, "(set)")
            else:
                self.record_test(f"Environment variable {var_name}", False, "(not set)")

        return True

    async def test_module_imports(self) -> bool:
        """Test that all required modules can be imported."""
        self.log("Testing module imports...", "PHASE")

        modules_to_test = [
            ("orchestrator.hybrid_orchestrator_v5", "HybridOrchestratorV5"),
            ("orchestrator.hybrid_planner", "HybridPlanner"),
            ("orchestrator.agent_dispatcher", "AgentDispatcher"),
            ("orchestrator.script_executor", "ScriptExecutor"),
            ("orchestrator.claude_code_agent", "ClaudeCodeAgent"),
            ("orchestrator.gemini_agent", "GeminiAgent"),
            ("orchestrator.best_practices", "get_best_practices_db"),
        ]

        all_imports_successful = True

        for module_name, class_name in modules_to_test:
            try:
                module = __import__(module_name, fromlist=[class_name])
                if hasattr(module, class_name):
                    self.record_test(f"Import {module_name}.{class_name}", True)
                else:
                    self.record_test(f"Import {module_name}.{class_name}", False, "(class not found)")
                    all_imports_successful = False
            except ImportError as e:
                self.record_test(f"Import {module_name}.{class_name}", False, f"({str(e)})")
                all_imports_successful = False
            except Exception as e:
                self.record_test(f"Import {module_name}.{class_name}", False, f"(unexpected: {str(e)})")
                all_imports_successful = False

        return all_imports_successful

    async def test_component_initialization(self) -> bool:
        """Test initialization of core components."""
        self.log("Testing component initialization...", "PHASE")

        components_ok = True

        # Test HybridPlanner
        try:
            from orchestrator.hybrid_planner import HybridPlanner
            planner = HybridPlanner(verbose=False)
            self.record_test("HybridPlanner initialization", True)
        except Exception as e:
            self.record_test("HybridPlanner initialization", False, f"({str(e)})")
            components_ok = False

        # Test AgentDispatcher
        try:
            from orchestrator.agent_dispatcher import AgentDispatcher
            dispatcher = AgentDispatcher(verbose=False)
            self.record_test("AgentDispatcher initialization", True)
        except Exception as e:
            self.record_test("AgentDispatcher initialization", False, f"({str(e)})")
            components_ok = False

        # Test ScriptExecutor
        try:
            from orchestrator.script_executor import ScriptExecutor
            executor = ScriptExecutor(verbose=False)
            self.record_test("ScriptExecutor initialization", True)
        except Exception as e:
            self.record_test("ScriptExecutor initialization", False, f"({str(e)})")
            components_ok = False

        # Test Best Practices Database
        try:
            from orchestrator.best_practices import get_best_practices_db
            db = get_best_practices_db()
            practices = db.find_relevant_practices("Build REST API")
            if len(practices) > 0:
                self.record_test("Best Practices Database", True, f"({len(practices)} practices found)")
            else:
                self.record_test("Best Practices Database", True, "(empty but functional)")
        except Exception as e:
            self.record_test("Best Practices Database", False, f"({str(e)})")
            components_ok = False

        return components_ok

    async def test_simple_workflow(self) -> bool:
        """Test a simple workflow execution."""
        self.log("Testing simple workflow execution...", "PHASE")

        try:
            from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

            # Create orchestrator
            orchestrator = HybridOrchestratorV5(
                project_root=PROJECT_ROOT,
                verbose=False
            )

            # Simple task and plan
            goal = "Create a simple greeting function"
            claude_plan = """
            # Simple Greeting Function Plan

            ## Step 1: Create greet.py
            - Create a function that takes a name and returns a greeting
            - Add docstring

            ## Step 2: Create test_greet.py
            - Test the greeting function
            - Test edge cases
            """

            self.log("Executing simple workflow...", "INFO")

            # Execute workflow
            result = await orchestrator.execute_goal(
                user_goal=goal,
                claude_plan=claude_plan,
                context={"test_mode": True}
            )

            # Check results
            if result.success:
                self.record_test("Simple workflow execution", True,
                    f"(quality: {result.review.quality_score}/10)")

                # Check files created
                if result.implementation.files_created:
                    self.record_test("Files created", True,
                        f"({len(result.implementation.files_created)} files)")
                else:
                    self.record_test("Files created", False, "(no files created)")

                return True
            else:
                self.record_test("Simple workflow execution", False,
                    f"(error: {result.implementation.error})")
                return False

        except Exception as e:
            self.record_test("Simple workflow execution", False, f"(exception: {str(e)})")
            return False

    async def test_agent_routing(self) -> bool:
        """Test agent routing logic."""
        self.log("Testing agent routing...", "PHASE")

        try:
            from orchestrator.agent_dispatcher import AgentDispatcher, AgentType

            dispatcher = AgentDispatcher(verbose=False)

            test_cases = [
                {
                    "task": {
                        "task_id": "test-1",
                        "description": "Implement user authentication",
                        "agent": "CODE"
                    },
                    "expected": AgentType.CODEX
                },
                {
                    "task": {
                        "task_id": "test-2",
                        "description": "Review and test the implementation",
                        "agent": "REVIEW"
                    },
                    "expected": AgentType.CLAUDE
                },
                {
                    "task": {
                        "task_id": "test-3",
                        "description": "Generate documentation",
                        "agent": "DOC"
                    },
                    "expected": AgentType.GEMINI
                }
            ]

            all_correct = True

            for test_case in test_cases:
                route = dispatcher.determine_route(test_case["task"])
                if route.primary_agent == test_case["expected"]:
                    self.record_test(
                        f"Route task '{test_case['task']['description'][:30]}...'",
                        True,
                        f"(→ {test_case['expected'].value})"
                    )
                else:
                    self.record_test(
                        f"Route task '{test_case['task']['description'][:30]}...'",
                        False,
                        f"(expected {test_case['expected'].value}, got {route.primary_agent.value})"
                    )
                    all_correct = False

            return all_correct

        except Exception as e:
            self.record_test("Agent routing", False, f"(exception: {str(e)})")
            return False

    async def test_script_execution(self) -> bool:
        """Test script executor functionality."""
        self.log("Testing script execution...", "PHASE")

        try:
            from orchestrator.script_executor import ScriptExecutor, ScriptTask

            executor = ScriptExecutor(verbose=False)

            # Test echo command
            task = ScriptTask(
                task_id="test-echo",
                command="echo 'Testing workflow'",
                timeout=5.0
            )

            result = await executor.execute(task)

            if result.success and "Testing workflow" in result.stdout:
                self.record_test("Script execution (echo)", True)
            else:
                self.record_test("Script execution (echo)", False,
                    f"(error: {result.error})")
                return False

            # Test Python execution
            task = ScriptTask(
                task_id="test-python",
                command="python -c \"print('Python test')\"",
                timeout=5.0
            )

            result = await executor.execute(task)

            if result.success and "Python test" in result.stdout:
                self.record_test("Script execution (python)", True)
            else:
                self.record_test("Script execution (python)", False,
                    f"(error: {result.error})")
                return False

            return True

        except Exception as e:
            self.record_test("Script execution", False, f"(exception: {str(e)})")
            return False

    async def test_redis_events(self) -> bool:
        """Test Redis event publishing (if available)."""
        self.log("Testing Redis events...", "PHASE")

        try:
            from orchestrator.redis_publisher import publish_event

            # Try to publish a test event
            test_event = {
                "type": "test_event",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {"test": "workflow_test"}
            }

            await publish_event(test_event)
            self.record_test("Redis event publishing", True)
            return True

        except ImportError:
            self.record_test("Redis event publishing", True, "(not configured, skipped)")
            return True
        except Exception as e:
            self.record_test("Redis event publishing", False, f"({str(e)})")
            return False

    async def test_obsidian_integration(self) -> bool:
        """Test Obsidian vault integration."""
        self.log("Testing Obsidian integration...", "PHASE")

        try:
            from orchestrator.obsidian_manager import ObsidianManager

            manager = ObsidianManager()

            # Test vault structure
            vault_path = Path(manager.vault_path)
            if vault_path.exists():
                self.record_test("Obsidian vault exists", True)

                # Check key directories
                dirs_to_check = ["Agents", "Projects", "Documentation"]
                for dir_name in dirs_to_check:
                    dir_path = vault_path / dir_name
                    if dir_path.exists():
                        self.record_test(f"Obsidian {dir_name} directory", True)
                    else:
                        self.record_test(f"Obsidian {dir_name} directory", False, "(missing)")

                return True
            else:
                self.record_test("Obsidian vault exists", False, f"(path: {vault_path})")
                return False

        except ImportError:
            self.record_test("Obsidian integration", True, "(not configured, skipped)")
            return True
        except Exception as e:
            self.record_test("Obsidian integration", False, f"({str(e)})")
            return False

    async def run_all_tests(self) -> bool:
        """Run all workflow tests."""
        self.start_time = datetime.now()

        print("\n" + "=" * 80)
        print(" ORCHESTRATION SYSTEM - COMPLETE WORKFLOW TEST SUITE")
        print("=" * 80)
        print(f"\n📅 Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Run tests in sequence
        test_methods = [
            self.test_environment_setup,
            self.test_module_imports,
            self.test_component_initialization,
            self.test_agent_routing,
            self.test_script_execution,
            self.test_redis_events,
            self.test_obsidian_integration,
            self.test_simple_workflow,  # Run this last as it's most complex
        ]

        for test_method in test_methods:
            print()  # Add spacing between test phases
            try:
                await test_method()
            except Exception as e:
                self.log(f"Unexpected error in {test_method.__name__}: {e}", "FAILURE")

        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()

        # Print summary
        print("\n" + "=" * 80)
        print(" TEST SUMMARY")
        print("=" * 80)
        print(f"\n📊 Results:")
        print(f"   Total Tests:  {self.test_count}")
        print(f"   ✅ Passed:    {self.passed_count}")
        print(f"   ❌ Failed:    {self.failed_count}")
        print(f"   Success Rate: {(self.passed_count/self.test_count)*100:.1f}%")
        print(f"\n⏱️  Duration:     {duration:.2f} seconds")
        print(f"📅 Completed at: {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}")

        # Save test results
        results_file = PROJECT_ROOT / "test_results_workflow.json"
        with open(results_file, "w") as f:
            json.dump({
                "summary": {
                    "total": self.test_count,
                    "passed": self.passed_count,
                    "failed": self.failed_count,
                    "success_rate": (self.passed_count/self.test_count)*100,
                    "duration": duration,
                    "start_time": self.start_time.isoformat(),
                    "end_time": self.end_time.isoformat()
                },
                "tests": self.test_results
            }, f, indent=2)

        print(f"\n📝 Detailed results saved to: {results_file}")

        # Determine overall success
        success = self.failed_count == 0

        if success:
            print("\n✅ ALL TESTS PASSED! The workflow is functioning correctly.")
        else:
            print(f"\n⚠️  {self.failed_count} test(s) failed. Please review the output above.")

        print("=" * 80 + "\n")

        return success


async def main():
    """Main test runner."""
    test_suite = WorkflowTestSuite()
    success = await test_suite.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test suite interrupted by user.")
        exit_code = 130
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        exit_code = 1

    sys.exit(exit_code)