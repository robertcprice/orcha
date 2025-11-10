"""
MCP-Based Unified Orchestrator
Executes 11-node DAG workflow with parallel batch processing.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
from pathlib import Path
import logging

# Core MCP infrastructure
from src.orchestrator.engine.mcp_client import AgentMCPClient
from src.orchestrator.engine.code_exec import CodeExecutor
from src.orchestrator.engine.dag import DAG, create_standard_dag
from src.orchestrator.engine.state import OrchestrationState
from src.orchestrator.engine.gates import (
    IntakeConfidenceGate,
    PlanningGate,
    SecurityPlanningGate,
    ImplementationGate,
    TestingGate,
    SecurityReviewGate,
    SecurityFixGate,
    RefinementGate,
    DocumentationGate,
    FinalOpsGate,
    PersistenceGate
)
from src.orchestrator.engine.telemetry import TelemetryCollector

# DAG Nodes
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


logger = logging.getLogger(__name__)


class MCPOrchestrator:
    """
    MCP-based orchestrator with 11-node DAG execution.

    Architecture:
    - Code execution-centric (no direct tool calls)
    - Progressive tool loading
    - Parallel batch execution
    - Confidence gates with ≥95% threshold
    - ReflexionMemory for learning
    - Cost tracking and budget enforcement

    Workflow:
    P0 (Intake) → P1 (Planning) → S1 (Security Plan) → P2 (Implementation)
    → T1 (Testing) + S2 (Security Review) → S3 (Security Fix)
    → P4 (Refinement) → D1 (Documentation) → O1 (Final Ops) → P6 (Persistence)
    """

    def __init__(
        self,
        mcp_servers: List[str] = None,
        confidence_threshold: float = 95.0,
        budget_limit: Optional[float] = None,
        workspace_dir: Optional[Path] = None
    ):
        """
        Initialize MCP orchestrator.

        Args:
            mcp_servers: List of MCP server names to connect to
            confidence_threshold: Minimum confidence score for gates (default 95%)
            budget_limit: Optional budget limit in USD
            workspace_dir: Optional workspace directory for artifacts
        """
        self.confidence_threshold = confidence_threshold
        self.budget_limit = budget_limit
        self.workspace_dir = workspace_dir or Path("./workspace")
        self.workspace_dir.mkdir(exist_ok=True)

        # Initialize MCP infrastructure
        self.mcp_client = AgentMCPClient(servers=mcp_servers or [])
        self.code_executor = CodeExecutor(workspace=str(self.workspace_dir))
        self.telemetry = TelemetryCollector(task_id="orchestrator_init")

        # Initialize nodes
        self.nodes = {
            'P0': create_intake_node(confidence_threshold),
            'P1': create_planning_node(confidence_threshold),
            'S1': create_security_planning_node(confidence_threshold),
            'P2': create_implementation_node(confidence_threshold),
            'T1': create_testing_node(confidence_threshold),
            'S2': create_security_review_node(confidence_threshold),
            'S3': create_security_fix_node(confidence_threshold),
            'P4': create_refinement_node(confidence_threshold),
            'D1': create_documentation_node(confidence_threshold),
            'O1': create_final_ops_node(confidence_threshold),
            'P6': create_persistence_node(confidence_threshold)
        }

        # Initialize gates
        self.gates = {
            'P0': IntakeConfidenceGate(confidence_threshold),
            'P1': PlanningGate(confidence_threshold),
            'S1': SecurityPlanningGate(confidence_threshold),
            'P2': ImplementationGate(confidence_threshold),
            'T1': TestingGate(confidence_threshold),
            'S2': SecurityReviewGate(confidence_threshold),
            'S3': SecurityFixGate(confidence_threshold),
            'P4': RefinementGate(confidence_threshold),
            'D1': DocumentationGate(confidence_threshold),
            'O1': FinalOpsGate(confidence_threshold),
            'P6': PersistenceGate(confidence_threshold)
        }

        logger.info(f"MCPOrchestrator initialized with {len(self.nodes)} nodes")

    def execute_task(
        self,
        task_name: str,
        user_task: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute complete 11-node DAG workflow.

        Args:
            task_name: Human-readable task name
            user_task: User's task description
            metadata: Optional metadata

        Returns:
            Dict with execution results, artifacts, cost, and telemetry
        """
        task_id = f"mcp_{int(datetime.now().timestamp() * 1000)}"
        logger.info(f"Starting task {task_id}: {task_name}")

        # Initialize state
        state = OrchestrationState(
            task_id=task_id,
            task_name=task_name,
            task_description=user_task
        )

        # Create DAG
        dag = create_standard_dag(task_name)
        execution_order = dag.get_execution_order()

        logger.info(f"Execution order: {execution_order}")

        # Execute batches
        for batch_idx, batch in enumerate(execution_order):
            logger.info(f"Executing batch {batch_idx + 1}/{len(execution_order)}: {batch}")

            batch_results = {}
            for node_id in batch:
                try:
                    result = self._execute_node(node_id, state)
                    batch_results[node_id] = result

                    # Check gate
                    gate_passed = self._check_gate(node_id, result)
                    if not gate_passed:
                        logger.error(f"Gate failed for node {node_id}")
                        return self._handle_gate_failure(task_id, node_id, state, result)

                    # Update state
                    self._update_state(state, node_id, result)

                    # Check budget
                    if self.budget_limit and self.telemetry.get_total_cost() > self.budget_limit:
                        logger.error(f"Budget limit exceeded: ${self.telemetry.get_total_cost():.4f}")
                        return self._handle_budget_exceeded(task_id, state)

                except Exception as e:
                    logger.error(f"Node {node_id} failed: {e}")
                    state.reflexion.record_failure(
                        node_id=node_id,
                        error_type=type(e).__name__,
                        error_message=str(e),
                        context={'batch': batch_idx}
                    )
                    return self._handle_node_failure(task_id, node_id, state, e)

        # Generate final result
        final_result = self._generate_final_result(task_id, state)
        logger.info(f"Task {task_id} completed successfully")

        return final_result

    def _execute_node(self, node_id: str, state: OrchestrationState) -> Dict[str, Any]:
        """Execute a single node."""
        logger.info(f"Executing node {node_id}")

        node = self.nodes[node_id]
        inputs = self._prepare_node_inputs(node_id, state)

        # Track start time
        start_time = datetime.now()

        # Execute node
        result = node.execute(
            mcp_client=self.mcp_client,
            code_executor=self.code_executor,
            inputs=inputs
        )

        # Track execution time
        execution_time = (datetime.now() - start_time).total_seconds() * 1000

        # Record telemetry
        if result.get('success'):
            self.telemetry.record_mcp_call(
                server='mcp_orchestrator',
                tool=node_id,
                node_id=node_id,
                tokens_used=result.get('metadata', {}).get('tokens_used', 0),
                cost=result.get('metadata', {}).get('cost', 0),
                latency_ms=execution_time
            )

        logger.info(f"Node {node_id} completed in {execution_time:.0f}ms")
        return result

    def _prepare_node_inputs(self, node_id: str, state: OrchestrationState) -> Dict[str, Any]:
        """Prepare inputs for a node based on DAG dependencies."""
        inputs = {
            'task_id': state.task_id,
            'task_name': state.task_name,
            'task_description': state.task_description
        }

        # P0: Intake (no dependencies)
        if node_id == 'P0':
            inputs['user_task'] = state.task_description

        # P1: Planning (depends on P0)
        elif node_id == 'P1':
            inputs['requirements'] = state.artifacts.get('requirements', {})
            inputs['clarifications'] = state.artifacts.get('clarifications', {})

        # S1: Security Planning (depends on P1)
        elif node_id == 'S1':
            inputs['plan'] = state.artifacts.get('plan', {})
            inputs['architecture'] = state.artifacts.get('architecture', {})

        # P2: Implementation (depends on P1, S1)
        elif node_id == 'P2':
            inputs['plan'] = state.artifacts.get('plan', {})
            inputs['sec_plan'] = state.artifacts.get('sec_plan', {})

        # T1: Testing (depends on P2)
        elif node_id == 'T1':
            inputs['source_code'] = state.artifacts.get('source_code', {})

        # S2: Security Review (depends on P2)
        elif node_id == 'S2':
            inputs['source_code'] = state.artifacts.get('source_code', {})
            inputs['tests'] = state.artifacts.get('tests', {})

        # S3: Security Fix (depends on S2)
        elif node_id == 'S3':
            inputs['findings'] = state.artifacts.get('findings', [])
            inputs['source_code'] = state.artifacts.get('source_code', {})

        # P4: Refinement (depends on T1, S3)
        elif node_id == 'P4':
            inputs['source_code'] = state.artifacts.get('source_code', {})
            inputs['patches'] = state.artifacts.get('patches', {})
            inputs['failing_tests'] = state.artifacts.get('failing_tests', [])
            inputs['findings'] = state.artifacts.get('findings', [])

        # D1: Documentation (depends on P4)
        elif node_id == 'D1':
            inputs['refined_code'] = state.artifacts.get('refined_code', {})
            inputs['tests'] = state.artifacts.get('tests', {})
            inputs['sec_plan'] = state.artifacts.get('sec_plan', {})

        # O1: Final Ops (depends on D1)
        elif node_id == 'O1':
            inputs['refined_code'] = state.artifacts.get('refined_code', {})
            inputs['tests'] = state.artifacts.get('tests', {})
            inputs['readme'] = state.artifacts.get('readme', '')

        # P6: Persistence (depends on O1)
        elif node_id == 'P6':
            inputs['refined_code'] = state.artifacts.get('refined_code', {})
            inputs['tests'] = state.artifacts.get('tests', {})
            inputs['readme'] = state.artifacts.get('readme', '')
            inputs['api_docs'] = state.artifacts.get('api_docs', '')
            inputs['runbook'] = state.artifacts.get('runbook', '')
            inputs['security_notes'] = state.artifacts.get('security_notes', '')
            inputs['cost_ledger'] = self.telemetry.export_cost_ledger_data()
            inputs['reflexion_memory'] = state.reflexion.export()
            inputs['all_logs'] = state.get_all_logs()
            inputs['metadata'] = state.metadata

        return inputs

    def _check_gate(self, node_id: str, result: Dict[str, Any]) -> bool:
        """Check confidence gate for a node."""
        if not result.get('success'):
            return False

        gate = self.gates.get(node_id)
        if not gate:
            return True

        confidence = result.get('metadata', {}).get('confidence', 0)
        passed = gate.check(confidence, result.get('metadata', {}))

        logger.info(f"Gate {node_id}: confidence={confidence:.1f}%, passed={passed}")
        return passed

    def _update_state(self, state: OrchestrationState, node_id: str, result: Dict[str, Any]):
        """Update orchestration state with node outputs."""
        outputs = result.get('outputs', {})
        metadata = result.get('metadata', {})
        logs = result.get('logs', [])

        # Save outputs as artifacts
        for key, value in outputs.items():
            state.save_artifact(key, value, {'node_id': node_id})

        # Update metadata
        state.metadata[f'{node_id}_confidence'] = metadata.get('confidence', 0)
        state.metadata[f'{node_id}_completed'] = True

        # Record success in ReflexionMemory
        state.reflexion.record_success(
            node_id=node_id,
            strategy=f"{node_id} execution",
            confidence=metadata.get('confidence', 0),
            context={'outputs': list(outputs.keys())}
        )

        # Add logs
        for log in logs:
            state.add_log(f"[{node_id}] {log}")

    def _handle_gate_failure(
        self,
        task_id: str,
        node_id: str,
        state: OrchestrationState,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle gate failure."""
        confidence = result.get('metadata', {}).get('confidence', 0)

        state.reflexion.record_failure(
            node_id=node_id,
            error_type='GateFailure',
            error_message=f'Confidence {confidence:.1f}% < {self.confidence_threshold}%',
            context={'result': result}
        )

        return {
            'success': False,
            'task_id': task_id,
            'error': 'gate_failure',
            'failed_node': node_id,
            'confidence': confidence,
            'threshold': self.confidence_threshold,
            'message': f'Node {node_id} failed confidence gate: {confidence:.1f}% < {self.confidence_threshold}%',
            'telemetry': self.telemetry.get_summary(),
            'state': state.export()
        }

    def _handle_budget_exceeded(self, task_id: str, state: OrchestrationState) -> Dict[str, Any]:
        """Handle budget exceeded."""
        return {
            'success': False,
            'task_id': task_id,
            'error': 'budget_exceeded',
            'total_cost': self.telemetry.get_total_cost(),
            'budget_limit': self.budget_limit,
            'message': f'Budget exceeded: ${self.telemetry.get_total_cost():.4f} > ${self.budget_limit:.4f}',
            'telemetry': self.telemetry.get_summary(),
            'state': state.export()
        }

    def _handle_node_failure(
        self,
        task_id: str,
        node_id: str,
        state: OrchestrationState,
        error: Exception
    ) -> Dict[str, Any]:
        """Handle node execution failure."""
        return {
            'success': False,
            'task_id': task_id,
            'error': 'node_failure',
            'failed_node': node_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'message': f'Node {node_id} failed: {error}',
            'telemetry': self.telemetry.get_summary(),
            'state': state.export()
        }

    def _generate_final_result(self, task_id: str, state: OrchestrationState) -> Dict[str, Any]:
        """Generate final execution result."""
        return {
            'success': True,
            'task_id': task_id,
            'task_name': state.task_name,
            'completed_at': datetime.now().isoformat(),
            'artifacts': {
                'vault_path': state.artifacts.get('vault_path'),
                'code_files': state.artifacts.get('refined_code', {}),
                'test_files': state.artifacts.get('tests', {}),
                'documentation': {
                    'readme': state.artifacts.get('readme', ''),
                    'api_docs': state.artifacts.get('api_docs', ''),
                    'runbook': state.artifacts.get('runbook', ''),
                    'security_notes': state.artifacts.get('security_notes', '')
                },
                'cost_ledger': state.artifacts.get('cost_ledger', ''),
                'knowledge': state.artifacts.get('knowledge', ''),
                'summary': state.artifacts.get('summary', '')
            },
            'telemetry': {
                'total_cost': self.telemetry.get_total_cost(),
                'total_tokens': self.telemetry.get_total_tokens(),
                'total_calls': self.telemetry.get_total_calls(),
                'breakdown': self.telemetry.get_breakdown()
            },
            'quality': {
                'final_confidence': state.metadata.get('P6_confidence', 0),
                'all_gates_passed': all(
                    state.metadata.get(f'{node}_completed', False)
                    for node in self.nodes.keys()
                ),
                'security_passed': state.metadata.get('S2_confidence', 0) >= self.confidence_threshold
            },
            'learning': state.reflexion.export()
        }


def create_orchestrator(
    mcp_servers: List[str] = None,
    confidence_threshold: float = 95.0,
    budget_limit: Optional[float] = None
) -> MCPOrchestrator:
    """
    Create MCP orchestrator instance.

    Args:
        mcp_servers: List of MCP server names
        confidence_threshold: Minimum confidence (default 95%)
        budget_limit: Optional budget in USD

    Returns:
        MCPOrchestrator instance
    """
    return MCPOrchestrator(
        mcp_servers=mcp_servers,
        confidence_threshold=confidence_threshold,
        budget_limit=budget_limit
    )
