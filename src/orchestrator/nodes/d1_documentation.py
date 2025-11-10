"""
D1: Documentation Generation Node
Creates comprehensive documentation for the project.
"""
from typing import Dict, Any
import json


class DocumentationNode:
    """Generate comprehensive project documentation."""

    def __init__(self, confidence_threshold: float = 95.0):
        self.confidence_threshold = confidence_threshold

    def generate_code(self, inputs: Dict[str, Any]) -> str:
        code = f'''
import json

refined_code = {json.dumps(inputs.get('refined_code', {}))}
tests = {json.dumps(inputs.get('tests', {}))}
sec_plan = {json.dumps(inputs.get('sec_plan', {}))}

logs.append("=== Documentation Generation ===")

# README.md
readme_result = mcp.call_tool(
    'gemini',
    'generate_docs',
    {{
        'type': 'readme',
        'source_code': refined_code,
        'tests': tests,
        'include_sections': ['installation', 'usage', 'api', 'examples']
    }}
)

readme_md = readme_result.get('result', {{}}).get('markdown', '')

# API Documentation
api_result = mcp.call_tool(
    'gemini',
    'generate_docs',
    {{
        'type': 'api',
        'source_code': refined_code
    }}
)

api_md = api_result.get('result', {{}}).get('markdown', '')

# Architecture Documentation
arch_result = mcp.call_tool(
    'claude',
    'generate_architecture_docs',
    {{
        'source_code': refined_code,
        'security_plan': sec_plan
    }}
)

architecture_md = arch_result.get('result', {{}}).get('markdown', '')

# Security Notes
security_notes_md = f"""# Security Documentation

## Threat Model
{{chr(10).join(f"- {{t.get('category')}}: {{t.get('threat')}}" for t in sec_plan[:10])}}

## Security Controls
- Authentication: Implemented
- Authorization: Role-based
- Encryption: TLS 1.3+

See SEC_PLAN.md for full details.
"""

# Runbook
runbook_md = """# Operations Runbook

## Deployment
1. Install dependencies
2. Configure environment
3. Run migrations
4. Start services

## Monitoring
- Health endpoint: /health
- Metrics: /metrics

## Troubleshooting
See logs in ./logs/
"""

confidence_result = mcp.call_tool(
    'claude',
    'score_documentation',
    {{
        'readme': readme_md,
        'api': api_md,
        'criteria': ['completeness', 'clarity']
    }}
)

result = {{
    'readme': readme_md,
    'api_docs': api_md,
    'runbook': runbook_md,
    'security_notes': security_notes_md,
    'architecture': architecture_md,
    'confidence_score': confidence_result.get('result', {{}}).get('score', 0)
}}

logs.append("=== Documentation Complete ===")
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
                'readme': output.get('readme', ''),
                'api_docs': output.get('api_docs', ''),
                'runbook': output.get('runbook', ''),
                'security_notes': output.get('security_notes', '')
            },
            'metadata': {'confidence': output.get('confidence_score', 0)},
            'logs': exec_result.get('logs', [])
        }


def create_documentation_node(confidence_threshold: float = 95.0) -> DocumentationNode:
    return DocumentationNode(confidence_threshold)
