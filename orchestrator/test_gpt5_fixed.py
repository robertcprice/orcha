#!/usr/bin/env python3
"""
Test if gpt-5 works with correct parameters
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import openai

# Load environment
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
load_dotenv(env_path)

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("❌ OPENAI_API_KEY not found")
    sys.exit(1)

client = openai.OpenAI(api_key=api_key)

print("🧪 Testing gpt-5 with correct parameters...")
print("   (gpt-5 uses 'max_completion_tokens' instead of 'max_tokens')")
print()

try:
    import time
    start = time.time()

    # Try with no token limit first to see if it works
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'hello' and nothing else"}
        ],
        timeout=30.0  # 30 second timeout
    )

    elapsed = time.time() - start
    message = response.choices[0].message.content

    print(f"✅ gpt-5 call successful!")
    print(f"   Response: {message}")
    print(f"   Time: {elapsed:.2f}s")
    print(f"   Model: {response.model}")

except openai.APITimeoutError as e:
    print(f"❌ Timeout: Request took longer than 30 seconds")
    print(f"   Error: {e}")
    print()
    print("💡 gpt-5 might be very slow or unavailable")
    sys.exit(1)

except openai.APIError as e:
    print(f"❌ API Error: {e}")
    print(f"   Status: {e.status_code if hasattr(e, 'status_code') else 'N/A'}")
    sys.exit(1)

except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ gpt-5 works!")
