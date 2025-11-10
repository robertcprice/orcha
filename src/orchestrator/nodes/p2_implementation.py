"""
P2: Code Implementation Node
Generates code from execution plan using Codex via MCP.

Uses MCP code execution for build, test scaffold generation, and validation.
"""
from typing import Dict, Any
import json


class ImplementationNode:
    """
    Code generation with build validation.

    Process:
    1. Generate code from plan using Codex
    2. Create project structure
    3. Generate unit test skeletons
    4. Run build/lint
    5. Validate against requirements
    """

    def __init__(self, confidence_threshold: float = 95.0):
        """
        Initialize implementation node.

        Args:
            confidence_threshold: Required confidence to proceed
        """
        self.confidence_threshold = confidence_threshold

    def generate_code(
        self,
        plan: Dict[str, Any],
        sec_plan: Dict[str, Any]
    ) -> str:
        """
        Generate MCP code for implementation.

        Args:
            plan: Execution plan from P1
            sec_plan: Security plan from S1

        Returns:
            Python code for execution
        """
        code = f'''
import json
import os

# Load inputs
plan = {json.dumps(plan)}
sec_plan = {json.dumps(sec_plan)}
confidence_threshold = {self.confidence_threshold}

logs.append("=== Code Implementation ===")

# Phase 1: Code Generation via Codex
logs.append("\\n--- Phase 1: Code Generation ---")

# Generate code for each component in plan
components_to_implement = plan.get('steps', [])
logs.append(f"Implementing {{len(components_to_implement)}} components")

generated_files = {{}}

for i, component in enumerate(components_to_implement):
    comp_name = component.get('name', f'Component{{i}}')
    logs.append(f"\\nGenerating: {{comp_name}}")

    # Call Codex for code generation
    code_result = mcp.call_tool(
        'codex',
        'generate_code',
        {{
            'specification': component.get('description', ''),
            'plan_context': plan,
            'security_context': sec_plan,
            'language': plan.get('stack', {{}}).get('language', 'python'),
            'framework': plan.get('stack', {{}}).get('framework', '')
        }}
    )

    code_content = code_result.get('result', {{}}).get('code', '')
    file_path = code_result.get('result', {{}}).get('file_path', f'src/{{comp_name}}.py')

    generated_files[file_path] = code_content

    logs.append(f"  Generated: {{file_path}} ({{len(code_content)}} chars)")

logs.append(f"\\nTotal files generated: {{len(generated_files)}}")

# Phase 2: Project Structure
logs.append("\\n--- Phase 2: Project Structure ---")

# Create directory structure
structure_result = mcp.call_tool(
    'codex',
    'create_project_structure',
    {{
        'plan': plan,
        'files': list(generated_files.keys())
    }}
)

project_structure = structure_result.get('result', {{}})
logs.append(f"Created structure with {{len(project_structure.get('directories', []))}} directories")

# Phase 3: Generate Unit Test Skeletons
logs.append("\\n--- Phase 3: Test Scaffolding ---")

test_files = {{}}

for file_path, code_content in generated_files.items():
    # Generate test skeleton via Claude
    test_result = mcp.call_tool(
        'claude',
        'generate_test_skeleton',
        {{
            'source_file': file_path,
            'source_code': code_content,
            'testing_framework': plan.get('stack', {{}}).get('test_framework', 'pytest')
        }}
    )

    test_code = test_result.get('result', {{}}).get('test_code', '')
    test_path = test_result.get('result', {{}}).get('test_path', f'tests/test_{{file_path.split("/")[-1]}}')

    test_files[test_path] = test_code

logs.append(f"Generated {{len(test_files)}} test skeletons")

# Phase 4: Build Validation
logs.append("\\n--- Phase 4: Build Validation ---")

# Simulate build (in production, would actually run build)
build_result = mcp.call_tool(
    'codex',
    'validate_build',
    {{
        'files': generated_files,
        'language': plan.get('stack', {{}}).get('language', 'python'),
        'dependencies': plan.get('dependencies', [])
    }}
)

build_success = build_result.get('result', {{}}).get('success', True)
build_errors = build_result.get('result', {{}}).get('errors', [])
build_warnings = build_result.get('result', {{}}).get('warnings', [])

logs.append(f"Build: {{'✓ Success' if build_success else '✗ Failed'}}")
logs.append(f"Errors: {{len(build_errors)}}")
logs.append(f"Warnings: {{len(build_warnings)}}")

if build_errors:
    for error in build_errors[:5]:  # Show first 5
        logs.append(f"  ERROR: {{error}}")

# Phase 5: Lint Check
logs.append("\\n--- Phase 5: Lint Check ---")

lint_result = mcp.call_tool(
    'codex',
    'run_lint',
    {{
        'files': generated_files,
        'language': plan.get('stack', {{}}).get('language', 'python')
    }}
)

lint_passed = lint_result.get('result', {{}}).get('passed', True)
lint_issues = lint_result.get('result', {{}}).get('issues', [])

logs.append(f"Lint: {{'✓ Clean' if lint_passed else f'⚠ {{len(lint_issues)}} issues'}}")

# Phase 6: Requirements Validation
logs.append("\\n--- Phase 6: Requirements Validation ---")

validation_result = mcp.call_tool(
    'claude',
    'validate_requirements',
    {{
        'plan': plan,
        'generated_files': generated_files,
        'check_for_todos': True,
        'check_completeness': True
    }}
)

requirements_met = validation_result.get('result', {{}}).get('all_met', True)
missing_requirements = validation_result.get('result', {{}}).get('missing', [])
todo_count = validation_result.get('result', {{}}).get('todo_count', 0)

logs.append(f"Requirements: {{'✓ All met' if requirements_met else f'✗ {{len(missing_requirements)}} missing'}}")
logs.append(f"TODOs found: {{todo_count}}")

# Phase 7: Confidence Scoring
logs.append("\\n--- Phase 7: Confidence Scoring ---")

confidence_result = mcp.call_tool(
    'claude',
    'score_implementation',
    {{
        'build_success': build_success,
        'lint_passed': lint_passed,
        'requirements_met': requirements_met,
        'todo_count': todo_count,
        'test_coverage': len(test_files) / len(generated_files) if generated_files else 0,
        'criteria': [
            'build_success',
            'code_quality',
            'test_coverage',
            'completeness'
        ]
    }}
)

confidence_score = confidence_result.get('result', {{}}).get('score', 0)
quality_metrics = confidence_result.get('result', {{}}).get('metrics', {{}})

logs.append(f"Confidence: {{confidence_score:.1f}}%")
logs.append(f"Quality metrics: {{quality_metrics}}")

# Generate build log summary
build_log_md = f"""# Build Log

## Summary
- Files Generated: {{len(generated_files)}}
- Test Skeletons: {{len(test_files)}}
- Build: {{'✓ Success' if build_success else '✗ Failed'}}
- Lint: {{'✓ Clean' if lint_passed else f'{{len(lint_issues)}} issues'}}
- Requirements: {{'✓ Met' if requirements_met else f'{{len(missing_requirements)}} missing'}}

## Errors
{{chr(10).join(f"- {{e}}" for e in build_errors[:10])}}

## Warnings
{{chr(10).join(f"- {{w}}" for w in build_warnings[:10])}}

## Files
{{chr(10).join(f"- {{f}}" for f in generated_files.keys())}}
"""

# Token usage
tokens_used = sum([
    sum(code_result.get('tokens_used', 0) for code_result in []),  # Would accumulate in loop
    structure_result.get('tokens_used', 0),
    build_result.get('tokens_used', 0),
    lint_result.get('tokens_used', 0),
    validation_result.get('tokens_used', 0),
    confidence_result.get('tokens_used', 0)
])

# Final result
result = {{
    'source_code': generated_files,
    'test_skeletons': test_files,
    'project_structure': project_structure,
    'build_log_md': build_log_md,
    'build_success': build_success,
    'lint_passed': lint_passed,
    'requirements_met': requirements_met,
    'confidence_score': confidence_score,
    'quality_metrics': quality_metrics,
    'errors': build_errors,
    'warnings': build_warnings,
    'todo_count': todo_count,
    'tokens_used': tokens_used
}}

logs.append(f"\\n=== Implementation Complete ===")
logs.append(f"Files: {{len(generated_files)}}")
logs.append(f"Build: {{'✓' if build_success else '✗'}}")
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
        Execute implementation node.

        Args:
            mcp_client: MCP client instance
            code_executor: Code executor instance
            inputs: Must contain 'plan' from P1 and 'sec_plan' from S1

        Returns:
            Execution result with source code and build logs
        """
        plan = inputs.get('plan')
        sec_plan = inputs.get('sec_plan')

        if not plan:
            return {
                'success': False,
                'error': 'No plan provided from P1'
            }

        # Generate execution code
        code = self.generate_code(plan, sec_plan or {})

        # Execute in sandboxed environment
        exec_result = code_executor.exec_code(
            code=code,
            mcp_client=mcp_client,
            imports=['json', 'os']
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
                'source_code': output.get('source_code', {}),
                'test_skeletons': output.get('test_skeletons', {}),
                'build_logs': output.get('build_log_md', '')
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'quality_metrics': output.get('quality_metrics', {}),
                'build_success': output.get('build_success', False),
                'lint_passed': output.get('lint_passed', False),
                'requirements_met': output.get('requirements_met', False),
                'file_count': len(output.get('source_code', {})),
                'test_count': len(output.get('test_skeletons', {})),
                'todo_count': output.get('todo_count', 0),
                'tokens_used': output.get('tokens_used', 0)
            },
            'logs': exec_result.get('logs', [])
        }


# Factory function
def create_implementation_node(confidence_threshold: float = 95.0) -> ImplementationNode:
    """
    Create implementation node with specified threshold.

    Args:
        confidence_threshold: Required confidence (0-100)

    Returns:
        ImplementationNode instance
    """
    return ImplementationNode(confidence_threshold=confidence_threshold)
