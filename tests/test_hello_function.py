import pytest
from hello_function import hello


def test_hello():
    """Test that the hello function returns the correct greeting."""
    result = hello()
    assert result == 'Hello, World!', f"Expected 'Hello, World!' but got '{result}'"


def test_hello_return_type():
    """Test that the hello function returns a string."""
    result = hello()
    assert isinstance(result, str), f"Expected string type but got {type(result)}"
