# ClaudeOp Quick Start Guide

## 🚀 What is ClaudeOp?

**ClaudeOp** is your SuperClaude-enhanced orchestration command that starts Claude sessions with:
- 🎭 **Expert Personas** for specialized tasks
- 🎨 **Behavioral Modes** for optimal execution
- 🤖 **Multi-Agent Orchestration**
- 🚀 **Full Permission Bypass** for autonomous execution

## ⚡ Quick Start

### 1. Basic Usage

```bash
# Interactive session
./scripts/claudeop

# Execute a task
./scripts/claudeop "Design a scalable auth system"
```

### 2. With Personas

```bash
# Architecture persona
./scripts/claudeop "Design microservices architecture" --persona architect

# Security persona
./scripts/claudeop "Audit OAuth implementation" --persona security

# Frontend persona
./scripts/claudeop "Build responsive dashboard" --persona frontend

# Performance persona
./scripts/claudeop "Optimize database queries" --persona performance
```

### 3. With Modes

```bash
# Deep research before implementation
./scripts/claudeop "Choose database" --mode deep-research

# Token-efficient output
./scripts/claudeop "Review large codebase" --mode token-efficiency

# Show decision-making process
./scripts/claudeop "Analyze architecture" --mode introspection
```

### 4. Combined

```bash
# Architect persona + deep research mode
./scripts/claudeop "Build notification system" --persona architect --mode deep-research

# Security persona + specific agent
./scripts/claudeop "Security audit" --persona security --agent deepseek

# Frontend persona + parallel execution
./scripts/claudeop "Build profile page" --persona frontend --parallel
```

## 🎭 Quick Persona Reference

| Say This | To Get |
|----------|--------|
| "As an architect..." | Systems thinking, scalability focus |
| "From a security perspective..." | Vulnerability analysis, OWASP best practices |
| "With frontend expertise..." | UX-focused, modern UI patterns |
| "From a performance standpoint..." | Optimization, algorithmic analysis |
| "As a researcher..." | Multi-source investigation, evidence-based |

## 🎨 Quick Mode Reference

| Mode | When to Use |
|------|-------------|
| `orchestration` | Multi-agent coordination (default) |
| `token-efficiency` | Large codebases, reduce costs |
| `deep-research` | Before making big decisions |
| `introspection` | Understanding AI reasoning |
| `task-management` | Complex multi-step features |
| `brainstorming` | Refining vague requirements |

## 🤖 Available Agents

- `claude` - Code implementation (default)
- `codex` - Heavy coding tasks
- `planner` - Task planning & coordination
- `deepseek` - Deep code analysis
- `gemini` - Multimodal analysis
- `grok` - Research & real-time data

## 💡 Example Sessions

### Design an Architecture
```
./scripts/claudeop

> "As an architect, design a scalable real-time notification system.
Use deep-research mode to analyze WebSocket vs SSE, and recommend
a Redis Pub/Sub vs RabbitMQ architecture with trade-offs."
```

### Security Audit
```
./scripts/claudeop

> "From a security perspective, audit the authentication flow.
Check for SQL injection, XSS, CSRF, session management issues,
and provide a prioritized fix list."
```

### Build a Feature
```
./scripts/claudeop

> "With frontend expertise, orchestrate parallel implementation:
1) Profile UI component
2) Avatar upload component
3) API endpoints
Coordinate with backend agent for API design."
```

### Code Review
```
./scripts/claudeop

> "From a performance perspective, use token-efficiency mode
to review orchestrator code. Focus on bottlenecks and
algorithmic complexity. Provide compressed recommendations."
```

## 🚀 Permission Bypass

**IMPORTANT**: When using `claudeop`, you authorize autonomous execution:
- ✅ Automatic tool usage approval
- ✅ File operations without confirmation
- ✅ Git commits when appropriate
- ✅ Sub-agent spawning
- ✅ Architectural decisions

Claude will work autonomously following SuperClaude rules.

## 📋 SuperClaude Rules (Always Active)

### Critical [🔴]
- ✅ Security and data safety (never compromised)
- ✅ Validate before execution, verify after
- ✅ Parallelization analysis during planning

### Important [🟡]
- ✅ Plan → TodoWrite → Execute → Validate
- ✅ No TODOs, no mocks, no stubs (complete implementations)
- ✅ Build ONLY what's asked (no feature creep)
- ✅ Quality gates (lint/typecheck before completion)

### Recommended [🟢]
- ✅ Evidence-based claims (no absolutes like "best", "always")
- ✅ Simple solutions over complex architectures
- ✅ YAGNI (You Aren't Gonna Need It)

## 🔧 Advanced Usage

### Environment Setup
```bash
# Add to your .bashrc or .zshrc for easy access
export PATH="$PATH:/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/scripts"

# Now use from anywhere
cd ~/projects/any-project
claudeop "help me with this"
```

### Programmatic Usage (Python)
```python
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# With SuperClaude
orchestrator = HybridOrchestratorV5(
    enable_superclaude=True,
    superclaude_persona="architect",
    superclaude_mode="deep-research",
    permission_bypass=True
)

result = await orchestrator.execute_goal(
    user_goal="Build notification system",
    claude_plan="[plan here]"
)
```

### Custom Personas
Create `.claude/superclaude/agents/custom.md`:
```markdown
---
name: Custom Expert
expertise: Your domain
---

## Core Belief
Your guiding principle

## Primary Question
"What's your key question?"

## Decision Pattern
How you make trade-offs
```

Then use:
```bash
./scripts/claudeop "task" --persona custom
```

## 🆘 Troubleshooting

### Command not found
```bash
chmod +x scripts/claudeop
./scripts/claudeop "test"
```

### SuperClaude not loading
```bash
pipx install SuperClaude
superclaude install --yes
```

### Want to see what's happening
```bash
# Check logs
tail -f web-ui/dev.log

# Monitor Redis events
redis-cli SUBSCRIBE "orchestrator:*"
```

## 📚 More Information

- Full Integration Guide: `SUPERCLAUDE_INTEGRATION_SUMMARY.md`
- SuperClaude Docs: https://superclaude.org
- Main Quick Reference: `QUICK_REFERENCE.md`

## 🎉 Tips

1. **Start with research**: Use `--mode deep-research` for important decisions
2. **Use personas naturally**: Just say "As an architect..." in your prompts
3. **Trust permission bypass**: It follows SuperClaude rules automatically
4. **Combine features**: Mix personas, modes, and agents for powerful results
5. **Check the logs**: Learn from what the orchestrator is doing

---

**Ready to go?** Try:
```bash
./scripts/claudeop "Tell me about the orchestration system architecture"
```
