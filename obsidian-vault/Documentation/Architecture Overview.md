---
title: "Architecture Overview"
date: 2025-11-02
tags: [architecture, overview, system-design]
type: architecture
related_docs: [[Hybrid Orchestrator Design]], [[Agent Communication]], [[Redis Integration]]
---

# Architecture Overview

The Orchestration System is a sophisticated multi-agent AI platform that enables coordinated task execution across multiple AI providers.

## Core Components

### 1. Hybrid Orchestrator
The [[Hybrid Orchestrator Design]] implements a flexible orchestration layer that:
- Routes tasks to appropriate agents based on capabilities
- Manages agent communication via [[Redis Integration]]
- Handles real-time streaming and progress updates
- Provides fallback and retry mechanisms

### 2. Agent Framework
Multiple specialized agents work together:
- **Claude Code Agent** - See [[Claude Code Integration]]
- **Codex MCP Agent** - See [[MCP Integration]]
- **ChatGPT Agent** - See [[ChatGPT Integration]]
- **DeepSeek Agent** - See [[DeepSeek Integration]]

### 3. Communication Layer
Built on [[Redis Integration]] for:
- Pub/sub messaging between components
- Real-time event streaming to UI
- State synchronization across agents
- Session management and history

### 4. Web Interface
The [[Web UI Architecture]] provides:
- Task submission and monitoring
- Real-time session streaming via [[WebSocket Streaming]]
- Knowledge vault browser (this tool!)
- Agent status dashboard

## Data Flow

```
User Request → Web UI → Orchestrator → Agent Selection
                                    ↓
                                Redis Pub/Sub
                                    ↓
                            Agent Execution
                                    ↓
                        Stream Results → Web UI
```

See [[Data Flow Diagrams]] for detailed visualizations.

## Key Design Decisions

- [[ADR-001 Hybrid Orchestrator]] - Why hybrid orchestration
- [[ADR-002 Redis Communication]] - Communication architecture
- [[ADR-003 WebSocket Streaming]] - Real-time streaming design
- [[ADR-004 Knowledge Vault]] - Obsidian-based knowledge management

## Related Documentation

- [[Component Reference]] - Technical component details
- [[API Documentation]] - API reference
- [[Deployment Guide]] - How to deploy
- [[Development Setup]] - Developer environment setup
