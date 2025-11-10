"""
Tests for the hello_world function module.
"""
from io import StringIO
import sys
from hello_world_function import hello_world


def test_hello_world_output():
    """
    Test that hello_world() prints 'Hello, World!' to stdout.
    """
    # Capture stdout
    captured_output = StringIO()
    sys.stdout = captured_output

    # Call the function
    hello_world()

    # Reset stdout
    sys.stdout = sys.__stdout__

    # Verify the output
    output = captured_output.getvalue().strip()
    assert output == "Hello, World!", f"Expected 'Hello, World!' but got '{output}'"
    print("✓ test_hello_world_output passed")


def test_hello_world_returns_none():
    """
    Test that hello_world() returns None.
    """
    # Capture stdout to suppress output during test
    captured_output = StringIO()
    sys.stdout = captured_output

    result = hello_world()

    # Reset stdout
    sys.stdout = sys.__stdout__

    assert result is None, f"Expected None but got {result}"
    print("✓ test_hello_world_returns_none passed")


if __name__ == "__main__":
    print("Running tests for hello_world function...")
    print("-" * 50)

    try:
        test_hello_world_output()
        test_hello_world_returns_none()
        print("-" * 50)
        print("All tests passed! ✓")
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
