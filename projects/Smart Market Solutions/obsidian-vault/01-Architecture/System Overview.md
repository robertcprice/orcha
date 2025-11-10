---
title: System Overview
tags: [architecture, overview, system-design]
created: 2025-11-02
updated: 2025-11-02
type: architecture
status: active
---

# System Overview

The AI Orchestration Console is a comprehensive platform for managing multiple AI agents and coordinating complex tasks across different LLM providers.

## Core Components

The system consists of several key components:

- [[Hybrid Orchestrator]] - Main coordination engine
- [[Claude Code Agent]] - Primary coding agent
- [[Codex MCP Agent]] - Model Context Protocol integration
- [[Redis Publisher]] - Event streaming system
- [[Web UI]] - React-based dashboard

## Architecture Principles

1. **Modularity** - Each agent operates independently
2. **Observability** - Real-time monitoring via WebSocket streams
3. **Resilience** - Graceful error handling and recovery
4. **Extensibility** - Easy to add new agents and capabilities

## Related Documents

- [[Agent Communication Protocol]]
- [[Task Distribution Strategy]]
- [[Session Management]]

## Key Technologies

- Python 3.11+ for backend orchestration
- Next.js 14 for the web interface
- Redis for pub/sub messaging
- WebSocket for real-time updates

## Future Enhancements

See [[Roadmap]] for planned features and improvements.
