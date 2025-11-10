#!/usr/bin/env python3
"""
Test Multi-AI Research Module

Tests the integration of multiple AI providers (OpenAI, Grok, Claude)
for comprehensive research and consensus building.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root for imports
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.multi_ai_research import MultiAIResearch, research_with_multiple_ai


async def test_basic_research():
    """Test basic multi-AI research."""

    print("=" * 60)
    print("TEST 1: Basic Multi-AI Research")
    print("=" * 60)

    research = MultiAIResearch()

    # Check provider status
    status = research.get_provider_status()
    print("\n📊 Provider Status:")
    for provider, available in status.items():
        status_icon = "✅" if available else "❌"
        print(f"  {status_icon} {provider}")

    available_providers = [p for p, avail in status.items() if avail]

    if not available_providers:
        print("\n❌ No AI providers available. Please set API keys:")
        print("  - OPENAI_API_KEY")
        print("  - GROK_API_KEY or XAI_API_KEY")
        print("  - ANTHROPIC_API_KEY")
        return False

    # Test research
    topic = "What are the best practices for async/await in Python?"

    print(f"\n📖 Topic: {topic}")
    print(f"🤖 Using providers: {', '.join(available_providers)}\n")

    result = await research.research_topic(
        topic=topic,
        providers=available_providers,
        synthesize=True
    )

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    # Show individual responses
    print("\n📝 Individual Responses:")
    for i, response in enumerate(result.responses, 1):
        print(f"\n{i}. {response.provider.upper()} ({response.model}):")
        print("-" * 60)
        if response.error:
            print(f"❌ Error: {response.error}")
        else:
            preview = response.content[:300] + "..." if len(response.content) > 300 else response.content
            print(preview)
        print()

    # Show synthesis
    if result.synthesis:
        print("\n🧠 SYNTHESIZED ANSWER:")
        print("=" * 60)
        print(result.synthesis)
        print()

    # Show consensus
    if result.consensus_points:
        print("\n✅ CONSENSUS POINTS:")
        for point in result.consensus_points:
            print(f"  • {point}")
        print()

    # Show divergent views
    if result.divergent_points:
        print("\n🔀 DIFFERENT PERSPECTIVES:")
        for point in result.divergent_points:
            print(f"  • {point}")
        print()

    print("=" * 60)
    print("TEST 1 COMPLETE")
    print("=" * 60)

    return True


async def test_grok_specific():
    """Test Grok specifically if available."""

    print("\n" + "=" * 60)
    print("TEST 2: Grok-Specific Test")
    print("=" * 60)

    grok_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")

    if not grok_key:
        print("\n⚠️  Grok API key not found. Set GROK_API_KEY or XAI_API_KEY to test Grok.")
        print("   Skipping Grok-specific test.")
        return False

    print(f"\n✅ Grok API key found: {grok_key[:8]}...")

    research = MultiAIResearch(grok_api_key=grok_key)

    topic = "What is X.AI Grok and what makes it unique?"

    print(f"\n📖 Topic: {topic}")
    print("🤖 Using provider: Grok only\n")

    result = await research.research_topic(
        topic=topic,
        providers=["grok"],
        synthesize=False
    )

    print("\n" + "=" * 60)
    print("GROK RESPONSE")
    print("=" * 60)

    if result.responses:
        response = result.responses[0]
        if response.error:
            print(f"\n❌ Error: {response.error}")
            return False
        else:
            print(f"\n✅ Success!")
            print(f"Model: {response.model}")
            print(f"Length: {len(response.content)} chars")
            print("\nContent:")
            print("-" * 60)
            print(response.content)
            print("-" * 60)

    print("\n" + "=" * 60)
    print("TEST 2 COMPLETE")
    print("=" * 60)

    return True


async def test_convenience_function():
    """Test the convenience function."""

    print("\n" + "=" * 60)
    print("TEST 3: Convenience Function")
    print("=" * 60)

    topic = "What are the differences between Python asyncio and threading?"

    print(f"\n📖 Topic: {topic}")
    print("🤖 Using all available providers\n")

    try:
        result = await research_with_multiple_ai(topic)

        print("\n✅ Research complete!")
        print(f"Providers used: {len(result.responses)}")

        successful = [r for r in result.responses if not r.error]
        print(f"Successful responses: {len(successful)}")

        if result.synthesis:
            print(f"\nSynthesis preview:")
            preview = result.synthesis[:200] + "..." if len(result.synthesis) > 200 else result.synthesis
            print(preview)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

    print("\n" + "=" * 60)
    print("TEST 3 COMPLETE")
    print("=" * 60)

    return True


async def main():
    """Run all tests."""

    print("\n" + "=" * 60)
    print("MULTI-AI RESEARCH TEST SUITE")
    print("=" * 60)

    results = {
        "basic_research": False,
        "grok_specific": False,
        "convenience_function": False
    }

    # Test 1: Basic research
    try:
        results["basic_research"] = await test_basic_research()
    except Exception as e:
        print(f"\n❌ Test 1 failed: {e}")

    # Test 2: Grok specific
    try:
        results["grok_specific"] = await test_grok_specific()
    except Exception as e:
        print(f"\n❌ Test 2 failed: {e}")

    # Test 3: Convenience function
    try:
        results["convenience_function"] = await test_convenience_function()
    except Exception as e:
        print(f"\n❌ Test 3 failed: {e}")

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")

    passed_count = sum(1 for p in results.values() if p)
    total_count = len(results)

    print(f"\nTotal: {passed_count}/{total_count} tests passed")

    print("\n" + "=" * 60)

    return passed_count == total_count


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
