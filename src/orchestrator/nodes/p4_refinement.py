"""
P4: Iterative Refinement Node
Improves code based on all feedback from previous nodes.
"""
from typing import Dict, Any
import json


class RefinementNode:
    """Iterative code refinement until all gates pass."""

    def __init__(self, confidence_threshold: float = 95.0, max_iterations: int = 5):
        self.confidence_threshold = confidence_threshold
        self.max_iterations = max_iterations

    def generate_code(self, inputs: Dict[str, Any]) -> str:
        code = f'''
import json

source_code = {json.dumps(inputs.get('source_code', {}))}
patches = {json.dumps(inputs.get('patches', {}))}
test_failures = {json.dumps(inputs.get('failing_tests', []))}
sec_findings = {json.dumps(inputs.get('findings', []))}

logs.append("=== Iterative Refinement ===")

# Apply patches
for file_path, patch_code in patches.items():
    source_code[file_path] = patch_code
    logs.append(f"Applied patch: {{file_path}}")

iteration = 0
all_gates_passed = False

while not all_gates_passed and iteration < {self.max_iterations}:
    iteration += 1
    logs.append(f"\\n--- Iteration {{iteration}} ---")

    # Collect all feedback
    feedback = {{
        'test_failures': test_failures,
        'sec_findings': [f for f in sec_findings if f.get('severity') in ['medium', 'low']],
        'iteration': iteration
    }}

    # Refine code via Codex
    refine_result = mcp.call_tool(
        'codex',
        'refine',
        {{
            'source_code': source_code,
            'feedback': feedback
        }}
    )

    source_code = refine_result.get('result', {{}}).get('refined_code', source_code)

    # Re-validate gates
    gate_result = mcp.call_tool(
        'claude',
        'validate_all_gates',
        {{
            'source_code': source_code,
            'gates': ['IMPL', 'TESTS', 'SEC_REVIEW']
        }}
    )

    gates_status = gate_result.get('result', {{}})
    all_gates_passed = all(gates_status.values())

    logs.append(f"Gates: {{gates_status}}")

confidence_result = mcp.call_tool(
    'claude',
    'score_refinement',
    {{'iterations': iteration, 'gates_passed': all_gates_passed}}
)

result = {{
    'refined_code': source_code,
    'iterations': iteration,
    'confidence_score': confidence_result.get('result', {{}}).get('score', 0)
}}

logs.append(f"\\n=== Refinement Complete ===")
logs.append(f"Iterations: {{iteration}}")
'''
        return code

    def execute(self, mcp_client, code_executor, inputs):
        code = self.generate_code(inputs)
        exec_result = code_executor.exec_code(code, mcp_client, ['json'])

        if not exec_result['success']:
            return {'success': False, 'error': exec_result.get('error')}

        output = exec_result['output']
        return {
            'success': True,
            'outputs': {'refined_code': output.get('refined_code', {})},
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'iterations': output.get('iterations', 0)
            },
            'logs': exec_result.get('logs', [])
        }


def create_refinement_node(confidence_threshold: float = 95.0) -> RefinementNode:
    return RefinementNode(confidence_threshold)
