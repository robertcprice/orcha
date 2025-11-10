"""Unit tests for the calculator module."""

import math
import unittest
from decimal import Decimal
from fractions import Fraction

from calculator import calculate


class CalculateTests(unittest.TestCase):
    """Exercise the calculator across supported operations and edge cases."""

    def test_addition(self) -> None:
        self.assertEqual(calculate(2, 3, "add"), 5)
        self.assertAlmostEqual(calculate(-1.5, 0.5, "add"), -1.0)

    def test_subtraction(self) -> None:
        self.assertEqual(calculate(5, 3, "subtract"), 2)
        self.assertAlmostEqual(calculate(-2.5, -2.5, "subtract"), 0.0)

    def test_multiplication(self) -> None:
        self.assertEqual(calculate(4, 3, "multiply"), 12)
        self.assertAlmostEqual(calculate(-2, 0.5, "multiply"), -1.0)

    def test_division(self) -> None:
        self.assertEqual(calculate(12, 3, "divide"), 4)
        self.assertTrue(math.isclose(calculate(7, 2, "divide"), 3.5))

    def test_division_by_zero_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            calculate(5, 0, "divide")

    def test_non_numeric_operands_raise_type_error(self) -> None:
        with self.assertRaises(TypeError):
            calculate("a", 1, "add")  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            calculate(1, "b", "add")  # type: ignore[arg-type]

    def test_boolean_operands_raise_type_error(self) -> None:
        with self.assertRaises(TypeError):
            calculate(True, 1, "add")  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            calculate(1, False, "add")  # type: ignore[arg-type]

    def test_operation_is_case_insensitive(self) -> None:
        self.assertEqual(calculate(2, 2, "AdD"), 4)
        self.assertEqual(calculate(5, 3, "SuBtRaCt"), 2)

    def test_operation_tolerates_whitespace(self) -> None:
        self.assertEqual(calculate(10, 4, "  multiply  "), 40)

    def test_non_string_operation_raises_type_error(self) -> None:
        with self.assertRaises(TypeError):
            calculate(1, 2, None)  # type: ignore[arg-type]

    def test_empty_operation_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            calculate(1, 2, "   ")

    def test_unsupported_operation_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            calculate(1, 1, "mod")

    def test_decimal_operands_supported(self) -> None:
        first = Decimal("1.1")
        second = Decimal("2.2")
        self.assertEqual(calculate(first, second, "add"), first + second)
        self.assertEqual(calculate(first, second, "multiply"), first * second)

    def test_fraction_operands_supported(self) -> None:
        first = Fraction(1, 3)
        second = Fraction(1, 6)
        self.assertEqual(calculate(first, second, "add"), first + second)
        self.assertEqual(calculate(first, second, "divide"), first / second)


if __name__ == "__main__":
    unittest.main()
