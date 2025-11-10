# MCP Orchestration Examples

This directory contains example code demonstrating how to use the MCP Orchestration System.

## Examples

### 1. Simple Task Demo (`demo_simple_task.py`)

Demonstrates direct usage of the MCP orchestrator to execute a complete 11-node DAG workflow.

**What it does:**
- Creates a simple calculator API task
- Runs through all 11 nodes: P0→P1→S1→P2→T1→S2→S3→P4→D1→O1→P6
- Shows artifact generation, cost tracking, and quality metrics

**Usage:**
```bash
python examples/demo_simple_task.py
```

**Output:**
- Console output showing progress through each node
- Final metrics (cost, tokens, confidence scores)
- Generated artifacts in `obsidian-vault/Projects/`
- Full result saved to `examples/demo_result.json`

**Expected Results:**
- **Success**: Task completes with >95% confidence
- **Artifacts**: Code files, tests, documentation
- **Cost**: ~$0.05 (90-98% reduction vs traditional approach)
- **Duration**: 2-5 minutes

---

### 2. REST API Demo (`demo_rest_api.py`)

Demonstrates using the MCP Orchestration System via REST API endpoints.

**What it does:**
- Submits a user authentication API task via REST API
- Polls for task completion
- Retrieves results and telemetry
- Lists all jobs

**Prerequisites:**
Start the REST API server first:
```bash
cd rest-api
uvicorn src.main:app --reload
```

**Usage:**
```bash
python examples/demo_rest_api.py
```

**API Endpoints Used:**
- `POST /api/v1/orchestration/tasks` - Submit task
- `GET /api/v1/orchestration/tasks/{task_id}` - Get status
- `GET /api/v1/orchestration/tasks/{task_id}/result` - Get result
- `GET /api/v1/telemetry/tasks/{task_id}` - Get telemetry
- `GET /api/v1/jobs/` - List jobs
- `GET /api/v1/orchestration/dag/structure` - Get DAG structure

---

## Understanding the Output

### Artifact Structure

After execution, artifacts are saved to:
```
obsidian-vault/Projects/{task-name}/
├── Code/              # Generated code files
├── Tests/             # Generated test files
├── Documentation/
│   ├── README.md      # User documentation
│   ├── API_DOCS.md    # API documentation
│   ├── RUNBOOK.md     # Operations guide
│   └── SECURITY_NOTES.md  # Security documentation
├── Artifacts/
│   ├── cost_ledger.csv    # Cost breakdown
│   ├── cost_ledger.json   # Cost data
│   └── execution_logs.txt # Full logs
├── KNOWLEDGE.md       # Lessons learned
└── SUMMARY.md         # Execution summary
```

### Cost Metrics

The system tracks:
- **Tokens Used**: Total tokens across all MCP calls
- **API Calls**: Number of calls to each MCP server
- **Cost**: Estimated cost in USD
- **Breakdown**: Per-node and per-server costs

**Efficiency Gains:**
- Traditional approach: ~155k tokens, $0.25/job
- MCP approach: ~10.5k tokens, $0.05/job
- **Reduction**: 90-98% token savings, 80% cost savings

### Quality Gates

Each node has a confidence gate requiring ≥95% confidence:

| Node | Gate | Metrics |
|------|------|---------|
| P0 | Intake | Clarity, Completeness, Alignment |
| P1 | Planning | Traceability, Testability, Risk Coverage |
| S1 | Security Planning | Threat Coverage, Mitigation Quality |
| P2 | Implementation | Code Quality, Build Success |
| T1 | Testing | Coverage (≥80%), Test Quality |
| S2 | Security Review | No Critical Vulns, SBOM Present |
| S3 | Security Fix | All Patched, Validated |
| P4 | Refinement | All Gates Pass |
| D1 | Documentation | Completeness, Clarity |
| O1 | Final Ops | E2E Tests Pass, Resilience |
| P6 | Persistence | All Artifacts Saved |

### Learning System

The ReflexionMemory system captures:
- **Failures**: Error types, contexts, and remediation
- **Successes**: Effective strategies and patterns
- **Ambiguities**: Questions that required clarification
- **Improvements**: Suggested optimizations

This knowledge is used to improve future executions.

---

## Modifying Examples

### Custom Task

To run your own task, modify `demo_simple_task.py`:

```python
task_name = "Your Task Name"
task_description = """
Your detailed task description here.
Include:
- Requirements
- Constraints
- Expected outputs
"""

orchestrator = create_orchestrator(
    confidence_threshold=95.0,
    budget_limit=5.0  # Adjust budget as needed
)

result = orchestrator.execute_task(
    task_name=task_name,
    user_task=task_description
)
```

### REST API Client

Use the `MCPOrchestrationClient` class:

```python
from examples.demo_rest_api import MCPOrchestrationClient

client = MCPOrchestrationClient("http://localhost:8000")

# Submit task
task = client.submit_task(
    task_name="My Task",
    task_description="Task details...",
    budget_limit=10.0
)

# Wait for completion
result = client.wait_for_completion(task['task_id'])
```

---

## Troubleshooting

### "MCP server not available"

Ensure MCP servers are configured in your environment. Check:
```bash
echo $MCP_SERVERS
```

### "Budget exceeded"

Increase the budget limit:
```python
orchestrator = create_orchestrator(budget_limit=10.0)
```

Or for REST API:
```python
client.submit_task(..., budget_limit=10.0)
```

### "Confidence gate failed"

Lower the confidence threshold (not recommended for production):
```python
orchestrator = create_orchestrator(confidence_threshold=85.0)
```

Or review the logs to see which node failed and why.

### REST API not responding

Make sure the server is running:
```bash
cd rest-api
uvicorn src.main:app --reload
```

Check logs in `rest-api/logs/api.log`

---

## Next Steps

1. **Run the examples** to see the system in action
2. **Review generated artifacts** in the Obsidian vault
3. **Modify examples** for your use cases
4. **Integrate into your workflow** using the REST API
5. **Monitor costs** and optimize as needed

For more information, see:
- [MCP Integration Plan](../dev-plans/MCP_INTEGRATION_PLAN.md)
- [REST API Documentation](../rest-api/README.md)
- [Node Documentation](../src/orchestrator/nodes/)
