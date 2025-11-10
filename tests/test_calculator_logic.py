"""
Unit tests for Scientific Calculator Mathematical Logic
Tests mathematical operations without GUI dependencies.
"""

import unittest
import math


class CalculatorLogic:
    """Core calculator logic without GUI dependencies."""

    def __init__(self):
        self.angle_mode = "deg"

    def convert_expression(self, expr):
        """Convert custom notation to Python-evaluable expression."""
        import re

        # Replace custom symbols with Python equivalents (but preserve scientific notation)
        expr = expr.replace("π", str(math.pi))

        # Handle 'e' carefully - only replace standalone 'e', not in scientific notation
        expr = re.sub(r'(?<!\d)e(?!\d)', str(math.e), expr)

        expr = expr.replace("²", "**2")
        expr = expr.replace("^", "**")
        expr = expr.replace("√", "math.sqrt")

        # Handle factorial
        while "!" in expr:
            idx = expr.index("!")
            start = idx - 1
            while start >= 0 and (expr[start].isdigit() or expr[start] == "."):
                start -= 1
            start += 1
            num = expr[start:idx]
            factorial_result = str(math.factorial(int(float(num))))
            expr = expr[:start] + factorial_result + expr[idx+1:]

        # Handle trigonometric functions with angle mode
        if self.angle_mode == "deg":
            # Track how many extra closing parens we need
            extra_parens_needed = 0

            # Replace trig functions and count them
            for func in ['sin', 'cos', 'tan']:
                old_count = expr.count(func + '(')
                expr = expr.replace(func + '(', f'math.{func}(math.radians(')
                extra_parens_needed += old_count

            # Find and balance each trig function call
            for func in ['sin', 'cos', 'tan']:
                pattern = f'math.{func}(math.radians('
                offset = 0
                while True:
                    idx = expr.find(pattern, offset)
                    if idx == -1:
                        break

                    # Find the matching closing paren for this function call
                    paren_count = 2  # We have two opening parens from the pattern
                    pos = idx + len(pattern)
                    start_pos = pos

                    while pos < len(expr) and paren_count > 0:
                        if expr[pos] == '(':
                            paren_count += 1
                        elif expr[pos] == ')':
                            paren_count -= 1
                            if paren_count == 1:
                                # Add the extra closing paren for math.radians
                                expr = expr[:pos] + ')' + expr[pos:]
                                offset = pos + 2  # Skip past both closing parens
                                break
                        pos += 1

                    if paren_count == 0:
                        offset = pos + 1
        else:
            expr = expr.replace("sin(", "math.sin(")
            expr = expr.replace("cos(", "math.cos(")
            expr = expr.replace("tan(", "math.tan(")

        # Handle logarithms
        expr = expr.replace("log(", "math.log10(")
        expr = expr.replace("ln(", "math.log(")

        # Handle absolute value
        expr = expr.replace("abs(", "abs(")

        # Handle percentage
        expr = expr.replace("%", "/100")

        return expr

    def evaluate(self, expression):
        """Evaluate a mathematical expression."""
        try:
            python_expr = self.convert_expression(expression)
            result = eval(python_expr)
            return result
        except Exception as e:
            raise ValueError(f"Invalid expression: {str(e)}")


class TestCalculatorLogic(unittest.TestCase):
    """Test cases for calculator mathematical logic."""

    def setUp(self):
        """Set up test calculator logic instance."""
        self.calc = CalculatorLogic()

    def test_basic_addition(self):
        """Test basic addition operation."""
        result = self.calc.evaluate("5+3")
        self.assertEqual(result, 8)

    def test_basic_subtraction(self):
        """Test basic subtraction operation."""
        result = self.calc.evaluate("10-4")
        self.assertEqual(result, 6)

    def test_basic_multiplication(self):
        """Test basic multiplication operation."""
        result = self.calc.evaluate("6*7")
        self.assertEqual(result, 42)

    def test_basic_division(self):
        """Test basic division operation."""
        result = self.calc.evaluate("20/4")
        self.assertEqual(result, 5)

    def test_power_operation(self):
        """Test power operation."""
        result = self.calc.evaluate("2^3")
        self.assertEqual(result, 8)

    def test_square_operation(self):
        """Test square operation."""
        result = self.calc.evaluate("5²")
        self.assertEqual(result, 25)

    def test_square_root(self):
        """Test square root operation."""
        result = self.calc.evaluate("√(16)")
        self.assertEqual(result, 4)

    def test_factorial(self):
        """Test factorial operation."""
        result = self.calc.evaluate("5!")
        self.assertEqual(result, 120)

    def test_sine_degrees(self):
        """Test sine function in degree mode."""
        self.calc.angle_mode = "deg"
        result = self.calc.evaluate("sin(30)")
        self.assertAlmostEqual(result, 0.5, places=10)

    def test_cosine_degrees(self):
        """Test cosine function in degree mode."""
        self.calc.angle_mode = "deg"
        result = self.calc.evaluate("cos(60)")
        self.assertAlmostEqual(result, 0.5, places=10)

    def test_tangent_degrees(self):
        """Test tangent function in degree mode."""
        self.calc.angle_mode = "deg"
        result = self.calc.evaluate("tan(45)")
        self.assertAlmostEqual(result, 1.0, places=10)

    def test_sine_radians(self):
        """Test sine function in radian mode."""
        self.calc.angle_mode = "rad"
        result = self.calc.evaluate("sin(1.5708)")  # π/2
        self.assertAlmostEqual(result, 1.0, places=4)

    def test_logarithm_base_10(self):
        """Test logarithm base 10."""
        result = self.calc.evaluate("log(100)")
        self.assertAlmostEqual(result, 2.0, places=10)

    def test_natural_logarithm(self):
        """Test natural logarithm."""
        result = self.calc.evaluate("ln(2.71828)")
        self.assertAlmostEqual(result, 1.0, places=4)

    def test_pi_constant(self):
        """Test pi constant."""
        result = self.calc.evaluate("π")
        self.assertAlmostEqual(result, math.pi, places=10)

    def test_e_constant(self):
        """Test e constant."""
        result = self.calc.evaluate("e")
        self.assertAlmostEqual(result, math.e, places=10)

    def test_percentage(self):
        """Test percentage operation."""
        result = self.calc.evaluate("50%")
        self.assertEqual(result, 0.5)

    def test_parentheses(self):
        """Test parentheses grouping."""
        result = self.calc.evaluate("(2+3)*4")
        self.assertEqual(result, 20)

    def test_complex_expression(self):
        """Test complex mathematical expression."""
        result = self.calc.evaluate("2^3+√(16)*5")
        self.assertEqual(result, 28)

    def test_absolute_value(self):
        """Test absolute value function."""
        result = self.calc.evaluate("abs(-15)")
        self.assertEqual(result, 15)

    def test_order_of_operations(self):
        """Test proper order of operations."""
        result = self.calc.evaluate("2+3*4")
        self.assertEqual(result, 14)

    def test_decimal_operations(self):
        """Test operations with decimal numbers."""
        result = self.calc.evaluate("3.5+2.5")
        self.assertEqual(result, 6.0)

    def test_negative_numbers(self):
        """Test operations with negative numbers."""
        result = self.calc.evaluate("-5+10")
        self.assertEqual(result, 5)

    def test_multiple_operations(self):
        """Test chaining multiple operations."""
        result = self.calc.evaluate("10+5-3*2")
        self.assertEqual(result, 9)

    def test_nested_parentheses(self):
        """Test nested parentheses."""
        result = self.calc.evaluate("((2+3)*4)-5")
        self.assertEqual(result, 15)

    def test_combined_functions(self):
        """Test combining multiple functions."""
        self.calc.angle_mode = "deg"
        result = self.calc.evaluate("sin(30)+cos(60)")
        self.assertAlmostEqual(result, 1.0, places=10)

    def test_power_with_decimals(self):
        """Test power operation with decimal exponent."""
        result = self.calc.evaluate("4^0.5")
        self.assertEqual(result, 2.0)

    def test_very_large_numbers(self):
        """Test handling of very large numbers."""
        result = self.calc.evaluate("999999*999999")
        self.assertEqual(result, 999998000001)

    def test_scientific_notation_expression(self):
        """Test scientific notation in expressions."""
        result = self.calc.evaluate("1e3+2e2")
        self.assertEqual(result, 1200)


class TestCalculatorEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def setUp(self):
        """Set up test calculator logic instance."""
        self.calc = CalculatorLogic()

    def test_division_by_zero(self):
        """Test division by zero raises error."""
        with self.assertRaises(ValueError):
            self.calc.evaluate("10/0")

    def test_invalid_expression(self):
        """Test invalid mathematical expression."""
        with self.assertRaises(ValueError):
            self.calc.evaluate("5+*3")

    def test_very_small_decimals(self):
        """Test handling of very small decimal numbers."""
        result = self.calc.evaluate("0.00001*0.00001")
        self.assertAlmostEqual(result, 0.0000000001, places=15)

    def test_zero_factorial(self):
        """Test factorial of zero."""
        result = self.calc.evaluate("0!")
        self.assertEqual(result, 1)

    def test_logarithm_of_one(self):
        """Test logarithm of 1."""
        result = self.calc.evaluate("log(1)")
        self.assertEqual(result, 0)

    def test_square_root_of_zero(self):
        """Test square root of zero."""
        result = self.calc.evaluate("√(0)")
        self.assertEqual(result, 0)


def run_tests():
    """Run all tests and display results."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestCalculatorLogic))
    suite.addTests(loader.loadTestsFromTestCase(TestCalculatorEdgeCases))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    import sys
    success = run_tests()
    print("\n" + "="*70)
    if success:
        print("✓ ALL TESTS PASSED - Calculator logic is working correctly!")
    else:
        print("✗ SOME TESTS FAILED - Please review the errors above")
    print("="*70)
    sys.exit(0 if success else 1)
