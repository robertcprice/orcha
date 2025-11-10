"""
Confidence gates and rubrics for quality control.
Ensures each node meets quality thresholds before proceeding.

Aligned with Anthropic's MCP Best Practices:
- High confidence thresholds (≥95%)
- Token efficiency metrics
- Multi-dimensional quality assessment
- Automated gate evaluation
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class GateStatus(Enum):
    """Gate evaluation status"""
    PASS = 'pass'
    FAIL = 'fail'
    WARNING = 'warning'


@dataclass
class SubMetric:
    """Individual quality sub-metric"""
    name: str
    description: str
    weight: float  # Contribution to total score (0-100)
    criteria: List[str]  # Evaluation criteria
    score: float = 0.0  # Actual score (0-100)
    evidence: List[str] = field(default_factory=list)  # Evidence for score


@dataclass
class GateResult:
    """Gate evaluation result"""
    gate_name: str
    status: GateStatus
    confidence_score: float  # 0-100
    threshold: float  # Required threshold
    passed: bool
    sub_metrics: List[SubMetric]
    feedback: List[str] = field(default_factory=list)
    token_efficiency: Optional[float] = None  # MCP token efficiency %

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        return {
            'gate_name': self.gate_name,
            'status': self.status.value,
            'confidence_score': self.confidence_score,
            'threshold': self.threshold,
            'passed': self.passed,
            'sub_metrics': [
                {
                    'name': sm.name,
                    'score': sm.score,
                    'weight': sm.weight,
                    'evidence': sm.evidence
                }
                for sm in self.sub_metrics
            ],
            'feedback': self.feedback,
            'token_efficiency': self.token_efficiency
        }


class ConfidenceGate:
    """
    Base confidence gate for quality control.

    Each gate evaluates multiple sub-metrics and computes
    a weighted confidence score.
    """

    def __init__(
        self,
        name: str,
        threshold: float = 95.0,
        sub_metrics: Optional[List[SubMetric]] = None
    ):
        """
        Initialize confidence gate.

        Args:
            name: Gate identifier
            threshold: Minimum confidence score to pass (0-100)
            sub_metrics: List of sub-metrics to evaluate
        """
        self.name = name
        self.threshold = threshold
        self.sub_metrics = sub_metrics or []

    def evaluate(
        self,
        artifacts: Dict[str, Any],
        node_result: Dict[str, Any]
    ) -> GateResult:
        """
        Evaluate gate against artifacts and node result.

        Args:
            artifacts: Available artifacts
            node_result: Node execution result

        Returns:
            GateResult with pass/fail and feedback
        """
        # Evaluate each sub-metric
        for sub_metric in self.sub_metrics:
            self._evaluate_sub_metric(sub_metric, artifacts, node_result)

        # Calculate weighted confidence score
        total_weight = sum(sm.weight for sm in self.sub_metrics)
        confidence_score = sum(
            sm.score * (sm.weight / total_weight)
            for sm in self.sub_metrics
        )

        # Determine status
        passed = confidence_score >= self.threshold
        status = GateStatus.PASS if passed else GateStatus.FAIL

        # Generate feedback
        feedback = self._generate_feedback(confidence_score, passed)

        # Calculate token efficiency (if applicable)
        token_efficiency = self._calculate_token_efficiency(node_result)

        return GateResult(
            gate_name=self.name,
            status=status,
            confidence_score=confidence_score,
            threshold=self.threshold,
            passed=passed,
            sub_metrics=self.sub_metrics,
            feedback=feedback,
            token_efficiency=token_efficiency
        )

    def _evaluate_sub_metric(
        self,
        sub_metric: SubMetric,
        artifacts: Dict[str, Any],
        node_result: Dict[str, Any]
    ):
        """
        Evaluate individual sub-metric.
        Override in subclasses for specific logic.
        """
        # Default: Extract score from node result if available
        if sub_metric.name.lower() in node_result:
            sub_metric.score = node_result[sub_metric.name.lower()]
        else:
            sub_metric.score = 0.0

    def _generate_feedback(self, score: float, passed: bool) -> List[str]:
        """Generate feedback messages"""
        feedback = []

        if not passed:
            feedback.append(
                f"Gate failed: Score {score:.1f}% is below threshold {self.threshold}%"
            )

            # Identify failing sub-metrics
            for sm in self.sub_metrics:
                if sm.score < 80:  # Flag sub-metrics below 80%
                    feedback.append(
                        f"  ✗ {sm.name}: {sm.score:.1f}% (weight: {sm.weight}%)"
                    )
        else:
            feedback.append(
                f"Gate passed: Score {score:.1f}% exceeds threshold {self.threshold}%"
            )

        return feedback

    def _calculate_token_efficiency(self, node_result: Dict[str, Any]) -> Optional[float]:
        """Calculate MCP token efficiency"""
        tokens_loaded = node_result.get('tokens_loaded', 0)
        tokens_needed = node_result.get('tokens_needed', 0)

        if tokens_needed > 0:
            # Efficiency = how few tokens loaded vs needed (inverted)
            efficiency = max(0, 100 - (tokens_loaded / tokens_needed * 100))
            return efficiency

        return None


# Specific gate implementations

class IntakeConfidenceGate(ConfidenceGate):
    """Gate for P0: Interactive Intake"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='INTAKE_CONF',
            threshold=threshold,
            sub_metrics=[
                SubMetric(
                    name='Clarity',
                    description='Task description is clear and unambiguous',
                    weight=25.0,
                    criteria=[
                        'All technical terms defined',
                        'Success criteria explicit',
                        'No conflicting requirements'
                    ]
                ),
                SubMetric(
                    name='Completeness',
                    description='All necessary information collected',
                    weight=25.0,
                    criteria=[
                        'Stack/technology specified',
                        'Constraints documented',
                        'Dependencies identified'
                    ]
                ),
                SubMetric(
                    name='Alignment',
                    description='Task aligns with capabilities and constraints',
                    weight=25.0,
                    criteria=[
                        'Scope is achievable',
                        'Timeline is realistic',
                        'Resources are available'
                    ]
                ),
                SubMetric(
                    name='Ambiguity Resolution',
                    description='All ambiguities resolved',
                    weight=25.0,
                    criteria=[
                        'All clarifying questions answered',
                        'Edge cases discussed',
                        'Assumptions documented'
                    ]
                )
            ]
        )


class PlanningGate(ConfidenceGate):
    """Gate for P1: Multi-AI Planning"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='PLAN',
            threshold=threshold,
            sub_metrics=[
                SubMetric(
                    name='Traceability',
                    description='Requirements traceable to implementation',
                    weight=20.0,
                    criteria=[
                        'All requirements mapped to steps',
                        'Each step traceable to requirement',
                        'No orphaned steps'
                    ]
                ),
                SubMetric(
                    name='Testability',
                    description='Plan includes testable acceptance criteria',
                    weight=20.0,
                    criteria=[
                        'Test strategy per component',
                        'Acceptance criteria measurable',
                        'Edge cases identified'
                    ]
                ),
                SubMetric(
                    name='Risk Coverage',
                    description='Risks identified and mitigated',
                    weight=20.0,
                    criteria=[
                        'STRIDE analysis complete',
                        'Mitigations defined',
                        'Contingencies planned'
                    ]
                ),
                SubMetric(
                    name='Cost Estimation',
                    description='Accurate cost and time estimates',
                    weight=20.0,
                    criteria=[
                        'Token budgets per phase',
                        'Time estimates per node',
                        'Cost projections validated'
                    ]
                ),
                SubMetric(
                    name='Token Efficiency',
                    description='MCP tool loading is efficient',
                    weight=20.0,
                    criteria=[
                        'Tool defs loaded < 5000 tokens',
                        'Progressive disclosure used',
                        'MCP calls optimized'
                    ]
                )
            ]
        )


class SecurityPlanGate(ConfidenceGate):
    """Gate for S1: Security Planning"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='SEC_PLAN',
            threshold=threshold,
            sub_metrics=[
                SubMetric(
                    name='Asset Coverage',
                    description='All assets identified and categorized',
                    weight=20.0,
                    criteria=[
                        'Data assets documented',
                        'System boundaries defined',
                        'Trust zones mapped'
                    ]
                ),
                SubMetric(
                    name='Threat Enumeration',
                    description='STRIDE threats enumerated per component',
                    weight=20.0,
                    criteria=[
                        'All STRIDE categories covered',
                        'Threats prioritized by severity',
                        'Attack vectors documented'
                    ]
                ),
                SubMetric(
                    name='Mitigation Planning',
                    description='Mitigations defined for each threat',
                    weight=20.0,
                    criteria=[
                        'Mitigation per high-severity threat',
                        'Defense-in-depth applied',
                        'Residual risks accepted explicitly'
                    ]
                ),
                SubMetric(
                    name='Test Coverage',
                    description='Security test matrix is comprehensive',
                    weight=20.0,
                    criteria=[
                        'Abuse cases defined',
                        'Boundary tests planned',
                        'Exploit scenarios documented'
                    ]
                ),
                SubMetric(
                    name='Research Depth',
                    description='Thorough security research conducted',
                    weight=20.0,
                    criteria=[
                        'CVE database queried',
                        'Best practices consulted',
                        'Similar system threats reviewed'
                    ]
                )
            ]
        )


class ImplementationGate(ConfidenceGate):
    """Gate for P2: Implementation"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='IMPL',
            threshold=threshold,
            sub_metrics=[
                SubMetric(
                    name='Build Success',
                    description='Code builds without errors',
                    weight=25.0,
                    criteria=[
                        'Compilation successful',
                        'No syntax errors',
                        'Dependencies resolved'
                    ]
                ),
                SubMetric(
                    name='Code Quality',
                    description='Code meets quality standards',
                    weight=25.0,
                    criteria=[
                        'Linting passes',
                        'No code smells',
                        'Consistent style'
                    ]
                ),
                SubMetric(
                    name='Test Coverage',
                    description='Adequate test coverage',
                    weight=25.0,
                    criteria=[
                        'Unit tests ≥80% coverage',
                        'Critical paths tested',
                        'Edge cases covered'
                    ]
                ),
                SubMetric(
                    name='Completeness',
                    description='All requirements implemented',
                    weight=25.0,
                    criteria=[
                        'No TODOs in production code',
                        'All features functional',
                        'No placeholder implementations'
                    ]
                )
            ]
        )


class SecurityReviewGate(ConfidenceGate):
    """Gate for S2: Security Review"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='SEC_REVIEW',
            threshold=threshold,
            sub_metrics=[
                SubMetric(
                    name='No Critical Vulns',
                    description='Zero critical/high severity findings',
                    weight=30.0,
                    criteria=[
                        'No critical findings',
                        'No high severity findings',
                        'All medium findings triaged'
                    ]
                ),
                SubMetric(
                    name='Secret Detection',
                    description='No hardcoded secrets',
                    weight=25.0,
                    criteria=[
                        'No API keys in code',
                        'No passwords in config',
                        'Secrets use vault/env'
                    ]
                ),
                SubMetric(
                    name='SBOM Present',
                    description='Software Bill of Materials generated',
                    weight=20.0,
                    criteria=[
                        'All dependencies listed',
                        'Versions specified',
                        'Licenses documented'
                    ]
                ),
                SubMetric(
                    name='Code Analysis',
                    description='Static analysis complete',
                    weight=25.0,
                    criteria=[
                        'SAST scan complete',
                        'Dependency scan complete',
                        'False positives reviewed'
                    ]
                )
            ]
        )


class SecurityPlanningGate(ConfidenceGate):
    """Gate for S1: Security Planning"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='S1_SEC_PLAN',
            threshold=threshold,
            sub_metrics=[]
        )


class TestingGate(ConfidenceGate):
    """Gate for T1: Testing"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='T1_TESTING',
            threshold=threshold,
            sub_metrics=[]
        )


class SecurityFixGate(ConfidenceGate):
    """Gate for S3: Security Fix"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='S3_SEC_FIX',
            threshold=threshold,
            sub_metrics=[]
        )


class RefinementGate(ConfidenceGate):
    """Gate for P4: Refinement"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='P4_REFINE',
            threshold=threshold,
            sub_metrics=[]
        )


class DocumentationGate(ConfidenceGate):
    """Gate for D1: Documentation"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='D1_DOCS',
            threshold=threshold,
            sub_metrics=[]
        )


class FinalOpsGate(ConfidenceGate):
    """Gate for O1: Final Ops"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='O1_FINAL',
            threshold=threshold,
            sub_metrics=[]
        )


class PersistenceGate(ConfidenceGate):
    """Gate for P6: Persistence"""

    def __init__(self, threshold: float = 95.0):
        super().__init__(
            name='P6_PERSIST',
            threshold=threshold,
            sub_metrics=[]
        )


# Gate registry
GATE_REGISTRY: Dict[str, type] = {
    'INTAKE_CONF': IntakeConfidenceGate,
    'PLAN': PlanningGate,
    'SEC_PLAN': SecurityPlanGate,
    'IMPL': ImplementationGate,
    'SEC_REVIEW': SecurityReviewGate,
    'TESTING': TestingGate,
    'SEC_FIX': SecurityFixGate,
    'REFINEMENT': RefinementGate,
    'DOCUMENTATION': DocumentationGate,
    'FINAL_OPS': FinalOpsGate,
    'PERSISTENCE': PersistenceGate,
}


def create_gate(gate_name: str) -> ConfidenceGate:
    """
    Factory function to create gate by name.

    Args:
        gate_name: Gate identifier

    Returns:
        Confidence gate instance

    Raises:
        ValueError: If gate name not found
    """
    if gate_name not in GATE_REGISTRY:
        raise ValueError(
            f"Unknown gate: {gate_name}. Available: {list(GATE_REGISTRY.keys())}"
        )

    gate_class = GATE_REGISTRY[gate_name]
    return gate_class()


def evaluate_node_with_gate(
    gate_name: str,
    artifacts: Dict[str, Any],
    node_result: Dict[str, Any]
) -> GateResult:
    """
    Evaluate node result against its gate.

    Args:
        gate_name: Gate to evaluate against
        artifacts: Available artifacts
        node_result: Node execution result

    Returns:
        Gate evaluation result
    """
    gate = create_gate(gate_name)
    return gate.evaluate(artifacts, node_result)
