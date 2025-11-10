#!/usr/bin/env python3
"""
Integration Verification Script

Verifies that all Claude commands, skills, and utilities are properly installed
and configured.

Usage:
    python3 scripts/verify_integration.py
"""

import sys
from pathlib import Path
from typing import List, Tuple

PROJECT_ROOT = Path(__file__).parent.parent

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_file(path: Path, description: str) -> bool:
    """Check if a file exists."""
    if path.exists():
        print(f"  {GREEN}✓{RESET} {description}")
        return True
    else:
        print(f"  {RED}✗{RESET} {description} - NOT FOUND")
        return False

def check_directory(path: Path, description: str) -> bool:
    """Check if a directory exists."""
    if path.exists() and path.is_dir():
        file_count = len(list(path.iterdir()))
        print(f"  {GREEN}✓{RESET} {description} ({file_count} items)")
        return True
    else:
        print(f"  {RED}✗{RESET} {description} - NOT FOUND")
        return False

def check_executable(path: Path, description: str) -> bool:
    """Check if a file is executable."""
    if path.exists():
        import os
        if os.access(path, os.X_OK):
            print(f"  {GREEN}✓{RESET} {description} - executable")
            return True
        else:
            print(f"  {YELLOW}⚠{RESET} {description} - exists but not executable")
            return False
    else:
        print(f"  {RED}✗{RESET} {description} - NOT FOUND")
        return False

def verify_commands() -> Tuple[int, int]:
    """Verify slash commands."""
    print(f"\n{BLUE}📋 Slash Commands{RESET}")
    print("━" * 50)

    commands_dir = PROJECT_ROOT / ".claude" / "commands"
    passed = 0
    total = 0

    commands = [
        ("contextualize.md", "Contextualize command"),
        ("push.md", "Push command"),
        ("listtasks.md", "List tasks command"),
        ("taskstatus.md", "Task status command"),
        ("spawn-agent.md", "Spawn agent command"),
    ]

    for filename, description in commands:
        total += 1
        if check_file(commands_dir / filename, description):
            passed += 1

    return passed, total

def verify_skills() -> Tuple[int, int]:
    """Verify skills."""
    print(f"\n{BLUE}🧠 Skills{RESET}")
    print("━" * 50)

    skills_dir = PROJECT_ROOT / ".claude" / "skills"
    passed = 0
    total = 0

    skills = [
        ("multi-ai.md", "Multi-AI skill"),
        ("orchestration.md", "Orchestration skill"),
        ("README.md", "Skills README (updated)"),
    ]

    for filename, description in skills:
        total += 1
        if check_file(skills_dir / filename, description):
            passed += 1

    return passed, total

def verify_scripts() -> Tuple[int, int]:
    """Verify utility scripts."""
    print(f"\n{BLUE}⚙️  Utility Scripts{RESET}")
    print("━" * 50)

    scripts_dir = PROJECT_ROOT / "scripts"
    passed = 0
    total = 0

    scripts = [
        ("list_tasks.py", "List tasks script"),
        ("check_task.py", "Check task script"),
        ("spawn_agent.py", "Spawn agent script"),
        ("verify_integration.py", "Verify integration script"),
    ]

    for filename, description in scripts:
        total += 1
        if check_executable(scripts_dir / filename, description):
            passed += 1

    return passed, total

def verify_agents() -> Tuple[int, int]:
    """Verify agent files."""
    print(f"\n{BLUE}🤖 Agent Files{RESET}")
    print("━" * 50)

    orchestrator_dir = PROJECT_ROOT / "orchestrator"
    passed = 0
    total = 0

    agents = [
        ("hybrid_orchestrator_v5.py", "Hybrid Orchestrator V5"),
        ("claude_code_agent.py", "Claude Code Agent"),
        ("codex_mcp_agent.py", "Codex MCP Agent"),
        ("chatgpt_planner.py", "ChatGPT Planner"),
        ("gemini_agent.py", "Gemini Agent"),
        ("deepseek_agent.py", "DeepSeek Agent"),
        ("grok_agent.py", "Grok Agent"),
    ]

    for filename, description in agents:
        total += 1
        if check_file(orchestrator_dir / filename, description):
            passed += 1

    return passed, total

def verify_documentation() -> Tuple[int, int]:
    """Verify documentation."""
    print(f"\n{BLUE}📚 Documentation{RESET}")
    print("━" * 50)

    passed = 0
    total = 0

    docs = [
        ("CLAUDE_COMMANDS_INTEGRATION.md", "Integration Guide"),
        ("V5_ARCHITECTURE.md", "V5 Architecture"),
        ("DOCUMENTATION.md", "Main Documentation"),
    ]

    for filename, description in docs:
        total += 1
        if check_file(PROJECT_ROOT / filename, description):
            passed += 1

    return passed, total

def verify_directories() -> Tuple[int, int]:
    """Verify required directories."""
    print(f"\n{BLUE}📁 Required Directories{RESET}")
    print("━" * 50)

    passed = 0
    total = 0

    dirs = [
        (".claude", "Claude config directory"),
        (".claude/commands", "Commands directory"),
        (".claude/skills", "Skills directory"),
        ("scripts", "Scripts directory"),
        ("orchestrator", "Orchestrator directory"),
        ("obsidian-vault", "Obsidian vault"),
        ("projects/Smart Market Solutions", "Project directory"),
    ]

    for dirname, description in dirs:
        total += 1
        if check_directory(PROJECT_ROOT / dirname, description):
            passed += 1

    return passed, total

def check_env_vars():
    """Check environment variables."""
    print(f"\n{BLUE}🔐 Environment Variables{RESET}")
    print("━" * 50)

    import os

    env_vars = [
        ("OPENAI_API_KEY", "OpenAI API"),
        ("ANTHROPIC_API_KEY", "Anthropic API"),
        ("GOOGLE_API_KEY", "Google Gemini API"),
        ("DEEPSEEK_API_KEY", "DeepSeek API (optional)"),
        ("XAI_API_KEY", "xAI Grok API (optional)"),
    ]

    for var, description in env_vars:
        if os.getenv(var):
            print(f"  {GREEN}✓{RESET} {description} - set")
        else:
            optional = "(optional)" in description
            color = YELLOW if optional else RED
            symbol = "⚠" if optional else "✗"
            print(f"  {color}{symbol}{RESET} {description} - NOT SET")

def main():
    """Run all verification checks."""
    print(f"\n{BLUE}{'=' * 50}")
    print("  Claude Code Integration Verification")
    print(f"{'=' * 50}{RESET}")

    results = []

    # Run checks
    results.append(("Directories", *verify_directories()))
    results.append(("Commands", *verify_commands()))
    results.append(("Skills", *verify_skills()))
    results.append(("Scripts", *verify_scripts()))
    results.append(("Agents", *verify_agents()))
    results.append(("Documentation", *verify_documentation()))

    # Check environment
    check_env_vars()

    # Summary
    print(f"\n{BLUE}{'=' * 50}")
    print("  Summary")
    print(f"{'=' * 50}{RESET}\n")

    total_passed = 0
    total_checks = 0

    for category, passed, total in results:
        total_passed += passed
        total_checks += total
        percentage = (passed / total * 100) if total > 0 else 0

        if passed == total:
            color = GREEN
            symbol = "✓"
        elif passed > 0:
            color = YELLOW
            symbol = "⚠"
        else:
            color = RED
            symbol = "✗"

        print(f"  {color}{symbol}{RESET} {category:20} {passed}/{total} ({percentage:.0f}%)")

    print(f"\n{BLUE}{'━' * 50}{RESET}")

    overall_percentage = (total_passed / total_checks * 100) if total_checks > 0 else 0

    if total_passed == total_checks:
        print(f"  {GREEN}✅ All checks passed! ({total_passed}/{total_checks}){RESET}")
        print(f"\n  {GREEN}🎉 Integration is complete and verified!{RESET}\n")
        return 0
    elif total_passed > total_checks * 0.8:
        print(f"  {YELLOW}⚠️  Most checks passed ({total_passed}/{total_checks} - {overall_percentage:.0f}%){RESET}")
        print(f"\n  {YELLOW}Some items are missing. Review the output above.{RESET}\n")
        return 1
    else:
        print(f"  {RED}❌ Many checks failed ({total_passed}/{total_checks} - {overall_percentage:.0f}%){RESET}")
        print(f"\n  {RED}Integration is incomplete. Review the output above.{RESET}\n")
        return 2

if __name__ == "__main__":
    sys.exit(main())
