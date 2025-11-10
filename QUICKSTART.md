# MCP Orchestration System - Quick Start Guide

Get up and running with the MCP Orchestration System in 5 minutes.

## Prerequisites

- Python 3.9+
- pip or pipx

## Installation

### 1. Install Dependencies

```bash
# Main orchestration system
pip install -r requirements.txt

# REST API (optional)
cd rest-api
pip install -r requirements.txt
cd ..
```

### 2. Verify Installation

```bash
# Check Python
python --version  # Should be 3.9+

# Verify imports
python -c "from src.orchestrator.mcp_orchestrator import create_orchestrator; print('✓ Installation successful')"
```

## Option 1: Direct Orchestrator Usage (Recommended for First Run)

### Run Simple Demo

```bash
python examples/demo_simple_task.py
```

**What it does:**
- Creates a simple calculator API task
- Executes complete 11-node DAG workflow
- Shows progress, costs, and results
- Saves artifacts to `obsidian-vault/Projects/`

**Expected output:**
```
================================================================================
MCP ORCHESTRATION SYSTEM - SIMPLE DEMO
================================================================================

Task: Simple Calculator API
Description: Build a simple REST API using FastAPI...

Creating MCP orchestrator...
✓ Orchestrator created

Starting 11-node DAG execution...
This will run through:
  P0: Interactive Intake (Q&A)
  P1: Multi-AI Planning
  S1: Security Planning (STRIDE)
  P2: Implementation
  T1: Testing
  S2: Security Review (SAST)
  S3: Security Fixes
  P4: Refinement
  D1: Documentation
  O1: Final Ops (E2E tests)
  P6: Persistence

...

================================================================================
EXECUTION COMPLETE
================================================================================

✓ SUCCESS

📦 ARTIFACTS:
  Vault Path: obsidian-vault/Projects/Simple-Calculator-API
  Code Files: 3
  Test Files: 2
  Documentation: 4

💰 COST & PERFORMANCE:
  Total Cost: $0.0450
  Total Tokens: 9,234
  Total API Calls: 18

✅ QUALITY METRICS:
  Final Confidence: 97.3%
  All Gates Passed: True
  Security Passed: True
```

### Custom Task

Create your own script:

```python
from src.orchestrator.mcp_orchestrator import create_orchestrator

# Create orchestrator
orchestrator = create_orchestrator(
    confidence_threshold=95.0,
    budget_limit=5.0
)

# Execute task
result = orchestrator.execute_task(
    task_name="Your Task Name",
    user_task="""
    Your detailed task description here.
    Be specific about requirements.
    """
)

# Check result
if result['success']:
    print(f"✓ Task completed!")
    print(f"Cost: ${result['telemetry']['total_cost']:.4f}")
    print(f"Artifacts: {result['artifacts']['vault_path']}")
else:
    print(f"✗ Failed: {result['message']}")
```

## Option 2: REST API Usage

### Step 1: Start API Server

```bash
cd rest-api
uvicorn src.main:app --reload
```

Server starts at: http://localhost:8000

API docs at: http://localhost:8000/api/docs

### Step 2: Submit Task

**Using curl:**
```bash
curl -X POST "http://localhost:8000/api/v1/orchestration/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "User Auth API",
    "task_description": "Build a user authentication API with JWT tokens",
    "budget_limit": 5.0,
    "confidence_threshold": 95.0
  }'
```

**Using Python:**
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/orchestration/tasks",
    json={
        "task_name": "User Auth API",
        "task_description": "Build a user authentication API with JWT tokens",
        "budget_limit": 5.0
    }
)

task_id = response.json()['task_id']
print(f"Task submitted: {task_id}")
```

### Step 3: Check Status

```python
import requests
import time

task_id = "mcp_1234567890"

while True:
    status = requests.get(
        f"http://localhost:8000/api/v1/orchestration/tasks/{task_id}"
    ).json()

    print(f"Status: {status['status']}")

    if status['status'] in ['completed', 'failed']:
        break

    time.sleep(10)

# Get result
result = requests.get(
    f"http://localhost:8000/api/v1/orchestration/tasks/{task_id}/result"
).json()

print(f"Success: {result['success']}")
print(f"Cost: ${result['telemetry']['total_cost']:.4f}")
```

### Step 4: View Artifacts

Artifacts are saved to:
```
obsidian-vault/Projects/{task-name}/
├── Code/              # Generated code
├── Tests/             # Generated tests
├── Documentation/     # README, API docs, etc.
├── Artifacts/         # Cost ledger, logs
├── KNOWLEDGE.md       # Lessons learned
└── SUMMARY.md         # Execution summary
```

## Understanding the Results

### Success Criteria

A successful execution will have:
- ✅ `success: true`
- ✅ `quality.final_confidence >= 95.0%`
- ✅ `quality.all_gates_passed: true`
- ✅ `quality.security_passed: true`

### Cost Breakdown

The system tracks costs at multiple levels:

```json
{
  "telemetry": {
    "total_cost": 0.0450,
    "total_tokens": 9234,
    "total_calls": 18,
    "breakdown": {
      "by_node": {
        "P0": {"cost": 0.002, "tokens": 412},
        "P1": {"cost": 0.008, "tokens": 1643},
        ...
      },
      "by_server": {
        "claude": {"cost": 0.020, "calls": 8},
        "codex": {"cost": 0.015, "calls": 5},
        ...
      }
    }
  }
}
```

### Quality Metrics

Each node reports confidence:

```json
{
  "metadata": {
    "P0_confidence": 98.5,
    "P1_confidence": 96.2,
    "S1_confidence": 97.1,
    ...
    "P6_confidence": 95.8
  }
}
```

All nodes must achieve ≥95% confidence to pass.

## Troubleshooting

### "No module named 'src.orchestrator'"

Make sure you're running from the project root:
```bash
cd /path/to/Orchestration-System
python examples/demo_simple_task.py
```

### "MCP server not available"

MCP servers need to be configured. For demo purposes, the system simulates MCP calls. To connect real MCP servers, configure:

```python
orchestrator = create_orchestrator(
    mcp_servers=['claude', 'codex', 'semgrep'],
    # ... other settings
)
```

### "Budget exceeded"

Increase the budget limit:
```python
orchestrator = create_orchestrator(budget_limit=10.0)
```

### API server won't start

Check if port 8000 is in use:
```bash
lsof -i :8000
```

Use a different port:
```bash
uvicorn src.main:app --port 8001
```

## Next Steps

1. **Run the examples** to understand the workflow
2. **Review generated artifacts** in the Obsidian vault
3. **Try your own tasks** with custom requirements
4. **Monitor costs** and optimize as needed
5. **Read full documentation** in `IMPLEMENTATION_COMPLETE.md`

## Common Use Cases

### 1. Build REST API

```python
orchestrator.execute_task(
    task_name="Blog API",
    user_task="""
    Build a REST API for a blog platform with:
    - User authentication (JWT)
    - CRUD operations for posts
    - Comments system
    - Search functionality
    - Unit tests with >80% coverage
    """
)
```

### 2. Create Data Pipeline

```python
orchestrator.execute_task(
    task_name="ETL Pipeline",
    user_task="""
    Create an ETL pipeline that:
    - Extracts data from CSV files
    - Transforms data (clean, normalize)
    - Loads into PostgreSQL database
    - Includes error handling
    - Has comprehensive tests
    """
)
```

### 3. Security Audit

```python
orchestrator.execute_task(
    task_name="Security Audit",
    user_task="""
    Perform security audit of existing codebase:
    - SAST scanning
    - Dependency vulnerability check
    - Secret detection
    - STRIDE threat model
    - Remediation recommendations
    """
)
```

## Resources

- **Full Documentation:** `IMPLEMENTATION_COMPLETE.md`
- **Examples Guide:** `examples/README.md`
- **API Docs:** http://localhost:8000/api/docs (when server running)
- **MCP Plan:** `dev-plans/MCP_INTEGRATION_PLAN.md`

## Getting Help

1. Check the logs: `workspace/jobs/{task_id}.json`
2. Review execution logs: `obsidian-vault/Projects/{task}/Artifacts/execution_logs.txt`
3. Examine confidence scores in task result metadata
4. Review KNOWLEDGE.md for lessons learned

---

**You're ready to go!** Start with `python examples/demo_simple_task.py` to see the system in action.
