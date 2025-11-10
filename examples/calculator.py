"""Utility module providing a typed arithmetic calculator function."""

from decimal import Decimal
from fractions import Fraction
from numbers import Real
from typing import Callable, Dict

try:  # NumPy is optional; used only for scalar type detection.
    import numpy as _np
except ModuleNotFoundError:  # pragma: no cover - exercised when numpy absent.
    _np = None


def _add(a: float, b: float) -> float:
    """Return the sum of two numeric operands."""
    return a + b


def _subtract(a: float, b: float) -> float:
    """Return the difference of two numeric operands."""
    return a - b


def _multiply(a: float, b: float) -> float:
    """Return the product of two numeric operands."""
    return a * b


def _divide(a: float, b: float) -> float:
    """Return the quotient of two numeric operands, guarding against zero division."""
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


# Map supported operation names to their implementations for quick lookup.
_OPERATIONS: Dict[str, Callable[[float, float], float]] = {
    "add": _add,
    "subtract": _subtract,
    "multiply": _multiply,
    "divide": _divide,
}


def calculate(a: float, b: float, operation: str) -> float:
    """Perform an arithmetic operation on two numbers.

    Args:
        a: The first numeric operand.
        b: The second numeric operand.
        operation: The operation to perform. Supported values are "add", "subtract",
            "multiply", and "divide".

    Returns:
        The result of applying the requested operation to the operands.

    Raises:
        ValueError: If the operation is unsupported or if division by zero is attempted.
        TypeError: If non-numeric operands are provided.
    """
    def _is_valid_operand(value: object) -> bool:
        """Return True when the operand behaves like a real scalar value."""
        if isinstance(value, bool):
            return False

        if isinstance(value, Real):
            return True

        if isinstance(value, (Decimal, Fraction)):
            return True

        if _np is not None and isinstance(value, _np.generic):
            return _np.issubdtype(value.dtype, _np.number) and not _np.issubdtype(
                value.dtype, _np.bool_
            )

        return False

    if not _is_valid_operand(a) or not _is_valid_operand(b):
        raise TypeError("Operands must be real numeric types (excluding booleans).")

    if not isinstance(operation, str):
        raise TypeError("Operation specifier must be a string.")

    normalized_operation = operation.strip().lower()
    if not normalized_operation:
        raise ValueError("Operation cannot be empty or whitespace only.")
    if normalized_operation not in _OPERATIONS:
        raise ValueError(f"Unsupported operation: {operation}")

    # Dispatch to the correct arithmetic function through the operation map.
    return _OPERATIONS[normalized_operation](a, b)
