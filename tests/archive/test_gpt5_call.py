#!/usr/bin/env python3
"""
Test GPT-5 API call without max_tokens parameter
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import openai

# Load environment variables
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌ OPENAI_API_KEY not found")
    sys.exit(1)

client = openai.OpenAI(api_key=api_key)

print("=" * 80)
print("Testing GPT-5 API Call (without max_tokens)")
print("=" * 80)
print()

# Test GPT-5 with proper parameters
try:
    print("Testing gpt-5 model...")
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'GPT-5 is working' if you can read this."}
        ],
        temperature=0.7
        # Note: NOT using max_tokens - GPT-5 doesn't support it
    )
    result = response.choices[0].message.content
    print(f"✅ GPT-5 works! Response: {result}")
    print()
except Exception as e:
    print(f"❌ GPT-5 failed: {type(e).__name__}: {e}")
    print()

# Test GPT-4o for comparison
try:
    print("Testing gpt-4o model...")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'GPT-4o is working' if you can read this."}
        ],
        temperature=0.7
    )
    result = response.choices[0].message.content
    print(f"✅ GPT-4o works! Response: {result}")
    print()
except Exception as e:
    print(f"❌ GPT-4o failed: {type(e).__name__}: {e}")
    print()

print("=" * 80)
print("Conclusion")
print("=" * 80)
print()
print("If GPT-5 works above, the orchestrator should work with:")
print("  python orchestrator/chatgpt_claude_cli_orchestrator.py --goal 'your goal' --reasoning-model gpt-5")
print()
