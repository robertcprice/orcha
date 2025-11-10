"""
Simple Demo: MCP Orchestration System
Demonstrates basic usage of the 11-node DAG workflow.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.orchestrator.mcp_orchestrator import create_orchestrator
import json
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    """Run a simple orchestration demo."""

    print("\n" + "=" * 80)
    print("MCP ORCHESTRATION SYSTEM - SIMPLE DEMO")
    print("=" * 80 + "\n")

    # Task: Build a simple calculator API
    task_name = "Simple Calculator API"
    task_description = """
    Build a simple REST API using FastAPI that provides basic calculator operations:
    - Addition
    - Subtraction
    - Multiplication
    - Division

    Requirements:
    - Use FastAPI framework
    - Add input validation
    - Include error handling for division by zero
    - Add basic unit tests
    - Include API documentation
    """

    print(f"Task: {task_name}")
    print(f"Description: {task_description.strip()}")
    print("\n" + "-" * 80 + "\n")

    # Create orchestrator with budget limit
    print("Creating MCP orchestrator...")
    orchestrator = create_orchestrator(
        mcp_servers=None,  # Use defaults
        confidence_threshold=95.0,
        budget_limit=2.0  # $2 budget limit for demo
    )
    print("✓ Orchestrator created\n")

    # Execute task
    print("Starting 11-node DAG execution...")
    print("This will run through:")
    print("  P0: Interactive Intake (Q&A)")
    print("  P1: Multi-AI Planning")
    print("  S1: Security Planning (STRIDE)")
    print("  P2: Implementation")
    print("  T1: Testing")
    print("  S2: Security Review (SAST)")
    print("  S3: Security Fixes")
    print("  P4: Refinement")
    print("  D1: Documentation")
    print("  O1: Final Ops (E2E tests)")
    print("  P6: Persistence")
    print("\n" + "-" * 80 + "\n")

    try:
        result = orchestrator.execute_task(
            task_name=task_name,
            user_task=task_description,
            metadata={"demo": True}
        )

        # Display results
        print("\n" + "=" * 80)
        print("EXECUTION COMPLETE")
        print("=" * 80 + "\n")

        if result['success']:
            print("✓ SUCCESS\n")

            # Artifacts
            print("📦 ARTIFACTS:")
            artifacts = result.get('artifacts', {})
            print(f"  Vault Path: {artifacts.get('vault_path')}")
            print(f"  Code Files: {len(artifacts.get('code_files', {}))}")
            print(f"  Test Files: {len(artifacts.get('test_files', {}))}")
            print(f"  Documentation: {len([d for d in artifacts.get('documentation', {}).values() if d])}")

            # Telemetry
            print("\n💰 COST & PERFORMANCE:")
            telemetry = result.get('telemetry', {})
            print(f"  Total Cost: ${telemetry.get('total_cost', 0):.4f}")
            print(f"  Total Tokens: {telemetry.get('total_tokens', 0):,}")
            print(f"  Total API Calls: {telemetry.get('total_calls', 0)}")

            # Quality
            print("\n✅ QUALITY METRICS:")
            quality = result.get('quality', {})
            print(f"  Final Confidence: {quality.get('final_confidence', 0):.1f}%")
            print(f"  All Gates Passed: {quality.get('all_gates_passed', False)}")
            print(f"  Security Passed: {quality.get('security_passed', False)}")

            # Learning
            print("\n📚 LEARNING:")
            learning = result.get('learning', {})
            print(f"  Failures Recorded: {len(learning.get('failures', []))}")
            print(f"  Successes Recorded: {len(learning.get('successes', []))}")
            print(f"  Improvements Suggested: {len(learning.get('improvements', []))}")

            # Save result
            result_file = Path("examples/demo_result.json")
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Full result saved to: {result_file}")

        else:
            print("✗ FAILED\n")
            print(f"Error: {result.get('error')}")
            print(f"Message: {result.get('message')}")

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        logger.error("Execution failed", exc_info=True)
        return 1

    print("\n" + "=" * 80 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
