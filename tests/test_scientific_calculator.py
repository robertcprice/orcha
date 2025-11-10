"""
Unit tests for Scientific Calculator
Tests all mathematical operations and functions.
"""

import unittest
import sys
import os
import math

# Add parent directory to path to import calculator
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scientific_calculator import ScientificCalculator
import tkinter as tk


class TestScientificCalculator(unittest.TestCase):
    """Test cases for ScientificCalculator class."""

    def setUp(self):
        """Set up test calculator instance."""
        self.root = tk.Tk()
        self.calc = ScientificCalculator(self.root)

    def tearDown(self):
        """Clean up after tests."""
        self.root.destroy()

    def test_basic_addition(self):
        """Test basic addition operation."""
        self.calc.expression = "5+3"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 8)

    def test_basic_subtraction(self):
        """Test basic subtraction operation."""
        self.calc.expression = "10-4"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 6)

    def test_basic_multiplication(self):
        """Test basic multiplication operation."""
        self.calc.expression = "6*7"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 42)

    def test_basic_division(self):
        """Test basic division operation."""
        self.calc.expression = "20/4"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 5)

    def test_power_operation(self):
        """Test power operation."""
        self.calc.expression = "2^3"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 8)

    def test_square_operation(self):
        """Test square operation."""
        self.calc.expression = "5²"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 25)

    def test_square_root(self):
        """Test square root operation."""
        self.calc.expression = "√(16)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 4)

    def test_factorial(self):
        """Test factorial operation."""
        self.calc.expression = "5!"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 120)

    def test_sine_degrees(self):
        """Test sine function in degree mode."""
        self.calc.angle_mode = "deg"
        self.calc.expression = "sin(30)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 0.5, places=10)

    def test_cosine_degrees(self):
        """Test cosine function in degree mode."""
        self.calc.angle_mode = "deg"
        self.calc.expression = "cos(60)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 0.5, places=10)

    def test_tangent_degrees(self):
        """Test tangent function in degree mode."""
        self.calc.angle_mode = "deg"
        self.calc.expression = "tan(45)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 1.0, places=10)

    def test_sine_radians(self):
        """Test sine function in radian mode."""
        self.calc.angle_mode = "rad"
        self.calc.expression = "sin(1.5708)"  # π/2
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 1.0, places=4)

    def test_logarithm_base_10(self):
        """Test logarithm base 10."""
        self.calc.expression = "log(100)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 2.0, places=10)

    def test_natural_logarithm(self):
        """Test natural logarithm."""
        self.calc.expression = "ln(2.71828)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 1.0, places=4)

    def test_pi_constant(self):
        """Test pi constant."""
        self.calc.expression = "π"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, math.pi, places=10)

    def test_e_constant(self):
        """Test e constant."""
        self.calc.expression = "e"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, math.e, places=10)

    def test_percentage(self):
        """Test percentage operation."""
        self.calc.expression = "50%"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 0.5)

    def test_parentheses(self):
        """Test parentheses grouping."""
        self.calc.expression = "(2+3)*4"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 20)

    def test_complex_expression(self):
        """Test complex mathematical expression."""
        self.calc.expression = "2^3+√(16)*5"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 28)

    def test_clear_function(self):
        """Test clear function."""
        self.calc.expression = "123+456"
        self.calc.clear()
        self.assertEqual(self.calc.expression, "")
        self.assertEqual(self.calc.display.get(), "0")

    def test_toggle_mode(self):
        """Test angle mode toggle."""
        initial_mode = self.calc.angle_mode
        self.calc.toggle_mode()
        self.assertNotEqual(self.calc.angle_mode, initial_mode)
        self.calc.toggle_mode()
        self.assertEqual(self.calc.angle_mode, initial_mode)

    def test_memory_operations(self):
        """Test memory functions."""
        # Clear memory
        self.calc.memory_clear()
        self.assertEqual(self.calc.memory, 0)

        # Add to memory
        self.calc.expression = "50"
        self.calc.update_display()
        self.calc.memory_add()
        self.assertEqual(self.calc.memory, 50)

        # Add more to memory
        self.calc.expression = "25"
        self.calc.update_display()
        self.calc.memory_add()
        self.assertEqual(self.calc.memory, 75)

        # Subtract from memory
        self.calc.expression = "15"
        self.calc.update_display()
        self.calc.memory_subtract()
        self.assertEqual(self.calc.memory, 60)

        # Recall memory
        self.calc.memory_recall()
        self.assertEqual(self.calc.expression, "60")

    def test_absolute_value(self):
        """Test absolute value function."""
        self.calc.expression = "abs(-15)"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 15)

    def test_order_of_operations(self):
        """Test proper order of operations."""
        self.calc.expression = "2+3*4"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 14)

    def test_decimal_operations(self):
        """Test operations with decimal numbers."""
        self.calc.expression = "3.5+2.5"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 6.0)

    def test_negative_numbers(self):
        """Test operations with negative numbers."""
        self.calc.expression = "-5+10"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 5)

    def test_multiple_operations(self):
        """Test chaining multiple operations."""
        self.calc.expression = "10+5-3*2"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertEqual(result, 9)


class TestCalculatorEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def setUp(self):
        """Set up test calculator instance."""
        self.root = tk.Tk()
        self.calc = ScientificCalculator(self.root)

    def tearDown(self):
        """Clean up after tests."""
        self.root.destroy()

    def test_division_by_zero_handling(self):
        """Test division by zero error handling."""
        self.calc.expression = "10/0"
        self.calc.calculate()
        self.assertIn("Error", self.calc.display.get())

    def test_empty_expression(self):
        """Test calculation with empty expression."""
        self.calc.expression = ""
        self.calc.calculate()
        # Should not crash, just return without action

    def test_invalid_expression(self):
        """Test invalid mathematical expression."""
        self.calc.expression = "5+*3"
        self.calc.calculate()
        self.assertIn("Error", self.calc.display.get())

    def test_very_large_numbers(self):
        """Test handling of very large numbers."""
        self.calc.expression = "999999999999*999999999999"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertIsInstance(result, int)

    def test_very_small_decimals(self):
        """Test handling of very small decimal numbers."""
        self.calc.expression = "0.00001*0.00001"
        python_expr = self.calc.convert_expression(self.calc.expression)
        result = eval(python_expr)
        self.assertAlmostEqual(result, 0.0000000001, places=15)


def run_tests():
    """Run all tests and display results."""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestScientificCalculator))
    suite.addTests(loader.loadTestsFromTestCase(TestCalculatorEdgeCases))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Return True if all tests passed
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
