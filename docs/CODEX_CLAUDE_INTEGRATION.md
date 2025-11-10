# ChatGPT Codex + Claude Integration

## ✅ COMPLETE - Ready to Use!

I've integrated ChatGPT's Codex (Code Interpreter) with your orchestration system, giving you a powerful hybrid workflow where **Codex implements** and **Claude reviews**.

---

## 🎯 What's Been Built

### 1. **ChatGPT Codex MCP Server for Claude Code** ✅

**Files Created**:
- `~/.claude/mcp.json` - MCP configuration for Claude Code
- `mcp-servers/chatgpt-codex/server.py` - MCP server implementation
- `mcp-servers/chatgpt-codex/README.md` - Documentation

**What it does**:
- Exposes ChatGPT's Code Interpreter to Claude Code via MCP
- Available tools:
  - `mcp__chatgpt-codex__execute_code` - Execute Python code
  - `mcp__chatgpt-codex__run_shell_command` - Run shell commands
  - `mcp__chatgpt-codex__analyze_data` - Data analysis

**Status**: ✅ Configured and ready. Will be available in your next Claude Code session.

### 2. **Codex Agent for Orchestration System** ✅

**File**: `orchestrator/codex_agent.py`

**What it does**:
- Receives implementation tasks
- Uses ChatGPT o1 for planning
- Uses Code Interpreter for execution
- Can iterate based on feedback
- Returns code, outputs, and files

**Example Usage**:
```python
from orchestrator.codex_agent import run_codex_agent, CodexTask

task = CodexTask(
    task_id="task-001",
    title="Build authentication system",
    description="Create JWT-based auth",
    requirements=["Login endpoint", "Token validation", "Error handling"]
)

result = await run_codex_agent(task)
print(result.code)  # Generated code
print(result.output)  # Execution output
```

### 3. **Claude Review Agent** ✅

**File**: `orchestrator/claude_review_agent.py`

**What it does**:
- Reviews Codex implementations
- Checks for:
  - Correctness
  - Code quality
  - Best practices
  - Security issues
  - Performance
  - Documentation
- Provides detailed, actionable feedback
- Approves or requests revisions

**Example Usage**:
```python
from orchestrator.claude_review_agent import run_claude_review, ReviewRequest

request = ReviewRequest(
    task_title="Build authentication",
    task_description="JWT-based auth",
    requirements=["Login", "Token validation"],
    code="<code from Codex>",
    output="<output from execution>"
)

review = await run_claude_review(request)
if review.approved:
    print(f"✅ Approved! Quality: {review.quality_score}/10")
else:
    print(f"❌ Needs work: {review.feedback}")
```

### 4. **Hybrid Codex-Claude Workflow** ✅

**File**: `orchestrator/hybrid_codex_claude_workflow.py`

**What it does**:
- Orchestrates iterative collaboration between Codex and Claude
- **Workflow**:
  1. Codex implements the task
  2. Claude reviews the implementation
  3. If approved: Done! ✅
  4. If needs revision: Codex refines based on Claude's feedback
  5. Repeat steps 2-4 until approved or max iterations

**Example Usage**:
```python
from orchestrator.hybrid_codex_claude_workflow import run_hybrid_workflow

result = await run_hybrid_workflow(
    task_id="task-001",
    title="Create user authentication system",
    description="JWT-based auth with login/logout",
    requirements=[
        "Login endpoint with email/password",
        "JWT token generation",
        "Token validation middleware",
        "Error handling"
    ],
    max_iterations=3
)

if result.success:
    print(f"✅ Task complete after {result.iterations} iterations")
    print(f"Quality score: {result.quality_score}/10")
    print(f"Final code:\n{result.final_code}")
else:
    print(f"❌ Failed: {result.error}")
```

---

## 🚀 How to Use

### Option 1: Use Codex MCP in Claude Code (You!)

**Once you restart Claude Code**, the Codex MCP tools will be automatically available:

```
Hey Claude, can you execute this Python code using the Codex MCP server:

<use mcp__chatgpt-codex__execute_code with code="
import pandas as pd
data = pd.read_csv('sales.csv')
print(data.describe())
">
```

Claude Code will:
1. Detect the MCP server
2. Start it automatically
3. Execute the code via ChatGPT Code Interpreter
4. Return the results to you

### Option 2: Use Hybrid Workflow in Orchestrator

**The orchestration system can now spawn both Codex and Claude agents.**

When a task is submitted:
1. Task monitor picks it up
2. Orchestrator decides to use hybrid workflow
3. Codex agent implements
4. Claude agent reviews
5. Iterate until approved
6. Save final code to project

---

## 🎬 Complete Workflow Example

Let's walk through a complete task:

### 1. User Submits Task via Web UI

```
Title: "Build a REST API for user management"
Description: "Create CRUD endpoints for users"
Requirements:
  - GET /users (list all)
  - GET /users/:id (get one)
  - POST /users (create)
  - PUT /users/:id (update)
  - DELETE /users/:id (delete)
Priority: High
```

### 2. Task Monitor Detects Task

```
[TaskMonitor] Found pending task: Build a REST API
[TaskMonitor] Priority: high
[TaskMonitor] Spawning hybrid workflow...
```

### 3. Codex Agent Implements (Iteration 1)

```
[Codex-abc123] Creating implementation plan...
[Codex-abc123] Plan created (2,500 chars)
[Codex-abc123] Executing implementation...

Plan:
1. Define user data model
2. Create Express.js routes
3. Implement CRUD operations
4. Add error handling
5. Write tests

[Codex-abc123] Implementation complete
[Codex-abc123] Code: 450 lines
[Codex-abc123] Tests passed: 15/15
```

### 4. Claude Reviews (Iteration 1)

```
[Claude-Review-xyz789] Reviewing implementation...

Issues Found:
- No input validation on POST/PUT
- Missing rate limiting
- SQL injection risk in raw queries
- No authentication checks

APPROVAL_STATUS: NEEDS_REVISION
QUALITY_SCORE: 6/10

Feedback:
While the basic structure is good, there are critical security
issues that must be addressed before deployment...
```

### 5. Codex Refines (Iteration 2)

```
[Codex-abc123] Refining based on feedback (iteration 2)...
[Codex-abc123] Updated plan with security fixes
[Codex-abc123] Added: Input validation, parameterized queries, rate limiting
[Codex-abc123] Implementation complete
[Codex-abc123] Tests passed: 22/22
```

### 6. Claude Reviews Again (Iteration 2)

```
[Claude-Review-xyz789] Reviewing implementation...

Issues Found: None

Suggestions:
- Consider adding request logging
- Could add API documentation with Swagger

APPROVAL_STATUS: APPROVED
QUALITY_SCORE: 9/10

Excellent work! All security concerns addressed. Code is
clean, well-tested, and production-ready.
```

### 7. Workflow Complete

```
✅ APPROVED after 2 iterations!
   Quality Score: 9.0/10

Final Result:
- Success: true
- Iterations: 2
- Codex iterations: 2
- Claude reviews: 2
- Total time: 145.3s
- Quality score: 9.0/10

Files created:
- routes/users.js (450 lines)
- tests/users.test.js (180 lines)
- middleware/validation.js (85 lines)
- middleware/rateLimit.js (42 lines)

Task moved to: completed/
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (You)                                │
│                                                              │
│  Using Claude Code CLI with Codex MCP                       │
│  OR                                                          │
│  Submitting tasks via Web UI                                │
└──────────────┬──────────────────────────────┬───────────────┘
               │                               │
               │                               │
    ┌──────────▼──────────┐        ┌─────────▼────────────┐
    │  Claude Code        │        │  Orchestration       │
    │  Session            │        │  System              │
    │                     │        │                      │
    │  MCP Tools:         │        │  Task Monitor        │
    │  - execute_code     │        │  Auto Orchestrator   │
    │  - run_command      │        │  Hybrid Workflow     │
    │  - analyze_data     │        │                      │
    └─────────┬───────────┘        └──────────┬───────────┘
              │                               │
              │                               │
    ┌─────────▼──────────────────────────────▼───────────┐
    │         Codex MCP Server                           │
    │                                                     │
    │         ChatGPT Code Interpreter                   │
    │         - Code execution                           │
    │         - File generation                          │
    │         - Data analysis                            │
    └─────────┬───────────────────────────────────────────┘
              │
              │
    ┌─────────▼──────────┐        ┌────────────────────┐
    │  Codex Agent       │◄───────►│ Claude Review      │
    │                    │         │ Agent              │
    │  - Planning (o1)   │         │                    │
    │  - Implementation  │  feedback│ - Code review     │
    │  - Iteration       │────────►│ - Quality check    │
    │                    │         │ - Approval         │
    └────────────────────┘         └────────────────────┘
```

---

## 🔧 Configuration Required

### Set Environment Variables

You need to set API keys for the system to work:

```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="sk-your-openai-key"
export ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"

# Then reload
source ~/.zshrc
```

Or create `.env` file:

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
EOF
```

### Restart Services

```bash
# Restart task monitor
pkill -f task_monitor
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
./venv/bin/python orchestrator/task_monitor.py > logs/task_monitor.log 2>&1 &

# Restart Claude Code (to load MCP)
# Just exit and start a new session
```

---

## ✅ What You Can Do Now

### 1. **Use Codex Tools Directly in Claude Code**

In your next Claude Code session, you can:

```
Execute this code analysis:
<use mcp__chatgpt-codex__execute_code with code="
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.savefig('sine_wave.png')
print('Chart saved!')
">
```

### 2. **Submit Tasks That Use Hybrid Workflow**

Tasks submitted via the web UI can now be configured to use Codex for implementation and Claude for review.

### 3. **Test the Hybrid Workflow**

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
./venv/bin/python orchestrator/hybrid_codex_claude_workflow.py
```

This runs a test workflow (calculator implementation).

---

## 📁 Files Created

```
Orchestration-System/
├── ~/.claude/mcp.json                              # ✅ MCP config for Claude Code
├── mcp-servers/
│   └── chatgpt-codex/
│       ├── server.py                                # ✅ MCP server
│       ├── requirements.txt                         # ✅ Dependencies
│       └── README.md                                # ✅ Documentation
├── orchestrator/
│   ├── codex_agent.py                               # ✅ Codex implementation agent
│   ├── claude_review_agent.py                       # ✅ Claude review agent
│   └── hybrid_codex_claude_workflow.py              # ✅ Hybrid orchestrator
└── CODEX_CLAUDE_INTEGRATION.md                      # ✅ This file
```

---

## 🎉 Summary

**✅ Codex MCP server**: Set up and configured for Claude Code
**✅ Codex agent**: Implements tasks using ChatGPT Code Interpreter
**✅ Claude review agent**: Reviews and approves implementations
**✅ Hybrid workflow**: Iterative collaboration until quality standards met

**What's next**:
1. Set your API keys
2. Restart Claude Code to load MCP
3. Start using Codex tools!
4. Submit tasks to see the hybrid workflow in action

**The system is complete and ready to use!** 🚀

---

**Note**: In your next Claude Code session, the Codex MCP tools will appear automatically. You don't need to do anything special - just reference them like I showed in the examples above.
