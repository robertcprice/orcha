"""Unit tests for the hello_world module."""

import subprocess
import sys
from pathlib import Path
from hello_world import hello_world, main


def test_hello_world_returns_correct_string():
    """Test that hello_world function returns 'Hello, World!'"""
    result = hello_world()
    assert result == 'Hello, World!'


def test_hello_world_return_type():
    """Test that hello_world function returns a string"""
    result = hello_world()
    assert isinstance(result, str)


def test_hello_world_exact_match():
    """Test exact string match including punctuation and capitalization"""
    result = hello_world()
    assert result == 'Hello, World!'
    assert result != 'hello, world!'
    assert result != 'Hello World'


def test_hello_world_prints_correct_message(capsys):
    """Test that hello_world.main() prints 'Hello, World!' to stdout."""
    main()

    # Capture the output
    captured = capsys.readouterr()

    # Assert the output is exactly "Hello, World!\n"
    assert captured.out == "Hello, World!\n"
    assert captured.err == ""


def test_hello_world_script_via_subprocess():
    """Test that running hello_world.py as a script produces correct output."""
    # Get the path to hello_world.py
    script_path = Path(__file__).parent / "hello_world.py"

    # Run the script via subprocess
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        timeout=5,
    )

    # Check exit code
    assert result.returncode == 0, f"Script failed with exit code {result.returncode}"

    # Check output
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""


def test_hello_world_script_executable():
    """Test that hello_world.py can be executed directly (if executable)."""
    script_path = Path(__file__).parent / "hello_world.py"

    # Check if script exists
    assert script_path.exists(), f"Script not found at {script_path}"

    # Check if it's a Python file
    assert script_path.suffix == ".py"

    # Verify it has a shebang line
    with open(script_path, "r") as f:
        first_line = f.readline()
        assert first_line.startswith("#!"), "Script missing shebang line"
        assert "python" in first_line.lower(), "Shebang doesn't reference Python"
