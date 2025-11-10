"""Unit tests for the greet module."""

import unittest

from greet import greet


class GreetTests(unittest.TestCase):
    """Verify the greet helper returns the expected message."""

    def test_returns_personalized_greeting(self) -> None:
        self.assertEqual(greet("Alice"), "Hello, Alice!")

    def test_handles_empty_name(self) -> None:
        self.assertEqual(greet(""), "Hello, !")


if __name__ == "__main__":
    unittest.main()
