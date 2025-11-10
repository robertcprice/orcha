import unittest

import multiply


class MultiplyFunctionTests(unittest.TestCase):
    def test_positive_numbers(self):
        self.assertEqual(multiply.multiply(3, 4), 12)

    def test_negative_numbers(self):
        self.assertEqual(multiply.multiply(-2, -5), 10)

    def test_mixed_sign_numbers(self):
        self.assertEqual(multiply.multiply(-7, 3), -21)


if __name__ == "__main__":
    unittest.main()
