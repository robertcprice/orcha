#!/usr/bin/env python3
"""
Example: Using the Agent Orchestration Framework

This demonstrates how to create hierarchical agents that automatically
follow all rules from CLAUDE.md.
"""

import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator.agent_framework import (
    AgentOrchestrator,
    AgentType,
    ExecutionMode
)


def example_1_simple_agent():
    """Example 1: Spawn a simple agent for a task"""

    print("="*70)
    print("Example 1: Simple Agent Spawn")
    print("="*70)

    orchestrator = AgentOrchestrator()

    # Spawn a data processor agent
    agent = orchestrator.spawn_agent(
        agent_type=AgentType.DATA_PROCESSOR,
        context={
            'task': 'Process NQ futures data',
            'files': '293 weekly CSV files',
            'years': '2020-2025'
        }
    )

    print(f"\n✅ Spawned agent: {agent.agent_id}")
    print(f"   Type: {agent.agent_type.value}")
    print(f"   Level: {agent.level}")

    # Execute a task
    result = orchestrator.execute_agent(
        agent=agent,
        task_description="Process all 293 NQ weekly CSV files",
        execution_mode=ExecutionMode.PARALLEL
    )

    print(f"\n📊 Result:")
    print(json.dumps(result, indent=2))

    return agent


def example_2_hierarchical_workflow():
    """Example 2: Create a hierarchical workflow with sub-agents"""

    print("\n" + "="*70)
    print("Example 2: Hierarchical Workflow")
    print("="*70)

    orchestrator = AgentOrchestrator()

    # Create root agent (project planner)
    planner = orchestrator.create_agent_workflow(
        workflow_name="NQ Multi-Asset Model Development",
        root_agent_type=AgentType.PROJECT_PLANNER
    )

    print(f"\n✅ Created workflow: NQ Multi-Asset Model Development")
    print(f"   Root agent: {planner.agent_id}")

    # Planner spawns implementation manager
    impl_manager = planner.spawn_sub_agent(
        agent_type=AgentType.IMPLEMENTATION_MANAGER,
        context={'phase': 'data_processing'}
    )

    print(f"\n   ├─ Implementation Manager: {impl_manager.agent_id}")

    # Implementation manager spawns specialized agents
    data_proc = impl_manager.spawn_sub_agent(
        agent_type=AgentType.DATA_PROCESSOR,
        context={'task': 'process_raw_csv', 'priority': 'high'}
    )

    print(f"   │  ├─ Data Processor: {data_proc.agent_id}")

    validator = impl_manager.spawn_sub_agent(
        agent_type=AgentType.TESTING_AGENT,
        context={'task': 'validate_processed_data'}
    )

    print(f"   │  ├─ Validator: {validator.agent_id}")

    documenter = impl_manager.spawn_sub_agent(
        agent_type=AgentType.DOCUMENTATION_AGENT,
        context={'task': 'create_processing_guide'}
    )

    print(f"   │  └─ Documenter: {documenter.agent_id}")

    # Execute workflow
    result = orchestrator.execute_agent(
        agent=planner,
        task_description="Plan and execute NQ data processing pipeline",
        execution_mode=ExecutionMode.SEQUENTIAL
    )

    print(f"\n📊 Workflow Result:")
    print(json.dumps(result, indent=2))

    # Get workflow status
    status = orchestrator.get_workflow_status(planner.agent_id)

    print(f"\n📋 Workflow Status:")
    print(json.dumps(status, indent=2))

    return planner


def example_3_parallel_training():
    """Example 3: Parallel crypto model training"""

    print("\n" + "="*70)
    print("Example 3: Parallel Crypto Model Training")
    print("="*70)

    orchestrator = AgentOrchestrator()

    # Create training coordinator
    coordinator = orchestrator.spawn_agent(
        agent_type=AgentType.MODEL_TRAINER,
        context={'task': 'coordinate_crypto_training'}
    )

    print(f"\n✅ Training Coordinator: {coordinator.agent_id}")

    # Spawn sub-agents for each crypto
    cryptos = [
        {'name': 'BTC', 'dataset': 'BTC_1min_full.pt', 'samples': '4.15M'},
        {'name': 'ETH', 'dataset': 'ETH_1min_full.pt', 'samples': '2.44M'},
        {'name': 'XRP', 'dataset': 'XRP_1min_full.pt', 'samples': '1.05M'}
    ]

    trainers = []
    for crypto in cryptos:
        trainer = coordinator.spawn_sub_agent(
            agent_type=AgentType.MODEL_TRAINER,
            context={
                'crypto': crypto['name'],
                'dataset': crypto['dataset'],
                'samples': crypto['samples'],
                'epochs': 30,
                'device': 'H200_GPU'
            }
        )

        trainers.append(trainer)

        print(f"   ├─ {crypto['name']} Trainer: {trainer.agent_id}")
        print(f"   │  Dataset: {crypto['dataset']} ({crypto['samples']} samples)")

    # Execute training in parallel
    result = orchestrator.execute_agent(
        agent=coordinator,
        task_description="Train all crypto models on full datasets simultaneously",
        execution_mode=ExecutionMode.PARALLEL
    )

    print(f"\n📊 Training Result:")
    print(json.dumps(result, indent=2))

    # Save workflow state
    state_path = orchestrator.save_workflow_state()
    print(f"\n💾 Workflow state saved to: {state_path}")

    return coordinator


def example_4_automatic_rule_enforcement():
    """Example 4: Demonstrating automatic rule enforcement"""

    print("\n" + "="*70)
    print("Example 4: Automatic Rule Enforcement")
    print("="*70)

    orchestrator = AgentOrchestrator()

    # Create model trainer (will trigger extended testing requirement)
    trainer = orchestrator.spawn_agent(
        agent_type=AgentType.MODEL_TRAINER,
        context={'model': 'GRU_dual_output', 'task': 'hyperparameter_tuning'}
    )

    # Create task
    task = trainer.add_task(
        description="Tune confidence thresholds for NQ model",
        priority=1,
        metadata={'parameter': 'confidence_threshold', 'range': [0.70, 0.95]}
    )

    print(f"\n✅ Created task: {task.task_id}")
    print(f"   Description: {task.description}")

    # Pre-execution checks (automatically applied)
    pre_checks = orchestrator._pre_execution_checks(trainer, task)

    print(f"\n🔍 Pre-Execution Checks (Automatic):")
    for check in pre_checks:
        print(f"   - {check['name']}: {check['description']}")

    # Simulate execution result
    result = {
        'success': True,
        'code_changes': True,
        'configurations_tested': ['0.70/0.65', '0.75/0.70', '0.80/0.75', '0.83/0.73', '0.85/0.80'],
        'metrics': {'best_f1': 0.652, 'best_config': '0.83/0.73'}
    }

    # Post-execution checks (automatically applied)
    post_checks = orchestrator._post_execution_checks(trainer, task, result)

    print(f"\n✅ Post-Execution Checks (Automatic):")
    for check in post_checks:
        print(f"   - {check['name']}: {check['description']}")
        if 'required_items' in check:
            for item in check['required_items']:
                print(f"     ✓ {item}")

    print("\n📌 Note: All agents automatically follow rules from CLAUDE.md!")
    print("   - File organization rules")
    print("   - Naming conventions")
    print("   - Testing requirements")
    print("   - Documentation updates")
    print("   - Extended parameter testing")
    print("   - Agent learning system search")

    return trainer


if __name__ == "__main__":

    print("\n" + "="*70)
    print("Agent Orchestration Framework - Examples")
    print("="*70)

    # Run all examples
    example_1_simple_agent()
    example_2_hierarchical_workflow()
    example_3_parallel_training()
    example_4_automatic_rule_enforcement()

    print("\n" + "="*70)
    print("Examples Complete!")
    print("="*70)
    print("\nSee orchestrator/agent_framework.py for implementation")
    print("See obsidian-vault/02-Guides/agent_orchestration_guide.md for full guide")
