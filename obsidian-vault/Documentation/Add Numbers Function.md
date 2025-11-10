# Add Numbers Function

## Overview

The `add_numbers` function is a simple utility function that adds two numeric values together. It demonstrates proper type hints, input validation, and comprehensive testing practices.

## Function Signature

```python
def add_numbers(a: Any, b: Any) -> Any
```

The function accepts a wide range of numeric types with type overloads for better IDE support.

## Parameters

- **a**: First numeric operand (int, float, Decimal, Fraction, or NumPy scalar)
- **b**: Second numeric operand (int, float, Decimal, Fraction, or NumPy scalar)

## Returns

- The arithmetic sum of `a` and `b` using the operands' native numeric type
- Return type depends on input types:
  - Two ints → int
  - Any float → float
  - Decimal operand → Decimal (with type coercion)
  - Fraction operand → Fraction (with type coercion)
  - NumPy scalar → appropriate NumPy type

## Raises

- **TypeError**: If either argument is not a supported numeric scalar (rejects booleans, strings, None, lists, dicts)

## Source Location

- **File**: `add_numbers.py` (project root)
- **Tests**: `test_add_numbers.py` (project root)

## Usage Examples

### Basic Addition

```python
from add_numbers import add_numbers

# Adding integers
result = add_numbers(2, 3)
print(result)  # Output: 5

# Adding floats
result = add_numbers(2.5, 3.5)
print(result)  # Output: 6.0

# Adding negative numbers
result = add_numbers(-5, 10)
print(result)  # Output: 5

# Adding with zero
result = add_numbers(0, 0)
print(result)  # Output: 0
```

### Mixed Types

```python
# Integer and float
result = add_numbers(5, 2.5)
print(result)  # Output: 7.5
```

### High Precision with Decimal

```python
from decimal import Decimal

# Decimal precision
result = add_numbers(Decimal("1.1"), Decimal("2.2"))
print(result)  # Output: Decimal('3.3')

# Mixed Decimal and int
result = add_numbers(Decimal("5"), 7)
print(result)  # Output: Decimal('12')
```

### Exact Fractions

```python
from fractions import Fraction

# Fraction arithmetic
result = add_numbers(Fraction(1, 3), Fraction(1, 6))
print(result)  # Output: Fraction(1, 2)

# Mixed Fraction and Decimal
result = add_numbers(Fraction(3, 4), Decimal("0.25"))
print(result)  # Output: Fraction(1, 1)
```

### NumPy Scalars

```python
import numpy as np

# NumPy scalar support
result = add_numbers(np.int64(4), np.float64(1.5))
print(result)  # Output: 5.5
```

### Error Handling

The function includes robust type checking:

```python
# These will raise TypeError:
add_numbers("1", 2)      # String not allowed
add_numbers(None, 5)      # None not allowed
add_numbers(True, 5)      # Boolean not allowed
add_numbers([1, 2], 3)    # List not allowed
```

## Import Instructions

To use the function in your code:

```python
from add_numbers import add_numbers
```

Or import from the project root:

```python
import sys
sys.path.append('/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System')
from add_numbers import add_numbers
```

## Testing

The function has comprehensive unit tests covering:

- ✓ Positive integers
- ✓ Negative integers
- ✓ Floating-point numbers
- ✓ Mixed int and float types
- ✓ Addition with zero
- ✓ Large numbers
- ✓ Decimal precision arithmetic
- ✓ Fraction arithmetic
- ✓ Mixed Decimal and Fraction operations
- ✓ NumPy scalar support
- ✓ Type validation (strings, None, lists, dicts, booleans)

Run the tests with:

```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
python -m pytest test_add_numbers.py -v
```

## Implementation Details

The function includes:
- Advanced type hints with overloads for better IDE support
- Comprehensive docstring with parameter descriptions
- Input validation using numeric scalar detection
- Special handling to reject boolean values (which are technically int subclasses in Python)
- Type coercion for mixed Decimal and Fraction operations
- Optional NumPy scalar support (gracefully handles missing NumPy installation)
- Precision-preserving arithmetic using native type semantics

## Related Documentation

- [[Hello World Script]] - Another simple example script
- [[Architecture Overview]] - Overall project structure
- [[Claude Code Integration]] - Integration patterns

## Tags

#utility #function #python #testing #documentation
