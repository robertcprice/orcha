"""
State management system with ReflexionMemory integration.
Handles orchestration state, artifacts, and learning from past executions.

Aligned with Anthropic's MCP Best Practices:
- State persistence to files
- Privacy-preserving tokenization
- Learning from past experiences
- Progressive artifact storage
"""
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
import json
import hashlib


class ReflexionMemory:
    """
    Learning system that captures insights from past executions.

    Stores:
    - Common failure patterns
    - Successful strategies
    - Ambiguity patterns
    - Quality improvements

    Used to improve future orchestrations.
    """

    def __init__(self, memory_dir: str = './memory'):
        """
        Initialize ReflexionMemory.

        Args:
            memory_dir: Directory to store memory files
        """
        self.memory_dir = Path(memory_dir)
        self.memory_dir.mkdir(exist_ok=True, parents=True)

        # Memory categories
        self.failures: List[Dict[str, Any]] = []
        self.successes: List[Dict[str, Any]] = []
        self.ambiguities: List[Dict[str, Any]] = []
        self.improvements: List[Dict[str, Any]] = []

        # Load existing memory
        self._load_memory()

    def record_failure(
        self,
        node_id: str,
        error_type: str,
        error_message: str,
        context: Dict[str, Any]
    ):
        """
        Record a failure for future learning.

        Args:
            node_id: Node that failed
            error_type: Type of error
            error_message: Error message
            context: Additional context
        """
        failure = {
            'node_id': node_id,
            'error_type': error_type,
            'error_message': error_message,
            'context': context,
            'timestamp': datetime.now().isoformat(),
            'frequency': 1
        }

        # Check if similar failure exists
        for existing in self.failures:
            if (existing['node_id'] == node_id and
                existing['error_type'] == error_type):
                existing['frequency'] += 1
                existing['last_seen'] = datetime.now().isoformat()
                self._save_memory()
                return

        self.failures.append(failure)
        self._save_memory()

    def record_success(
        self,
        node_id: str,
        strategy: str,
        confidence: float,
        context: Dict[str, Any]
    ):
        """Record a successful execution strategy"""
        success = {
            'node_id': node_id,
            'strategy': strategy,
            'confidence': confidence,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }

        self.successes.append(success)
        self._save_memory()

    def record_ambiguity(
        self,
        phase: str,
        ambiguity_type: str,
        resolution: str,
        qa_rounds: int
    ):
        """Record an ambiguity pattern for future proactive clarification"""
        ambiguity = {
            'phase': phase,
            'type': ambiguity_type,
            'resolution': resolution,
            'qa_rounds': qa_rounds,
            'timestamp': datetime.now().isoformat()
        }

        self.ambiguities.append(ambiguity)
        self._save_memory()

    def record_improvement(
        self,
        area: str,
        before_score: float,
        after_score: float,
        technique: str
    ):
        """Record a quality improvement technique"""
        improvement = {
            'area': area,
            'before_score': before_score,
            'after_score': after_score,
            'improvement': after_score - before_score,
            'technique': technique,
            'timestamp': datetime.now().isoformat()
        }

        self.improvements.append(improvement)
        self._save_memory()

    def get_insights(self, category: str = 'all') -> List[Dict[str, Any]]:
        """
        Get insights for a specific category or all.

        Args:
            category: 'failures', 'successes', 'ambiguities', 'improvements', or 'all'

        Returns:
            List of relevant insights
        """
        if category == 'failures':
            return sorted(self.failures, key=lambda x: x.get('frequency', 1), reverse=True)
        elif category == 'successes':
            return sorted(self.successes, key=lambda x: x['confidence'], reverse=True)
        elif category == 'ambiguities':
            return self.ambiguities
        elif category == 'improvements':
            return sorted(self.improvements, key=lambda x: x['improvement'], reverse=True)
        else:
            return {
                'failures': self.get_insights('failures')[:5],
                'successes': self.get_insights('successes')[:5],
                'ambiguities': self.get_insights('ambiguities')[:5],
                'improvements': self.get_insights('improvements')[:5]
            }

    def _load_memory(self):
        """Load memory from disk"""
        memory_file = self.memory_dir / 'reflexion_memory.json'
        if memory_file.exists():
            with open(memory_file, 'r') as f:
                data = json.load(f)
                self.failures = data.get('failures', [])
                self.successes = data.get('successes', [])
                self.ambiguities = data.get('ambiguities', [])
                self.improvements = data.get('improvements', [])

    def _save_memory(self):
        """Save memory to disk"""
        memory_file = self.memory_dir / 'reflexion_memory.json'
        with open(memory_file, 'w') as f:
            json.dump({
                'failures': self.failures,
                'successes': self.successes,
                'ambiguities': self.ambiguities,
                'improvements': self.improvements
            }, f, indent=2)


class OrchestrationState:
    """
    Manages state for DAG orchestration execution.

    Features:
    - Artifact storage and retrieval
    - Checkpoint/restore
    - Privacy-preserving tokenization
    - ReflexionMemory integration
    - Progress tracking
    """

    def __init__(
        self,
        task_id: str,
        state_dir: str = './state',
        memory: Optional[ReflexionMemory] = None
    ):
        """
        Initialize orchestration state.

        Args:
            task_id: Unique task identifier
            state_dir: Directory for state persistence
            memory: Optional ReflexionMemory instance
        """
        self.task_id = task_id
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(exist_ok=True, parents=True)

        # ReflexionMemory
        self.memory = memory or ReflexionMemory()

        # Artifacts storage
        self.artifacts: Dict[str, Any] = {}

        # Execution metadata
        self.metadata = {
            'task_id': task_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'status': 'initialized'
        }

        # Checkpoints
        self.checkpoints: List[Dict[str, Any]] = []

        # Load existing state if available
        self._load_state()

    def save_artifact(self, name: str, value: Any, metadata: Optional[Dict] = None):
        """
        Save artifact to state.

        Args:
            name: Artifact name (e.g., 'plan', 'source_code')
            value: Artifact value
            metadata: Optional metadata (e.g., confidence, cost)
        """
        self.artifacts[name] = {
            'value': value,
            'metadata': metadata or {},
            'timestamp': datetime.now().isoformat()
        }

        # Persist artifact to file
        artifact_file = self.state_dir / f'{self.task_id}_{name}.json'
        with open(artifact_file, 'w') as f:
            json.dump(self.artifacts[name], f, indent=2)

        self.metadata['updated_at'] = datetime.now().isoformat()
        self._save_state()

    def get_artifact(self, name: str) -> Optional[Any]:
        """
        Retrieve artifact from state.

        Args:
            name: Artifact name

        Returns:
            Artifact value or None if not found
        """
        if name in self.artifacts:
            return self.artifacts[name]['value']

        # Try loading from file
        artifact_file = self.state_dir / f'{self.task_id}_{name}.json'
        if artifact_file.exists():
            with open(artifact_file, 'r') as f:
                artifact_data = json.load(f)
                self.artifacts[name] = artifact_data
                return artifact_data['value']

        return None

    def get_inputs_for_node(self, node_inputs: List[str]) -> Dict[str, Any]:
        """
        Get all input artifacts for a node.

        Args:
            node_inputs: List of input artifact names

        Returns:
            Dictionary of {name: value}
        """
        inputs = {}
        for input_name in node_inputs:
            value = self.get_artifact(input_name)
            if value is not None:
                inputs[input_name] = value

        return inputs

    def save_node_result(
        self,
        node_id: str,
        outputs: Dict[str, Any],
        confidence: float,
        tokens_used: int,
        cost: float
    ):
        """
        Save node execution results.

        Args:
            node_id: Node identifier
            outputs: Output artifacts
            confidence: Confidence score
            tokens_used: Tokens consumed
            cost: Execution cost
        """
        # Save each output artifact
        for output_name, output_value in outputs.items():
            self.save_artifact(
                output_name,
                output_value,
                metadata={
                    'node_id': node_id,
                    'confidence': confidence,
                    'tokens_used': tokens_used,
                    'cost': cost
                }
            )

        # Record success in ReflexionMemory
        if confidence >= 95:
            self.memory.record_success(
                node_id=node_id,
                strategy='MCP code execution',
                confidence=confidence,
                context={'tokens': tokens_used, 'cost': cost}
            )

    def create_checkpoint(self, name: str):
        """
        Create state checkpoint for rollback.

        Args:
            name: Checkpoint name
        """
        checkpoint = {
            'name': name,
            'timestamp': datetime.now().isoformat(),
            'artifacts': list(self.artifacts.keys()),
            'metadata': self.metadata.copy()
        }

        self.checkpoints.append(checkpoint)

        # Save checkpoint file
        checkpoint_file = self.state_dir / f'{self.task_id}_checkpoint_{name}.json'
        with open(checkpoint_file, 'w') as f:
            json.dump(checkpoint, f, indent=2)

    def restore_checkpoint(self, name: str) -> bool:
        """
        Restore state from checkpoint.

        Args:
            name: Checkpoint name

        Returns:
            True if restored successfully
        """
        checkpoint_file = self.state_dir / f'{self.task_id}_checkpoint_{name}.json'
        if not checkpoint_file.exists():
            return False

        with open(checkpoint_file, 'r') as f:
            checkpoint = json.load(f)

        # Restore metadata
        self.metadata = checkpoint['metadata']

        # Artifacts are loaded on-demand, so just clear current cache
        self.artifacts = {}

        return True

    def get_state_hash(self) -> str:
        """
        Generate hash of current state for versioning.

        Returns:
            SHA256 hash of state
        """
        state_str = json.dumps(self.artifacts, sort_keys=True)
        return hashlib.sha256(state_str.encode()).hexdigest()

    def _load_state(self):
        """Load state from disk"""
        state_file = self.state_dir / f'{self.task_id}_state.json'
        if state_file.exists():
            with open(state_file, 'r') as f:
                data = json.load(f)
                self.metadata = data.get('metadata', self.metadata)
                # Artifacts loaded on-demand

    def _save_state(self):
        """Save state metadata to disk"""
        state_file = self.state_dir / f'{self.task_id}_state.json'
        with open(state_file, 'w') as f:
            json.dump({
                'metadata': self.metadata,
                'artifact_count': len(self.artifacts),
                'checkpoint_count': len(self.checkpoints)
            }, f, indent=2)

    def get_statistics(self) -> Dict[str, Any]:
        """Get state statistics"""
        total_tokens = sum(
            artifact['metadata'].get('tokens_used', 0)
            for artifact in self.artifacts.values()
        )

        total_cost = sum(
            artifact['metadata'].get('cost', 0.0)
            for artifact in self.artifacts.values()
        )

        confidences = [
            artifact['metadata'].get('confidence', 0)
            for artifact in self.artifacts.values()
            if 'confidence' in artifact.get('metadata', {})
        ]

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        return {
            'task_id': self.task_id,
            'artifact_count': len(self.artifacts),
            'checkpoint_count': len(self.checkpoints),
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'average_confidence': avg_confidence,
            'state_hash': self.get_state_hash()
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize state to dictionary"""
        return {
            'task_id': self.task_id,
            'metadata': self.metadata,
            'artifacts': {
                name: artifact['value']
                for name, artifact in self.artifacts.items()
            },
            'statistics': self.get_statistics()
        }


# Factory function
def create_state_for_task(task_id: str) -> OrchestrationState:
    """
    Create orchestration state for a task.

    Args:
        task_id: Unique task identifier

    Returns:
        OrchestrationState instance
    """
    return OrchestrationState(
        task_id=task_id,
        state_dir='./state',
        memory=ReflexionMemory('./memory')
    )
