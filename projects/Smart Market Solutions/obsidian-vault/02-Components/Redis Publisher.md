---
title: Redis Publisher
tags: [component, redis, streaming, pubsub]
created: 2025-11-02
updated: 2025-11-02
type: component
status: active
---

# Redis Publisher

Real-time event streaming system using Redis pub/sub for WebSocket communication.

## Purpose

The Redis Publisher enables real-time updates from agent sessions to be streamed to the [[Web UI]] for live monitoring.

## Architecture

```
Agent → Redis Publisher → Redis Pub/Sub → WebSocket Server → Browser
```

## Key Features

- **Non-blocking** - Async publishing doesn't slow down agents
- **Reliable** - Message delivery guarantees
- **Scalable** - Handles multiple concurrent sessions
- **Typed Events** - Structured message format

## Event Types

1. `session.started` - New session initiated
2. `session.thinking` - Agent reasoning update
3. `session.tool_use` - Tool execution event
4. `session.result` - Final result available
5. `session.error` - Error occurred

## Implementation

See `orchestrator/redis_publisher.py` for the implementation.

## Related

- [[Web UI]]
- [[Session Management]]
- [[System Overview]]
