#!/usr/bin/env python3
"""
Agent Spawner - Spawn specialized agents for specific tasks

Usage:
    python3 scripts/spawn_agent.py <agent_type> <task_description>

Examples:
    python3 scripts/spawn_agent.py claude "Implement user authentication"
    python3 scripts/spawn_agent.py gemini "Analyze this architecture diagram"
    python3 scripts/spawn_agent.py grok "Research WebSocket best practices"
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Agent configuration
AGENT_MAP = {
    # Core agents
    'claude': {
        'module': 'orchestrator.claude_code_agent',
        'class': 'ClaudeCodeAgent',
        'file': 'orchestrator/claude_code_agent.py',
        'description': 'MCP-based code implementation specialist'
    },
    'codex': {
        'module': 'orchestrator.codex_mcp_agent',
        'class': 'CodexMCPAgent',
        'file': 'orchestrator/codex_mcp_agent.py',
        'description': 'OpenAI-based coding specialist'
    },
    'planner': {
        'module': 'orchestrator.chatgpt_planner',
        'class': 'ChatGPTPlanner',
        'file': 'orchestrator/chatgpt_planner.py',
        'description': 'Task planning and coordination'
    },

    # Specialized AI models
    'gemini': {
        'module': 'orchestrator.gemini_agent',
        'class': 'GeminiAgent',
        'file': 'orchestrator/gemini_agent.py',
        'description': 'Multimodal analysis and planning'
    },
    'deepseek': {
        'module': 'orchestrator.deepseek_agent',
        'class': 'DeepSeekAgent',
        'file': 'orchestrator/deepseek_agent.py',
        'description': 'Deep code analysis and reasoning'
    },
    'grok': {
        'module': 'orchestrator.grok_agent',
        'class': 'GrokAgent',
        'file': 'orchestrator/grok_agent.py',
        'description': 'Research and real-time data'
    },

    # Role aliases
    'research': {
        'alias': 'grok',
        'description': 'Research specialist (uses Grok)'
    },
    'doc': {
        'alias': 'claude',
        'description': 'Documentation specialist (uses Claude)'
    },
    'test': {
        'alias': 'codex',
        'description': 'Testing specialist (uses Codex)'
    },
}


def list_agents():
    """List available agent types."""
    print("🤖 AVAILABLE AGENT TYPES\n")
    print("━" * 50)

    print("\n📦 Core Agents:")
    for name, config in AGENT_MAP.items():
        if 'alias' not in config and name in ['claude', 'codex', 'planner']:
            print(f"  {name:12} - {config['description']}")

    print("\n🧠 Specialized AI Models:")
    for name, config in AGENT_MAP.items():
        if 'alias' not in config and name in ['gemini', 'deepseek', 'grok']:
            print(f"  {name:12} - {config['description']}")

    print("\n🎭 Role Aliases:")
    for name, config in AGENT_MAP.items():
        if 'alias' in config:
            print(f"  {name:12} - {config['description']}")

    print("\n" + "━" * 50)


def resolve_agent(agent_type: str) -> Optional[Dict]:
    """Resolve agent type, handling aliases."""
    if agent_type not in AGENT_MAP:
        return None

    config = AGENT_MAP[agent_type].copy()

    # Resolve alias
    if 'alias' in config:
        return resolve_agent(config['alias'])

    return config


async def spawn_via_orchestrator(agent_type: str, task_description: str) -> Dict:
    """Spawn agent via hybrid orchestrator."""
    try:
        from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

        print(f"🚀 Spawning {agent_type} agent via orchestrator...")
        print(f"📋 Task: {task_description}\n")

        orchestrator = HybridOrchestratorV5()

        result = await orchestrator.execute_task(
            task_description=task_description,
            agent_preference=agent_type
        )

        return result

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "traceback": None
        }


def spawn_direct(agent_config: Dict, task_description: str) -> Dict:
    """Spawn agent directly (synchronous fallback)."""
    try:
        # Check if agent file exists
        agent_file = PROJECT_ROOT / agent_config['file']
        if not agent_file.exists():
            return {
                "status": "error",
                "error": f"Agent file not found: {agent_file}"
            }

        print(f"🚀 Spawning agent directly...")
        print(f"📋 Task: {task_description}\n")

        # Import and instantiate agent
        import importlib
        module = importlib.import_module(agent_config['module'])
        agent_class = getattr(module, agent_config['class'])

        agent = agent_class()

        # Execute task
        result = agent.execute(task_description)

        return {
            "status": "completed",
            "result": result,
            "agent": agent_config['class']
        }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def main():
    parser = argparse.ArgumentParser(
        description='Spawn specialized agents for specific tasks',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/spawn_agent.py claude "Implement authentication"
  python3 scripts/spawn_agent.py gemini "Analyze architecture diagram"
  python3 scripts/spawn_agent.py --list
        """
    )

    parser.add_argument('agent_type', nargs='?', help='Type of agent to spawn')
    parser.add_argument('task', nargs='?', help='Task description for the agent')
    parser.add_argument('--list', action='store_true', help='List available agent types')
    parser.add_argument('--use-orchestrator', action='store_true', default=True,
                        help='Use hybrid orchestrator (default)')
    parser.add_argument('--direct', action='store_true', help='Spawn agent directly without orchestrator')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')

    args = parser.parse_args()

    # List agents
    if args.list:
        list_agents()
        return

    # Validate inputs
    if not args.agent_type or not args.task:
        parser.print_help()
        sys.exit(1)

    # Resolve agent
    agent_config = resolve_agent(args.agent_type)
    if not agent_config:
        print(f"❌ Unknown agent type: {args.agent_type}")
        print("\nUse --list to see available agent types")
        sys.exit(1)

    # Spawn agent
    if args.direct:
        result = spawn_direct(agent_config, args.task)
    else:
        # Use orchestrator (async)
        result = asyncio.run(spawn_via_orchestrator(args.agent_type, args.task))

    # Output result
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        print("\n" + "━" * 50)
        print("📊 AGENT EXECUTION RESULT")
        print("━" * 50 + "\n")

        if result.get('status') == 'completed':
            print("✅ Status: COMPLETED\n")
            print("Result:")
            print(result.get('result', 'No result'))

            if 'metrics' in result:
                print("\nMetrics:")
                for key, value in result['metrics'].items():
                    print(f"  {key}: {value}")

        elif result.get('status') == 'error':
            print("❌ Status: ERROR\n")
            print(f"Error: {result.get('error', 'Unknown error')}")

            if result.get('traceback'):
                print(f"\nTraceback:\n{result['traceback']}")

        else:
            print(f"Status: {result.get('status', 'unknown')}")
            print(json.dumps(result, indent=2))

        print("\n" + "━" * 50)


if __name__ == "__main__":
    main()
