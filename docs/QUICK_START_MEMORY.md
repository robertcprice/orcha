# Quick Start: Claude-Flow Memory Integration

## ✅ Installation Complete!

Your system now has Claude-Flow memory integration fully operational.

## How to Use

### From Terminal

```bash
# Simply run your existing command - memory is automatic!
claudeop

# Or use claude directly
claude --dangerously-skip-permissions
```

That's it! Memory is **automatically enabled** when you use Claude Code.

## What Happens Automatically

When you run `claudeop` or start Claude Code:

1. ✅ **Claude-Flow MCP server loads** - Provides memory capabilities
2. ✅ **Memory retrieval** - Searches for similar past workflows before execution
3. ✅ **Context enrichment** - Applies lessons from previous tasks
4. ✅ **Decision storage** - Saves agent decisions during execution
5. ✅ **Workflow storage** - Stores complete results after completion

### Performance

- **96x-164x faster** than Redis for semantic search
- **2-3ms query latency** for pattern matching
- **Persistent memory** across all sessions
- **Automatic learning** from successes and failures

## Memory Commands (Optional)

You can also interact with memory directly:

```bash
# Store a memory
npx claude-flow@alpha memory store-vector \
  "key-001" \
  "Implemented auth with JWT tokens" \
  --namespace implementations

# Semantic search
npx claude-flow@alpha memory vector-search \
  "authentication implementation" \
  --k 10 \
  --threshold 0.7

# Get stats
npx claude-flow@alpha memory status --reasoningbank
```

## Memory Storage Location

All memory is stored in: `.swarm/memory.db`

```bash
# View memory database
ls -lh .swarm/memory.db

# Check memory stats
npx claude-flow@alpha memory status --reasoningbank
```

## Integration Points

Memory is automatically used by:

- ✅ `HybridOrchestratorV5` - Your main orchestrator
- ✅ `/claudeop` slash command - SuperClaude operator
- ✅ All agent workflows - Automatic learning

## Verify It's Working

### Test 1: Check MCP Server

```bash
# Inside Claude Code session
# The claude-flow MCP tools should be available
# You'll see: mcp__claude-flow__memory_usage, etc.
```

### Test 2: Run a Workflow

```bash
# Run claudeop from terminal
claudeop

# Then inside Claude Code:
/claudeop "Build a simple API"

# Check logs - you should see:
# "✓ Claude-Flow Memory loaded (96x-164x performance boost)"
# "🧠 Retrieving relevant context from memory..."
```

### Test 3: Check Memory Stats

```bash
# After running some workflows
npx claude-flow@alpha memory status --reasoningbank

# You should see:
# - Total memories: X
# - Embeddings: X
# - Namespaces: ["orchestration", "workflows", ...]
```

## Memory Namespaces

Your system uses these namespaces automatically:

- `orchestration` - General orchestration data
- `workflows` - Complete workflow results
- `agent_decisions` - Individual agent decisions
- `patterns` - Learned patterns

## Context Window Impact

| Component | Tokens | % of 200K |
|-----------|--------|-----------|
| Base System | 0 | 0% |
| SuperClaude Framework | 12,500 | 6.25% |
| + Claude-Flow Memory | 18,500 | 9.25% |
| **Total Overhead** | **18,500** | **9.25%** |
| **Available for Work** | **181,500** | **90.75%** |

**Net cost**: 6,000 tokens (3%) for 96x-164x performance improvement.

## Troubleshooting

### Memory not working?

```bash
# 1. Check MCP server
cat ~/.claude.json | grep claude-flow

# Should show:
# "claude-flow": {
#   "command": "npx",
#   "args": ["claude-flow@alpha", "mcp", "start"]
# }

# 2. Reinstall if needed
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start

# 3. Restart Claude Code
# Exit and run: claudeop
```

### Memory database issues?

```bash
# Remove and recreate
rm -f .swarm/memory.db
npx claude-flow@alpha memory status --reasoningbank
```

## Documentation

- **Full Integration Guide**: `CLAUDE_FLOW_INTEGRATION.md`
- **Test Suite**: `test_memory_integration.py`
- **Command Reference**: `.claude/commands/claudeop.md`

## What's Next?

Just use `claudeop` normally! The system will:
- Learn from every workflow
- Get smarter over time
- Retrieve relevant context automatically
- Store results for future reference

**No additional configuration needed - it just works!**

---

**Version**: 1.0.0
**Last Updated**: 2025-11-06
**Status**: ✅ OPERATIONAL
