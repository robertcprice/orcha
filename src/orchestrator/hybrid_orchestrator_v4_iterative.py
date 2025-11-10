"""
Compatibility Shim for HybridOrchestratorV4

This module provides backward compatibility for code importing from the old location.

⚠️ DEPRECATED: This import path is deprecated.
   Please update your imports to:
   from orchestrator.v4 import HybridOrchestratorV4

The orchestrator has been refactored into a modular architecture with iterative cycles:
- Stage 0: Multi-AI Planning (design iteration cycle)
- Stage 1: Claude Analysis
- Stage 2: ChatGPT Planning
- Stage 3: Iterative Execution (code-test-debug cycle)
- Stage 3.5: Code Review (review-fix cycle)
- Stage 4: Final Summary

For legacy code preserved as-is, see: hybrid_orchestrator_v4_iterative_LEGACY.py
"""

import warnings

# Show deprecation warning
warnings.warn(
    "Importing from 'orchestrator.hybrid_orchestrator_v4_iterative' is deprecated. "
    "Please update to 'from orchestrator.v4 import HybridOrchestratorV4'",
    DeprecationWarning,
    stacklevel=2
)

# Import from new location
from orchestrator.v4 import (
    HybridOrchestratorV4,
    IterativeExecutionResult,
    DialogueStage,
    InformationRequest,
    InformationResponse
)

__all__ = [
    "HybridOrchestratorV4",
    "IterativeExecutionResult",
    "DialogueStage",
    "InformationRequest",
    "InformationResponse"
]
