#!/usr/bin/env python3
"""
Test if gpt-5 model is available and working
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

print("🧪 Testing gpt-5 model...")
print("   (This might fail if gpt-5 doesn't exist or requires special access)")

try:
    import time
    start = time.time()

    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "Say 'hello' and nothing else"}
        ],
        max_tokens=10,
        timeout=15.0  # 15 second timeout
    )

    elapsed = time.time() - start
    message = response.choices[0].message.content

    print(f"✅ gpt-5 call successful!")
    print(f"   Response: {message}")
    print(f"   Time: {elapsed:.2f}s")
    print(f"   Model: {response.model}")

except openai.APIError as e:
    print(f"❌ API Error: {e}")
    print(f"   Status: {e.status_code if hasattr(e, 'status_code') else 'N/A'}")
    print(f"   Type: {e.type if hasattr(e, 'type') else 'N/A'}")
    print()
    print("💡 This likely means:")
    print("   - 'gpt-5' is not a valid model name, OR")
    print("   - Your account doesn't have access to gpt-5, OR")
    print("   - gpt-5 is not available yet (it's rumored but not confirmed)")
    print()
    print("   Try using gpt-4o instead (recommended)")
    sys.exit(1)

except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ gpt-5 is available!")
