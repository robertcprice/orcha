---
title: "Hybrid Orchestrator Design"
date: 2025-11-02
tags: [architecture, orchestrator, design-pattern]
type: architecture
related_docs: [[Architecture Overview]], [[Agent Guide]], [[Task Routing]], [[Redis Integration]]
---

# Hybrid Orchestrator Design

The Hybrid Orchestrator is the core coordination layer of the system, managing multiple AI agents and routing tasks intelligently.

## Design Philosophy

The orchestrator follows a **hybrid approach** combining:
1. **Explicit routing** - User-specified agent selection
2. **Intelligent routing** - Automatic agent selection based on capabilities
3. **Fallback mechanisms** - Automatic retry with alternative agents
4. **Real-time communication** - Live streaming of agent operations

## Architecture

### Core Components

```
┌─────────────────────────────────────┐
│     Hybrid Orchestrator V4          │
├─────────────────────────────────────┤
│  • Task Queue Manager               │
│  • Agent Selector                   │
│  • Session Manager                  │
│  • Result Aggregator                │
└─────────────────────────────────────┘
         ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │Claude  │    │ChatGPT │    │Codex   │
    │Code    │    │Agent   │    │MCP     │
    └────────┘    └────────┘    └────────┘
```

### Agent Selection Algorithm

See [[Task Routing]] for the full algorithm. Key factors:

1. **Explicit Selection** - `preferredAgent` parameter
2. **Capability Matching** - Task type → agent capabilities
3. **Availability** - Check agent status and load
4. **Cost Optimization** - Select most economical option
5. **Fallback Chain** - Define alternative agents

### Communication Flow

The orchestrator uses [[Redis Integration]] for:

```python
# Publish task to agent
redis.publish(f'agent:{agent_id}:tasks', task_data)

# Subscribe to agent updates
redis.subscribe(f'agent:{agent_id}:updates')

# Stream to UI
redis.publish('ui:stream', {
    'session_id': session_id,
    'type': 'progress',
    'data': progress_data
})
```

## Implementation Details

### Task Lifecycle

1. **Submission** - Task received from UI
2. **Validation** - Check task structure and requirements
3. **Agent Selection** - Route to appropriate agent
4. **Execution** - Agent processes task
5. **Streaming** - Real-time updates to UI
6. **Completion** - Results aggregated and returned
7. **Archival** - Session stored in vault

### Session Management

Each task execution creates a session:

```typescript
interface Session {
  id: string;
  taskId: string;
  agentId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  events: SessionEvent[];
  result?: any;
}
```

Sessions are tracked via [[Session Analysis]].

### Error Handling

The orchestrator implements robust error handling:

1. **Graceful Degradation** - Fall back to alternative agents
2. **Retry Logic** - Configurable retry with backoff
3. **Error Reporting** - Detailed error messages to UI
4. **State Recovery** - Resume from last known good state

## Key Features

### 1. Multi-Agent Coordination
- Run multiple agents in parallel
- Coordinate results from multiple sources
- Merge and aggregate outputs

### 2. Real-Time Streaming
- Live progress updates via [[WebSocket Streaming]]
- Token-by-token streaming for text generation
- Tool usage notifications
- Status updates

### 3. Context Management
- Maintain conversation context across agents
- Share state between sequential tasks
- Inject relevant documentation from vault

### 4. Resource Management
- Rate limiting and throttling
- Cost tracking and budgets
- Concurrent execution limits
- Memory and state cleanup

## Configuration

See [[Orchestrator Configuration]] for configuration options.

## Related Documentation

- [[Architecture Overview]] - System overview
- [[Agent Guide]] - Working with agents
- [[Redis Integration]] - Communication layer
- [[ADR-001 Hybrid Orchestrator]] - Design decision record
