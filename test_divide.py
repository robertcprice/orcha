import unittest

import divide


class DivideFunctionTests(unittest.TestCase):
    def test_positive_numbers(self):
        self.assertEqual(divide.divide(10, 2), 5)

    def test_negative_numbers(self):
        self.assertEqual(divide.divide(-9, 3), -3)

    def test_zero_numerator(self):
        self.assertEqual(divide.divide(0, 5), 0)

    def test_division_by_zero(self):
        with self.assertRaisesRegex(ZeroDivisionError, "Cannot divide by zero"):
            divide.divide(5, 0)


if __name__ == "__main__":
    unittest.main()
