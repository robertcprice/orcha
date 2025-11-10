"""Unit tests for the add_numbers module."""

import unittest
from decimal import Decimal
from fractions import Fraction

from add_numbers import add_numbers


class AddNumbersTests(unittest.TestCase):
    """Test add_numbers function across various input types and edge
    cases."""

    def test_add_positive_integers(self) -> None:
        """Test addition of two positive integers."""
        self.assertEqual(add_numbers(2, 3), 5)
        self.assertEqual(add_numbers(100, 200), 300)

    def test_add_negative_integers(self) -> None:
        """Test addition with negative integers."""
        self.assertEqual(add_numbers(-5, -3), -8)
        self.assertEqual(add_numbers(-10, 5), -5)

    def test_add_floats(self) -> None:
        """Test addition of floating-point numbers."""
        self.assertAlmostEqual(add_numbers(2.5, 3.5), 6.0)
        self.assertAlmostEqual(add_numbers(-1.5, 0.5), -1.0)

    def test_add_mixed_int_and_float(self) -> None:
        """Test addition of mixed integer and float."""
        self.assertAlmostEqual(add_numbers(5, 2.5), 7.5)
        self.assertAlmostEqual(add_numbers(3.75, 1), 4.75)

    def test_add_with_zero(self) -> None:
        """Test addition with zero."""
        self.assertEqual(add_numbers(0, 5), 5)
        self.assertEqual(add_numbers(10, 0), 10)
        self.assertEqual(add_numbers(0, 0), 0)

    def test_add_large_numbers(self) -> None:
        """Test addition of very large numbers."""
        self.assertEqual(add_numbers(1_000_000, 2_000_000), 3_000_000)
        self.assertAlmostEqual(
            add_numbers(1.7976931348623157e308, 1.0), 1.7976931348623157e308
        )

    def test_string_raises_type_error(self) -> None:
        """Test that string inputs raise TypeError."""
        with self.assertRaises(TypeError):
            add_numbers("1", 2)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            add_numbers(1, "2")  # type: ignore[arg-type]

    def test_none_raises_type_error(self) -> None:
        """Test that None inputs raise TypeError."""
        with self.assertRaises(TypeError):
            add_numbers(None, 5)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            add_numbers(10, None)  # type: ignore[arg-type]

    def test_list_raises_type_error(self) -> None:
        """Test that list inputs raise TypeError."""
        with self.assertRaises(TypeError):
            add_numbers([1, 2], 3)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            add_numbers(5, [1, 2])  # type: ignore[arg-type]

    def test_dict_raises_type_error(self) -> None:
        """Test that dict inputs raise TypeError."""
        with self.assertRaises(TypeError):
            add_numbers({"a": 1}, 2)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            add_numbers(3, {"b": 2})  # type: ignore[arg-type]

    def test_boolean_raises_type_error(self) -> None:
        """Test that boolean inputs raise TypeError."""
        with self.assertRaises(TypeError):
            add_numbers(True, 5)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            add_numbers(10, False)  # type: ignore[arg-type]

    def test_add_decimal_numbers(self) -> None:
        """Decimals maintain precision and are supported."""
        result = add_numbers(Decimal("1.1"), Decimal("2.2"))
        self.assertIsInstance(result, Decimal)
        self.assertEqual(result, Decimal("3.3"))

    def test_add_fraction_numbers(self) -> None:
        """Fractions are handled without converting to float."""
        result = add_numbers(Fraction(1, 3), Fraction(1, 6))
        self.assertIsInstance(result, Fraction)
        self.assertEqual(result, Fraction(1, 2))

    def test_add_decimal_and_fraction(self) -> None:
        """Decimal inputs should coerce compatible operands while staying Decimal."""
        result = add_numbers(Decimal("1.5"), Fraction(1, 2))
        self.assertIsInstance(result, Decimal)
        self.assertEqual(result, Decimal("2.0"))

    def test_add_fraction_and_decimal(self) -> None:
        """Fraction precedence is preserved when it is the primary operand."""
        result = add_numbers(Fraction(3, 4), Decimal("0.25"))
        self.assertIsInstance(result, Fraction)
        self.assertEqual(result, Fraction(1, 1))

    def test_add_mixed_decimal_and_int(self) -> None:
        """Mixed numeric types retain the behaviour of the left operand."""
        result = add_numbers(Decimal("5"), 7)
        self.assertIsInstance(result, Decimal)
        self.assertEqual(result, Decimal("12"))

    def test_numpy_scalar_support(self) -> None:
        """NumPy scalar values are treated as numeric inputs when available."""
        try:
            import numpy as np  # type: ignore
        except ModuleNotFoundError:
            self.skipTest("NumPy not installed")

        a = np.int64(4)
        b = np.float64(1.5)
        result = add_numbers(a, b)
        self.assertAlmostEqual(float(result), 5.5)


if __name__ == "__main__":
    unittest.main()
