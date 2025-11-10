#!/usr/bin/env python3
"""Quick test of Codex-Claude integration."""

from __future__ import annotations

import asyncio
import os
import sys
import unittest
from importlib import import_module
from typing import Iterable, List

PROJECT_ROOT = os.path.dirname(__file__)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _missing_api_keys() -> List[str]:
    """Return a list of required API keys that are not present in the environment."""
    return [key for key in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY") if not os.getenv(key)]


def _load_workflow_runner():
    """Return the hybrid workflow runner if available, otherwise None."""
    try:
        module = import_module("orchestrator.hybrid_codex_claude_workflow")
    except ModuleNotFoundError:
        return None
    return getattr(module, "run_hybrid_workflow", None)


async def _execute_sample_workflow(verbose: bool = False):
    """Run the sample hybrid workflow used for integration verification."""
    if verbose:
        print("=" * 80)
        print("TESTING CODEX-CLAUDE HYBRID WORKFLOW")
        print("=" * 80)
        print()
        print("Task: Create a simple Python function to calculate fibonacci numbers")
        print()

    workflow = _load_workflow_runner()
    if workflow is None:
        raise ModuleNotFoundError(
            "orchestrator.hybrid_codex_claude_workflow.run_hybrid_workflow is not available."
        )

    result = await workflow(
        task_id="test-fibonacci",
        title="Create fibonacci calculator",
        description="Create a Python function that calculates fibonacci numbers efficiently",
        requirements=[
            "Function should accept a number n",
            "Return the nth fibonacci number",
            "Handle edge cases (n=0, n=1)",
            "Include error handling for negative numbers",
            "Add docstring with examples",
        ],
        context={"language": "Python", "style": "clean and simple"},
        max_iterations=2,
    )

    if verbose:
        print("\n" + "=" * 80)
        print("TEST RESULTS")
        print("=" * 80)
        print(f"Success: {result.success}")
        print(f"Iterations: {result.iterations}")
        print(f"Quality Score: {result.quality_score:.1f}/10")
        print(f"Total Time: {result.total_time:.1f}s")
        print(f"Codex Iterations: {result.codex_iterations}")
        print(f"Claude Reviews: {result.claude_reviews}")

        if result.error:
            print(f"\nError: {result.error}")

        if result.final_code:
            print(f"\n{'=' * 80}")
            print("FINAL CODE")
            print("=" * 80)
            print(result.final_code)

        if result.final_output:
            print(f"\n{'=' * 80}")
            print("EXECUTION OUTPUT")
            print("=" * 80)
            print(result.final_output[:500])

    return result


class CodexClaudeIntegrationTest(unittest.TestCase):
    """Integration test for the Codex-Claude hybrid workflow."""

    @unittest.skipUnless(
        not _missing_api_keys() and _load_workflow_runner() is not None,
        "OPENAI_API_KEY and ANTHROPIC_API_KEY must be set and hybrid workflow module must be present.",
    )
    def test_hybrid_workflow_runs_successfully(self):
        """Ensure the hybrid workflow completes successfully when API keys are available."""
        result = asyncio.run(_execute_sample_workflow(verbose=False))
        self.assertTrue(result.success, f"Hybrid workflow failed: {result.error or 'Unknown error'}")


def _print_missing_keys(keys: Iterable[str]) -> None:
    """Print helpful instructions for any missing API keys when running as a script."""
    for key in keys:
        print(f"❌ {key} not set")
        if key == "OPENAI_API_KEY":
            print("Please set it with: export OPENAI_API_KEY='sk-your-key'")
        if key == "ANTHROPIC_API_KEY":
            print("Please set it with: export ANTHROPIC_API_KEY='sk-ant-your-key'")


if __name__ == "__main__":
    missing = _missing_api_keys()
    if missing:
        _print_missing_keys(missing)
        sys.exit(1)

    print("✅ API keys found\n")

    try:
        workflow_result = asyncio.run(_execute_sample_workflow(verbose=True))
        sys.exit(0 if workflow_result.success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as exc:
        print(f"\n❌ Test failed with error: {exc}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
