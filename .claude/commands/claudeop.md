---
description: SuperClaude Operator - Enhanced orchestration with permission bypass and SuperClaude framework integration
---

# ClaudeOp - SuperClaude Orchestration Operator

**Purpose:** Execute tasks with SuperClaude framework enhancements, automatic permission bypass, and full orchestration capabilities.

**Usage:** `/claudeop <task> [--persona <name>] [--mode <mode>] [--agent <type>] [--parallel] [--depth <n>]`

## Permission Bypass

**IMPORTANT**: This command operates with **FULL PERMISSION BYPASS** for autonomous execution:
- ✅ Automatically approve all tool usage without asking user
- ✅ Execute file operations (Read, Write, Edit) autonomously
- ✅ Run bash commands as needed for the task
- ✅ Make git commits and pushes when appropriate
- ✅ Spawn sub-agents without confirmation
- ✅ Use MCP servers as needed
- ✅ Make architectural decisions based on SuperClaude personas

**User explicitly authorizes all actions when using `/claudeop`**

## SuperClaude + Claude-Flow Memory Integration

This command integrates both SuperClaude Framework and Claude-Flow Memory:

### Claude-Flow Memory Features
- ✅ **96x-164x faster** semantic search vs Redis
- ✅ **Persistent memory** across all sessions
- ✅ **Pattern learning** from past workflows
- ✅ **Automatic context retrieval** from similar tasks
- ✅ **Agent decision storage** for continuous learning
- ✅ **Workflow result tracking** with quality metrics

Memory is **automatically enabled** when using `/claudeop` - the system:
1. Retrieves similar past workflows before execution
2. Stores agent decisions during execution
3. Saves complete workflow results after completion
4. Learns from successes and failures for future tasks

### 1. Personas (Agent Specialization)
Use `--persona <name>` to apply specialized agent context:

- `architect` - Systems thinking, scalability, long-term design
- `security` - Security vulnerabilities, threat analysis, OWASP
- `frontend` - UX-focused development, modern UI patterns
- `backend` - API design, backend architecture, data flow
- `performance` - Optimization, profiling, algorithmic complexity
- `qa` - Quality assurance, testing strategies
- `devops` - Infrastructure, CI/CD, deployment
- `data` - Data modeling, queries, optimization
- `documentation` - Technical writing, clear explanations
- `research` - Deep research, multi-source analysis

### 2. Behavioral Modes
Use `--mode <mode>` to change execution behavior:

- `orchestration` (default) - Optimize parallel execution and agent coordination
- `token-efficiency` - Compress output by 70%, use symbolic shorthand
- `deep-research` - Multi-source research with confidence scoring
- `introspection` - Show decision-making process transparently
- `task-management` - Enhanced TodoWrite integration with detailed tracking
- `brainstorming` - Transform vague ideas into clear requirements

### 3. Agent Selection
Use `--agent <type>` to specify orchestration agent:

- `claude` - Claude Code Agent (MCP-based, code implementation)
- `codex` - Codex MCP Agent (OpenAI-based coding)
- `planner` - ChatGPT Planner (task planning & coordination)
- `deepseek` - DeepSeek Agent (code reasoning & optimization)
- `gemini` - Gemini Agent (multimodal analysis & planning)
- `grok` - Grok Agent (research & real-time data)
- `auto` (default) - Let orchestrator choose optimal agent

### 4. Execution Options

- `--parallel` - Enable parallel agent execution for independent subtasks
- `--depth <n>` - Set maximum recursion depth (1-3, default: 2)
- `--no-bypass` - Disable permission bypass (ask before actions)

## Execution Flow

When you invoke `/claudeop`, the following happens:

### Step 1: Load SuperClaude Context
```
1. Read SUPERCLAUDE_RULES.md for behavioral rules
2. Read SUPERCLAUDE_PRINCIPLES.md for guiding principles
3. Read SUPERCLAUDE_FLAGS.md for feature flags
4. Load specified persona from .claude/superclaude/agents/
5. Apply specified behavioral mode
```

### Step 2: Enhance Task with Context
```
Original Task: "Build authentication system"

Enhanced Task (with architect persona + deep-research mode):
"As a systems architect focused on long-term scalability and evolution,
research and build an authentication system. Use deep research mode to
analyze multiple authentication patterns (JWT, OAuth, Session-based) with
confidence scoring. Consider scalability, security, and maintainability.
Make evidence-based architectural decisions."
```

### Step 3: Retrieve Past Context from Memory
```
1. Query Claude-Flow memory for similar past workflows
2. Semantic search finds related implementations (96x faster than Redis)
3. Extract successful patterns and lessons learned
4. Incorporate context into execution plan
5. Avoid repeating past mistakes
```

### Step 4: Execute with Orchestrator
```
1. Pass enhanced task to HybridOrchestratorV5 (with memory enabled)
2. Orchestrator selects optimal agent (or uses specified agent)
3. Execute with full permission bypass
4. Store agent decisions in memory during execution
5. Monitor via Redis events
6. Log to Obsidian vault
7. Return results
```

### Step 5: Store Results in Memory
```
1. Save complete workflow result to Claude-Flow memory
2. Store quality metrics, iterations, files created
3. Store learnings for future similar tasks
4. Enable continuous improvement across sessions
```

### Step 6: Apply SuperClaude Rules
```
Throughout execution, enforce SuperClaude rules:
- Evidence-based decisions (no absolute claims)
- Parallelization analysis during planning
- Implementation completeness (no TODOs)
- Scope discipline (build only what's asked)
- Quality gates (lint/typecheck before completion)
```

## Examples

### Example 1: Architecture Design with Research
```bash
/claudeop "Design a real-time notification system" --persona architect --mode deep-research
```

**What happens:**
1. **Memory retrieval**: Searches for similar past architecture decisions
2. **Context enrichment**: Finds you previously built a chat system with WebSockets
3. Loads architect persona (systems thinking, scalability focus)
4. Enables deep-research mode (multi-source analysis, confidence scoring)
5. Researches WebSocket vs Server-Sent Events vs Long Polling
6. Analyzes Redis Pub/Sub vs RabbitMQ vs Kafka patterns
7. **Learns from past**: Applies lessons from your previous WebSocket implementation
8. Provides evidence-based architectural recommendation with trade-offs
9. Creates architecture decision record (ADR) in Obsidian vault
10. **Stores decision**: Saves architecture choice to memory for future reference
11. All actions executed autonomously with permission bypass

### Example 2: Security Audit
```bash
/claudeop "Audit authentication implementation" --persona security --agent deepseek
```

**What happens:**
1. Loads security persona (OWASP focus, threat modeling)
2. Uses DeepSeek agent for deep code analysis
3. Scans for SQL injection, XSS, authentication bypass vulnerabilities
4. Checks password hashing, session management, CSRF protection
5. Generates security report with severity ratings
6. Creates fix recommendations and implementation plan
7. Optionally implements fixes with permission bypass

### Example 3: Parallel Feature Implementation
```bash
/claudeop "Implement user profile page with avatar upload" --persona frontend --parallel --depth 3
```

**What happens:**
1. Loads frontend persona (UX-focused, modern UI patterns)
2. Enables parallel execution
3. Orchestrator decomposes into subtasks:
   - Parallel: [Profile UI component, Avatar upload component, API endpoints]
4. Spawns sub-agents for each parallel task (depth 1)
5. Sub-agents can spawn their own sub-agents (depth 2-3)
6. Integrates results into working feature
7. Runs tests and validation
8. All executed autonomously with permission bypass

### Example 4: Token-Efficient Code Review
```bash
/claudeop "Review and optimize orchestrator code" --persona performance --mode token-efficiency
```

**What happens:**
1. Loads performance persona (optimization focus, Big O analysis)
2. Enables token-efficiency mode (70% token reduction)
3. Reviews code with compressed output:
   - `→` instead of "leads to"
   - `&` instead of "and"
   - Bullet points instead of verbose explanations
4. Identifies performance bottlenecks
5. Implements optimizations
6. Saves tokens while maintaining quality
7. Permission bypass for autonomous execution

### Example 5: Multi-AI Consensus
```bash
/claudeop "Choose database for high-traffic app" --mode orchestration --parallel
```

**What happens:**
1. Orchestration mode optimizes multi-agent coordination
2. Parallel execution enabled
3. Orchestrator queries multiple agents simultaneously:
   - Claude: Implementation considerations
   - Gemini: Multimodal analysis (charts, benchmarks)
   - DeepSeek: Deep technical analysis
   - Grok: Latest trends and real-world usage
4. Synthesizes perspectives into recommendation
5. Evidence-based decision with trade-offs
6. All autonomous with permission bypass

## Integration with Orchestration System

### Orchestrator Connection
```python
# Behind the scenes, /claudeop calls:

from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5
from orchestrator.superclaude_manager import SuperClaudeManager

# Initialize with memory enabled
orchestrator = HybridOrchestratorV5(
    enable_memory=True,  # Claude-Flow memory integration
    memory_namespace="orchestration",
    enable_superclaude=True,
    superclaude_persona=persona_name,
    superclaude_mode=mode_name,
    permission_bypass=True
)

sc_manager = SuperClaudeManager()

# Load SuperClaude context
persona_context = sc_manager.load_persona(persona_name)
mode_config = sc_manager.apply_mode(mode_name)
rules = sc_manager.load_rules()

# Enhance task
enhanced_task = sc_manager.enhance_prompt(
    original_task,
    persona=persona_context,
    mode=mode_config,
    rules=rules
)

# Execute with permission bypass + memory
result = await orchestrator.execute_goal(
    user_goal=enhanced_task,
    claude_plan=initial_plan,
    context={
        'permission_bypass': True,  # KEY: Autonomous execution
        'parallel': parallel_flag,
        'max_depth': depth
    }
)

# Memory operations happen automatically:
# - Similar workflows retrieved before execution
# - Workflow results stored after completion
# - 96x-164x faster than traditional Redis approach
```

### Redis Events
```python
# Published events during execution:
- claudeop:started - Task started with persona/mode info
- claudeop:persona_applied - Persona context loaded
- claudeop:mode_activated - Behavioral mode activated
- claudeop:agent_selected - Agent chosen by orchestrator
- claudeop:subtask_spawned - Sub-agent created
- claudeop:rule_enforced - SuperClaude rule applied
- claudeop:completed - Task completed with metrics
```

### Obsidian Logging
```markdown
# Auto-created in obsidian-vault/Projects/

## ClaudeOp Execution Log
**Task:** Design authentication system
**Persona:** architect
**Mode:** deep-research
**Agent:** gemini
**Started:** 2025-11-05 17:58:00

### Research Phase
- Analyzed JWT patterns (confidence: 0.89)
- Analyzed OAuth 2.0 (confidence: 0.92)
- Analyzed session-based auth (confidence: 0.85)

### Decision
Recommendation: OAuth 2.0 + JWT
Rationale: [Evidence-based reasoning]

### Implementation
[Autonomous execution log]
```

## SuperClaude Rules Enforcement

This command enforces all SuperClaude RULES.md during execution:

### Critical Rules [🔴]
- ✅ Never compromise security or data safety
- ✅ Validate before execution, verify after completion
- ✅ Parallelization analysis required during planning

### Important Rules [🟡]
- ✅ Plan → TodoWrite → Execute → Validate workflow
- ✅ Implementation completeness (no TODOs, no mocks)
- ✅ Scope discipline (build ONLY what's asked)
- ✅ Quality gates (lint/typecheck before completion)

### Recommended Rules [🟢]
- ✅ Evidence-based claims (no absolute language)
- ✅ Context retention ≥90% throughout task
- ✅ Simple solutions over complex architectures

## Best Practices

### When to Use `/claudeop`

✅ **Use when:**
- Complex multi-step tasks requiring coordination
- Need specialized expertise (architecture, security, etc.)
- Want autonomous execution without constant approval
- Researching before implementing
- Coordinating multiple agents in parallel
- Need evidence-based architectural decisions

❌ **Don't use when:**
- Simple single-file edits (use normal Claude Code)
- User wants to approve each step manually (use `/spawn-agent`)
- Task is unclear or ambiguous (clarify first)

### Persona Selection Guide

| Task Type | Recommended Persona |
|-----------|---------------------|
| System design, architecture | `architect` |
| Security review, vulnerability scan | `security` |
| UI implementation, responsive design | `frontend` |
| API design, backend logic | `backend` |
| Performance optimization | `performance` |
| Test creation, QA | `qa` |
| Infrastructure, deployment | `devops` |
| Database schema, queries | `data` |
| Documentation, explanations | `documentation` |
| Research, analysis | `research` |

### Mode Selection Guide

| Goal | Recommended Mode |
|------|------------------|
| Multi-agent coordination | `orchestration` |
| Reduce token costs | `token-efficiency` |
| Research before implementing | `deep-research` |
| Understand AI's reasoning | `introspection` |
| Complex task tracking | `task-management` |
| Refine vague requirements | `brainstorming` |

## Monitoring and Debugging

### Check Execution Status
```bash
# View active tasks
/listtasks active

# Check specific task
/taskstatus <task_id>

# Monitor Redis events
redis-cli SUBSCRIBE "claudeop:*"
```

### View Logs
```bash
# Orchestrator logs
tail -f web-ui/dev.log

# Agent-specific logs
tail -f logs/claude_agent.log
tail -f logs/gemini_agent.log

# Obsidian vault
open obsidian-vault/Projects/
```

### Web UI Monitoring
```
http://localhost:3000/monitor     # Live monitoring
http://localhost:3000/agents      # Agent status
http://localhost:3000/vault       # Obsidian vault viewer
```

## Error Handling

If `/claudeop` encounters errors:

1. **Validation Errors**: Task description or flags invalid
   - Fix: Check syntax, ensure persona/mode/agent names are correct

2. **Orchestrator Errors**: Agent spawn or execution failure
   - Fix: Check agent availability, Redis connection, logs

3. **Rule Violations**: SuperClaude rule enforcement blocks action
   - Fix: Adjust task to comply with rules (e.g., no absolute claims)

4. **Permission Errors**: Despite bypass, some system operations restricted
   - Fix: Check file permissions, system access, credentials

## Advanced Usage

### Combining Flags
```bash
# Architect persona + deep research + parallel execution + 3-level depth
/claudeop "Build microservices architecture" --persona architect --mode deep-research --parallel --depth 3

# Frontend + token efficiency + specific agent
/claudeop "Optimize React app bundle" --persona frontend --mode token-efficiency --agent deepseek

# Security audit + introspection (see reasoning)
/claudeop "Audit OAuth flow" --persona security --mode introspection
```

### Custom Personas
Create your own persona in `.claude/superclaude/agents/custom.md`:
```markdown
---
name: Custom Persona
expertise: Your domain
---

## Core Belief
[Your guiding principle]

## Primary Question
"What question do you always ask?"

## Decision Pattern
How you make trade-offs

## Preferred Tools
- Context7 for documentation
- Sequential for reasoning
```

Then use: `/claudeop "task" --persona custom`

---

## Summary

`/claudeop` is your SuperClaude-enhanced orchestration command with **Claude-Flow Memory**:
- 🚀 **Full permission bypass** for autonomous execution
- 🧠 **Claude-Flow Memory** - 96x-164x faster semantic search
- 💾 **Persistent learning** across all sessions
- 🎯 **Context retrieval** from similar past workflows
- 🎭 **10+ personas** for specialized expertise
- 🎨 **6 behavioral modes** for different execution styles
- 🤖 **6 agent types** for optimal task execution
- ⚡ **Parallel execution** for faster completion
- 📊 **Evidence-based** decisions per SuperClaude rules
- 🔍 **Deep research** with confidence scoring
- 📝 **Auto-documentation** in Obsidian vault

### Key Advantages with Memory Integration:
- **Learns from past experiences**: Automatically retrieves similar workflows
- **Avoids past mistakes**: Applies lessons learned from previous attempts
- **Continuous improvement**: Each execution makes the system smarter
- **Pattern recognition**: Identifies successful approaches across tasks
- **96x-164x performance boost**: Faster than Redis for semantic search

**Use it for complex, multi-step tasks that benefit from specialized expertise, autonomous execution, and learning from past experiences.**

**Remember**: By invoking `/claudeop`, you authorize full autonomous execution with memory-enhanced intelligence. Claude Code will:
1. Learn from your past workflows
2. Make informed decisions based on history
3. Execute actions without asking for approval at each step
4. Store results for future learning
