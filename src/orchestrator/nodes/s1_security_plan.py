"""
S1: Security Planning & Threat Modeling Node
STRIDE-based threat analysis with comprehensive mitigation planning.

Uses MCP code execution for systematic threat enumeration.
"""
from typing import Dict, Any
import json


class SecurityPlanningNode:
    """
    Security planning with STRIDE threat modeling.

    Process:
    1. Extract components and boundaries from plan
    2. For each component, enumerate STRIDE threats:
       - Spoofing
       - Tampering
       - Repudiation
       - Information Disclosure
       - Denial of Service
       - Elevation of Privilege
    3. Generate mitigations for each threat
    4. Create security test matrix
    5. Document policy requirements
    """

    def __init__(self, confidence_threshold: float = 95.0):
        """
        Initialize security planning node.

        Args:
            confidence_threshold: Required confidence to proceed
        """
        self.confidence_threshold = confidence_threshold

    def generate_code(self, plan: Dict[str, Any]) -> str:
        """
        Generate MCP code for STRIDE threat modeling.

        Args:
            plan: Execution plan from P1

        Returns:
            Python code for execution
        """
        code = f'''
import json

# Load plan
plan = {json.dumps(plan)}
confidence_threshold = {self.confidence_threshold}

logs.append("=== Security Planning & Threat Modeling ===")
logs.append("Using STRIDE methodology")

# Phase 1: Extract Components
logs.append("\\n--- Phase 1: Component Extraction ---")

components_result = mcp.call_tool(
    'claude',
    'extract_components',
    {{
        'plan': plan,
        'extract_boundaries': True
    }}
)

components = components_result.get('result', {{}}).get('components', [])
boundaries = components_result.get('result', {{}}).get('boundaries', [])

logs.append(f"Identified {{len(components)}} components")
logs.append(f"Identified {{len(boundaries)}} trust boundaries")

# Phase 2: STRIDE Threat Enumeration
logs.append("\\n--- Phase 2: STRIDE Threat Enumeration ---")

stride_categories = [
    'Spoofing',
    'Tampering',
    'Repudiation',
    'Information Disclosure',
    'Denial of Service',
    'Elevation of Privilege'
]

all_threats = []

for component in components:
    comp_name = component.get('name', 'Unknown')
    logs.append(f"\\nAnalyzing: {{comp_name}}")

    for category in stride_categories:
        # Enumerate threats via DeepSeek
        threat_result = mcp.call_tool(
            'deepseek',
            'enumerate_threats',
            {{
                'component': component,
                'category': category,
                'boundaries': boundaries
            }}
        )

        threats = threat_result.get('result', {{}}).get('threats', [])

        for threat in threats:
            # Generate mitigations via Claude
            mitigation_result = mcp.call_tool(
                'claude',
                'generate_mitigations',
                {{
                    'threat': threat,
                    'component': component,
                    'category': category
                }}
            )

            mitigations = mitigation_result.get('result', {{}}).get('mitigations', [])

            # Assess severity
            severity = threat.get('severity', 'medium')

            threat_entry = {{
                'component': comp_name,
                'category': category,
                'threat': threat.get('description', ''),
                'severity': severity,
                'mitigations': mitigations,
                'attack_vector': threat.get('attack_vector', ''),
                'impact': threat.get('impact', '')
            }}

            all_threats.append(threat_entry)

        logs.append(f"  {{category}}: {{len(threats)}} threats")

logs.append(f"\\nTotal threats identified: {{len(all_threats)}}")

# Categorize by severity
critical_threats = [t for t in all_threats if t['severity'] == 'critical']
high_threats = [t for t in all_threats if t['severity'] == 'high']
medium_threats = [t for t in all_threats if t['severity'] == 'medium']
low_threats = [t for t in all_threats if t['severity'] == 'low']

logs.append(f"  Critical: {{len(critical_threats)}}")
logs.append(f"  High: {{len(high_threats)}}")
logs.append(f"  Medium: {{len(medium_threats)}}")
logs.append(f"  Low: {{len(low_threats)}}")

# Phase 3: Security Test Matrix
logs.append("\\n--- Phase 3: Security Test Matrix ---")

test_matrix_result = mcp.call_tool(
    'claude',
    'create_security_test_matrix',
    {{
        'threats': all_threats,
        'components': components
    }}
)

test_matrix = test_matrix_result.get('result', {{}}).get('matrix', [])

logs.append(f"Generated {{len(test_matrix)}} test cases")

# Categorize test cases
abuse_cases = [t for t in test_matrix if t.get('type') == 'abuse']
boundary_tests = [t for t in test_matrix if t.get('type') == 'boundary']
exploit_scenarios = [t for t in test_matrix if t.get('type') == 'exploit']

logs.append(f"  Abuse cases: {{len(abuse_cases)}}")
logs.append(f"  Boundary tests: {{len(boundary_tests)}}")
logs.append(f"  Exploit scenarios: {{len(exploit_scenarios)}}")

# Phase 4: Policy Requirements
logs.append("\\n--- Phase 4: Policy Requirements ---")

policy_result = mcp.call_tool(
    'claude',
    'generate_policy_requirements',
    {{
        'threats': all_threats,
        'components': components,
        'severity_breakdown': {{
            'critical': len(critical_threats),
            'high': len(high_threats)
        }}
    }}
)

policy_requirements = policy_result.get('result', {{}}).get('requirements', [])

logs.append(f"Generated {{len(policy_requirements)}} policy requirements")

# Phase 5: Generate SEC_PLAN.md
logs.append("\\n--- Phase 5: Documentation Generation ---")

sec_plan_result = mcp.call_tool(
    'gemini',
    'format_security_plan',
    {{
        'threats': all_threats,
        'test_matrix': test_matrix,
        'components': components,
        'boundaries': boundaries,
        'policy_requirements': policy_requirements
    }}
)

sec_plan_md = sec_plan_result.get('result', {{}}).get('markdown', '')

# Generate SEC_TEST_MATRIX.md
test_matrix_md = f"""# Security Test Matrix

## Summary
- Total Tests: {{len(test_matrix)}}
- Abuse Cases: {{len(abuse_cases)}}
- Boundary Tests: {{len(boundary_tests)}}
- Exploit Scenarios: {{len(exploit_scenarios)}}

## Test Cases

{{chr(10).join(f"### {{i+1}}. {{t.get('name', 'Test')}}\\n**Type:** {{t.get('type')}}\\n**Component:** {{t.get('component')}}\\n**Description:** {{t.get('description')}}\\n" for i, t in enumerate(test_matrix))}}
"""

# Generate POLICY_REQUIREMENTS.md
policy_md = f"""# Security Policy Requirements

{{chr(10).join(f"## {{i+1}}. {{req.get('category', 'Unknown')}}\\n{{req.get('requirement', '')}}\\n" for i, req in enumerate(policy_requirements))}}
"""

# Phase 6: Confidence Scoring
logs.append("\\n--- Phase 6: Confidence Scoring ---")

confidence_result = mcp.call_tool(
    'claude',
    'score_security_plan',
    {{
        'threats': all_threats,
        'test_matrix': test_matrix,
        'policy_requirements': policy_requirements,
        'criteria': [
            'asset_coverage',
            'threat_enumeration',
            'mitigation_planning',
            'test_coverage',
            'research_depth'
        ]
    }}
)

confidence_score = confidence_result.get('result', {{}}).get('score', 0)
coverage_stats = confidence_result.get('result', {{}}).get('coverage', {{}})

logs.append(f"Confidence: {{confidence_score:.1f}}%")
logs.append(f"Coverage: {{coverage_stats}}")

# Privacy tokenization for sensitive threats
# (In production, would use mcp_client.tokenize_pii())
for threat in all_threats:
    if 'password' in threat.get('description', '').lower():
        threat['description'] = '[REDACTED_SECURITY_DETAIL]'

# Token usage tracking
tokens_used = sum([
    components_result.get('tokens_used', 0),
    test_matrix_result.get('tokens_used', 0),
    policy_result.get('tokens_used', 0),
    sec_plan_result.get('tokens_used', 0),
    confidence_result.get('tokens_used', 0)
])

logs.append(f"Total tokens used: {{tokens_used:,}}")

# Final result
result = {{
    'threats': all_threats,
    'test_matrix': test_matrix,
    'policy_requirements': policy_requirements,
    'sec_plan_md': sec_plan_md,
    'test_matrix_md': test_matrix_md,
    'policy_md': policy_md,
    'confidence_score': confidence_score,
    'coverage_stats': coverage_stats,
    'severity_breakdown': {{
        'critical': len(critical_threats),
        'high': len(high_threats),
        'medium': len(medium_threats),
        'low': len(low_threats)
    }},
    'tokens_used': tokens_used
}}

logs.append(f"\\n=== Security Planning Complete ===")
logs.append(f"Threats: {{len(all_threats)}}")
logs.append(f"Tests: {{len(test_matrix)}}")
logs.append(f"Confidence: {{confidence_score:.1f}}%")
'''

        return code

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute security planning node.

        Args:
            mcp_client: MCP client instance
            code_executor: Code executor instance
            inputs: Must contain 'plan' from P1

        Returns:
            Execution result with security artifacts
        """
        plan = inputs.get('plan')

        if not plan:
            return {
                'success': False,
                'error': 'No plan provided from P1'
            }

        # Generate execution code
        code = self.generate_code(plan)

        # Execute in sandboxed environment
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

        # Extract outputs
        output = exec_result['output']

        return {
            'success': True,
            'outputs': {
                'sec_plan': output.get('threats'),
                'test_matrix': output.get('test_matrix'),
                'policy_reqs': output.get('policy_requirements'),
                'sec_plan_md': output.get('sec_plan_md'),
                'test_matrix_md': output.get('test_matrix_md'),
                'policy_md': output.get('policy_md')
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'coverage_stats': output.get('coverage_stats', {}),
                'severity_breakdown': output.get('severity_breakdown', {}),
                'tokens_used': output.get('tokens_used', 0),
                'total_threats': len(output.get('threats', [])),
                'total_tests': len(output.get('test_matrix', []))
            },
            'logs': exec_result.get('logs', [])
        }


# Factory function
def create_security_planning_node(confidence_threshold: float = 95.0) -> SecurityPlanningNode:
    """
    Create security planning node with specified threshold.

    Args:
        confidence_threshold: Required confidence (0-100)

    Returns:
        SecurityPlanningNode instance
    """
    return SecurityPlanningNode(confidence_threshold=confidence_threshold)
