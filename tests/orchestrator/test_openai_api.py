#!/usr/bin/env python3
"""
OpenAI API Diagnostics Script
Tests API connection and model availability
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)

print("=" * 80)
print("OpenAI API Diagnostics")
print("=" * 80)
print()

# Step 1: Check API key
print("Step 1: Checking API Key")
print("-" * 80)
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌ ERROR: OPENAI_API_KEY not found in environment")
    sys.exit(1)
else:
    print(f"✅ API key found (length: {len(api_key)} chars)")
    print(f"   Starts with: {api_key[:10]}...")
    print(f"   Ends with: ...{api_key[-10:]}")
print()

# Step 2: Try importing openai
print("Step 2: Importing OpenAI library")
print("-" * 80)
try:
    import openai
    print(f"✅ OpenAI library imported successfully")
    print(f"   Version: {openai.__version__}")
except ImportError as e:
    print(f"❌ ERROR: Could not import openai library")
    print(f"   Error: {e}")
    print()
    print("   Fix: pip install openai")
    sys.exit(1)
print()

# Step 3: Create client
print("Step 3: Creating OpenAI Client")
print("-" * 80)
try:
    client = openai.OpenAI(api_key=api_key)
    print("✅ Client created successfully")
except Exception as e:
    print(f"❌ ERROR: Could not create OpenAI client")
    print(f"   Error: {e}")
    sys.exit(1)
print()

# Step 4: List available models
print("Step 4: Listing Available Models")
print("-" * 80)
try:
    print("Fetching models from OpenAI API...")
    models = client.models.list()
    model_ids = sorted([m.id for m in models.data])

    print(f"✅ Found {len(model_ids)} models")
    print()

    # Check for specific models
    gpt5_models = [m for m in model_ids if 'gpt-5' in m.lower()]
    gpt4_models = [m for m in model_ids if 'gpt-4' in m.lower()]
    o3_models = [m for m in model_ids if 'o3' in m.lower()]
    o1_models = [m for m in model_ids if 'o1' in m.lower()]

    print("GPT-5 models:")
    if gpt5_models:
        for m in gpt5_models:
            print(f"   ✅ {m}")
    else:
        print("   ❌ No GPT-5 models found")
    print()

    print("GPT-4 models:")
    if gpt4_models:
        for m in gpt4_models[:5]:  # Show first 5
            print(f"   ✅ {m}")
        if len(gpt4_models) > 5:
            print(f"   ... and {len(gpt4_models) - 5} more")
    else:
        print("   ❌ No GPT-4 models found")
    print()

    print("O3 models:")
    if o3_models:
        for m in o3_models:
            print(f"   ✅ {m}")
    else:
        print("   ❌ No O3 models found")
    print()

    print("O1 models:")
    if o1_models:
        for m in o1_models:
            print(f"   ✅ {m}")
    else:
        print("   ❌ No O1 models found")
    print()

    print("All available models:")
    for m in model_ids:
        print(f"   - {m}")

except Exception as e:
    print(f"❌ ERROR: Could not list models")
    print(f"   Error: {e}")
    print(f"   Type: {type(e).__name__}")

    # Check if it's an authentication error
    if "401" in str(e) or "Unauthorized" in str(e):
        print()
        print("   This looks like an authentication error.")
        print("   Your API key may be invalid or expired.")
    elif "404" in str(e):
        print()
        print("   This looks like the API endpoint was not found.")

    sys.exit(1)
print()

# Step 5: Test specific models
print("Step 5: Testing Specific Model Calls")
print("-" * 80)

models_to_test = [
    "gpt-5",           # What orchestrator tries to use
    "gpt-4o",          # Fallback option
    "gpt-4-turbo",     # Another fallback
    "o1",              # Reasoning model
    "o1-mini",         # Cheaper reasoning model
]

for model_name in models_to_test:
    print(f"Testing {model_name}...")
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Say 'test successful' if you can read this."}
            ],
            max_tokens=10
        )
        result = response.choices[0].message.content
        print(f"   ✅ {model_name} works! Response: {result}")
    except openai.NotFoundError:
        print(f"   ❌ {model_name} not found (404 error)")
    except openai.AuthenticationError:
        print(f"   ❌ {model_name} authentication failed (invalid API key)")
    except openai.PermissionDeniedError:
        print(f"   ⚠️  {model_name} exists but access denied (may need special access)")
    except Exception as e:
        print(f"   ❌ {model_name} error: {type(e).__name__}: {e}")
    print()

# Step 6: Recommendations
print("=" * 80)
print("Recommendations")
print("=" * 80)
print()

if gpt5_models:
    print("✅ GPT-5 models found. Use one of these:")
    for m in gpt5_models:
        print(f"   --reasoning-model {m}")
elif o1_models:
    print("⚠️  GPT-5 not found, but O1 models available:")
    for m in o1_models:
        print(f"   --reasoning-model {m}")
elif gpt4_models:
    print("⚠️  GPT-5 and O1 not found, but GPT-4 models available:")
    print(f"   --reasoning-model gpt-4o")
    print(f"   --reasoning-model gpt-4-turbo")
else:
    print("❌ No suitable models found. Check your API access.")

print()
print("To fix orchestrator, update the default in chatgpt_claude_cli_orchestrator.py:")
print("   Change default='gpt-5' to default='<working_model>'")
print()
