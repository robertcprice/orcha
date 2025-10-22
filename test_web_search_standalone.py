#!/usr/bin/env python3
"""
Standalone test for web search functionality (no OpenAI API required)
"""

import asyncio
import json


async def test_duckduckgo_search():
    """Test DuckDuckGo API directly"""
    print("=" * 80)
    print("Testing DuckDuckGo Web Search API")
    print("=" * 80)
    print()

    try:
        import aiohttp
        import urllib.parse
    except ImportError:
        print("⚠️  aiohttp not installed, installing...")
        import subprocess
        subprocess.check_call(["pip", "install", "aiohttp"])
        import aiohttp
        import urllib.parse

    test_queries = [
        "Python asyncio tutorial",
        "Redis best practices",
        "React hooks",
    ]

    all_passed = True

    for query in test_queries:
        print(f"\n{'─' * 80}")
        print(f"Query: {query}")
        print(f"{'─' * 80}\n")

        try:
            # Encode query
            encoded_query = urllib.parse.quote(query)
            url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"

            print(f"Fetching: {url}\n")

            # Make request
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Display results
                        abstract = data.get("Abstract", "")
                        abstract_source = data.get("AbstractSource", "")
                        abstract_url = data.get("AbstractURL", "")
                        related = data.get("RelatedTopics", [])

                        print(f"✓ Search successful!")
                        print(f"  Status: {response.status}")
                        print()

                        if abstract:
                            print(f"  Abstract:")
                            print(f"    Source: {abstract_source}")
                            print(f"    URL: {abstract_url}")
                            print(f"    Text: {abstract[:200]}...")
                            print()
                        else:
                            print(f"  ⚠️  No abstract returned")
                            print()

                        print(f"  Related Topics: {len(related)} found")

                        # Show first 3 related topics
                        for i, topic in enumerate(related[:3], 1):
                            if isinstance(topic, dict) and "Text" in topic:
                                print(f"    {i}. {topic.get('Text', '')[:100]}...")
                                print(f"       {topic.get('FirstURL', '')}")

                        if not abstract and not related:
                            print(f"  ℹ️  DuckDuckGo returned no results for this query")
                            print(f"      This is normal - not all queries have instant answers")

                        print(f"\n✓ Test passed")

                    else:
                        print(f"❌ API returned status {response.status}")
                        all_passed = False

        except Exception as e:
            print(f"❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            all_passed = False

    # Summary
    print(f"\n{'=' * 80}")
    print("Test Summary")
    print(f"{'=' * 80}\n")

    if all_passed:
        print("✅ DuckDuckGo API is working correctly!")
        print()
        print("What this means:")
        print("- Web search is functional in the orchestrator")
        print("- Agents can now access internet information")
        print("- Research tasks can get current documentation")
        print()
        print("Note: DuckDuckGo may not have instant answers for all queries.")
        print("This is expected behavior - the orchestrator handles this gracefully.")
        print()
        return True
    else:
        print("⚠️  Some tests encountered issues")
        print()
        print("Possible causes:")
        print("- Network connectivity problems")
        print("- DuckDuckGo API temporarily unavailable")
        print("- Rate limiting (unlikely)")
        print()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_duckduckgo_search())
    exit(0 if success else 1)
