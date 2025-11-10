#!/usr/bin/env python3
"""Verify all integration components are in place"""

import os
import json
from pathlib import Path

print("="*80)
print("CODEX-CLAUDE INTEGRATION VERIFICATION")
print("="*80)
print()

checks = []

# 1. Check MCP config
print("1. Checking MCP configuration...")
mcp_config_path = Path.home() / ".claude" / "mcp.json"
if mcp_config_path.exists():
    with open(mcp_config_path) as f:
        config = json.load(f)
        if "chatgpt-codex" in config.get("mcpServers", {}):
            print("   ✅ MCP config exists and has chatgpt-codex server")
            checks.append(True)
        else:
            print("   ⚠️  MCP config exists but missing chatgpt-codex")
            checks.append(False)
else:
    print("   ❌ MCP config not found")
    checks.append(False)

# 2. Check MCP server file
print("2. Checking MCP server implementation...")
server_path = Path("mcp-servers/chatgpt-codex/server.py")
if server_path.exists():
    print(f"   ✅ MCP server exists ({server_path.stat().st_size} bytes)")
    checks.append(True)
else:
    print("   ❌ MCP server not found")
    checks.append(False)

# 3. Check Codex agent
print("3. Checking Codex agent...")
codex_path = Path("orchestrator/codex_agent.py")
if codex_path.exists():
    print(f"   ✅ Codex agent exists ({codex_path.stat().st_size} bytes)")
    checks.append(True)
else:
    print("   ❌ Codex agent not found")
    checks.append(False)

# 4. Check Claude review agent
print("4. Checking Claude review agent...")
claude_path = Path("orchestrator/claude_review_agent.py")
if claude_path.exists():
    print(f"   ✅ Claude review agent exists ({claude_path.stat().st_size} bytes)")
    checks.append(True)
else:
    print("   ❌ Claude review agent not found")
    checks.append(False)

# 5. Check hybrid workflow
print("5. Checking hybrid workflow...")
hybrid_path = Path("orchestrator/hybrid_codex_claude_workflow.py")
if hybrid_path.exists():
    print(f"   ✅ Hybrid workflow exists ({hybrid_path.stat().st_size} bytes)")
    checks.append(True)
else:
    print("   ❌ Hybrid workflow not found")
    checks.append(False)

# 6. Check dependencies
print("6. Checking Python dependencies...")
try:
    import mcp
    print(f"   ✅ mcp package installed (v{mcp.__version__})")
    checks.append(True)
except ImportError:
    print("   ❌ mcp package not installed")
    checks.append(False)

try:
    import openai
    print(f"   ✅ openai package installed")
    checks.append(True)
except ImportError:
    print("   ❌ openai package not installed")
    checks.append(False)

try:
    import anthropic
    print(f"   ✅ anthropic package installed")
    checks.append(True)
except ImportError:
    print("   ❌ anthropic package not installed")
    checks.append(False)

# 7. Check API keys
print("7. Checking API keys...")
if os.getenv("OPENAI_API_KEY"):
    key = os.getenv("OPENAI_API_KEY")
    print(f"   ✅ OPENAI_API_KEY set ({key[:7]}...{key[-4:]})")
    checks.append(True)
else:
    print("   ⚠️  OPENAI_API_KEY not set (required for Codex)")
    checks.append(False)

if os.getenv("ANTHROPIC_API_KEY"):
    key = os.getenv("ANTHROPIC_API_KEY")
    print(f"   ✅ ANTHROPIC_API_KEY set ({key[:7]}...{key[-4:]})")
    checks.append(True)
else:
    print("   ⚠️  ANTHROPIC_API_KEY not set (required for Claude)")
    checks.append(False)

# 8. Test imports
print("8. Testing Python imports...")
try:
    from orchestrator.codex_agent import CodexAgent
    from orchestrator.claude_review_agent import ClaudeReviewAgent
    from orchestrator.hybrid_codex_claude_workflow import run_hybrid_workflow
    print("   ✅ All modules import successfully")
    checks.append(True)
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    checks.append(False)

# Summary
print()
print("="*80)
print("SUMMARY")
print("="*80)
passed = sum(checks)
total = len(checks)
print(f"Checks passed: {passed}/{total}")
print()

if passed == total:
    print("✅ INTEGRATION COMPLETE AND READY!")
    print()
    print("Next steps:")
    print("1. Set API keys (if not set)")
    print("2. Restart Claude Code to load MCP server")
    print("3. Run: ./venv/bin/python test_codex_integration.py")
elif passed >= total - 2:
    print("⚠️  INTEGRATION MOSTLY COMPLETE")
    print()
    print("Missing:")
    if not os.getenv("OPENAI_API_KEY"):
        print("- OPENAI_API_KEY environment variable")
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("- ANTHROPIC_API_KEY environment variable")
    print()
    print("Set API keys to enable full functionality")
else:
    print("❌ INTEGRATION INCOMPLETE")
    print()
    print("Some components are missing. Check errors above.")

print()
