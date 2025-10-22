#!/usr/bin/env python3
"""
Test web search functionality in Hybrid Orchestrator V4
"""

import asyncio
import json
from pathlib import Path
from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4
import os


async def test_web_search():
    """Test the web search capability"""
    print("=" * 80)
    print("Testing Web Search Functionality")
    print("=" * 80)
    print()

    # Initialize orchestrator
    project_root = Path(__file__).parent
    openai_key = os.getenv("OPENAI_API_KEY")

    if not openai_key:
        print("❌ OPENAI_API_KEY not set")
        return False

    orchestrator = HybridOrchestratorV4(
        project_root=project_root,
        openai_api_key=openai_key,
        gpt_model="gpt-4"
    )

    # Test queries
    test_queries = [
        "Python asyncio tutorial",
        "React hooks documentation",
        "Redis connection pooling best practices",
    ]

    all_passed = True

    for query in test_queries:
        print(f"\n{'─' * 80}")
        print(f"Testing query: {query}")
        print(f"{'─' * 80}\n")

        try:
            # Perform web search
            results = await orchestrator._perform_web_search(
                query=query,
                verbose=True,
                max_results=3
            )

            # Check results
            if "error" in results:
                print(f"❌ Search failed: {results['error']}")
                all_passed = False
                continue

            # Display results
            print(f"\n✓ Search completed successfully")
            print(f"  Query: {results.get('query', 'N/A')}")
            print(f"  Abstract: {results.get('abstract', 'No abstract')[:150]}...")

            sources = results.get('sources', [])
            print(f"  Sources found: {len(sources)}")

            if sources:
                print(f"\n  Source details:")
                for i, source in enumerate(sources[:3], 1):
                    print(f"    {i}. {source.get('title', 'No title')[:80]}")
                    print(f"       URL: {source.get('url', 'No URL')}")
                    print(f"       Snippet: {source.get('snippet', 'No snippet')[:100]}...")
                    print()
            else:
                print(f"  ⚠️  No sources returned (DuckDuckGo may not have results)")

            # Consider test passed if no error
            print(f"✓ Test passed for query: {query}")

        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            all_passed = False

    # Summary
    print(f"\n{'=' * 80}")
    print("Test Summary")
    print(f"{'=' * 80}\n")

    if all_passed:
        print("✅ All web search tests passed!")
        print()
        print("Next steps:")
        print("1. Web search is ready to use in orchestration tasks")
        print("2. Submit a task requiring web search via the UI")
        print("3. Check agents page to see web search activity")
        print()
        return True
    else:
        print("⚠️  Some tests failed")
        print()
        print("Common issues:")
        print("- aiohttp not installed (will auto-install on first run)")
        print("- Network connectivity issues")
        print("- DuckDuckGo API temporarily unavailable")
        print()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_web_search())
    exit(0 if success else 1)
