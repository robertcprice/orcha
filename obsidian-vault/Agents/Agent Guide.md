---
title: "Agent Guide"
date: 2025-11-02
tags: [agents, guide, tutorial]
type: guide
related_docs: [[Claude Code Integration]], [[Agent Capabilities]], [[Task Routing]]
---

# Agent Guide

This guide covers working with the various AI agents in the orchestration system.

## Available Agents

### Claude Code Agent
The most powerful agent for code-related tasks. See [[Claude Code Integration]].

**Capabilities:**
- Full codebase analysis and modification
- Complex refactoring operations
- Architecture design and implementation
- Terminal command execution
- File system operations

**Best for:**
- Large-scale refactoring
- System design and architecture
- Complex bug fixes
- New feature implementation

### Codex MCP Agent
Specialized in Model Context Protocol operations. See [[MCP Integration]].

**Capabilities:**
- MCP server interactions
- Tool-based operations
- Structured data operations
- API integrations

**Best for:**
- Working with MCP servers
- Structured tool usage
- External API interactions

### ChatGPT Agent
General-purpose conversational agent. See [[ChatGPT Integration]].

**Capabilities:**
- Natural language processing
- General knowledge queries
- Document analysis
- Conversation and brainstorming

**Best for:**
- Research and information gathering
- Documentation writing
- Brainstorming sessions
- Quick queries

### DeepSeek Agent
Specialized coding and reasoning agent. See [[DeepSeek Integration]].

**Capabilities:**
- Code generation
- Algorithm design
- Mathematical reasoning
- Optimization problems

**Best for:**
- Algorithm implementation
- Performance optimization
- Mathematical solutions

## Task Routing

The [[Hybrid Orchestrator Design]] automatically routes tasks based on:

1. **Explicit Agent Selection** - User specifies agent
2. **Capability Matching** - Task requirements vs agent capabilities
3. **Load Balancing** - Current agent availability
4. **Cost Optimization** - Most cost-effective agent for task

See [[Task Routing]] for detailed routing logic.

## Working with Agents

### Submitting Tasks

Tasks are submitted via the [[Web UI Architecture]]:

```typescript
{
  "description": "Task description",
  "context": "Additional context",
  "preferredAgent": "claude-code", // optional
  "priority": "high" // low, normal, high
}
```

### Monitoring Progress

Real-time progress is streamed via [[WebSocket Streaming]]:
- Agent selection and initialization
- Execution progress and updates
- Tool usage and operations
- Final results and artifacts

### Session History

All agent sessions are logged in the [[Session Analysis]] vault section.

## Best Practices

1. **Choose the Right Agent** - Match task to agent capabilities
2. **Provide Clear Context** - More context = better results
3. **Monitor Progress** - Watch the live feed for issues
4. **Review Sessions** - Learn from past executions

## Related Documentation

- [[Architecture Overview]] - System architecture
- [[Claude Code Integration]] - Claude Code agent details
- [[API Documentation]] - API reference
- [[Troubleshooting Guide]] - Common issues and solutions
