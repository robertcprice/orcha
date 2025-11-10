---
title: Claude Code Agent
tags: [component, agent, claude, coding]
created: 2025-11-02
updated: 2025-11-02
type: component
status: active
agent_type: claude-sonnet-4-5
---

# Claude Code Agent

Primary coding agent powered by Anthropic's Claude Sonnet 4.5 model.

## Capabilities

The Claude Code Agent excels at:

- Code generation and refactoring
- Architectural design and planning
- Debug assistance and error analysis
- Documentation generation
- Test writing and validation

## Integration

This agent integrates with the [[Hybrid Orchestrator]] and communicates via the standard agent protocol defined in [[Agent Communication Protocol]].

## Configuration

```python
{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 8000,
    "temperature": 0.7,
    "streaming": true
}
```

## Usage Examples

See [[Agent Usage Examples]] for common patterns.

## Related Documents

- [[System Overview]]
- [[Codex MCP Agent]]
- [[Agent Communication Protocol]]
