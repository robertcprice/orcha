"""Utility module providing robust numeric addition."""

from __future__ import annotations

from decimal import Decimal, localcontext, getcontext
from fractions import Fraction
from numbers import Real
from typing import Any, Union, overload

try:  # NumPy is optional; we only need it to recognise scalar values.
    import numpy as _np
except ModuleNotFoundError:  # pragma: no cover - exercised when numpy absent.
    _np = None

# Public type hint kept narrow for common use, but implementation accepts more.
Numeric = Union[int, float, Decimal, Fraction]


def _is_numeric_scalar(value: Any) -> bool:
    """Return True when ``value`` behaves like a real scalar number."""
    if isinstance(value, bool):
        return False

    if isinstance(value, Real):
        return True

    if isinstance(value, (Decimal, Fraction)):
        return True

    if _np is not None and isinstance(value, _np.generic):
        dtype = value.dtype
        return _np.issubdtype(dtype, _np.number) and not _np.issubdtype(dtype, _np.bool_)

    return False


def _to_decimal(value: Any) -> Decimal:
    """Convert supported numeric value to ``Decimal``."""
    if isinstance(value, Decimal):
        return value
    if isinstance(value, Fraction):
        with localcontext() as ctx:
            ctx.prec = max(getcontext().prec, 50)
            return (Decimal(value.numerator) / Decimal(value.denominator)).normalize()
    if isinstance(value, float):
        return Decimal.from_float(value)
    if isinstance(value, Real):
        return Decimal(str(value))
    if _np is not None and isinstance(value, _np.generic):
        return _to_decimal(value.item())
    raise TypeError(f"Cannot convert {type(value).__name__} to Decimal")


def _to_fraction(value: Any) -> Fraction:
    """Convert supported numeric value to ``Fraction``."""
    if isinstance(value, Fraction):
        return value
    if isinstance(value, Decimal):
        return Fraction(value)
    if isinstance(value, float):
        return Fraction.from_float(value).limit_denominator()
    if isinstance(value, Real):
        return Fraction(value)
    if _np is not None and isinstance(value, _np.generic):
        return _to_fraction(value.item())
    raise TypeError(f"Cannot convert {type(value).__name__} to Fraction")


def _coerced_add(a: Any, b: Any) -> Any:
    """Attempt addition after promoting operands to a compatible type."""
    if isinstance(a, Decimal):
        return _to_decimal(a) + _to_decimal(b)
    if isinstance(a, Fraction):
        return _to_fraction(a) + _to_fraction(b)
    if isinstance(b, Decimal):
        return _to_decimal(a) + _to_decimal(b)
    if isinstance(b, Fraction):
        return _to_fraction(a) + _to_fraction(b)
    # Final fallback – both operands are real scalars that failed direct addition.
    return float(a) + float(b)


@overload
def add_numbers(a: Numeric, b: Numeric) -> Numeric:
    ...


@overload
def add_numbers(a: Any, b: Any) -> Any:
    ...


def add_numbers(a: Any, b: Any) -> Any:
    """Return the arithmetic sum of two numeric scalars.

    The function accepts Python numeric primitives (``int``/``float``),
    ``decimal.Decimal`` instances, ``fractions.Fraction`` instances, and—when
    NumPy is available—NumPy scalar values. Booleans are deliberately rejected
    despite being ``int`` subclasses; passing any unsupported type raises a
    ``TypeError``.

    Args:
        a: First numeric operand.
        b: Second numeric operand.

    Returns:
        The result of ``a + b`` using the operands' native numeric type.

    Raises:
        TypeError: If either argument is not a supported numeric scalar.
    """
    if not _is_numeric_scalar(a):
        raise TypeError(
            f"First argument must be a real numeric scalar, got {type(a).__name__}."
        )
    if not _is_numeric_scalar(b):
        raise TypeError(
            f"Second argument must be a real numeric scalar, got {type(b).__name__}."
        )

    try:
        return a + b
    except TypeError:
        return _coerced_add(a, b)
