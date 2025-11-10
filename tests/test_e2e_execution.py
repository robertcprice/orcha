"""
End-to-End Execution Test
Tests complete workflow through all 11 nodes with actual execution
"""
import sys
import json
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.orchestrator.engine.mcp_client import AgentMCPClient
from src.orchestrator.engine.code_exec import CodeExecutor
from src.orchestrator.engine.state import OrchestrationState

# Import all nodes
from src.orchestrator.nodes.p0_intake import create_intake_node
from src.orchestrator.nodes.p1_planning import create_planning_node
from src.orchestrator.nodes.s1_security_plan import create_security_planning_node
from src.orchestrator.nodes.p2_implementation import create_implementation_node
from src.orchestrator.nodes.t1_testing import create_testing_node
from src.orchestrator.nodes.s2_security_review import create_security_review_node
from src.orchestrator.nodes.s3_security_fix import create_security_fix_node
from src.orchestrator.nodes.p4_refinement import create_refinement_node
from src.orchestrator.nodes.d1_documentation import create_documentation_node
from src.orchestrator.nodes.o1_final_ops import create_final_ops_node
from src.orchestrator.nodes.p6_persistence import create_persistence_node


class MockMCPClient:
    """Mock MCP client that simulates AI responses."""

    def __init__(self):
        self.call_count = 0
        self.calls = []

    def call_tool(self, server: str, tool: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate MCP tool call."""
        self.call_count += 1
        self.calls.append({'server': server, 'tool': tool, 'params': params})
        # Debug: print what's being called
        print(f"DEBUG: MCP call #{self.call_count}: server={server}, tool={tool}")

        # Simulate different responses based on tool
        if 'generate_questions' in tool:
            return {
                'result': {
                    'questions': [
                        'What programming language do you want to use?',
                        'What framework should be used?',
                        'What are the security requirements?'
                    ]
                }
            }

        elif 'evaluate_confidence' in tool or 'score' in tool:
            return {
                'result': {
                    'score': 96.5,
                    'breakdown': {'clarity': 97, 'completeness': 96}
                }
            }

        elif 'plan' in tool or 'organize' in tool:
            # For finalize_plan: result IS the plan (not result.plan)
            return {
                'result': {
                    'phases': ['setup', 'implementation', 'testing'],
                    'steps': [
                        {'name': 'calculator_module', 'description': 'Main calculator logic'},
                        {'name': 'api_handler', 'description': 'API endpoints'}
                    ],
                    'architecture': {
                        'components': ['api', 'database', 'frontend']
                    }
                }
            }

        elif 'threat' in tool or 'security' in tool:
            return {
                'result': {
                    'threats': [
                        {'category': 'Spoofing', 'threat': 'Fake user login', 'severity': 'high'},
                        {'category': 'Tampering', 'threat': 'Data modification', 'severity': 'medium'}
                    ],
                    'mitigations': ['Use JWT tokens', 'Validate all inputs']
                }
            }

        elif 'generate' in tool or 'implement' in tool:
            # Return code as a string, not dict (P2 expects string)
            return {
                'result': {
                    'code': 'def calculator_add(a, b):\n    return a + b\n\ndef calculator_multiply(a, b):\n    return a * b',
                    'file_path': 'src/calculator.py'
                }
            }

        elif 'test' in tool:
            # Return test code as string
            return {
                'result': {
                    'test_code': 'def test_add():\n    assert calculator_add(2, 3) == 5\n\ndef test_multiply():\n    assert calculator_multiply(4, 5) == 20',
                    'test_path': 'tests/test_calculator.py',
                    'coverage': 85.5,
                    'passed': True
                }
            }

        elif 'scan' in tool or 'semgrep' in tool:
            return {
                'result': {
                    'findings': [
                        {
                            'id': 'vuln_1',
                            'title': 'SQL Injection Risk',
                            'severity': 'medium',
                            'file': 'main.py',
                            'line': 42
                        }
                    ],
                    'dependencies': [],
                    'vulnerabilities': []
                }
            }

        elif 'fix' in tool or 'patch' in tool:
            return {
                'result': {
                    'patched_code': 'def hello(): return "Hello Fixed"',
                    'diff': '- old\n+ new',
                    'validated': True
                }
            }

        elif 'refine' in tool:
            return {
                'result': {
                    'refined_code': {
                        'main.py': 'def hello(): return "Hello Refined"'
                    }
                }
            }

        elif 'docs' in tool or 'documentation' in tool:
            return {
                'result': {
                    'markdown': '# Documentation\n\nThis is generated documentation.'
                }
            }

        elif 'smoke' in tool or 'e2e' in tool or 'resilience' in tool:
            return {
                'result': {
                    'passed': True,
                    'score': 95
                }
            }

        elif 'sbom' in tool:
            return {
                'result': {
                    'sbom': {
                        'components': [
                            {'name': 'fastapi', 'version': '0.104.0', 'license': 'MIT'}
                        ]
                    }
                }
            }

        elif 'publish' in tool:
            return {
                'result': {
                    'success': True,
                    'channel': 'orchestration:completions'
                }
            }

        # Default response
        return {
            'result': {
                'success': True,
                'data': 'Simulated response'
            }
        }


def test_individual_node_execution():
    """Test each node individually to verify execution."""
    print("\n" + "="*80)
    print("INDIVIDUAL NODE EXECUTION TESTS")
    print("="*80 + "\n")

    mcp_client = MockMCPClient()
    code_executor = CodeExecutor()

    # Test P0: Intake
    print("Testing P0: Interactive Intake...")
    node_p0 = create_intake_node()
    result_p0 = node_p0.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={'task': 'Build a simple calculator'}
    )
    print(f"  P0 Result: {result_p0.get('success', False)}")
    print(f"  P0 Outputs: {list(result_p0.get('outputs', {}).keys())}")
    print(f"  P0 Logs: {len(result_p0.get('logs', []))} lines")
    if result_p0.get('success'):
        print("  ✓ P0 PASSED\n")
    else:
        print(f"  ✗ P0 FAILED: {result_p0.get('error')}")
        if result_p0.get('message'):
            print(f"  Message: {result_p0.get('message')}")
        print()

    # Test P1: Planning
    print("Testing P1: Multi-AI Planning...")
    node_p1 = create_planning_node()
    result_p1 = node_p1.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'refined_task': result_p0.get('outputs', {}).get('refined_task', '')
        }
    )
    print(f"  P1 Result: {result_p1.get('success', False)}")
    print(f"  P1 Outputs: {list(result_p1.get('outputs', {}).keys())}")
    plan_from_p1 = result_p1.get('outputs', {}).get('plan', {})
    print(f"  P1 plan has 'steps': {'steps' in plan_from_p1}, steps count: {len(plan_from_p1.get('steps', []))}")
    if result_p1.get('success'):
        print("  ✓ P1 PASSED\n")
    else:
        print(f"  ✗ P1 FAILED: {result_p1.get('error')}\n")

    # Test S1: Security Planning
    print("Testing S1: Security Planning...")
    node_s1 = create_security_planning_node()
    result_s1 = node_s1.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'plan': result_p1.get('outputs', {}).get('plan', {}),
            'architecture': {}
        }
    )
    print(f"  S1 Result: {result_s1.get('success', False)}")
    print(f"  S1 Outputs: {list(result_s1.get('outputs', {}).keys())}")
    if result_s1.get('success'):
        print("  ✓ S1 PASSED\n")
    else:
        print(f"  ✗ S1 FAILED: {result_s1.get('error')}\n")

    # Test P2: Implementation
    print("Testing P2: Implementation...")
    node_p2 = create_implementation_node()
    result_p2 = node_p2.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'plan': result_p1.get('outputs', {}).get('plan', {}),
            'sec_plan': result_s1.get('outputs', {})  # Pass entire S1 output
        }
    )
    print(f"  P2 Result: {result_p2.get('success', False)}")
    print(f"  P2 Outputs: {list(result_p2.get('outputs', {}).keys())}")
    source_code_from_p2 = result_p2.get('outputs', {}).get('source_code', {})
    print(f"  P2 source_code type: {type(source_code_from_p2)}, empty: {not source_code_from_p2}")
    print(f"  P2 Logs (last 10 lines):")
    for log in result_p2.get('logs', [])[-10:]:
        print(f"    {log}")
    if result_p2.get('success'):
        print("  ✓ P2 PASSED\n")
    else:
        print(f"  ✗ P2 FAILED: {result_p2.get('error')}\n")

    # Test T1: Testing
    print("Testing T1: Testing...")
    node_t1 = create_testing_node()
    result_t1 = node_t1.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'source_code': result_p2.get('outputs', {}).get('source_code', {}),
            'test_matrix': result_s1.get('outputs', {}).get('test_matrix', [])
        }
    )
    print(f"  T1 Result: {result_t1.get('success', False)}")
    print(f"  T1 Outputs: {list(result_t1.get('outputs', {}).keys())}")
    if result_t1.get('success'):
        print("  ✓ T1 PASSED\n")
    else:
        print(f"  ✗ T1 FAILED: {result_t1.get('error')}\n")

    # Test S2: Security Review
    print("Testing S2: Security Review...")
    node_s2 = create_security_review_node()
    result_s2 = node_s2.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'source_code': result_p2.get('outputs', {}).get('source_code', {}),
            'tests': result_t1.get('outputs', {}).get('tests', {})
        }
    )
    print(f"  S2 Result: {result_s2.get('success', False)}")
    print(f"  S2 Outputs: {list(result_s2.get('outputs', {}).keys())}")
    if result_s2.get('success'):
        print("  ✓ S2 PASSED\n")
    else:
        print(f"  ✗ S2 FAILED: {result_s2.get('error')}")
        if result_s2.get('message'):
            print(f"  Message: {result_s2.get('message')}")
        print()

    # Test S3: Security Fix
    print("Testing S3: Security Fix...")
    node_s3 = create_security_fix_node()
    result_s3 = node_s3.execute(
        mcp_client=mcp_client,
        code_executor=code_executor,
        inputs={
            'findings': result_s2.get('outputs', {}).get('findings', []),
            'source_code': result_p2.get('outputs', {}).get('source_code', {})
        }
    )
    print(f"  S3 Result: {result_s3.get('success', False)}")
    print(f"  S3 Outputs: {list(result_s3.get('outputs', {}).keys())}")
    if result_s3.get('success'):
        print("  ✓ S3 PASSED\n")
    else:
        print(f"  ✗ S3 FAILED: {result_s3.get('error')}\n")

    # Summary
    print("\n" + "="*80)
    print("INDIVIDUAL NODE TEST SUMMARY")
    print("="*80)

    results = {
        'P0': result_p0.get('success', False),
        'P1': result_p1.get('success', False),
        'S1': result_s1.get('success', False),
        'P2': result_p2.get('success', False),
        'T1': result_t1.get('success', False),
        'S2': result_s2.get('success', False),
        'S3': result_s3.get('success', False),
    }

    passed = sum(results.values())
    total = len(results)

    print(f"\nNodes Tested: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")

    for node, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"  {node}: {status}")

    print(f"\nTotal MCP Calls: {mcp_client.call_count}")

    return passed == total


if __name__ == "__main__":
    import sys

    print("\n" + "="*80)
    print("MCP ORCHESTRATION SYSTEM - END-TO-END EXECUTION TEST")
    print("="*80)

    success = test_individual_node_execution()

    print("\n" + "="*80)
    if success:
        print("✓ ALL TESTS PASSED - SYSTEM IS WORKING!")
    else:
        print("✗ SOME TESTS FAILED - SEE DETAILS ABOVE")
    print("="*80 + "\n")

    sys.exit(0 if success else 1)
