"""
Additional gate classes needed for all 11 nodes
Append to gates.py
"""

# Add these classes before the GATE_REGISTRY in gates.py

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


# Update GATE_REGISTRY:
# GATE_REGISTRY: Dict[str, type] = {
#     'INTAKE_CONF': IntakeConfidenceGate,
#     'PLAN': PlanningGate,
#     'SEC_PLAN': SecurityPlanGate,
#     'IMPL': ImplementationGate,
#     'SEC_REVIEW': SecurityReviewGate,
#     'TESTING': TestingGate,
#     'SEC_FIX': SecurityFixGate,
#     'REFINEMENT': RefinementGate,
#     'DOCUMENTATION': DocumentationGate,
#     'FINAL_OPS': FinalOpsGate,
#     'PERSISTENCE': PersistenceGate,
# }
