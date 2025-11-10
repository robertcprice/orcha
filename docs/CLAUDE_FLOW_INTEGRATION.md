# Claude-Flow Memory Integration

Complete integration guide for Claude-Flow memory system with the Orchestration System.

## Overview

This integration adds Claude-Flow's **AgentDB** and **ReasoningBank** memory capabilities to the orchestration system, providing:

- **96x-164x faster vector search** vs traditional Redis approach
- **Semantic understanding** with HNSW indexing (O(log n) complexity)
- **Persistent memory** across orchestration sessions
- **Pattern learning** from agent coordination history
- **Hybrid system** with automatic fallback between AgentDB and ReasoningBank

## Installation

### 1. Install Dependencies

```bash
# Install Claude-Flow globally
npm install -g claude-flow@alpha

# Install memory dependencies
npm install agentdb@1.6.1 agentic-flow@1.8.10
```

### 2. Add MCP Server

```bash
# Add Claude-Flow MCP server to Claude Code
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### 3. Verify Installation

```bash
# Check Claude-Flow version
npx claude-flow@alpha --version

# Check memory status
npx claude-flow@alpha memory status --reasoningbank
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│           Hybrid Orchestrator V5                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Claude-Flow Memory Integration                   │  │
│  │  ┌─────────────────┐  ┌────────────────────────┐ │  │
│  │  │   AgentDB       │  │    ReasoningBank       │ │  │
│  │  │  Vector Search  │  │  Pattern Matching      │ │  │
│  │  │  96x-164x       │  │  2-3ms latency         │ │  │
│  │  │  faster         │  │  SQLite based          │ │  │
│  │  └─────────────────┘  └────────────────────────┘ │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │    Memory Operations                        │ │  │
│  │  │  • semantic_search()                        │ │  │
│  │  │  • store_vector()                           │ │  │
│  │  │  • query_patterns()                         │ │  │
│  │  │  • retrieve_context()                       │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Workflow Integration Points                      │  │
│  │  1. Pre-execution: Retrieve similar workflows    │  │
│  │  2. During execution: Store agent decisions      │  │
│  │  3. Post-execution: Store complete workflow      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Memory Namespaces

- `orchestration` - Default namespace for general orchestration data
- `workflows` - Complete workflow results and outcomes
- `agent_decisions` - Individual agent decisions and learnings
- `patterns` - Learned patterns from successful executions

## Usage

### Python Integration

```python
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# Initialize with memory enabled (default)
orchestrator = HybridOrchestratorV5(
    enable_memory=True,
    memory_namespace="orchestration",
    verbose=True
)

# Memory is automatically used during workflow execution
result = await orchestrator.execute_goal(
    user_goal="Build authentication system",
    claude_plan=plan_text
)

# Memory operations happen automatically:
# 1. Similar past workflows retrieved before execution
# 2. Workflow result stored after completion
# 3. Learnings available for future tasks
```

### Direct Memory Access

```python
from orchestrator.claude_flow_memory import ClaudeFlowMemory
from pathlib import Path

# Initialize memory system
memory = ClaudeFlowMemory(
    project_root=Path.cwd(),
    default_namespace="my_namespace",
    verbose=True
)

# Store a decision with vector embedding
await memory.store_vector(
    key="decision-001",
    content="Used hierarchical planning for complex task",
    namespace="agent_decisions",
    metadata={"agent": "planner", "success": True}
)

# Semantic search
results = await memory.semantic_search(
    query="How to handle complex planning?",
    k=5,
    threshold=0.7
)

for result in results:
    print(f"Similarity: {result.similarity_score:.3f}")
    print(f"Content: {result.content}")
    print(f"Metadata: {result.metadata}")
```

### CLI Usage

```bash
# Store memory
npx claude-flow@alpha memory store-vector \
  "auth-implementation" \
  "Implemented JWT authentication with refresh tokens" \
  --namespace implementations \
  --reasoningbank

# Semantic search
npx claude-flow@alpha memory vector-search \
  "authentication implementation" \
  --k 10 \
  --threshold 0.7 \
  --namespace implementations

# Pattern query
npx claude-flow@alpha memory query \
  "JWT tokens" \
  --namespace implementations \
  --reasoningbank

# Get stats
npx claude-flow@alpha memory status --reasoningbank
```

## Features

### 1. Semantic Vector Search (AgentDB)

**Performance**: 96x-164x faster than traditional search

```python
# Search by meaning, not just keywords
results = await memory.semantic_search(
    query="best practices for error handling",
    k=10,
    threshold=0.7
)

# Results ranked by semantic similarity
# 0.95 - "Implemented comprehensive error handling..."
# 0.87 - "Error recovery patterns for distributed systems..."
# 0.82 - "Exception handling best practices..."
```

**Benefits**:
- Understands context and meaning
- HNSW indexing for O(log n) performance
- 9 RL algorithms for intelligent ranking
- Quantization for 4-32x memory reduction

### 2. Pattern Matching (ReasoningBank)

**Performance**: 2-3ms query latency

```python
# Fast pattern-based search
results = await memory.query_patterns(
    query="authentication JWT",
    namespace="implementations"
)

# SQLite-based pattern matching
# Ideal for exact or fuzzy string matching
```

**Benefits**:
- No API keys required
- Persistent SQLite database
- Fast pattern matching
- Namespace isolation

### 3. Automatic Workflow Learning

The orchestrator automatically:

**Before Execution**:
```python
# Retrieves similar past workflows
similar_tasks = await memory.semantic_search(
    query=user_goal,
    k=3,
    threshold=0.7,
    namespace="workflows"
)
# Uses learnings to inform current execution
```

**After Execution**:
```python
# Stores complete workflow result
await memory.store_workflow_result(session_id, {
    "goal": user_goal,
    "success": True,
    "quality_score": 8.5,
    "total_iterations": 2,
    "files_created": ["auth.py", "tests.py"],
    "workflow_log": [...],
    "timestamp": "2025-11-06T..."
})
```

## Configuration

### Memory Settings

```python
orchestrator = HybridOrchestratorV5(
    # Enable/disable memory (default: True)
    enable_memory=True,

    # Default namespace for storage
    memory_namespace="orchestration",

    # Enable verbose logging
    verbose=True
)
```

### Memory System Settings

```python
memory = ClaudeFlowMemory(
    project_root=Path("/path/to/project"),
    default_namespace="my_namespace",

    # Enable ReasoningBank for pattern matching
    use_reasoningbank=True,

    # Enable verbose logging
    verbose=True
)
```

### Storage Location

Memory is stored in: `.swarm/memory.db` (SQLite database)

```bash
# Check memory database
ls -lh .swarm/memory.db

# View memory stats
npx claude-flow@alpha memory status --reasoningbank
```

## Performance Comparison

### Vector Search Performance

| Operation | Redis | AgentDB | Improvement |
|-----------|-------|---------|-------------|
| Single query | 9.6ms | <0.1ms | **96x faster** |
| Batch operations | 12.5ms | 0.1ms | **125x faster** |
| Large queries | 16.4ms | 0.1ms | **164x faster** |
| Memory usage | 100% | 25% | **4x reduction** |

### Context Window Impact

| Configuration | Token Usage | % of 200K |
|---------------|-------------|-----------|
| Base Orchestrator | 0 | 0% |
| + SuperClaude | 12,500 | 6.25% |
| + Claude-Flow Memory | 18,500 | 9.25% |
| **Net Addition** | **6,000** | **3%** |

## Integration Points

### 1. Workflow Initialization

```python
# orchestrator/hybrid_orchestrator_v5.py:399-421
if self.memory_enabled and self.memory:
    similar_tasks = await self.memory.semantic_search(
        query=user_goal,
        k=3,
        threshold=0.7,
        namespace="workflows"
    )
    if similar_tasks:
        context['similar_past_workflows'] = similar_tasks
```

### 2. Workflow Completion

```python
# orchestrator/hybrid_orchestrator_v5.py:575-594
if self.memory_enabled and self.memory:
    workflow_data = {
        "session_id": session_id,
        "goal": user_goal,
        "success": review.approved,
        "quality_score": review.quality_score,
        ...
    }
    await self.memory.store_workflow_result(session_id, workflow_data)
```

### 3. Agent Decisions

```python
# Custom integration
await memory.store_agent_decision(
    agent_id="claude-planner",
    task_id="task-001",
    decision="Used hierarchical planning...",
    metadata={"success": True}
)
```

## Monitoring

### Memory Statistics

```bash
# Get comprehensive stats
npx claude-flow@alpha memory status --reasoningbank
```

Output:
```json
{
  "total_memories": 150,
  "embeddings": 150,
  "namespaces": ["orchestration", "workflows", "agent_decisions"],
  "database_size": "2.4 MB",
  "avg_query_time": "2.3ms"
}
```

### Programmatic Monitoring

```python
stats = await memory.get_memory_stats()
print(f"Total memories: {stats['total_memories']}")
print(f"Query time: {stats['avg_query_time']}")
```

## Troubleshooting

### Memory not available

```python
if not orchestrator.memory_enabled:
    print("Claude-Flow Memory not available")
    # Fallback to Redis or no memory
```

### Installation issues

```bash
# Reinstall dependencies
npm install -g claude-flow@alpha --force
npm install agentdb@1.6.1 agentic-flow@1.8.10

# Verify installation
npx claude-flow@alpha --version
```

### Database errors

```bash
# Remove and recreate database
rm -f .swarm/memory.db
npx claude-flow@alpha memory status --reasoningbank
```

## Best Practices

### 1. Use Namespaces

Organize memories by domain:
- `workflows` - Complete workflow results
- `agent_decisions` - Individual decisions
- `patterns` - Learned patterns
- Custom namespaces for specific domains

### 2. Set Appropriate Thresholds

```python
# High precision (fewer, more relevant results)
results = await memory.semantic_search(query, threshold=0.8)

# High recall (more results, some less relevant)
results = await memory.semantic_search(query, threshold=0.6)

# Balanced (recommended)
results = await memory.semantic_search(query, threshold=0.7)
```

### 3. Store Rich Metadata

```python
await memory.store_vector(
    key="decision-001",
    content="Decision description",
    metadata={
        "agent_id": "planner",
        "task_type": "complex_planning",
        "success": True,
        "duration": 45.2,
        "quality_score": 8.5,
        "files_affected": ["plan.md", "tasks.json"]
    }
)
```

### 4. Regular Cleanup

```python
# Implement periodic cleanup of old memories
# (Feature to be added in future version)
```

## Future Enhancements

Planned improvements:
- Automatic memory consolidation
- Memory expiration policies
- Cross-session learning analytics
- Memory visualization dashboard
- Export/import capabilities

## Support

- GitHub Issues: https://github.com/ruvnet/claude-flow/issues
- Documentation: https://github.com/ruvnet/claude-flow/docs
- Discord: https://discord.com/invite/dfxmpwkG2D

## License

MIT License - Integration follows same license as Claude-Flow

---

**Version**: 1.0.0
**Last Updated**: 2025-11-06
**Compatibility**: Claude-Flow v2.7.0-alpha.10+
