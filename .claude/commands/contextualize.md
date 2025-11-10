# Contextualize - Learn the Environment

**For newly spawned agents:** Quickly learn the project environment, structure, and current status.

**Usage:** `/contextualize`

## What This Does

This command provides a comprehensive overview of:
1. Project structure and organization
2. Current work status and priorities
3. Active tasks and recent activity
4. Available tools and resources
5. Key documentation locations
6. Recent changes and commits

This is essential for newly spawned agents to understand context before working.

## Now Execute

Provide the following information to help the agent understand the environment:

### 1. Project Overview

Read and summarize key documentation:
```bash
cat README.md 2>/dev/null || echo "No README found"
cat DOCUMENTATION.md 2>/dev/null || echo "No DOCUMENTATION found"
cat V5_ARCHITECTURE.md 2>/dev/null || echo "No V5_ARCHITECTURE found"
```

### 2. Current Work Status

Check for status files in obsidian vault:
```bash
cat obsidian-vault/index.md 2>/dev/null || echo "No index found"
ls -la "projects/Smart Market Solutions/" 2>/dev/null || echo "No projects directory"
```

### 3. Active Tasks

List active tasks from the project:
```bash
find "projects/Smart Market Solutions/tasks" -name "*.json" -type f 2>/dev/null | head -10
```

### 4. Recent Activity

```bash
git log --oneline -10
git status --short
```

### 5. Project Structure

```bash
ls -la
tree -L 2 -I 'node_modules|venv|__pycache__|.git|.next|dist|build' 2>/dev/null || find . -maxdepth 2 -type d | grep -v "node_modules\|__pycache__\|.git\|.next"
```

### 6. Key Files and Locations

Highlight:
- **Orchestration**: `orchestrator/` (agent framework, hybrid orchestrator v5)
- **Web UI**: `web-ui/` (Next.js interface)
- **Docs**: `obsidian-vault/`, `*.md` files
- **Tasks**: `projects/Smart Market Solutions/tasks/`
- **Logs**: `logs/`, `web-ui/dev.log`
- **Scripts**: `*.py` test scripts

### 7. Available Commands

List available Claude commands:
```bash
ls -1 .claude/commands/ 2>/dev/null | sed 's/.md$//' | sed 's/^/  \//' || echo "No commands directory"
```

### 8. Available Skills

```bash
ls -1 .claude/skills/ 2>/dev/null | sed 's/^/  - /' || echo "No skills directory"
```

### 9. Environment Info

```bash
python3 --version
node --version 2>/dev/null || echo "Node not installed"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+set}"
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+set}"
echo "REDIS_HOST: ${REDIS_HOST:-localhost}"
```

---

## Summary Template

After gathering info, provide a structured summary:

```
🤖 AGENT CONTEXTUALIZATION COMPLETE

PROJECT: Smart Market Solutions - Orchestration System
TYPE: Multi-AI orchestration framework with hybrid agents

📁 STRUCTURE:
- Orchestration: orchestrator/ (v5 hybrid orchestrator)
- Web UI: web-ui/ (Next.js dashboard)
- Scripts: test_*.py (integration tests)
- Docs: obsidian-vault/, *.md (documentation)
- Tasks: projects/Smart Market Solutions/tasks/

📊 CURRENT STATUS:
[Summary from documentation files]

🎯 ACTIVE WORK:
[List of active/pending tasks]

📝 RECENT CHANGES:
[Last few commits]

🔧 AVAILABLE TOOLS:
- Task management: /listtasks, /taskstatus
- Agent spawning: /spawn-agent (hierarchical)
- Git workflow: /push
- AI Models: Claude Code, OpenAI, Gemini, DeepSeek, Grok

🤖 ORCHESTRATION CAPABILITIES:
- Hybrid v5 Orchestrator (unified multi-AI)
- Claude Code Agent (MCP-based)
- Codex MCP Agent (OpenAI-based)
- ChatGPT Planner
- Redis pub/sub for real-time events
- WebSocket streaming
- Obsidian vault integration

💡 QUICK TIPS:
- Use hybrid_orchestrator_v5.py for unified orchestration
- Web UI runs on port 3000
- Redis required for pub/sub
- Check obsidian-vault for documentation
- Test with test_v5_*.py scripts

✅ You're now contextualized and ready to work!
```

Present this summary clearly to the agent.
