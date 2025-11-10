"""
Directed Acyclic Graph (DAG) orchestration engine.
Manages node execution, dependencies, and state transitions.

Aligned with Anthropic's MCP Best Practices:
- Code-first orchestration
- Parallel execution where possible
- Progressive state management
- Efficient context usage
"""
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
import json
import networkx as nx


class NodeStatus(Enum):
    """Node execution status"""
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    SKIPPED = 'skipped'


class NodeType(Enum):
    """Node type categories"""
    PLANNING = 'planning'
    IMPLEMENTATION = 'implementation'
    TESTING = 'testing'
    SECURITY = 'security'
    DOCUMENTATION = 'documentation'
    OPERATIONS = 'operations'
    PERSISTENCE = 'persistence'


@dataclass
class Node:
    """
    DAG node specification.

    Represents a single unit of work in the orchestration pipeline.
    """
    id: str
    name: str
    type: NodeType
    agent: str  # MCP server to use (e.g., 'claude', 'chatgpt')
    tool: str  # Tool within server (e.g., 'orchestrate', 'create_plan')

    # Input/Output specifications
    inputs: List[str] = field(default_factory=list)  # Input artifact names
    outputs: List[str] = field(default_factory=list)  # Output artifact names

    # Dependencies (other node IDs that must complete first)
    dependencies: List[str] = field(default_factory=list)

    # Confidence gate
    gate: Optional[str] = None  # Gate name (e.g., 'PLAN', 'IMPL')
    gate_threshold: float = 95.0  # Min confidence score to pass

    # Execution config
    max_retries: int = 3
    timeout: int = 300  # seconds
    budget: Dict[str, int] = field(default_factory=dict)  # tokens, time

    # Code generation params
    code_template: Optional[str] = None  # MCP code generation template
    imports: List[str] = field(default_factory=list)  # Required imports

    # Runtime state
    status: NodeStatus = NodeStatus.PENDING
    attempts: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    # Metrics
    tokens_used: int = 0
    cost: float = 0.0
    confidence_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Serialize node to dictionary"""
        data = asdict(self)
        data['status'] = self.status.value
        data['type'] = self.type.value
        if self.start_time:
            data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Node':
        """Deserialize node from dictionary"""
        data['status'] = NodeStatus(data['status'])
        data['type'] = NodeType(data['type'])
        if 'start_time' in data and data['start_time']:
            data['start_time'] = datetime.fromisoformat(data['start_time'])
        if 'end_time' in data and data['end_time']:
            data['end_time'] = datetime.fromisoformat(data['end_time'])
        return cls(**data)


class DAG:
    """
    Directed Acyclic Graph for orchestration.

    Features:
    - Automatic topological sorting
    - Parallel batch detection
    - Cycle detection
    - State persistence
    - Progress tracking
    - Retry management
    """

    def __init__(self, name: str, description: str = ''):
        """
        Initialize DAG.

        Args:
            name: DAG identifier
            description: Human-readable description
        """
        self.name = name
        self.description = description
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, Node] = {}
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def add_node(self, node: Node):
        """
        Add node to DAG.

        Args:
            node: Node to add

        Raises:
            ValueError: If node ID already exists
        """
        if node.id in self.nodes:
            raise ValueError(f"Node '{node.id}' already exists in DAG")

        self.nodes[node.id] = node
        self.graph.add_node(node.id, **node.to_dict())
        self.updated_at = datetime.now()

    def add_edge(self, from_node: str, to_node: str):
        """
        Add dependency edge between nodes.

        Args:
            from_node: Source node ID
            to_node: Target node ID

        Raises:
            ValueError: If nodes don't exist or edge creates cycle
        """
        if from_node not in self.nodes:
            raise ValueError(f"Source node '{from_node}' does not exist")
        if to_node not in self.nodes:
            raise ValueError(f"Target node '{to_node}' does not exist")

        # Add edge
        self.graph.add_edge(from_node, to_node)

        # Check for cycles
        if not nx.is_directed_acyclic_graph(self.graph):
            # Remove edge and raise error
            self.graph.remove_edge(from_node, to_node)
            raise ValueError(
                f"Adding edge {from_node} → {to_node} would create a cycle"
            )

        # Update node dependencies
        if from_node not in self.nodes[to_node].dependencies:
            self.nodes[to_node].dependencies.append(from_node)

        self.updated_at = datetime.now()

    def get_execution_order(self) -> List[List[str]]:
        """
        Get topologically sorted execution order with parallelization.

        Returns list of batches, where each batch can execute in parallel.

        Returns:
            List of batches, each batch is a list of node IDs

        Example:
            [
                ['P0'],           # Batch 0: Intake (start)
                ['P1', 'S1'],     # Batch 1: Planning and Security Plan (parallel)
                ['P2'],           # Batch 2: Implementation
                ['T1', 'S2'],     # Batch 3: Testing and Security Review (parallel)
                ...
            ]
        """
        # Get topological order
        try:
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXError as e:
            raise ValueError(f"DAG contains cycle: {e}")

        # Group into parallel batches
        batches = []
        processed = set()

        while processed != set(topo_order):
            batch = []

            for node_id in topo_order:
                if node_id in processed:
                    continue

                # Check if all dependencies have been processed
                deps = list(self.graph.predecessors(node_id))
                if all(dep in processed for dep in deps):
                    batch.append(node_id)

            if not batch:
                # Safety check - should never happen with valid DAG
                remaining = set(topo_order) - processed
                raise RuntimeError(
                    f"Unable to schedule remaining nodes: {remaining}. "
                    f"This indicates a bug in the DAG implementation."
                )

            batches.append(batch)
            processed.update(batch)

        return batches

    def get_critical_path(self) -> Tuple[List[str], int]:
        """
        Calculate critical path (longest path through DAG).

        Returns:
            Tuple of (node_ids, total_time_estimate)
        """
        # Use node budgets for time estimates
        for node_id in self.nodes:
            node = self.nodes[node_id]
            self.graph.nodes[node_id]['weight'] = node.budget.get('time', node.timeout)

        # Find longest path
        try:
            critical_path = nx.dag_longest_path(self.graph, weight='weight')
            total_time = nx.dag_longest_path_length(self.graph, weight='weight')
            return critical_path, int(total_time)
        except nx.NetworkXError:
            return [], 0

    def get_node(self, node_id: str) -> Node:
        """Get node by ID"""
        if node_id not in self.nodes:
            raise ValueError(f"Node '{node_id}' not found")
        return self.nodes[node_id]

    def update_node_status(
        self,
        node_id: str,
        status: NodeStatus,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """
        Update node execution status.

        Args:
            node_id: Node to update
            status: New status
            result: Execution result (if completed)
            error: Error message (if failed)
        """
        node = self.get_node(node_id)
        node.status = status

        if status == NodeStatus.RUNNING:
            node.start_time = datetime.now()

        elif status in [NodeStatus.COMPLETED, NodeStatus.FAILED, NodeStatus.SKIPPED]:
            node.end_time = datetime.now()

            if result:
                node.result = result
                node.tokens_used = result.get('tokens_used', 0)
                node.cost = result.get('cost', 0.0)
                node.confidence_score = result.get('confidence', 0.0)

            if error:
                node.error = error

        self.updated_at = datetime.now()

    def get_ready_nodes(self) -> List[str]:
        """
        Get nodes that are ready to execute.

        A node is ready if:
        - Status is PENDING
        - All dependencies are COMPLETED
        """
        ready = []

        for node_id, node in self.nodes.items():
            if node.status != NodeStatus.PENDING:
                continue

            # Check if all dependencies completed
            deps_completed = all(
                self.nodes[dep].status == NodeStatus.COMPLETED
                for dep in node.dependencies
            )

            if deps_completed:
                ready.append(node_id)

        return ready

    def get_statistics(self) -> Dict[str, Any]:
        """Get DAG execution statistics"""
        total_nodes = len(self.nodes)
        status_counts = {status: 0 for status in NodeStatus}

        for node in self.nodes.values():
            status_counts[node.status] += 1

        total_tokens = sum(node.tokens_used for node in self.nodes.values())
        total_cost = sum(node.cost for node in self.nodes.values())

        completed_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.COMPLETED]
        avg_confidence = (
            sum(n.confidence_score for n in completed_nodes) / len(completed_nodes)
            if completed_nodes else 0
        )

        return {
            'total_nodes': total_nodes,
            'completed': status_counts[NodeStatus.COMPLETED],
            'failed': status_counts[NodeStatus.FAILED],
            'running': status_counts[NodeStatus.RUNNING],
            'pending': status_counts[NodeStatus.PENDING],
            'skipped': status_counts[NodeStatus.SKIPPED],
            'progress_percent': (
                status_counts[NodeStatus.COMPLETED] / total_nodes * 100
                if total_nodes > 0 else 0
            ),
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'average_confidence': avg_confidence
        }

    def visualize(self, format: str = 'text') -> str:
        """
        Generate DAG visualization.

        Args:
            format: 'text' or 'dot' (Graphviz)

        Returns:
            Visualization string
        """
        if format == 'text':
            return self._visualize_text()
        elif format == 'dot':
            return self._visualize_dot()
        else:
            raise ValueError(f"Unknown format: {format}")

    def _visualize_text(self) -> str:
        """Generate ASCII text visualization"""
        lines = [
            f"DAG: {self.name}",
            "=" * 60,
            f"Description: {self.description}",
            f"Nodes: {len(self.nodes)}",
            f"Created: {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
            ""
        ]

        # Statistics
        stats = self.get_statistics()
        lines.append("Statistics:")
        lines.append(f"  Progress: {stats['progress_percent']:.1f}%")
        lines.append(f"  Completed: {stats['completed']}/{stats['total_nodes']}")
        lines.append(f"  Failed: {stats['failed']}")
        lines.append(f"  Total Tokens: {stats['total_tokens']:,}")
        lines.append(f"  Total Cost: ${stats['total_cost']:.4f}")
        lines.append(f"  Avg Confidence: {stats['average_confidence']:.1f}%")
        lines.append("")

        # Execution order
        lines.append("Execution Order (by batch):")
        lines.append("-" * 60)

        batches = self.get_execution_order()
        for batch_num, batch in enumerate(batches):
            lines.append(f"\nBatch {batch_num + 1} (parallel execution):")
            for node_id in batch:
                node = self.nodes[node_id]
                status_symbol = {
                    NodeStatus.PENDING: '○',
                    NodeStatus.RUNNING: '◐',
                    NodeStatus.COMPLETED: '●',
                    NodeStatus.FAILED: '✗',
                    NodeStatus.SKIPPED: '⊘'
                }[node.status]

                confidence_str = (
                    f" [{node.confidence_score:.0f}%]"
                    if node.confidence_score > 0 else ""
                )

                lines.append(
                    f"  {status_symbol} {node.name} "
                    f"({node.type.value}){confidence_str}"
                )

        # Critical path
        critical_path, total_time = self.get_critical_path()
        if critical_path:
            lines.append("")
            lines.append(f"Critical Path (est. {total_time}s):")
            path_str = ' → '.join(self.nodes[nid].name for nid in critical_path)
            lines.append(f"  {path_str}")

        return '\n'.join(lines)

    def _visualize_dot(self) -> str:
        """Generate Graphviz DOT format"""
        lines = ['digraph DAG {']
        lines.append('  rankdir=TB;')
        lines.append('  node [shape=box, style=rounded];')
        lines.append('')

        # Add nodes
        for node_id, node in self.nodes.items():
            color = {
                NodeStatus.PENDING: 'lightgray',
                NodeStatus.RUNNING: 'yellow',
                NodeStatus.COMPLETED: 'lightgreen',
                NodeStatus.FAILED: 'red',
                NodeStatus.SKIPPED: 'orange'
            }[node.status]

            label = f"{node.name}\\n{node.type.value}"
            if node.confidence_score > 0:
                label += f"\\n{node.confidence_score:.0f}%"

            lines.append(
                f'  "{node_id}" [label="{label}", fillcolor={color}, style=filled];'
            )

        lines.append('')

        # Add edges
        for edge in self.graph.edges():
            lines.append(f'  "{edge[0]}" -> "{edge[1]}";')

        lines.append('}')
        return '\n'.join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize DAG to dictionary"""
        return {
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'nodes': {
                node_id: node.to_dict()
                for node_id, node in self.nodes.items()
            },
            'edges': list(self.graph.edges()),
            'statistics': self.get_statistics()
        }

    def to_json(self, filepath: str):
        """Save DAG to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DAG':
        """Deserialize DAG from dictionary"""
        dag = cls(data['name'], data.get('description', ''))

        if 'created_at' in data:
            dag.created_at = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data:
            dag.updated_at = datetime.fromisoformat(data['updated_at'])

        # Add nodes
        for node_id, node_data in data['nodes'].items():
            node = Node.from_dict(node_data)
            dag.nodes[node_id] = node
            dag.graph.add_node(node_id, **node.to_dict())

        # Add edges
        for from_id, to_id in data['edges']:
            dag.graph.add_edge(from_id, to_id)

        return dag

    @classmethod
    def from_json(cls, filepath: str) -> 'DAG':
        """Load DAG from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


# Factory function for standard orchestration DAG
def create_standard_dag(task_name: str) -> DAG:
    """
    Create standard 11-node orchestration DAG.

    Nodes:
    - P0: Intake
    - P1: Planning
    - S1: Security Planning
    - P2: Implementation
    - T1: Testing
    - S2: Security Review
    - S3: Security Fix
    - P4: Refinement
    - D1: Documentation
    - O1: Final Ops
    - P6: Persistence
    """
    dag = DAG(
        name=f"task_{task_name}",
        description="Standard MCP-based orchestration workflow"
    )

    # P0: Intake
    dag.add_node(Node(
        id='P0',
        name='Interactive Intake & Budgeting',
        type=NodeType.PLANNING,
        agent='chatgpt',
        tool='interactive_intake',
        outputs=['refined_task', 'budgets', 'transcript'],
        gate='INTAKE_CONF',
        gate_threshold=95.0,
        budget={'tokens': 15000, 'time': 300}
    ))

    # P1: Planning
    dag.add_node(Node(
        id='P1',
        name='Multi-AI Planning Committee',
        type=NodeType.PLANNING,
        agent='claude',
        tool='orchestrate_planning',
        inputs=['refined_task'],
        outputs=['plan', 'risks', 'checks'],
        dependencies=['P0'],
        gate='PLAN',
        gate_threshold=95.0,
        budget={'tokens': 40000, 'time': 600}
    ))

    # S1: Security Planning
    dag.add_node(Node(
        id='S1',
        name='Security Planning & Threat Modeling',
        type=NodeType.SECURITY,
        agent='claude',
        tool='security_planning',
        inputs=['plan'],
        outputs=['sec_plan', 'test_matrix', 'policy_reqs'],
        dependencies=['P1'],
        gate='SEC_PLAN',
        gate_threshold=95.0,
        budget={'tokens': 30000, 'time': 600}
    ))

    # P2: Implementation
    dag.add_node(Node(
        id='P2',
        name='Code Implementation',
        type=NodeType.IMPLEMENTATION,
        agent='codex',
        tool='generate_code',
        inputs=['plan', 'sec_plan'],
        outputs=['source_code', 'build_logs'],
        dependencies=['P1', 'S1'],
        gate='IMPL',
        gate_threshold=95.0,
        budget={'tokens': 60000, 'time': 900}
    ))

    # T1: Testing
    dag.add_node(Node(
        id='T1',
        name='Test Generation & Execution',
        type=NodeType.TESTING,
        agent='claude',
        tool='generate_tests',
        inputs=['source_code', 'test_matrix'],
        outputs=['tests', 'coverage_report'],
        dependencies=['P2'],
        gate='TESTS',
        gate_threshold=95.0,
        budget={'tokens': 30000, 'time': 600}
    ))

    # S2: Security Review
    dag.add_node(Node(
        id='S2',
        name='Security Review & Scanning',
        type=NodeType.SECURITY,
        agent='claude',
        tool='security_review',
        inputs=['source_code', 'tests'],
        outputs=['findings', 'sbom', 'review'],
        dependencies=['T1'],
        gate='SEC_REVIEW',
        gate_threshold=95.0,
        budget={'tokens': 25000, 'time': 300}
    ))

    # S3: Security Fix
    dag.add_node(Node(
        id='S3',
        name='Vulnerability Debugging & Mitigation',
        type=NodeType.SECURITY,
        agent='codex',
        tool='fix_vulnerabilities',
        inputs=['findings', 'source_code'],
        outputs=['patches', 'fix_notes', 'delta_tests'],
        dependencies=['S2'],
        gate='SEC_FIX',
        gate_threshold=95.0,
        budget={'tokens': 30000, 'time': 600},
        max_retries=3
    ))

    # P4: Refinement
    dag.add_node(Node(
        id='P4',
        name='Iterative Refinement',
        type=NodeType.IMPLEMENTATION,
        agent='codex',
        tool='refine_code',
        inputs=['source_code', 'tests', 'patches'],
        outputs=['refined_code', 'updated_tests'],
        dependencies=['S3'],
        gate='REFINE',
        gate_threshold=95.0,
        budget={'tokens': 25000, 'time': 600},
        max_retries=5
    ))

    # D1: Documentation
    dag.add_node(Node(
        id='D1',
        name='Documentation Generation',
        type=NodeType.DOCUMENTATION,
        agent='gemini',
        tool='generate_docs',
        inputs=['refined_code', 'tests', 'sec_plan'],
        outputs=['readme', 'api_docs', 'runbook', 'security_notes'],
        dependencies=['P4'],
        gate='DOCS',
        gate_threshold=95.0,
        budget={'tokens': 20000, 'time': 300}
    ))

    # O1: Final Ops
    dag.add_node(Node(
        id='O1',
        name='Final Operations & System Test',
        type=NodeType.OPERATIONS,
        agent='claude',
        tool='final_ops_test',
        inputs=['refined_code', 'tests', 'readme'],
        outputs=['e2e_logs', 'resilience_report'],
        dependencies=['D1'],
        gate='FINAL_OPS',
        gate_threshold=95.0,
        budget={'tokens': 15000, 'time': 600}
    ))

    # P6: Persistence
    dag.add_node(Node(
        id='P6',
        name='Persist & Publish',
        type=NodeType.PERSISTENCE,
        agent='system',
        tool='persist_results',
        inputs=['*'],  # All artifacts
        outputs=['vault_entry', 'redis_event', 'cost_ledger'],
        dependencies=['O1'],
        budget={'tokens': 5000, 'time': 60}
    ))

    return dag
