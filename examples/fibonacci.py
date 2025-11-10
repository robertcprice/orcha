"""
Fibonacci Sequence Calculator

This module provides efficient implementations for calculating Fibonacci numbers.
"""

from functools import lru_cache
from typing import List


def calculate_fibonacci(n: int, method: str = "iterative") -> int:
    """
    Calculate the nth Fibonacci number using the specified method.

    The Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...
    Where F(0) = 0, F(1) = 1, and F(n) = F(n-1) + F(n-2) for n > 1

    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        method (str): Algorithm to use - "iterative", "memoized", or "recursive"
                     Default is "iterative" for best performance

    Returns:
        int: The nth Fibonacci number

    Raises:
        ValueError: If n is negative or method is invalid

    Examples:
        >>> calculate_fibonacci(0)
        0
        >>> calculate_fibonacci(1)
        1
        >>> calculate_fibonacci(10)
        55
        >>> calculate_fibonacci(20, method="memoized")
        6765

    Time Complexity:
        - iterative: O(n)
        - memoized: O(n)
        - recursive: O(2^n) - not recommended for n > 30

    Space Complexity:
        - iterative: O(1)
        - memoized: O(n)
        - recursive: O(n) for call stack
    """
    if n < 0:
        raise ValueError("n must be non-negative")

    if method == "iterative":
        return _fibonacci_iterative(n)
    elif method == "memoized":
        return _fibonacci_memoized(n)
    elif method == "recursive":
        if n > 35:
            raise ValueError("Recursive method not recommended for n > 35 (too slow)")
        return _fibonacci_recursive(n)
    else:
        raise ValueError(f"Invalid method: {method}. Choose 'iterative', 'memoized', or 'recursive'")


def _fibonacci_iterative(n: int) -> int:
    """
    Calculate Fibonacci number using iterative approach.
    Most efficient for general use: O(n) time, O(1) space.
    """
    if n <= 1:
        return n

    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr

    return curr


@lru_cache(maxsize=None)
def _fibonacci_memoized(n: int) -> int:
    """
    Calculate Fibonacci number using memoization (cached recursion).
    Efficient recursive approach: O(n) time, O(n) space.
    """
    if n <= 1:
        return n
    return _fibonacci_memoized(n - 1) + _fibonacci_memoized(n - 2)


def _fibonacci_recursive(n: int) -> int:
    """
    Calculate Fibonacci number using naive recursion.
    Simple but inefficient: O(2^n) time. Only for educational purposes.
    """
    if n <= 1:
        return n
    return _fibonacci_recursive(n - 1) + _fibonacci_recursive(n - 2)


def fibonacci_sequence(n: int, method: str = "iterative") -> List[int]:
    """
    Generate a list of the first n Fibonacci numbers.

    Args:
        n (int): Number of Fibonacci numbers to generate
        method (str): Algorithm to use (default: "iterative")

    Returns:
        List[int]: List of first n Fibonacci numbers

    Examples:
        >>> fibonacci_sequence(5)
        [0, 1, 1, 2, 3]
        >>> fibonacci_sequence(10)
        [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    """
    if n <= 0:
        return []

    return [calculate_fibonacci(i, method=method) for i in range(n)]


if __name__ == "__main__":
    # Demo usage
    print("Fibonacci Calculator Demo")
    print("=" * 40)

    # Calculate individual Fibonacci numbers
    test_values = [0, 1, 5, 10, 20, 30]

    print("\nIndividual Fibonacci numbers:")
    for n in test_values:
        result = calculate_fibonacci(n)
        print(f"F({n}) = {result}")

    # Generate sequence
    print("\nFirst 15 Fibonacci numbers:")
    sequence = fibonacci_sequence(15)
    print(sequence)

    # Compare methods (for smaller values)
    print("\nMethod comparison for F(30):")
    import time

    methods = ["iterative", "memoized"]
    for method in methods:
        start = time.time()
        result = calculate_fibonacci(30, method=method)
        elapsed = time.time() - start
        print(f"{method:12s}: {result:10d} (Time: {elapsed*1000:.4f}ms)")
