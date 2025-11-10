#!/usr/bin/env python3
"""
Test the complete unified orchestration flow:
1. Multi-AI enrichment
2. Codex implementation
3. Claude review
4. Gemini documentation
5. Obsidian storage
"""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path.cwd()))

from orchestrator.unified_orchestrator import UnifiedOrchestrator

async def test_complete_flow():
    print("\n" + "="*70)
    print("TESTING COMPLETE UNIFIED ORCHESTRATION FLOW")
    print("="*70 + "\n")

    # Define a simple test task
    user_goal = "Create a simple greeting function in Python"
    claude_plan = """1. Create a greet.py file with a greet() function
2. The function should take a name parameter and return a greeting
3. Add type hints and docstrings
4. Create tests in test_greet.py
5. Document the usage"""

    print(f"Goal: {user_goal}")
    print(f"Claude Plan:\n{claude_plan}\n")
    print("="*70 + "\n")

    # Initialize orchestrator
    project_root = Path.cwd()
    orchestrator = UnifiedOrchestrator(
        project_root=project_root,
        verbose=True,
        max_refinement_iterations=2
    )

    print("🚀 Starting unified orchestration...\n")

    try:
        result = await orchestrator.execute_goal(
            user_goal=user_goal,
            claude_plan=claude_plan,
            context={"test_mode": True},
            task_id="test_unified_flow_001"
        )

        print("\n" + "="*70)
        print("ORCHESTRATION COMPLETE")
        print("="*70)
        print(f"✅ Success: {result['success']}")
        print(f"📊 Quality Score: {result['quality_score']}/10")
        print(f"📁 Files Created: {len(result['implementation']['files_created'])}")
        print(f"🔄 Refinement Iterations: {result['refinement']['iterations']}")
        print(f"💰 Total Cost: ${result['cost']:.4f}")
        print(f"✅ Approved: {result['review']['approved']}")

        print("\n" + "="*70)
        print("ENRICHMENT DETAILS")
        print("="*70)
        print(f"Confidence: {result['enrichment']['confidence']}/10")
        print(f"AI Contributors: {result['enrichment']['ai_contributors']}")
        print(f"Risks: {len(result['enrichment']['risks'])}")

        print("\n" + "="*70)
        print("IMPLEMENTATION DETAILS")
        print("="*70)
        for file in result['implementation']['files_created']:
            print(f"  📄 {file}")

        print("\n" + "="*70)
        print("REVIEW DETAILS")
        print("="*70)
        print(f"Quality Score: {result['review']['quality_score']}/10")
        print(f"Issues: {len(result['review']['issues'])}")
        if result['review']['issues']:
            for issue in result['review']['issues']:
                print(f"  ⚠️  {issue}")

        print("\n" + "="*70)
        print("DOCUMENTATION")
        print("="*70)
        print(f"Docs Generated: {len(result['documentation'])} files")
        for doc_file, content in result['documentation'].items():
            print(f"  📚 {doc_file} ({len(content)} chars)")

        return result

    except Exception as e:
        print("\n" + "="*70)
        print("ORCHESTRATION FAILED")
        print("="*70)
        print(f"❌ Error: {e}")

        import traceback
        traceback.print_exc()

        return None

if __name__ == "__main__":
    result = asyncio.run(test_complete_flow())

    if result and result['success']:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)
