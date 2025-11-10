---
title: "Claude Code Integration"
date: 2025-11-02
tags: [claude, integration, agent]
type: technical
related_docs: [[Agent Guide]], [[Architecture Overview]], [[MCP Integration]]
---

# Claude Code Integration

Integration of Anthropic's Claude Code CLI agent into the orchestration system.

## Overview

Claude Code is the most powerful agent in the system, capable of:
- Full codebase analysis and modification
- Complex refactoring operations
- Terminal command execution
- Multi-file operations
- Architecture design

## Architecture

The Claude Code agent wrapper (`claude_code_agent.py`) provides:

```python
class ClaudeCodeAgent:
    def __init__(self):
        self.agent_id = "claude-code"
        self.capabilities = [
            "code-generation",
            "refactoring",
            "architecture",
            "file-operations",
            "terminal-execution"
        ]

    async def execute_task(self, task: Task) -> Result:
        # Execute via Claude Code CLI
        # Stream results via Redis
        # Return structured result
```

## Communication Flow

See [[Redis Integration]] for details on the pub/sub architecture.

```
Web UI → Orchestrator → Claude Code Agent
                            ↓
                    Claude Code CLI
                            ↓
                    File System / Terminal
                            ↓
                    Results → Redis → Web UI
```

## Streaming Implementation

The agent implements token-level streaming:

1. **Initialize Stream** - Open WebSocket connection
2. **Execute Task** - Run Claude Code with streaming enabled
3. **Parse Events** - Parse Claude's output events
4. **Publish Updates** - Push to Redis pub/sub
5. **UI Update** - WebSocket broadcasts to UI

See [[WebSocket Streaming]] for UI implementation.

## Features

### 1. Intelligent Task Handling
- Automatically breaks down complex tasks
- Manages multi-step operations
- Provides progress updates

### 2. Context Awareness
- Accesses full codebase
- Understands project structure
- Leverages git history

### 3. Safety Features
- Read-only mode option
- Change confirmation
- Rollback capabilities

### 4. Performance
- Parallel file operations
- Efficient codebase scanning
- Optimized token usage

## Configuration

```json
{
  "agent_id": "claude-code",
  "model": "claude-sonnet-4-5",
  "max_tokens": 200000,
  "temperature": 0.7,
  "streaming": true,
  "timeout": 300
}
```

## Best Practices

### When to Use Claude Code
- Complex code refactoring
- Architecture changes
- Multi-file operations
- System design tasks

### When NOT to Use
- Simple queries (use [[ChatGPT Integration]] instead)
- Pure research tasks
- Quick documentation lookups

## Examples

### Example 1: Refactoring
```
Task: "Refactor the authentication system to use JWT tokens"

Claude Code will:
1. Analyze current auth implementation
2. Plan the refactoring steps
3. Modify all relevant files
4. Update tests
5. Verify the changes
```

### Example 2: New Feature
```
Task: "Add rate limiting to API endpoints"

Claude Code will:
1. Design rate limiting strategy
2. Implement middleware
3. Add configuration
4. Create tests
5. Update documentation
```

## Troubleshooting

See [[Troubleshooting Guide]] for common issues.

### Issue: Timeout Errors
- Increase timeout in configuration
- Break task into smaller chunks
- Check system resources

### Issue: Context Too Large
- Use .claud_code_ignore to exclude files
- Focus on specific directories
- Clear cache if needed

## Related Documentation

- [[Agent Guide]] - General agent guide
- [[Architecture Overview]] - System architecture
- [[MCP Integration]] - MCP agent details
- [[Task Routing]] - How tasks are routed
