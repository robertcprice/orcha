# Claude Code Skills

This directory contains skills that guide Claude Code in following best practices across different aspects of software development.

## Available Skills

### Core Development Skills

#### 1. **plan.md** - Task Planning
**When to use**: Before starting any complex task

Ensures proper task planning with focus on:
- Breaking down complex tasks into manageable steps
- Identifying parallelization opportunities
- Determining what to delegate to subagents
- Creating clear success criteria

**Key Features**:
- Automatic activation for multi-step tasks
- Parallelization strategy templates
- Delegation opportunity identification
- Integration with other skills

#### 2. **delegate.md** - Task Delegation
**When to use**: When work can be delegated to specialized subagents

Enables effective delegation using Codex MCP server:
- Creating subagents with clear specifications
- Monitoring and debugging subagent work
- Parallelizing independent work
- Integrating subagent results

**Key Features**:
- Codex MCP integration guide
- Subagent specification templates
- Debug protocol for subagent code
- Parallelization patterns

#### 3. **debug.md** - Debugging Protocol
**When to use**: When encountering any error

Implements mandatory 3-attempt error resolution:
- **Attempt 1**: Document and try one solution
- **Attempt 2**: Try a different approach
- **Attempt 3**: Consult external expert (ChatGPT-5, Hybrid, etc.)

**Key Features**:
- Playwright MCP integration for browser issues
- Expert consultation templates
- Red flags for immediate escalation
- Error documentation guidelines

### Quality Assurance Skills

#### 4. **test.md** - Testing
**When to use**: After ANY code modification

Ensures comprehensive testing:
- Unit, integration, and E2E testing strategies
- Playwright testing patterns
- Test pyramid approach
- Testing checklist

**Key Features**:
- Playwright MCP server integration
- Test organization guidelines
- Coverage goals
- Testing anti-patterns to avoid

#### 5. **review.md** - Self-Review
**When to use**: BEFORE marking any task complete

Mandatory self-review checklist covering:
- Requirements verification
- File organization
- Code quality
- Testing
- Documentation
- Security
- Performance

**Key Features**:
- Comprehensive 10-point checklist
- Self-correction protocol
- Common issues and fixes
- Verification commands

#### 6. **security.md** - Security
**When to use**: When handling user input, auth, APIs, or sensitive data

Prevents OWASP Top 10 vulnerabilities:
- Injection prevention (SQL, XSS, etc.)
- Authentication & authorization best practices
- Input validation & output encoding
- Security testing patterns

**Key Features**:
- Code examples for secure patterns
- Security checklist
- Common vulnerabilities to avoid
- Environment-specific hardening

### Code Organization Skills

#### 7. **document.md** - Documentation
**When to use**: After implementing features or fixing bugs

Ensures comprehensive documentation:
- Code comments (explain WHY)
- API documentation
- README files
- Architecture Decision Records (ADRs)

**Key Features**:
- Documentation templates
- Best practices (examples, edge cases)
- Integration with other skills
- Special scenarios (bug fixes, optimizations)

#### 8. **commit.md** - Git Workflow
**When to use**: When creating commits or preparing for PR

Ensures clean git history:
- Conventional commit format
- Atomic commits
- Pre-commit checklist
- Git safety protocol

**Key Features**:
- Commit message templates
- Common scenarios guide
- Git safety rules
- Useful commands reference

#### 9. **architecture.md** - System Design
**When to use**: When starting new features or making design decisions

Guides architectural decisions:
- SOLID principles
- Design patterns (Repository, Factory, Strategy, Observer)
- Layered architecture
- API design (REST, GraphQL)
- Database schema design

**Key Features**:
- Architecture Decision Records (ADR) template
- Trade-off evaluation framework
- Monolith vs Microservices guide
- Common mistakes to avoid

### Optimization Skills

#### 10. **performance.md** - Performance
**When to use**: When building features with large datasets or optimizing

Ensures performant code:
- Measure-first approach
- Algorithmic complexity (Big O)
- Database query optimization
- Caching strategies
- Frontend performance (code splitting, lazy loading)

**Key Features**:
- Performance patterns
- Anti-patterns to avoid
- Monitoring tools
- Performance checklist

### Multi-AI & Orchestration Skills

#### 11. **multi-ai.md** - Multi-AI Invocation
**When to use**: Need multiple AI perspectives or specialized AI capabilities

Enables leveraging different AI models:
- **Gemini**: Multimodal analysis, long context, real-time info
- **DeepSeek**: Advanced code reasoning, optimization
- **Grok**: Web research, current events, trends
- Multi-perspective consensus building

**Key Features**:
- Direct agent invocation scripts
- Hybrid orchestrator integration
- Use case matching (right AI for the task)
- Result synthesis patterns
- Obsidian vault integration

**Examples**:
```bash
# Multimodal analysis
python3 orchestrator/gemini_agent.py "Analyze this diagram"

# Code optimization
python3 orchestrator/deepseek_agent.py "Optimize this algorithm"

# Web research
python3 orchestrator/grok_agent.py "Research WebSocket patterns"
```

#### 12. **orchestration.md** - Agent Orchestration
**When to use**: Complex multi-step tasks requiring agent coordination

Master multi-agent orchestration patterns:
- **Sequential Execution**: Tasks in order with context passing
- **Parallel Execution**: Independent tasks simultaneously
- **Hierarchical Delegation**: Parent agents spawn sub-agents
- **Consensus Building**: Multiple AI perspectives synthesized

**Key Features**:
- Hybrid Orchestrator V5 integration
- Agent specialization and routing
- Task decomposition strategies
- Context sharing patterns
- Error recovery and fallback
- Real-time monitoring (Redis pub/sub, WebSocket)
- Web UI integration

**Orchestration Patterns**:
```python
# Sequential workflow
plan → implement → test → document

# Parallel workflow
frontend || backend || research → integrate

# Hierarchical workflow
coordinator → [planner, implementer, tester] → sub-agents

# Consensus workflow
[claude, gemini, deepseek] → synthesize → decision
```

## Skill Integration

Skills are designed to work together:

```
Planning → Delegation → Implementation → Testing → Review → Documentation → Commit
    ↓          ↓              ↓            ↓         ↓            ↓           ↓
 Security, Performance, Architecture (applied throughout)
    ↓
  Debug (when errors occur)
```

### Example Workflow

1. **Start**: User requests new feature
2. **plan.md**: Break down task, identify parallelization
3. **delegate.md**: Create subagents for parallel work
4. **architecture.md**: Make design decisions
5. **security.md**: Ensure secure implementation
6. **performance.md**: Optimize critical paths
7. **debug.md**: Fix issues as they arise (3-attempt protocol)
8. **test.md**: Write comprehensive tests
9. **review.md**: Self-review before completion
10. **document.md**: Document the feature
11. **commit.md**: Create clean commits

## How to Use Skills

Skills are automatically available to Claude Code. Reference them by name:

```
"Use the debug skill to fix this error"
"Follow the plan skill to break down this task"
"Apply the security skill to this auth code"
```

Claude Code will also proactively apply skills based on context:
- Complex tasks → **plan** skill
- Errors → **debug** skill
- Pre-completion → **review** skill
- Code changes → **test** skill

## Customization

Skills can be customized for your project:

1. Edit existing skill files to add project-specific guidelines
2. Add new skills by creating `.md` files in this directory
3. Update this README to document new skills

## Best Practices

### DO:
- ✅ Reference skills by name when relevant
- ✅ Combine multiple skills for comprehensive coverage
- ✅ Follow skill protocols (especially debug 3-attempt rule)
- ✅ Update skills as you learn new patterns

### DON'T:
- ❌ Skip mandatory skills (review, test, security)
- ❌ Ignore skill protocols (e.g., debug escalation)
- ❌ Treat skills as optional suggestions
- ❌ Forget to apply security/performance skills

## Skill Reference Quick Guide

| Situation | Use This Skill |
|-----------|----------------|
| Starting complex task | **plan** |
| Need to delegate work | **delegate** |
| Encountered an error | **debug** |
| Finished coding | **test** + **review** |
| Ready to commit | **commit** |
| Writing docs | **document** |
| Handling user input | **security** |
| Performance issue | **performance** |
| Design decision | **architecture** |
| Need multimodal AI or specialized analysis | **multi-ai** |
| Coordinating multiple agents | **orchestration** |
| Need Gemini for images/PDFs | **multi-ai** (Gemini) |
| Need deep code analysis | **multi-ai** (DeepSeek) |
| Need web research | **multi-ai** (Grok) |

## Mandatory Skills

Some skills are **MANDATORY** in specific situations:

| Skill | When Mandatory |
|-------|----------------|
| **debug** | After 2 failed fix attempts |
| **review** | Before marking task complete |
| **test** | After any code change |
| **security** | When handling user input, auth, or sensitive data |
| **commit** | Before creating git commits |

## Philosophy

These skills embody key principles:

1. **Quality over speed**: Do it right, not fast
2. **Proactive over reactive**: Prevent issues before they happen
3. **Systematic over ad-hoc**: Follow protocols consistently
4. **Document over remember**: Write it down
5. **Collaborate over solo**: Delegate and consult experts

## Contributing

To add a new skill:

1. Create `skillname.md` in this directory
2. Follow the structure of existing skills:
   - "When to Use This Skill" section
   - Clear guidelines and examples
   - Checklist or protocol
   - Integration with other skills
   - "Remember" summary
3. Update this README
4. Test the skill in practice

## Resources

- **CLAUDE.md**: Project-specific Claude guidelines
- **Playwright MCP**: Browser automation for testing
- **Codex MCP**: Subagent creation and management

---

**Remember**: Skills are here to help you deliver high-quality work consistently. Use them proactively!
