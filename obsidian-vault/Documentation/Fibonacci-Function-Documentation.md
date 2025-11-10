# Fibonacci Function Documentation

## Overview
Python module providing efficient implementations for calculating Fibonacci numbers with multiple algorithm options.

## Module Location
`fibonacci.py` in project root

## Main Functions

### `calculate_fibonacci(n, method="iterative")`
Calculate the nth Fibonacci number using the specified algorithm.

**Parameters**:
- `n` (int): Position in the Fibonacci sequence (0-indexed)
- `method` (str, optional): Algorithm to use
  - `"iterative"` (default): Best for general use
  - `"memoized"`: Cached recursion
  - `"recursive"`: Naive recursion (educational only, n ≤ 35)

**Returns**:
- `int`: The nth Fibonacci number

**Raises**:
- `ValueError`: If n is negative or method is invalid
- `ValueError`: If recursive method used with n > 35

**Time/Space Complexity**:
| Method | Time | Space | Best For |
|--------|------|-------|----------|
| iterative | O(n) | O(1) | General use |
| memoized | O(n) | O(n) | Recursive preference |
| recursive | O(2^n) | O(n) | Education only |

**Examples**:
```python
from fibonacci import calculate_fibonacci

# Basic usage (iterative by default)
result = calculate_fibonacci(10)  # Returns: 55

# Using different methods
result = calculate_fibonacci(20, method="memoized")  # Returns: 6765

# Edge cases
calculate_fibonacci(0)  # Returns: 0
calculate_fibonacci(1)  # Returns: 1
```

---

### `fibonacci_sequence(n, method="iterative")`
Generate a list of the first n Fibonacci numbers.

**Parameters**:
- `n` (int): Number of Fibonacci numbers to generate
- `method` (str, optional): Algorithm to use (default: "iterative")

**Returns**:
- `List[int]`: List containing first n Fibonacci numbers

**Examples**:
```python
from fibonacci import fibonacci_sequence

# Generate first 10 numbers
sequence = fibonacci_sequence(10)
# Returns: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# Generate first 5 numbers
sequence = fibonacci_sequence(5)
# Returns: [0, 1, 1, 2, 3]
```

---

## Usage Examples

### Basic Calculation
```python
from fibonacci import calculate_fibonacci

# Calculate specific Fibonacci numbers
f_10 = calculate_fibonacci(10)
print(f"F(10) = {f_10}")  # Output: F(10) = 55

f_20 = calculate_fibonacci(20)
print(f"F(20) = {f_20}")  # Output: F(20) = 6765
```

### Generate Sequence
```python
from fibonacci import fibonacci_sequence

# Get first 15 Fibonacci numbers
numbers = fibonacci_sequence(15)
print(numbers)
# Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
```

### Method Comparison
```python
from fibonacci import calculate_fibonacci
import time

# Compare performance of different methods
n = 30

for method in ["iterative", "memoized"]:
    start = time.time()
    result = calculate_fibonacci(n, method=method)
    elapsed = time.time() - start
    print(f"{method}: F({n}) = {result} (Time: {elapsed*1000:.4f}ms)")
```

### Error Handling
```python
from fibonacci import calculate_fibonacci

try:
    # This will raise ValueError
    result = calculate_fibonacci(-5)
except ValueError as e:
    print(f"Error: {e}")  # Output: Error: n must be non-negative

try:
    # This will raise ValueError (n too large for recursive)
    result = calculate_fibonacci(40, method="recursive")
except ValueError as e:
    print(f"Error: {e}")
```

---

## Algorithm Selection Guide

### Use **Iterative** when:
- General purpose calculations
- Large n values (n > 100)
- Memory efficiency is important
- **Recommended for most use cases**

### Use **Memoized** when:
- You prefer recursive style
- Moderate n values (n < 1000)
- Multiple calls with same inputs
- Call stack depth is not a concern

### Use **Recursive** when:
- Educational/demonstration purposes only
- Very small n (n < 20)
- **Not recommended for production**

---

## Implementation Details

### Iterative Algorithm
Uses two variables to track previous values, updating them in a loop:
```python
prev, curr = 0, 1
for _ in range(2, n + 1):
    prev, curr = curr, prev + curr
```

### Memoized Algorithm
Uses Python's `@lru_cache` decorator for automatic caching:
```python
@lru_cache(maxsize=None)
def _fibonacci_memoized(n):
    if n <= 1:
        return n
    return _fibonacci_memoized(n - 1) + _fibonacci_memoized(n - 2)
```

---

## Performance Characteristics

### Benchmark Results (approximate)
| n | Iterative | Memoized | Recursive |
|---|-----------|----------|-----------|
| 10 | < 0.01ms | < 0.01ms | 0.1ms |
| 20 | < 0.01ms | < 0.01ms | 10ms |
| 30 | < 0.01ms | < 0.01ms | 1000ms |
| 100 | < 0.1ms | < 0.1ms | N/A |
| 1000 | < 1ms | < 1ms | N/A |

---

## Running the Demo
Execute the module directly to see demonstration output:
```bash
python fibonacci.py
```

This will display:
- Individual Fibonacci numbers for test values
- First 15 numbers in the sequence
- Performance comparison between methods

---

## Related Documentation
- [Fibonacci Algorithms Research](Fibonacci-Algorithms-Research.md) - Detailed algorithm analysis and comparisons
