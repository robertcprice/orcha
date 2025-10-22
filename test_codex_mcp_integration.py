#!/usr/bin/env python3
"""
Test script for Codex MCP integration.

This verifies the CORRECTED approach using `codex mcp-server`.
"""

import asyncio
import sys
from pathlib import Path

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent / "orchestrator"))

from codex_mcp_agent import CodexMCPAgent, CodexTask, run_codex_mcp_agent
from claude_review_agent import ClaudeReviewAgent, ReviewRequest
from hybrid_codex_claude_mcp import run_hybrid_mcp_workflow


async def test_codex_mcp_simple():
    """Test simple Codex MCP session."""
    print("\n" + "="*80)
    print("TEST 1: Simple Codex MCP Session")
    print("="*80 + "\n")

    task = CodexTask(
        task_id="test-simple",
        title="Create Add Function",
        description="Create a simple Python function that adds two numbers",
        requirements=[
            "Function should be named 'add'",
            "Accept two parameters: a and b",
            "Return the sum of a and b",
            "Include a docstring"
        ],
        cwd=".",
        sandbox="workspace-write",
        approval_policy="never"
    )

    result = await run_codex_mcp_agent(task)

    print("\n" + "-"*80)
    print("RESULT")
    print("-"*80)
    print(f"Success: {result.success}")
    print(f"Conversation ID: {result.conversation_id}")
    print(f"Error: {result.error}")
    print("\nOutput:")
    print(result.output if result.output else "No output")
    print("-"*80)

    return result.success


async def test_hybrid_workflow():
    """Test hybrid Codex-Claude workflow."""
    print("\n" + "="*80)
    print("TEST 2: Hybrid Codex-Claude Workflow")
    print("="*80 + "\n")

    result = await run_hybrid_mcp_workflow(
        task_id="test-hybrid",
        title="Create Calculator Function",
        description="Create a Python calculator with basic operations",
        requirements=[
            "Support addition, subtraction, multiplication, division",
            "Handle division by zero gracefully",
            "Include docstrings",
            "Use clear function names"
        ],
        cwd=".",
        max_iterations=2
    )

    print("\n" + "-"*80)
    print("HYBRID WORKFLOW RESULT")
    print("-"*80)
    print(f"Success: {result.success}")
    print(f"Iterations: {result.iterations}")
    print(f"Codex Iterations: {result.codex_iterations}")
    print(f"Claude Reviews: {result.claude_reviews}")
    print(f"Quality Score: {result.quality_score:.1f}/10")
    print(f"Total Time: {result.total_time:.1f}s")
    print(f"Error: {result.error}")
    print("-"*80)

    return result.success


async def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("🧪 CODEX MCP INTEGRATION TESTS")
    print("="*80)

    # Check if Codex is available
    import subprocess
    try:
        subprocess.run(
            ["codex", "--version"],
            capture_output=True,
            check=True
        )
        print("\n✅ Codex CLI is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("\n❌ Codex CLI not found. Please install from https://github.com/anthropics/codex")
        return

    # Check MCP server
    try:
        subprocess.run(
            ["codex", "mcp-server", "--help"],
            capture_output=True,
            check=True
        )
        print("✅ Codex MCP server is available")
    except subprocess.CalledProcessError:
        print("❌ Codex MCP server not available. Update Codex CLI.")
        return

    print("\n" + "="*80)
    print("Starting tests...")
    print("="*80)

    # Test 1: Simple Codex MCP session
    test1_success = await test_codex_mcp_simple()

    # Test 2: Hybrid workflow (only if Test 1 passed and we have API keys)
    import os
    if test1_success and os.getenv("ANTHROPIC_API_KEY"):
        test2_success = await test_hybrid_workflow()
    else:
        print("\n⚠️  Skipping hybrid workflow test")
        if not test1_success:
            print("   Reason: Test 1 failed")
        if not os.getenv("ANTHROPIC_API_KEY"):
            print("   Reason: ANTHROPIC_API_KEY not set")
        test2_success = False

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Test 1 (Simple Codex MCP): {'✅ PASSED' if test1_success else '❌ FAILED'}")
    print(f"Test 2 (Hybrid Workflow): {'✅ PASSED' if test2_success else '⚠️  SKIPPED'}")
    print("="*80)

    if test1_success:
        print("\n✅ Codex MCP integration is working!")
        print("\nNext steps:")
        print("1. Set ANTHROPIC_API_KEY to test hybrid workflow")
        print("2. Restart Claude Code to load MCP server")
        print("3. Use Codex tools in Claude Code:")
        print("   - mcp__codex__codex")
        print("   - mcp__codex__codex-reply")
    else:
        print("\n❌ Integration not working. Check:")
        print("1. Codex CLI is installed and up to date")
        print("2. `codex mcp-server` command works")
        print("3. MCP SDK is installed: pip install mcp")


if __name__ == "__main__":
    asyncio.run(main())
