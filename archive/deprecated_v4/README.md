# Deprecated V4 and Earlier Code - Archive

This folder contains deprecated code from V4 and earlier versions of the orchestration system.

**Archived on:** November 1, 2024
**Reason:** Replaced by V5 Hybrid Orchestrator with multi-AI pipeline

## What's Archived

### Old Orchestrators (27 files)
- `hybrid_orchestrator_v4_iterative.py` - V4 iterative dialogue system (replaced by V5)
- `hybrid_orchestrator_v3.py` - V3 version
- `auto_orchestrator.py` - Old auto orchestration
- `enhanced_orchestrator.py` - Old enhanced version
- `sub_orchestrator.py` - Old sub-orchestrator
- `chatgpt_claude_cli_orchestrator.py` - Old ChatGPT/Claude orchestrator

### Old Agent Implementations
- `codex_agent.py` - Old Codex agent (replaced by `codex_mcp_agent.py`)
- `claude_review_agent.py` - Old Claude review (replaced by `claude_code_agent.py`)
- `multi_ai_research.py` - Old multi-AI research (replaced by individual agents)
- `research_agent.py` - Old research agent
- `hierarchical_agent.py` - Old hierarchical agent

### Old Workflows
- `hybrid_codex_claude_workflow.py` - Old Codex/Claude workflow
- `hybrid_codex_claude_mcp.py` - Old MCP workflow

### Old Framework/Infrastructure
- `agent_framework.py` - Old agent framework
- `agent_cli.py` - Old agent CLI
- `agent_sdk_manager.py` - Old SDK manager
- `planning_layer.py` - Old planning layer
- `task_decomposer.py` - Old task decomposer
- `manager_agents.py` - Old manager agents
- `task_monitor.py` - Old task monitor
- `feedback_validator.py` - Old feedback validator

### Old Test/Example Files
- `tests/` - Old test files (test_hybrid_system.py, test_gpt5_*.py, etc.)
- `example_agent_usage.py` - Old usage examples
- `run_claude_orchestrator.py` - Old runner
- `run_hybrid_task.py` - Old task runner

## Current Active System (V5)

The following files are **active and in use**:

### V5 Core Components
- `hybrid_orchestrator_v5.py` - Main V5 orchestrator
- `hybrid_planner.py` - Multi-AI enrichment pipeline
- `agent_dispatcher.py` - Cost-optimized agent routing
- `script_executor.py` - Bash script execution

### V5 Agents
- `gemini_agent.py` - Gemini documentation agent
- `deepseek_agent.py` - DeepSeek enrichment agent
- `grok_agent.py` - Grok review agent
- `claude_code_agent.py` - Claude code review agent
- `codex_mcp_agent.py` - Codex MCP agent

### V5 Infrastructure
- `best_practices.py` - Best practices knowledge base
- `chatgpt_planner.py` - ChatGPT planner (used by hybrid_planner)
- `redis_publisher.py` - Redis event publishing
- `claude_cli_executor.py` - Claude CLI execution

### Runners
- `run_hybrid_task_v5.py` - V5 task runner
- `run_hybrid_task_v4.py` - V4 task runner (kept for backwards compatibility)

## Migration Notes

If you need to reference old V4 functionality:
1. Check the archived files in this folder
2. Most V4 functionality is replaced by equivalent V5 components
3. See `V5_ARCHITECTURE.md` for V5 design and implementation

## Can This Be Deleted?

Yes, this archive can be safely deleted if:
- V5 is working correctly
- No need to reference old implementations
- All active development is on V5

Keep it if:
- You want to reference old approaches
- Need to understand migration path
- Want to keep historical record
