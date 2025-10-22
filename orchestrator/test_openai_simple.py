#!/usr/bin/env python3
"""
Simple OpenAI API test to diagnose connection issues
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
load_dotenv(env_path)

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("❌ OPENAI_API_KEY not found in environment")
    sys.exit(1)

print(f"✅ API Key loaded: {api_key[:10]}...{api_key[-4:]}")
print(f"   Length: {len(api_key)} chars")
print()

# Test OpenAI import
try:
    import openai
    print(f"✅ OpenAI package imported (version {openai.__version__})")
except ImportError as e:
    print(f"❌ Failed to import openai: {e}")
    sys.exit(1)

# Test client creation
try:
    client = openai.OpenAI(api_key=api_key)
    print("✅ OpenAI client created")
except Exception as e:
    print(f"❌ Failed to create client: {e}")
    sys.exit(1)

# Test simple API call
print("\n🧪 Testing API call with gpt-4o-mini...")
print("   (This should complete in 2-5 seconds)")

try:
    import time
    start = time.time()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": "Say 'hello' and nothing else"}
        ],
        max_tokens=10,
        timeout=10.0  # 10 second timeout
    )

    elapsed = time.time() - start
    message = response.choices[0].message.content

    print(f"✅ API call successful!")
    print(f"   Response: {message}")
    print(f"   Time: {elapsed:.2f}s")
    print(f"   Model: {response.model}")

except Exception as e:
    print(f"❌ API call failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ All tests passed!")
