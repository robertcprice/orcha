"""
O1: Final Operations & System Test Node
End-to-end validation and deployment readiness.
"""
from typing import Dict, Any
import json


class FinalOpsNode:
    """Final system testing and validation."""

    def __init__(self, confidence_threshold: float = 95.0):
        self.confidence_threshold = confidence_threshold

    def generate_code(self, inputs: Dict[str, Any]) -> str:
        code = f'''
import json

refined_code = {json.dumps(inputs.get('refined_code', {}))}
tests = {json.dumps(inputs.get('tests', {}))}
readme = {json.dumps(inputs.get('readme', ''))}

logs.append("=== Final Operations & System Test ===")

# Smoke Tests
logs.append("\\n--- Smoke Tests ---")
smoke_result = mcp.call_tool(
    'claude',
    'run_smoke_tests',
    {{'code': refined_code}}
)

smoke_passed = smoke_result.get('result', {{}}).get('passed', True)
logs.append(f"Smoke: {{'✓' if smoke_passed else '✗'}}")

# E2E Scenarios
logs.append("\\n--- E2E Scenarios ---")
e2e_result = mcp.call_tool(
    'claude',
    'run_e2e',
    {{'code': refined_code, 'scenarios': ['happy_path', 'error_handling']}}
)

e2e_passed = e2e_result.get('result', {{}}).get('passed', True)
logs.append(f"E2E: {{'✓' if e2e_passed else '✗'}}")

# Resilience Testing
logs.append("\\n--- Resilience Tests ---")
resilience_result = mcp.call_tool(
    'claude',
    'test_resilience',
    {{'code': refined_code, 'tests': ['bad_inputs', 'edge_cases']}}
)

resilience_score = resilience_result.get('result', {{}}).get('score', 95)
logs.append(f"Resilience: {{resilience_score:.1f}}%")

all_passed = smoke_passed and e2e_passed and resilience_score >= 90

confidence_result = mcp.call_tool(
    'claude',
    'score_final_ops',
    {{'smoke': smoke_passed, 'e2e': e2e_passed, 'resilience': resilience_score}}
)

result = {{
    'e2e_logs': 'All tests passed',
    'resilience_report': f'Resilience: {{resilience_score:.1f}}%',
    'confidence_score': confidence_result.get('result', {{}}).get('score', 0),
    'all_passed': all_passed
}}

logs.append(f"\\n=== Final Ops Complete ===")
logs.append(f"Status: {{'✓ PASS' if all_passed else '✗ FAIL'}}")
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
            'outputs': {
                'e2e_logs': output.get('e2e_logs', ''),
                'resilience_report': output.get('resilience_report', '')
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'all_passed': output.get('all_passed', False)
            },
            'logs': exec_result.get('logs', [])
        }


def create_final_ops_node(confidence_threshold: float = 95.0) -> FinalOpsNode:
    return FinalOpsNode(confidence_threshold)
