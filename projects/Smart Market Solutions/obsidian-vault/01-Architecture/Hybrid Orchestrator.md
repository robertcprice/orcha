---
title: Hybrid Orchestrator
tags: [architecture, orchestrator, core]
created: 2025-11-02
updated: 2025-11-02
type: architecture
status: active
related:
  - System Overview
  - Agent Communication Protocol
---

# Hybrid Orchestrator

The Hybrid Orchestrator is the central coordination engine that manages task distribution across multiple AI agents.

## Overview

Located in `orchestrator/hybrid_orchestrator_v4_iterative.py`, this component serves as the brain of the system, routing tasks to appropriate agents and managing their lifecycle.

## Key Features

### Task Distribution

The orchestrator analyzes incoming tasks and determines which agent is best suited to handle them. This decision is based on:

- Task type and complexity
- Agent capabilities and availability
- Current system load
- Historical performance metrics

### Agent Management

The orchestrator maintains connections to:

- [[Claude Code Agent]] - For code generation and analysis
- [[Codex MCP Agent]] - For tool-augmented interactions
- Multiple research agents for specialized queries

### Session Tracking

Every task execution is tracked as a session, with full observability through:

- Real-time WebSocket updates via [[Redis Publisher]]
- Structured logging to the [[Obsidian Vault]]
- State persistence in Redis

## Implementation Details

```python
class HybridOrchestrator:
    def __init__(self):
        self.agents = {}
        self.redis_publisher = RedisPublisher()

    async def delegate_task(self, task):
        # Route to appropriate agent
        agent = self.select_agent(task)
        return await agent.execute(task)
```

## Configuration

See [[Configuration Guide]] for setup instructions.

## Related

- [[System Overview]]
- [[Task Distribution Strategy]]
- [[Agent Communication Protocol]]
