"""
S3: Vulnerability Debugging & Mitigation Node
Patches identified security vulnerabilities with PoC validation.
"""
from typing import Dict, Any
import json


class SecurityFixNode:
    """
    Vulnerability patching with PoC and validation.

    Process:
    1. Triage findings by severity
    2. Reproduce vulnerabilities (PoC)
    3. Generate patches
    4. Validate fixes
    5. Add regression tests
    """

    def __init__(self, confidence_threshold: float = 95.0):
        """Initialize security fix node."""
        self.confidence_threshold = confidence_threshold

    def generate_code(self, findings: list, source_code: Dict[str, str]) -> str:
        """Generate MCP code for vulnerability fixing."""
        code = f'''
import json

findings = {json.dumps(findings)}
source_code = {json.dumps(source_code)}
confidence_threshold = {self.confidence_threshold}

logs.append("=== Vulnerability Debugging & Mitigation ===")

# Filter to critical and high severity
critical_high = [f for f in findings if f.get('severity') in ['critical', 'high']]
logs.append(f"Processing {{len(critical_high)}} critical/high severity findings")

patches = {{}}
fix_notes = []
delta_tests = {{}}

# Phase 1: Triage & PoC
logs.append("\\n--- Phase 1: Triage & PoC ---")

for i, vuln in enumerate(critical_high):
    vuln_id = vuln.get('id', f'vuln_{{i}}')
    logs.append(f"\\n[{{i+1}}/{{len(critical_high)}}] {{vuln.get('title', vuln_id)}}")

    # Generate PoC via DeepSeek
    poc_result = mcp.call_tool(
        'deepseek',
        'reproduce',
        {{
            'vulnerability': vuln,
            'source_code': source_code
        }}
    )

    poc = poc_result.get('result', {{}}).get('poc', '')
    reproduced = poc_result.get('result', {{}}).get('success', False)

    if not reproduced:
        logs.append(f"  ⚠ Could not reproduce - skipping")
        continue

    logs.append(f"  ✓ Reproduced vulnerability")

    # Phase 2: Generate Patch
    patch_result = mcp.call_tool(
        'codex',
        'fix',
        {{
            'vuln': vuln,
            'poc': poc,
            'source_file': vuln.get('file'),
            'source_code': source_code.get(vuln.get('file'), '')
        }}
    )

    patch_code = patch_result.get('result', {{}}).get('patched_code', '')
    patch_diff = patch_result.get('result', {{}}).get('diff', '')

    patches[vuln.get('file')] = patch_code

    # Phase 3: Validate Fix
    validate_result = mcp.call_tool(
        'claude',
        'validate',
        {{
            'original_vuln': vuln,
            'patch': patch_code,
            'poc': poc
        }}
    )

    validated = validate_result.get('result', {{}}).get('validated', False)

    if validated:
        logs.append(f"  ✓ Patch validated")
    else:
        logs.append(f"  ✗ Patch validation failed")
        continue

    # Phase 4: Generate Regression Test
    test_result = mcp.call_tool(
        'claude',
        'generate_regression_test',
        {{
            'vulnerability': vuln,
            'patch': patch_code,
            'poc': poc
        }}
    )

    regression_test = test_result.get('result', {{}}).get('test_code', '')
    test_path = f'tests/security/regression/test_{{vuln_id}}.py'

    delta_tests[test_path] = regression_test

    # Document fix
    fix_note = {{
        'vuln_id': vuln_id,
        'title': vuln.get('title'),
        'severity': vuln.get('severity'),
        'file': vuln.get('file'),
        'poc': poc,
        'patch_diff': patch_diff,
        'validated': validated
    }}

    fix_notes.append(fix_note)

    logs.append(f"  ✓ Fix complete")

logs.append(f"\\nFixed {{len(fix_notes)}} vulnerabilities")

# Generate SEC_FIX_NOTES.md
fix_sections = []
for i, note in enumerate(fix_notes):
    section = f"""### {{i+1}}. {{note.get('title', 'Unknown')}}
Severity: {{note.get('severity', 'Unknown')}}
File: {{note.get('file', 'Unknown')}}
Status: {{'✓ Validated' if note.get('validated') else '✗ Not Validated'}}

Patch:
```diff
{{note.get('patch_diff', 'N/A')}}
```
"""
    fix_sections.append(section)

fix_notes_md = f"""# Vulnerability Fix Notes

## Summary
- Total Fixes: {{len(fix_notes)}}
- Regression Tests Added: {{len(delta_tests)}}

## Fixes

{{chr(10).join(fix_sections)}}
"""

# Confidence scoring
confidence_result = mcp.call_tool(
    'claude',
    'score_security_fixes',
    {{
        'fixes': fix_notes,
        'regressions_added': len(delta_tests),
        'criteria': ['all_fixed', 'validated', 'regressions']
    }}
)

confidence_score = confidence_result.get('result', {{}}).get('score', 0)

result = {{
    'patches': patches,
    'fix_notes': fix_notes,
    'fix_notes_md': fix_notes_md,
    'delta_tests': delta_tests,
    'confidence_score': confidence_score,
    'fixes_count': len(fix_notes)
}}

logs.append(f"\\n=== Security Fixes Complete ===")
logs.append(f"Fixes: {{len(fix_notes)}}")
logs.append(f"Confidence: {{confidence_score:.1f}}%")
'''
        return code

    def execute(self, mcp_client, code_executor, inputs):
        """Execute security fix node."""
        findings = inputs.get('findings', [])
        source_code = inputs.get('source_code', {})

        code = self.generate_code(findings, source_code)
        exec_result = code_executor.exec_code(code, mcp_client, ['json'])

        if not exec_result['success']:
            return {'success': False, 'error': exec_result.get('error')}

        output = exec_result['output']
        return {
            'success': True,
            'outputs': {
                'patches': output.get('patches', {}),
                'fix_notes': output.get('fix_notes_md', ''),
                'delta_tests': output.get('delta_tests', {})
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'fixes_count': output.get('fixes_count', 0),
                'tokens_used': output.get('tokens_used', 0)
            },
            'logs': exec_result.get('logs', [])
        }


def create_security_fix_node(confidence_threshold: float = 95.0) -> SecurityFixNode:
    return SecurityFixNode(confidence_threshold)
