"""
P6: Persistence & Publishing Node
Saves artifacts to Obsidian vault, publishes Redis events, generates cost ledger.
"""
from typing import Dict, Any
import json


class PersistenceNode:
    """
    Artifact persistence and knowledge publishing.

    Process:
    1. Save all artifacts to Obsidian vault
    2. Publish completion events to Redis
    3. Generate cost ledger (CSV/JSON)
    4. Create KNOWLEDGE.md from ReflexionMemory
    5. Bundle outputs for archival
    6. Generate final summary report
    """

    def __init__(self, confidence_threshold: float = 95.0):
        """Initialize persistence node."""
        self.confidence_threshold = confidence_threshold

    def generate_code(self, inputs: Dict[str, Any]) -> str:
        """Generate MCP code for persistence operations."""
        code = f'''
import json
import os
from pathlib import Path
from datetime import datetime

# Load inputs
task_id = {json.dumps(inputs.get('task_id', 'unknown'))}
task_name = {json.dumps(inputs.get('task_name', 'Unnamed Task'))}
refined_code = {json.dumps(inputs.get('refined_code', {{}}))}
tests = {json.dumps(inputs.get('tests', {{}}))}
readme = {json.dumps(inputs.get('readme', ''))}
api_docs = {json.dumps(inputs.get('api_docs', ''))}
runbook = {json.dumps(inputs.get('runbook', ''))}
security_notes = {json.dumps(inputs.get('security_notes', ''))}
cost_ledger = {json.dumps(inputs.get('cost_ledger', []))}
reflexion_memory = {json.dumps(inputs.get('reflexion_memory', {{}}))}
all_logs = {json.dumps(inputs.get('all_logs', []))}
metadata = {json.dumps(inputs.get('metadata', {{}}))}

logs.append("=== Persistence & Publishing ===")

# Phase 1: Prepare Obsidian Vault Structure
logs.append("\\n--- Phase 1: Obsidian Vault Setup ---")

vault_base = Path("obsidian-vault")
project_dir = vault_base / "Projects" / task_name.replace(" ", "-")

# Create directory structure
directories = [
    project_dir / "Code",
    project_dir / "Tests",
    project_dir / "Documentation",
    project_dir / "Security",
    project_dir / "Artifacts"
]

for dir_path in directories:
    os.makedirs(dir_path, exist_ok=True)
    logs.append(f"  ✓ Created: {{dir_path}}")

# Phase 2: Save Code Artifacts
logs.append("\\n--- Phase 2: Code Artifacts ---")

code_files_saved = 0
for file_path, file_content in refined_code.items():
    save_path = project_dir / "Code" / file_path.replace("/", "_")
    with open(save_path, 'w') as f:
        f.write(file_content)
    code_files_saved += 1
    logs.append(f"  ✓ Saved: {{file_path}}")

logs.append(f"Saved {{code_files_saved}} code files")

# Phase 3: Save Test Artifacts
logs.append("\\n--- Phase 3: Test Artifacts ---")

test_files_saved = 0
for test_path, test_content in tests.items():
    save_path = project_dir / "Tests" / test_path.replace("/", "_")
    with open(save_path, 'w') as f:
        f.write(test_content)
    test_files_saved += 1
    logs.append(f"  ✓ Saved: {{test_path}}")

logs.append(f"Saved {{test_files_saved}} test files")

# Phase 4: Save Documentation
logs.append("\\n--- Phase 4: Documentation ---")

docs_to_save = {{
    "README.md": readme,
    "API_DOCS.md": api_docs,
    "RUNBOOK.md": runbook,
    "SECURITY_NOTES.md": security_notes
}}

for doc_name, doc_content in docs_to_save.items():
    if doc_content:
        save_path = project_dir / "Documentation" / doc_name
        with open(save_path, 'w') as f:
            f.write(doc_content)
        logs.append(f"  ✓ Saved: {{doc_name}}")

# Phase 5: Generate KNOWLEDGE.md from ReflexionMemory
logs.append("\\n--- Phase 5: Knowledge Extraction ---")

failures = reflexion_memory.get('failures', [])
successes = reflexion_memory.get('successes', [])
ambiguities = reflexion_memory.get('ambiguities', [])
improvements = reflexion_memory.get('improvements', [])

# Build sections without nested f-strings
failure_items = []
for i, failure in enumerate(failures[:10]):
    failure_items.append(f"""#### {i+1}. {failure.get('error_type', 'Unknown')}
- Node: {failure.get('node_id')}
- Context: {failure.get('context')}
- Message: {failure.get('error_message')}
- Timestamp: {failure.get('timestamp')}""")

success_items = []
for i, success in enumerate(successes[:10]):
    conf = success.get('confidence', 0)
    success_items.append(f"""#### {i+1}. {success.get('strategy', 'Strategy')}
- Node: {success.get('node_id')}
- Confidence: {conf:.1f}%
- Context: {success.get('context')}
- Timestamp: {success.get('timestamp')}""")

ambiguity_items = []
for i, ambiguity in enumerate(ambiguities[:10]):
    ambiguity_items.append(f"""#### {i+1}. {ambiguity.get('question', 'Question')}
- Resolution: {ambiguity.get('resolution')}
- Impact: {ambiguity.get('impact')}""")

improvement_items = [f"- {imp.get('suggestion')}" for imp in improvements[:20]]

cost_rows = []
for item in cost_ledger[:20]:
    cost_rows.append(f"| {item.get('tool', 'Unknown')} | {item.get('calls', 1)} | {item.get('tokens_used', 0)} | ${item.get('cost', 0):.4f} |")

total_cost = sum(item.get('cost', 0) for item in cost_ledger)

knowledge_md = f"""# Knowledge Base: {task_name}

## Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Task Overview
- Task ID: {task_id}
- Files Generated: {code_files_saved}
- Tests Generated: {test_files_saved}
- Total Cost: ${total_cost:.4f}

## Lessons Learned

### Failures ({len(failures)})
{chr(10).join(failure_items)}

### Successes ({len(successes)})
{chr(10).join(success_items)}

### Ambiguities Resolved ({len(ambiguities)})
{chr(10).join(ambiguity_items)}

### Suggested Improvements ({len(improvements)})
{chr(10).join(improvement_items)}

## Cost Breakdown

| Component | Calls | Tokens | Cost |
|-----------|-------|--------|------|
{chr(10).join(cost_rows)}

Total: ${total_cost:.4f}

## Execution Metadata

```json
{json.dumps(metadata, indent=2)}
```

## Next Steps

1. Review generated code in Code/ directory
2. Run tests in Tests/ directory
3. Follow deployment instructions in RUNBOOK.md
4. Review security considerations in SECURITY_NOTES.md

---
Generated by MCP Orchestration System
"""

knowledge_path = project_dir / "KNOWLEDGE.md"
with open(knowledge_path, 'w') as f:
    f.write(knowledge_md)

logs.append(f"  ✓ Generated KNOWLEDGE.md ({{len(knowledge_md)}} chars)")

# Phase 6: Generate Cost Ledger
logs.append("\\n--- Phase 6: Cost Ledger ---")

# CSV format
csv_lines = ["Timestamp,Node,Server,Tool,Tokens,Cost,Latency_ms"]
for entry in cost_ledger:
    csv_lines.append(f"{{entry.get('timestamp')}},{{entry.get('node_id')}},{{entry.get('server')}},{{entry.get('tool')}},{{entry.get('tokens_used', 0)}},{{entry.get('cost', 0)}},{{entry.get('latency_ms', 0)}}")

csv_content = "\\n".join(csv_lines)
csv_path = project_dir / "Artifacts" / "cost_ledger.csv"
with open(csv_path, 'w') as f:
    f.write(csv_content)

logs.append(f"  ✓ Saved cost_ledger.csv ({{len(cost_ledger)}} entries)")

# JSON format
json_path = project_dir / "Artifacts" / "cost_ledger.json"
with open(json_path, 'w') as f:
    json.dump(cost_ledger, f, indent=2)

logs.append(f"  ✓ Saved cost_ledger.json")

# Phase 7: Save Execution Logs
logs.append("\\n--- Phase 7: Execution Logs ---")

logs_path = project_dir / "Artifacts" / "execution_logs.txt"
with open(logs_path, 'w') as f:
    f.write("\\n".join(all_logs))

logs.append(f"  ✓ Saved execution_logs.txt ({{len(all_logs)}} lines)")

# Phase 8: Publish to Redis
logs.append("\\n--- Phase 8: Redis Publishing ---")

redis_event = {{
    'event_type': 'orchestration_complete',
    'task_id': task_id,
    'task_name': task_name,
    'timestamp': datetime.now().isoformat(),
    'files_generated': code_files_saved + test_files_saved,
    'total_cost': sum(item.get('cost', 0) for item in cost_ledger),
    'vault_path': str(project_dir),
    'metadata': metadata
}}

# Publish via MCP
publish_result = mcp.call_tool(
    'redis',
    'publish',
    {{
        'channel': 'orchestration:completions',
        'message': json.dumps(redis_event)
    }}
)

published = publish_result.get('result', {{}}).get('success', False)
logs.append(f"  Redis: {{'✓ Published' if published else '✗ Failed'}}")

# Phase 9: Generate Final Summary
logs.append("\\n--- Phase 9: Final Summary ---")

summary_md = f"""# Orchestration Summary: {{task_name}}

## Completion Status: ✓ SUCCESS

**Task ID**: {{task_id}}
**Completed**: {{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}}

## Deliverables

- **Code Files**: {{code_files_saved}}
- **Test Files**: {{test_files_saved}}
- **Documentation**: {{len([d for d in docs_to_save.values() if d])}} files
- **Security Artifacts**: Available in Security/

## Cost Summary

- **Total Tokens**: {{sum(item.get('tokens_used', 0) for item in cost_ledger)}}
- **Total Cost**: ${{sum(item.get('cost', 0) for item in cost_ledger):.4f}}
- **API Calls**: {{len(cost_ledger)}}

## Quality Metrics

- **Confidence Score**: {{metadata.get('final_confidence', 0):.1f}}%
- **All Gates Passed**: {{metadata.get('all_gates_passed', False)}}
- **Security Review**: {{metadata.get('security_passed', False)}}

## Artifacts Location

```
{{project_dir}}/
├── Code/           ({{code_files_saved}} files)
├── Tests/          ({{test_files_saved}} files)
├── Documentation/  (README, API docs, Runbook, Security)
├── Artifacts/      (Cost ledger, logs)
└── KNOWLEDGE.md    (Lessons learned)
```

## Next Steps

1. Review code in `{{project_dir}}/Code/`
2. Run tests: See `{{project_dir}}/Tests/`
3. Deploy: Follow `{{project_dir}}/Documentation/RUNBOOK.md`
4. Security: Review `{{project_dir}}/Documentation/SECURITY_NOTES.md`

---
**Generated by MCP Orchestration System**
"""

summary_path = project_dir / "SUMMARY.md"
with open(summary_path, 'w') as f:
    f.write(summary_md)

logs.append(f"  ✓ Generated SUMMARY.md")

# Phase 10: Confidence Scoring
logs.append("\\n--- Phase 10: Confidence Evaluation ---")

confidence_result = mcp.call_tool(
    'claude',
    'score_persistence',
    {{
        'files_saved': code_files_saved + test_files_saved,
        'docs_saved': len([d for d in docs_to_save.values() if d]),
        'redis_published': published,
        'vault_created': True,
        'criteria': ['completeness', 'organization', 'traceability']
    }}
)

confidence_score = confidence_result.get('result', {{}}).get('score', 0)
logs.append(f"Confidence: {{confidence_score:.1f}}%")

# Final result
result = {{
    'vault_path': str(project_dir),
    'files_saved': code_files_saved + test_files_saved,
    'docs_saved': len([d for d in docs_to_save.values() if d]),
    'cost_ledger_path': str(json_path),
    'knowledge_path': str(knowledge_path),
    'summary_path': str(summary_path),
    'redis_published': published,
    'confidence_score': confidence_score,
    'total_cost': sum(item.get('cost', 0) for item in cost_ledger),
    'total_tokens': sum(item.get('tokens_used', 0) for item in cost_ledger)
}}

logs.append(f"\\n=== Persistence Complete ===")
logs.append(f"Vault: {{project_dir}}")
logs.append(f"Files: {{code_files_saved + test_files_saved}}")
logs.append(f"Cost: ${{result['total_cost']:.4f}}")
logs.append(f"Confidence: {{confidence_score:.1f}}%")
'''
        return code

    def execute(self, mcp_client, code_executor, inputs):
        """Execute persistence node."""
        code = self.generate_code(inputs)
        exec_result = code_executor.exec_code(code, mcp_client, ['json', 'os', 'pathlib', 'datetime'])

        if not exec_result['success']:
            return {'success': False, 'error': exec_result.get('error')}

        output = exec_result['output']
        return {
            'success': True,
            'outputs': {
                'vault_path': output.get('vault_path', ''),
                'cost_ledger': output.get('cost_ledger_path', ''),
                'knowledge': output.get('knowledge_path', ''),
                'summary': output.get('summary_path', '')
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'files_saved': output.get('files_saved', 0),
                'docs_saved': output.get('docs_saved', 0),
                'redis_published': output.get('redis_published', False),
                'total_cost': output.get('total_cost', 0),
                'total_tokens': output.get('total_tokens', 0)
            },
            'logs': exec_result.get('logs', [])
        }


def create_persistence_node(confidence_threshold: float = 95.0) -> PersistenceNode:
    """Create persistence node."""
    return PersistenceNode(confidence_threshold)
