# Agent Orchestration Skill

**Purpose:** Master the art of orchestrating multiple AI agents to solve complex tasks through hierarchical coordination, parallel execution, and intelligent task decomposition.

**When to use this skill:**
- Complex multi-step tasks requiring coordination
- Tasks that benefit from parallel agent execution
- Need to leverage different AI strengths simultaneously
- Building autonomous agent workflows
- Creating hierarchical agent systems

## Core Concepts

### 1. Hybrid Orchestrator V5

The V5 orchestrator is the central brain of the multi-agent system:

```python
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# Initialize orchestrator
orchestrator = HybridOrchestratorV5()

# Execute complex task with automatic agent selection
result = await orchestrator.execute_task(
    task_description="Build a real-time monitoring dashboard",
    context={
        "technologies": ["React", "WebSocket", "Redis"],
        "requirements": ["real-time updates", "responsive UI"]
    }
)
```

### 2. Agent Types and Roles

**Available Agents:**
- **Claude Code Agent**: MCP-based, excels at code implementation
- **Codex MCP Agent**: OpenAI-based, strong at coding tasks
- **ChatGPT Planner**: Task planning and coordination
- **Gemini Agent**: Multimodal analysis and planning
- **DeepSeek Agent**: Deep code analysis and reasoning
- **Grok Agent**: Research and real-time data

**Role Assignment:**
```python
AGENT_SPECIALIZATIONS = {
    "code_implementation": ["claude", "codex"],
    "planning": ["planner", "gemini"],
    "research": ["grok", "gemini"],
    "analysis": ["deepseek", "claude"],
    "testing": ["claude", "codex"],
    "documentation": ["claude", "gemini"]
}
```

### 3. Task Decomposition

Break complex tasks into agent-specific subtasks:

```python
# Example: Building a feature
task = "Implement user authentication with JWT"

# Orchestrator decomposes into:
subtasks = [
    {
        "agent": "planner",
        "task": "Plan authentication architecture"
    },
    {
        "agent": "claude",
        "task": "Implement auth endpoints",
        "depends_on": ["planner"]
    },
    {
        "agent": "codex",
        "task": "Create JWT utilities",
        "parallel_with": ["claude"]
    },
    {
        "agent": "claude",
        "task": "Write unit tests",
        "depends_on": ["claude", "codex"]
    }
]
```

## Orchestration Patterns

### Pattern 1: Sequential Execution

Tasks that must be done in order:

```python
async def sequential_workflow():
    orchestrator = HybridOrchestratorV5()

    # Step 1: Plan
    plan = await orchestrator.execute_task(
        "Plan the database schema for user management",
        agent_preference="planner"
    )

    # Step 2: Implement (uses plan context)
    implementation = await orchestrator.execute_task(
        "Implement the database schema",
        agent_preference="claude",
        context={"plan": plan}
    )

    # Step 3: Test
    tests = await orchestrator.execute_task(
        "Create tests for database operations",
        agent_preference="codex",
        context={"implementation": implementation}
    )

    return {"plan": plan, "implementation": implementation, "tests": tests}
```

### Pattern 2: Parallel Execution

Independent tasks that can run simultaneously:

```python
async def parallel_workflow():
    orchestrator = HybridOrchestratorV5()

    # Run multiple agents in parallel
    tasks = [
        orchestrator.execute_task(
            "Implement frontend authentication UI",
            agent_preference="claude"
        ),
        orchestrator.execute_task(
            "Implement backend auth endpoints",
            agent_preference="codex"
        ),
        orchestrator.execute_task(
            "Research OAuth best practices",
            agent_preference="grok"
        )
    ]

    # Wait for all to complete
    results = await asyncio.gather(*tasks)

    return {
        "frontend": results[0],
        "backend": results[1],
        "research": results[2]
    }
```

### Pattern 3: Hierarchical Delegation

Parent agents spawning specialized sub-agents:

```python
async def hierarchical_workflow():
    # Top-level coordinator
    coordinator = HybridOrchestratorV5()

    # Coordinator spawns specialized teams
    result = await coordinator.execute_task(
        task_description="Build complete authentication system",
        decomposition_strategy="hierarchical",
        max_depth=3  # Allow 3 levels of sub-agents
    )

    # Orchestrator automatically:
    # 1. Creates planning agent
    # 2. Planning agent spawns implementation agents
    # 3. Implementation agents spawn testing agents
    # 4. Results bubble up to coordinator

    return result
```

### Pattern 4: Consensus Building

Get multiple AI perspectives and synthesize:

```python
async def consensus_workflow():
    orchestrator = HybridOrchestratorV5()

    question = "What's the best architecture for our real-time system?"

    # Get opinions from multiple AIs
    perspectives = await asyncio.gather(
        orchestrator.execute_task(question, agent_preference="claude"),
        orchestrator.execute_task(question, agent_preference="gemini"),
        orchestrator.execute_task(question, agent_preference="deepseek")
    )

    # Synthesize consensus
    synthesis = await orchestrator.execute_task(
        f"Synthesize these perspectives into a recommendation:\n\n{perspectives}",
        agent_preference="planner"
    )

    return synthesis
```

## Advanced Features

### 1. Context Sharing

Share context between agents:

```python
# Agent 1 creates context
result1 = await orchestrator.execute_task(
    "Research WebSocket libraries",
    agent_preference="grok"
)

# Agent 2 uses that context
result2 = await orchestrator.execute_task(
    "Implement WebSocket server based on research",
    agent_preference="claude",
    context={
        "research": result1,
        "requirements": ["real-time", "scalable"]
    }
)
```

### 2. Dynamic Agent Selection

Let orchestrator choose optimal agent:

```python
# Orchestrator analyzes task and picks best agent
result = await orchestrator.execute_task(
    task_description="Optimize this image processing pipeline",
    # Orchestrator will likely pick DeepSeek for optimization
)
```

### 3. Error Recovery and Retry

Built-in retry logic with agent fallbacks:

```python
orchestrator = HybridOrchestratorV5(
    max_retries=3,
    fallback_strategy="next_best_agent"
)

result = await orchestrator.execute_task(
    task_description="Complex task",
    agent_preference="claude"
)
# If Claude fails, automatically tries Codex, then other agents
```

### 4. Progress Monitoring

Real-time monitoring of agent orchestration:

```python
# Enable event streaming
orchestrator = HybridOrchestratorV5(
    enable_events=True,
    redis_host="localhost"
)

# Subscribe to events
import redis
r = redis.Redis()
pubsub = r.pubsub()
pubsub.subscribe('orchestrator:*')

# Monitor progress in real-time
for message in pubsub.listen():
    print(f"Event: {message}")
```

## Integration with Web UI

### Monitor Agents in Dashboard

```bash
# Start web UI
cd web-ui && npm run dev

# View at:
http://localhost:3000/agents      # Agent status and metrics
http://localhost:3000/monitor     # Live monitoring
http://localhost:3000/vault       # Agent outputs in Obsidian
```

### Submit Tasks via UI

```typescript
// Submit orchestrated task from UI
const response = await fetch('/api/hybrid-orchestrator/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        taskDescription: "Build authentication system",
        agentPreference: "auto",  // Let orchestrator decide
        enableEvents: true
    })
});
```

## Task Management

### Create and Track Tasks

```python
from orchestrator.task_manager import TaskManager

# Create task
task = TaskManager.create_task(
    title="Implement OAuth",
    description="Add OAuth 2.0 authentication",
    priority="high",
    assigned_agent="auto"
)

# Track progress
status = TaskManager.get_status(task.id)

# Complete task
TaskManager.complete_task(task.id, result=result)
```

### List and Monitor Tasks

```bash
# Use slash commands
/listtasks active
/taskstatus <task_id>

# Or via Python
python3 scripts/list_tasks.py --status active
python3 scripts/check_task.py <task_id>
```

## Best Practices

### 1. Task Decomposition

**Good:**
```python
# Clear, focused subtasks
await orchestrator.execute_task(
    "Create user model in database/models/user.py",
    agent_preference="claude"
)
```

**Avoid:**
```python
# Too vague and broad
await orchestrator.execute_task(
    "Build the entire user management system",
    agent_preference="claude"
)
```

### 2. Context Management

**Good:**
```python
# Pass relevant context
result = await orchestrator.execute_task(
    task_description="Implement feature",
    context={
        "existing_code": code_snippet,
        "requirements": requirements_list,
        "constraints": constraints
    }
)
```

### 3. Agent Selection

**Good:**
```python
# Use right agent for the job
"code implementation" → claude/codex
"planning" → planner/gemini
"research" → grok
"analysis" → deepseek
```

### 4. Error Handling

```python
try:
    result = await orchestrator.execute_task(task)
except AgentException as e:
    # Log to Obsidian
    obsidian.log_error(agent=e.agent, error=e.message)
    # Retry with different agent
    result = await orchestrator.execute_task(
        task,
        agent_preference="fallback_agent"
    )
```

## Monitoring and Debugging

### View Orchestration Logs

```bash
# Main orchestrator log
tail -f web-ui/dev.log

# Agent-specific logs
tail -f logs/claude_agent.log
tail -f logs/codex_agent.log

# Redis events
redis-cli SUBSCRIBE "orchestrator:*"
```

### Obsidian Vault Integration

All agent outputs are saved to Obsidian vault:

```bash
# View agent outputs
ls -la obsidian-vault/Agents/

# View documentation
ls -la obsidian-vault/Documentation/

# View project notes
ls -la obsidian-vault/Projects/
```

### Performance Metrics

```python
# After task completion
print(f"Total execution time: {result['metrics']['duration']}s")
print(f"Agents used: {result['metrics']['agents']}")
print(f"Tokens consumed: {result['metrics']['tokens']}")
print(f"Parallel efficiency: {result['metrics']['parallel_ratio']}")
```

## Examples

### Example 1: Full Feature Implementation

```python
async def build_feature():
    orchestrator = HybridOrchestratorV5()

    # Orchestrated workflow
    result = await orchestrator.execute_task(
        task_description="""
        Build a real-time notification system with:
        1. WebSocket server
        2. Redis pub/sub backend
        3. React frontend component
        4. Unit tests
        5. Documentation
        """,
        decomposition_strategy="hierarchical",
        parallel_execution=True
    )

    return result
```

### Example 2: Code Review Workflow

```python
async def code_review_workflow(code_changes):
    orchestrator = HybridOrchestratorV5()

    # Parallel review by multiple agents
    reviews = await asyncio.gather(
        orchestrator.execute_task(
            f"Review for code quality:\n{code_changes}",
            agent_preference="claude"
        ),
        orchestrator.execute_task(
            f"Review for security issues:\n{code_changes}",
            agent_preference="deepseek"
        ),
        orchestrator.execute_task(
            f"Review for best practices:\n{code_changes}",
            agent_preference="gemini"
        )
    )

    # Synthesize reviews
    final_review = await orchestrator.execute_task(
        f"Synthesize code review feedback:\n{reviews}",
        agent_preference="planner"
    )

    return final_review
```

## Resources

- **Architecture**: `V5_ARCHITECTURE.md`
- **Integration Guide**: `V5_INTEGRATION_COMPLETE.md`
- **Test Examples**: `test_v5_*.py`
- **Web UI**: `web-ui/components/HybridOrchestratorPanel.tsx`
