---
title: "Hello World Script Guide"
date: 2025-11-02
tags: [tutorial, python, getting-started]
type: guide
related_docs: [[Architecture Overview]], [[Component Reference]]
---

# Hello World Script Guide

## Overview

The `hello_world.py` script is a simple demonstration Python script that prints "Hello, World!" to the console. It serves as a basic example for understanding the project's Python script structure and testing conventions.

## Location

```
/hello_world.py
```

The script is located in the project root directory.

## Prerequisites

- Python 3.10 or higher (project uses Python 3.13.7)
- No external dependencies required

## Usage

### Running the Script

You can run the script in several ways:

#### Method 1: Using Python directly

```bash
python3 hello_world.py
```

#### Method 2: Using the shebang (if executable)

```bash
./hello_world.py
```

#### Method 3: From project root

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
python3 hello_world.py
```

### Expected Output

```
Hello, World!
```

The script will print exactly "Hello, World!" followed by a newline and exit with code 0.

## Script Structure

The script follows Python best practices:

1. **Shebang Line**: `#!/usr/bin/env python3` for cross-platform execution
2. **Module Docstring**: Clear description of the script's purpose
3. **Main Function**: Logic encapsulated in a `main()` function
4. **Main Guard**: `if __name__ == "__main__":` pattern for proper module behavior

## Code Example

```python
#!/usr/bin/env python3
"""
Hello World Script
A simple script that prints 'Hello, World!' to the console.
"""


def main():
    """Print Hello, World! to the console."""
    print("Hello, World!")


if __name__ == "__main__":
    main()
```

## Testing

The script has comprehensive test coverage in `test_hello_world.py`.

### Running Tests

```bash
# Run all tests
python3 -m pytest test_hello_world.py -v

# Run a specific test
python3 -m pytest test_hello_world.py::test_hello_world_prints_correct_message -v
```

### Test Coverage

The test suite includes:

1. **Function Test**: Tests the `main()` function directly using pytest's `capsys` fixture
2. **Subprocess Test**: Verifies the script runs correctly via subprocess
3. **Executable Test**: Validates the script's shebang and executability

All tests verify that:
- Output is exactly "Hello, World!\n"
- Exit code is 0
- No errors are written to stderr

## Code Quality

The script passes all quality checks:

- **Black**: Code formatting (88 character line length)
- **Flake8**: Linting and style checks
- **isort**: Import sorting
- **mypy**: Static type checking

### Running Quality Checks

```bash
# Check code formatting
python3 -m black --check hello_world.py

# Run linter
python3 -m flake8 hello_world.py --max-line-length=88

# Check import sorting
python3 -m isort --check-only hello_world.py

# Run type checker
python3 -m mypy hello_world.py --ignore-missing-imports
```

## Troubleshooting

### Common Issues

**Issue**: Permission denied when running `./hello_world.py`

**Solution**: Make the script executable:
```bash
chmod +x hello_world.py
```

---

**Issue**: "python3: command not found"

**Solution**: Ensure Python 3 is installed and in your PATH:
```bash
# Check Python version
python3 --version

# Or try with just 'python'
python --version
```

---

**Issue**: Tests fail with "module not found"

**Solution**: Install test dependencies:
```bash
python3 -m pip install pytest pytest-asyncio pytest-cov pytest-mock
```

## Related Documentation

- [[Architecture Overview]] - Understanding the project structure
- [[Component Reference]] - Technical component documentation
- Project README.md - Project setup and installation

## Next Steps

After running this simple script, you can explore:

1. **More Complex Scripts**: Check the `scripts/` directory for utility scripts
2. **Test Patterns**: Review other test files like `test_calculator.py` for testing patterns
3. **Project Documentation**: Read the main README.md for full project capabilities

---

*Last Updated: 2025-11-02*
