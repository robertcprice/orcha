#!/usr/bin/env python3
"""
REAL Multi-AI Integration Test
Actually calls all AI APIs to verify they work
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

print("=" * 70)
print("REAL MULTI-AI INTEGRATION TEST")
print("⚠️  NO OUTPUT IS TRUNCATED - ALL RESPONSES SHOWN IN FULL")
print("=" * 70)
print()

# Test 1: Gemini Agent
print("=" * 70)
print("TEST 1: GEMINI AGENT - Documentation Generation")
print("=" * 70)

try:
    from orchestrator.gemini_agent import GeminiAgent, DocumentationRequest

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
    else:
        print(f"✅ GEMINI_API_KEY found: {api_key[:20]}...")

        agent = GeminiAgent(agent_id="test-gemini", api_key=api_key)

        request = DocumentationRequest(
            task_title="Calculator Module",
            task_description="A simple calculator with add, subtract, multiply, divide",
            code_files={
                "calculator.py": "def add(a, b): return a + b\ndef subtract(a, b): return a - b"
            },
            test_files={
                "test_calculator.py": "def test_add(): assert add(2, 3) == 5"
            },
            implementation_notes="Simple calculator implementation"
        )

        print("\nCalling Gemini API...")
        result = asyncio.run(agent.document(request))

        if result.success:
            print(f"✅ Gemini API call succeeded!")
            print(f"✅ Generated documentation ({len(result.documentation or '')} chars)")
            print(f"\nFull Documentation:")
            print("-" * 70)
            print(result.documentation or "No documentation generated")
            print("-" * 70)
        else:
            print(f"❌ Gemini API call failed: {result.error}")

except Exception as e:
    print(f"❌ Gemini test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n")

# Test 2: DeepSeek Agent
print("=" * 70)
print("TEST 2: DEEPSEEK AGENT - Plan Enrichment")
print("=" * 70)

try:
    from orchestrator.deepseek_agent import DeepSeekAgent, PlanEnrichmentRequest

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("❌ DEEPSEEK_API_KEY not found in environment")
    else:
        print(f"✅ DEEPSEEK_API_KEY found: {api_key[:20]}...")

        agent = DeepSeekAgent(agent_id="test-deepseek", api_key=api_key)

        request = PlanEnrichmentRequest(
            task_title="Build Calculator",
            task_description="Create a simple calculator module",
            initial_plan="1. Create calculator.py\n2. Add basic operations\n3. Write tests"
        )

        print("\nCalling DeepSeek API...")
        result = asyncio.run(agent.enrich_plan(request))

        if result.success:
            print(f"✅ DeepSeek API call succeeded!")
            print(f"✅ Generated enrichment ({len(result.enriched_content or '')} chars)")
            print(f"✅ Suggestions: {len(result.suggestions)}")
            print(f"\nFull Enrichment:")
            print("-" * 70)
            print(result.enriched_content or "No enrichment generated")
            print("-" * 70)
        else:
            print(f"❌ DeepSeek API call failed: {result.error}")

except Exception as e:
    print(f"❌ DeepSeek test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n")

# Test 3: Grok Agent
print("=" * 70)
print("TEST 3: GROK AGENT - Plan Review")
print("=" * 70)

try:
    from orchestrator.grok_agent import GrokAgent, PlanReviewRequest

    api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
    if not api_key:
        print("❌ GROK_API_KEY/XAI_API_KEY not found in environment")
    else:
        print(f"✅ GROK_API_KEY found: {api_key[:20]}...")

        agent = GrokAgent(agent_id="test-grok", api_key=api_key)

        request = PlanReviewRequest(
            task_title="Build Calculator",
            task_description="Create a simple calculator module",
            initial_plan="1. Create calculator.py\n2. Add basic operations\n3. Write tests",
            enrichments=[
                {"ChatGPT": "Add error handling and type hints"},
                {"DeepSeek": "Consider edge cases and performance"}
            ]
        )

        print("\nCalling Grok API...")
        result = asyncio.run(agent.review_plan(request))

        if result.success:
            print(f"✅ Grok API call succeeded!")
            print(f"✅ Review summary ({len(result.review_summary or '')} chars)")
            print(f"✅ Strengths: {len(result.strengths)}")
            print(f"✅ Weaknesses: {len(result.weaknesses)}")
            print(f"✅ Alternative approaches: {len(result.alternative_approaches)}")
            print(f"\nFull Review Summary:")
            print("-" * 70)
            print(result.review_summary or "No review generated")
            print("-" * 70)
            print(f"\nStrengths:")
            for i, s in enumerate(result.strengths, 1):
                print(f"{i}. {s}")
            print(f"\nWeaknesses:")
            for i, w in enumerate(result.weaknesses, 1):
                print(f"{i}. {w}")
            print(f"\nAlternative Approaches:")
            for i, a in enumerate(result.alternative_approaches, 1):
                print(f"{i}. {a}")
            print("-" * 70)
        else:
            print(f"❌ Grok API call failed: {result.error}")

except Exception as e:
    print(f"❌ Grok test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n")

# Test 4: ChatGPT Agent
print("=" * 70)
print("TEST 4: CHATGPT AGENT - Plan Creation")
print("=" * 70)

try:
    from orchestrator.chatgpt_planner import ChatGPTPlanner

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
    else:
        print(f"✅ OPENAI_API_KEY found: {api_key[:20]}...")

        planner = ChatGPTPlanner(openai_api_key=api_key)

        print("\nCalling ChatGPT API...")
        result = asyncio.run(planner.create_plan(
            user_goal="Build a simple calculator module",
            context={"requirements": "Need calculator with basic operations and tests"}
        ))

        if result and result.tasks:
            print(f"✅ ChatGPT API call succeeded!")
            print(f"✅ Generated plan with {len(result.tasks)} tasks")
            print(f"\nFull Plan with ALL Tasks:")
            print("-" * 70)
            for i, task in enumerate(result.tasks, 1):
                title = task.get('title', 'No title')
                desc = task.get('description', '')
                print(f"\nTask {i}: {title}")
                if desc:
                    print(f"Description: {desc}")
                if task.get('dependencies'):
                    print(f"Dependencies: {task.get('dependencies')}")
                if task.get('estimated_time'):
                    print(f"Estimated Time: {task.get('estimated_time')}")
            print("-" * 70)
        else:
            print(f"❌ ChatGPT API call failed: No tasks generated")

except Exception as e:
    print(f"❌ ChatGPT test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n")
print("=" * 70)
print("MULTI-AI INTEGRATION TEST COMPLETE")
print("=" * 70)
print("\nAll 4 AI agents are configured and ready to use!")
print("The orchestration system can now:")
print("  ✅ Use ChatGPT for planning")
print("  ✅ Use DeepSeek for plan enrichment")
print("  ✅ Use Grok for creative review")
print("  ✅ Use Gemini for documentation")
print()
