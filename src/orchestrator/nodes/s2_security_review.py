"""
S2: Security Review & Scanning Node
Automated security scanning with SAST, dependency checks, and SBOM generation.

Uses MCP code execution to integrate Semgrep and other security tools.
"""
from typing import Dict, Any
import json


class SecurityReviewNode:
    """
    Comprehensive security review and scanning.

    Process:
    1. SAST scanning (Semgrep via MCP)
    2. Dependency vulnerability scanning
    3. Secret detection
    4. SBOM generation
    5. Finding normalization and ranking
    6. Claude rubric evaluation
    """

    def __init__(self, confidence_threshold: float = 95.0):
        """Initialize security review node."""
        self.confidence_threshold = confidence_threshold

    def generate_code(self, source_code: Dict[str, str], tests: Dict[str, str]) -> str:
        """Generate MCP code for security review."""
        code = f'''
import json

# Load inputs
source_code = {json.dumps(source_code)}
tests = {json.dumps(tests)}
confidence_threshold = {self.confidence_threshold}

logs.append("=== Security Review & Scanning ===")

# Phase 1: SAST Scanning with Semgrep
logs.append("\\n--- Phase 1: SAST Scanning ---")

# Scan each source file
sast_findings = []

for file_path, file_content in source_code.items():
    logs.append(f"Scanning: {{file_path}}")

    # Call Semgrep via MCP
    scan_result = mcp.call_tool(
        'semgrep',
        'scan',
        {{
            'file_path': file_path,
            'code': file_content,
            'rules': ['security', 'owasp-top-10']
        }}
    )

    findings = scan_result.get('result', {{}}).get('findings', [])
    sast_findings.extend(findings)

    logs.append(f"  Found {{len(findings)}} issues")

logs.append(f"Total SAST findings: {{len(sast_findings)}}")

# Categorize by severity
critical = [f for f in sast_findings if f.get('severity') == 'critical']
high = [f for f in sast_findings if f.get('severity') == 'high']
medium = [f for f in sast_findings if f.get('severity') == 'medium']
low = [f for f in sast_findings if f.get('severity') == 'low']

logs.append(f"  Critical: {{len(critical)}}")
logs.append(f"  High: {{len(high)}}")
logs.append(f"  Medium: {{len(medium)}}")
logs.append(f"  Low: {{len(low)}}")

# Phase 2: Dependency Vulnerability Scanning
logs.append("\\n--- Phase 2: Dependency Scanning ---")

# Extract dependencies from source
deps_result = mcp.call_tool(
    'codex',
    'extract_dependencies',
    {{
        'source_code': source_code
    }}
)

dependencies = deps_result.get('result', {{}}).get('dependencies', [])
logs.append(f"Identified {{len(dependencies)}} dependencies")

# Scan dependencies for vulnerabilities
vuln_findings = []

for dep in dependencies:
    vuln_result = mcp.call_tool(
        'semgrep',
        'scan_dependency',
        {{
            'package': dep.get('name'),
            'version': dep.get('version')
        }}
    )

    vulns = vuln_result.get('result', {{}}).get('vulnerabilities', [])
    vuln_findings.extend(vulns)

logs.append(f"Dependency vulnerabilities: {{len(vuln_findings)}}")

# Phase 3: Secret Detection
logs.append("\\n--- Phase 3: Secret Detection ---")

secrets_found = []

for file_path, file_content in source_code.items():
    # Detect secrets via pattern matching
    secret_result = mcp.call_tool(
        'semgrep',
        'detect_secrets',
        {{
            'file_path': file_path,
            'code': file_content
        }}
    )

    secrets = secret_result.get('result', {{}}).get('secrets', [])
    secrets_found.extend(secrets)

logs.append(f"Secrets detected: {{len(secrets_found)}}")

if secrets_found:
    for secret in secrets_found[:5]:
        logs.append(f"  ⚠ {{secret.get('type')}}: {{secret.get('file')}}:{{secret.get('line')}}")

# Phase 4: SBOM Generation
logs.append("\\n--- Phase 4: SBOM Generation ---")

sbom_result = mcp.call_tool(
    'claude',
    'generate_sbom',
    {{
        'dependencies': dependencies,
        'source_files': list(source_code.keys()),
        'format': 'cyclonedx'
    }}
)

sbom = sbom_result.get('result', {{}}).get('sbom', {{}})

logs.append(f"SBOM generated: {{len(sbom.get('components', []))}} components")

# Phase 5: Finding Normalization & Ranking
logs.append("\\n--- Phase 5: Finding Analysis ---")

# Combine all findings
all_findings = sast_findings + vuln_findings + [
    {{'type': 'secret', 'severity': 'critical', **s}} for s in secrets_found
]

# Normalize findings via DeepSeek
normalized_result = mcp.call_tool(
    'deepseek',
    'normalize_findings',
    {{
        'findings': all_findings,
        'include_false_positive_analysis': True
    }}
)

normalized_findings = normalized_result.get('result', {{}}).get('findings', [])
false_positives = normalized_result.get('result', {{}}).get('false_positives', [])

logs.append(f"Normalized {{len(normalized_findings)}} findings")
logs.append(f"False positives identified: {{len(false_positives)}}")

# Rank by severity and exploitability
ranked_findings = sorted(
    normalized_findings,
    key=lambda f: (
        {{'critical': 0, 'high': 1, 'medium': 2, 'low': 3}}.get(f.get('severity'), 4),
        -f.get('exploitability_score', 0)
    )
)

# Phase 6: Claude Rubric Evaluation
logs.append("\\n--- Phase 6: Rubric Evaluation ---")

rubric_result = mcp.call_tool(
    'claude',
    'evaluate_security_rubric',
    {{
        'findings': ranked_findings,
        'secrets': secrets_found,
        'sbom': sbom,
        'criteria': [
            'no_critical_vulns',
            'secret_detection',
            'sbom_present',
            'code_analysis'
        ]
    }}
)

confidence_score = rubric_result.get('result', {{}}).get('score', 0)
rubric_breakdown = rubric_result.get('result', {{}}).get('breakdown', {{}})

logs.append(f"Confidence: {{confidence_score:.1f}}%")

# Determine pass/fail
critical_or_high = len(critical) + len(high)
has_secrets = len(secrets_found) > 0
passed = critical_or_high == 0 and not has_secrets and sbom is not None

logs.append(f"Gate status: {{'PASS' if passed else 'FAIL'}}")

# Phase 7: Generate Documentation
logs.append("\\n--- Phase 7: Documentation ---")

# Generate SECURITY_FINDINGS.json (normalized format)
findings_json = {{
    'summary': {{
        'total': len(ranked_findings),
        'critical': len([f for f in ranked_findings if f.get('severity') == 'critical']),
        'high': len([f for f in ranked_findings if f.get('severity') == 'high']),
        'medium': len([f for f in ranked_findings if f.get('severity') == 'medium']),
        'low': len([f for f in ranked_findings if f.get('severity') == 'low'])
    }},
    'findings': ranked_findings,
    'false_positives': false_positives
}}

# Generate SECURITY_REVIEW.md (using string concatenation to avoid nested f-string issues)
review_parts = [
    "# Security Review Report",
    "",
    "## Summary",
    "- **Total Findings:** " + str(len(ranked_findings)),
    "- **Critical:** " + str(len(critical)),
    "- **High:** " + str(len(high)),
    "- **Medium:** " + str(len(medium)),
    "- **Low:** " + str(len(low)),
    "- **Secrets Found:** " + str(len(secrets_found)),
    "",
    "## Gate Status: " + ("✓ PASS" if passed else "✗ FAIL"),
    "",
    "## Critical & High Severity Findings",
    "",
    "## Dependencies",
    "- Total: " + str(len(dependencies)),
    "- Vulnerabilities: " + str(len(vuln_findings)),
    "",
    "## SBOM",
    "- Components: " + str(len(sbom.get('components', []))),
    ""
]
review_md = "\\n".join(review_parts)

# Token usage
tokens_used = sum([
    deps_result.get('tokens_used', 0),
    sbom_result.get('tokens_used', 0),
    normalized_result.get('tokens_used', 0),
    rubric_result.get('tokens_used', 0)
])

# Final result
result = {{
    'findings': ranked_findings,
    'findings_json': findings_json,
    'review_md': review_md,
    'sbom': sbom,
    'secrets_found': secrets_found,
    'confidence_score': confidence_score,
    'rubric_breakdown': rubric_breakdown,
    'passed': passed,
    'severity_breakdown': {{
        'critical': len(critical),
        'high': len(high),
        'medium': len(medium),
        'low': len(low)
    }},
    'tokens_used': tokens_used
}}

logs.append(f"\\n=== Security Review Complete ===")
logs.append(f"Findings: {{len(ranked_findings)}}")
logs.append(f"Status: {{'PASS' if passed else 'FAIL'}}")
logs.append(f"Confidence: {{confidence_score:.1f}}%")
'''

        return code

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute security review node."""
        source_code = inputs.get('source_code', {})
        tests = inputs.get('tests', {})

        if not source_code:
            return {
                'success': False,
                'error': 'No source_code provided'
            }

        code = self.generate_code(source_code, tests)

        exec_result = code_executor.exec_code(
            code=code,
            mcp_client=mcp_client,
            imports=['json']
        )

        if not exec_result['success']:
            return {
                'success': False,
                'error': exec_result.get('error'),
                'message': exec_result.get('message', 'Execution failed')
            }

        output = exec_result['output']

        return {
            'success': True,
            'outputs': {
                'findings': output.get('findings', []),
                'sbom': output.get('sbom', {}),
                'review': output.get('review_md', '')
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'passed': output.get('passed', False),
                'severity_breakdown': output.get('severity_breakdown', {}),
                'secrets_count': len(output.get('secrets_found', [])),
                'total_findings': len(output.get('findings', [])),
                'tokens_used': output.get('tokens_used', 0)
            },
            'logs': exec_result.get('logs', [])
        }


def create_security_review_node(confidence_threshold: float = 95.0) -> SecurityReviewNode:
    """Create security review node."""
    return SecurityReviewNode(confidence_threshold)
