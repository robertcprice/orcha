#!/usr/bin/env python3
"""
Agent CLI - Command-line interface for spawning and managing hierarchical agents

Usage:
    python orchestrator/agent_cli.py spawn --type data_processor --task "Process NQ data"
    python orchestrator/agent_cli.py status --agent agent.1
    python orchestrator/agent_cli.py workflow --name "NQ Processing" --type data_processor
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator.agent_framework import (
    AgentOrchestrator,
    AgentType,
    ExecutionMode,
    Agent
)


def spawn_agent_command(args):
    """Spawn a new agent"""

    orchestrator = AgentOrchestrator()

    # Parse agent type
    try:
        agent_type = AgentType[args.type.upper()]
    except KeyError:
        print(f"Error: Unknown agent type '{args.type}'")
        print(f"Available types: {', '.join([t.name.lower() for t in AgentType])}")
        return 1

    # Parse context if provided
    context = {}
    if args.context:
        try:
            context = json.loads(args.context)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON context: {args.context}")
            return 1

    # Spawn agent
    agent = orchestrator.spawn_agent(agent_type, context)

    print(f"✅ Spawned agent {agent.agent_id} ({agent.agent_type.value})")

    # Execute task if provided
    if args.task:
        execution_mode = ExecutionMode[args.mode.upper()] if args.mode else ExecutionMode.SEQUENTIAL

        print(f"\n🚀 Executing task: {args.task}")
        print(f"   Mode: {execution_mode.value}")

        result = orchestrator.execute_agent(agent, args.task, execution_mode)

        print(f"\n📊 Result:")
        print(json.dumps(result, indent=2))

        # Save state
        if args.save_state:
            state_path = orchestrator.save_workflow_state()
            print(f"\n💾 Workflow state saved to: {state_path}")

    return 0


def create_workflow_command(args):
    """Create a multi-agent workflow"""

    orchestrator = AgentOrchestrator()

    # Parse root agent type
    try:
        agent_type = AgentType[args.type.upper()]
    except KeyError:
        print(f"Error: Unknown agent type '{args.type}'")
        return 1

    # Create workflow
    root_agent = orchestrator.create_agent_workflow(args.name, agent_type)

    print(f"✅ Created workflow '{args.name}'")
    print(f"   Root agent: {root_agent.agent_id} ({agent_type.value})")

    # Add sub-agents if specified
    if args.sub_agents:
        for sub_agent_type_str in args.sub_agents.split(','):
            try:
                sub_agent_type = AgentType[sub_agent_type_str.strip().upper()]
                sub_agent = root_agent.spawn_sub_agent(sub_agent_type)
                print(f"   + Sub-agent: {sub_agent.agent_id} ({sub_agent_type.value})")
            except KeyError:
                print(f"   ⚠️  Unknown sub-agent type: {sub_agent_type_str}")

    # Execute workflow if task provided
    if args.task:
        execution_mode = ExecutionMode[args.mode.upper()] if args.mode else ExecutionMode.SEQUENTIAL

        print(f"\n🚀 Executing workflow task: {args.task}")

        result = orchestrator.execute_agent(root_agent, args.task, execution_mode)

        print(f"\n📊 Result:")
        print(json.dumps(result, indent=2))

    # Show workflow status
    status = orchestrator.get_workflow_status(root_agent.agent_id)

    print(f"\n📋 Workflow Status:")
    print(json.dumps(status, indent=2))

    # Save state
    state_path = orchestrator.save_workflow_state()
    print(f"\n💾 Workflow state saved to: {state_path}")

    return 0


def status_command(args):
    """Get agent or workflow status"""

    orchestrator = AgentOrchestrator()

    if args.agent:
        status = orchestrator.get_workflow_status(args.agent)

        print(f"📊 Agent Status:")
        print(json.dumps(status, indent=2))
    else:
        # Show all agents
        print("📊 All Agents:")
        for agent_id, agent in orchestrator.agents.items():
            print(f"\n{agent_id} ({agent.agent_type.value})")
            print(f"  Level: {agent.level}")
            print(f"  Tasks: {len(agent.tasks)}")
            print(f"  Sub-agents: {len(agent.sub_agents)}")

    return 0


def list_types_command(args):
    """List all available agent types"""

    print("📋 Available Agent Types:\n")

    print("Core Orchestration:")
    print("  - project_planner      : High-level planning")
    print("  - implementation_manager : Manages implementation tasks")
    print("  - code_reviewer        : Reviews and validates code")
    print("  - research_agent       : Investigates and researches")

    print("\nSpecialized Tasks:")
    print("  - data_processor       : Data processing tasks")
    print("  - model_trainer        : Model training tasks")
    print("  - testing_agent        : Testing and validation")
    print("  - documentation_agent  : Creates documentation")

    print("\nInfrastructure:")
    print("  - file_organizer       : Manages file organization")
    print("  - dependency_checker   : Checks dependencies")
    print("  - deployment_agent     : Handles deployments")

    print("\nGeneral:")
    print("  - general_agent        : General-purpose agent")

    return 0


def main():
    """Main CLI entry point"""

    parser = argparse.ArgumentParser(
        description="Agent CLI - Spawn and manage hierarchical agents",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Spawn command
    spawn_parser = subparsers.add_parser('spawn', help='Spawn a new agent')
    spawn_parser.add_argument('--type', required=True, help='Agent type')
    spawn_parser.add_argument('--task', help='Task to execute')
    spawn_parser.add_argument('--context', help='JSON context for agent')
    spawn_parser.add_argument('--mode', choices=['sequential', 'parallel', 'adaptive'],
                             default='sequential', help='Execution mode')
    spawn_parser.add_argument('--save-state', action='store_true',
                             help='Save workflow state after execution')

    # Workflow command
    workflow_parser = subparsers.add_parser('workflow', help='Create multi-agent workflow')
    workflow_parser.add_argument('--name', required=True, help='Workflow name')
    workflow_parser.add_argument('--type', required=True, help='Root agent type')
    workflow_parser.add_argument('--sub-agents', help='Comma-separated list of sub-agent types')
    workflow_parser.add_argument('--task', help='Task to execute')
    workflow_parser.add_argument('--mode', choices=['sequential', 'parallel', 'adaptive'],
                                default='sequential', help='Execution mode')

    # Status command
    status_parser = subparsers.add_parser('status', help='Get agent status')
    status_parser.add_argument('--agent', help='Agent ID to check (if not provided, shows all)')

    # List types command
    list_parser = subparsers.add_parser('list-types', help='List available agent types')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Execute command
    if args.command == 'spawn':
        return spawn_agent_command(args)
    elif args.command == 'workflow':
        return create_workflow_command(args)
    elif args.command == 'status':
        return status_command(args)
    elif args.command == 'list-types':
        return list_types_command(args)

    return 0


if __name__ == "__main__":
    sys.exit(main())
