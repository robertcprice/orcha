# Claude Code - Quick Reference

## 🚀 Slash Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/contextualize` | Learn project environment | `/contextualize` |
| `/push` | Smart git commit & push | `/push` |
| `/listtasks` | List tasks | `/listtasks [status] [limit]` |
| `/taskstatus` | Check task status | `/taskstatus <task_id>` |
| `/spawn-agent` | Spawn specialized agent | `/spawn-agent <type> <task>` |

## 🧠 Skills

| Skill | Use When | Key Feature |
|-------|----------|-------------|
| `multi-ai` | Need specialized AI | Gemini/DeepSeek/Grok |
| `orchestration` | Multi-agent coordination | Sequential/Parallel/Hierarchical patterns |

## 🤖 Available Agents

### Core Agents
- `claude` - Code implementation (MCP-based)
- `codex` - Coding (OpenAI-based)
- `planner` - Planning & coordination

### Specialized AI
- `gemini` - Multimodal analysis
- `deepseek` - Code reasoning
- `grok` - Research

### Aliases
- `research` → grok
- `doc` → claude
- `test` → codex

## 📝 Common Workflows

### New Agent Startup
```bash
/contextualize
```

### Spawn Agent for Task
```bash
/spawn-agent claude "Implement feature X"
```

### Check Task Progress
```bash
/listtasks active
/taskstatus <task_id>
```

### Commit Changes
```bash
/push
```

### Multi-AI Research
```bash
/spawn-agent grok "Research best practices"
/spawn-agent gemini "Analyze architecture"
/spawn-agent deepseek "Optimize code"
```

## ⚙️ Utility Scripts

```bash
# List tasks
python3 scripts/list_tasks.py --status pending

# Check task
python3 scripts/check_task.py <task_id> --watch

# Spawn agent
python3 scripts/spawn_agent.py gemini "Task description"

# Verify setup
python3 scripts/verify_integration.py
```

## 🎯 Orchestration Patterns

### Sequential
```python
plan → implement → test → document
```

### Parallel
```python
frontend || backend || research → integrate
```

### Hierarchical
```python
coordinator → [planner, implementer, tester] → sub-agents
```

### Consensus
```python
[claude, gemini, deepseek] → synthesize → decision
```

## 🌐 Web UI

```bash
cd web-ui && npm run dev

# Access:
http://localhost:3000/agents      # Agent status
http://localhost:3000/monitor     # Live monitoring
http://localhost:3000/vault       # Obsidian vault
```

## 📚 Documentation

- **Integration Guide**: `CLAUDE_COMMANDS_INTEGRATION.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Architecture**: `V5_ARCHITECTURE.md`
- **Skills**: `.claude/skills/README.md`

## 🔧 Quick Tips

1. **Always contextualize** new agents
2. **Choose right AI** for the task
3. **Use parallel execution** when possible
4. **Stay within 3 levels** of hierarchy
5. **Document in Obsidian** vault
6. **Monitor via Web UI**

## 🆘 Troubleshooting

### Commands not found?
```bash
ls -la .claude/commands/
```

### Scripts not executable?
```bash
chmod +x scripts/*.py
```

### Agent not available?
```bash
python3 scripts/spawn_agent.py --list
```

### Verify everything?
```bash
python3 scripts/verify_integration.py
```

---

**Quick Start**: `/contextualize` → `/spawn-agent` → `/listtasks` → `/push`
