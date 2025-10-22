#!/usr/bin/env python3
"""Quick test of Codex-Claude integration"""

import asyncio
import os
import sys

# Check for API keys
if not os.getenv("OPENAI_API_KEY"):
    print("❌ OPENAI_API_KEY not set")
    print("Please set it with: export OPENAI_API_KEY='sk-your-key'")
    sys.exit(1)

if not os.getenv("ANTHROPIC_API_KEY"):
    print("❌ ANTHROPIC_API_KEY not set")
    print("Please set it with: export ANTHROPIC_API_KEY='sk-ant-your-key'")
    sys.exit(1)

print("✅ API keys found\n")

# Import the hybrid workflow
sys.path.insert(0, os.path.dirname(__file__))
from orchestrator.hybrid_codex_claude_workflow import run_hybrid_workflow

async def test():
    print("="*80)
    print("TESTING CODEX-CLAUDE HYBRID WORKFLOW")
    print("="*80)
    print()
    
    print("Task: Create a simple Python function to calculate fibonacci numbers")
    print()
    
    result = await run_hybrid_workflow(
        task_id="test-fibonacci",
        title="Create fibonacci calculator",
        description="Create a Python function that calculates fibonacci numbers efficiently",
        requirements=[
            "Function should accept a number n",
            "Return the nth fibonacci number",
            "Handle edge cases (n=0, n=1)",
            "Include error handling for negative numbers",
            "Add docstring with examples"
        ],
        context={"language": "Python", "style": "clean and simple"},
        max_iterations=2
    )
    
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    print(f"Success: {result.success}")
    print(f"Iterations: {result.iterations}")
    print(f"Quality Score: {result.quality_score:.1f}/10")
    print(f"Total Time: {result.total_time:.1f}s")
    print(f"Codex Iterations: {result.codex_iterations}")
    print(f"Claude Reviews: {result.claude_reviews}")
    
    if result.error:
        print(f"\nError: {result.error}")
    
    if result.final_code:
        print(f"\n{'='*80}")
        print("FINAL CODE")
        print("="*80)
        print(result.final_code)
    
    if result.final_output:
        print(f"\n{'='*80}")
        print("EXECUTION OUTPUT")
        print("="*80)
        print(result.final_output[:500])
    
    return result.success

if __name__ == "__main__":
    try:
        success = asyncio.run(test())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
