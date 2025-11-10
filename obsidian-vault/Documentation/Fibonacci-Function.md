# Fibonacci Function Documentation

## Overview

The `fibonacci.py` module provides efficient implementations for calculating Fibonacci numbers using multiple algorithmic approaches. The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...

## Mathematical Definition

```
F(0) = 0
F(1) = 1
F(n) = F(n-1) + F(n-2) for n > 1
```

## Main Function

### `calculate_fibonacci(n: int, method: str = "iterative") -> int`

Calculate the nth Fibonacci number using the specified method.

**Parameters:**
- `n` (int): The position in the Fibonacci sequence (0-indexed, must be non-negative)
- `method` (str): Algorithm to use - "iterative" (default), "memoized", or "recursive"

**Returns:**
- int: The nth Fibonacci number

**Raises:**
- `ValueError`: If n is negative or method is invalid

**Time Complexity:**
- iterative: O(n)
- memoized: O(n)
- recursive: O(2^n) - not recommended for n > 30

**Space Complexity:**
- iterative: O(1)
- memoized: O(n)
- recursive: O(n) for call stack

## Usage Examples

### Basic Usage

```python
from fibonacci import calculate_fibonacci

# Calculate the 10th Fibonacci number
result = calculate_fibonacci(10)
print(result)  # Output: 55

# Calculate using memoized approach
result = calculate_fibonacci(20, method="memoized")
print(result)  # Output: 6765
```

### Generate Fibonacci Sequence

```python
from fibonacci import fibonacci_sequence

# Get first 10 Fibonacci numbers
sequence = fibonacci_sequence(10)
print(sequence)  # Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# Generate sequence using memoized method
sequence = fibonacci_sequence(15, method="memoized")
print(sequence)
```

### Method Comparison

```python
import time
from fibonacci import calculate_fibonacci

# Compare performance of different methods
n = 30
methods = ["iterative", "memoized"]

for method in methods:
    start = time.time()
    result = calculate_fibonacci(n, method=method)
    elapsed = time.time() - start
    print(f"{method}: F({n}) = {result} (Time: {elapsed*1000:.4f}ms)")
```

## Algorithm Descriptions

### 1. Iterative Method (Recommended)

The iterative approach is the most efficient for general use. It calculates Fibonacci numbers by maintaining two variables that store the previous two values in the sequence.

**Advantages:**
- O(n) time complexity
- O(1) space complexity (constant memory)
- No risk of stack overflow
- Best for production use

**Use when:**
- You need to calculate any Fibonacci number efficiently
- Memory usage is a concern
- Calculating large Fibonacci numbers (n > 100)

### 2. Memoized Method

This method uses recursion with automatic caching (via Python's `@lru_cache` decorator) to avoid recalculating the same values.

**Advantages:**
- O(n) time complexity with caching
- Elegant recursive implementation
- Good for multiple lookups of the same values

**Disadvantages:**
- O(n) space complexity for cache storage
- Recursion depth limits for very large n

**Use when:**
- You need to calculate multiple Fibonacci numbers
- Code readability is prioritized
- n is moderately sized (< 1000)

### 3. Recursive Method (Educational Only)

Naive recursive implementation without memoization. This is extremely inefficient and only provided for educational purposes.

**Disadvantages:**
- O(2^n) time complexity (exponential!)
- Recalculates the same values many times
- Not suitable for n > 35

**Use when:**
- Teaching recursion concepts
- Demonstrating the need for optimization

## Performance Comparison

| Method      | F(10)    | F(20)     | F(30)      | F(100)     |
|-------------|----------|-----------|------------|------------|
| Iterative   | < 0.01ms | < 0.01ms  | < 0.01ms   | < 0.01ms   |
| Memoized    | < 0.01ms | < 0.01ms  | < 0.01ms   | < 0.01ms   |
| Recursive   | 0.1ms    | 10ms      | 1000ms     | N/A (too slow) |

*Note: Actual performance may vary based on hardware*

## API Reference

### Functions

#### `calculate_fibonacci(n, method="iterative")`
Main entry point for calculating individual Fibonacci numbers.

#### `fibonacci_sequence(n, method="iterative")`
Generate a list of the first n Fibonacci numbers.

#### `_fibonacci_iterative(n)` (Internal)
Iterative implementation.

#### `_fibonacci_memoized(n)` (Internal)
Memoized recursive implementation.

#### `_fibonacci_recursive(n)` (Internal)
Naive recursive implementation.

## Best Practices

1. **Use iterative method by default** - It's the most efficient for single calculations
2. **Use memoized method for multiple lookups** - If you need to calculate many Fibonacci numbers
3. **Avoid recursive method** - Only use for educational purposes with small values
4. **Handle large numbers** - Python handles arbitrary precision integers automatically
5. **Validate input** - The function validates that n is non-negative

## Common Use Cases

### Calculate Single Fibonacci Number

```python
fib_50 = calculate_fibonacci(50)
print(f"F(50) = {fib_50}")
```

### Generate Fibonacci Series for Display

```python
series = fibonacci_sequence(20)
print("First 20 Fibonacci numbers:")
print(", ".join(map(str, series)))
```

### Performance Testing

```python
import time

def benchmark_fibonacci(n, method):
    start = time.perf_counter()
    result = calculate_fibonacci(n, method=method)
    elapsed = time.perf_counter() - start
    return result, elapsed

result, time_taken = benchmark_fibonacci(100, "iterative")
print(f"F(100) = {result} (computed in {time_taken*1000:.4f}ms)")
```

## Error Handling

The function includes comprehensive error handling:

```python
try:
    # This will raise ValueError
    result = calculate_fibonacci(-5)
except ValueError as e:
    print(f"Error: {e}")  # Output: Error: n must be non-negative

try:
    # This will raise ValueError for invalid method
    result = calculate_fibonacci(10, method="invalid")
except ValueError as e:
    print(f"Error: {e}")
```

## Related Links

- [[index]] - Main documentation index
- [[Projects/Orchestration-System]] - Project overview

## Tags

#fibonacci #algorithms #python #mathematics #dynamic-programming
