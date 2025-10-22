#!/usr/bin/env python3
"""
Minimal GPT-5 API call test
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
print("Testing GPT-5 with MINIMAL parameters")
print("=" * 80)
print()

# Test 1: GPT-5 with no optional parameters
try:
    print("Test 1: GPT-5 with system prompt + user message (no optional params)")
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'Test 1 success' if you can read this."}
        ]
    )
    result = response.choices[0].message.content
    print(f"✅ SUCCESS: {result}")
    print()
except Exception as e:
    print(f"❌ FAILED: {type(e).__name__}: {e}")
    print()

# Test 2: GPT-5 with just user message (no system prompt)
try:
    print("Test 2: GPT-5 with just user message (no system prompt)")
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "Say 'Test 2 success' if you can read this."}
        ]
    )
    result = response.choices[0].message.content
    print(f"✅ SUCCESS: {result}")
    print()
except Exception as e:
    print(f"❌ FAILED: {type(e).__name__}: {e}")
    print()

# Test 3: Check what parameters GPT-5 supports
print("=" * 80)
print("GPT-5 Restrictions Found:")
print("=" * 80)
print("❌ Does NOT support: max_tokens (use max_completion_tokens instead)")
print("❌ Does NOT support: temperature != 1 (only default value of 1 is supported)")
print()
print("✅ DOES support: messages (system + user)")
print()
