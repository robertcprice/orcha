"""
Unit tests for Fibonacci sequence calculator.
"""

import pytest
import time
from fibonacci import calculate_fibonacci, fibonacci_sequence


class TestCalculateFibonacci:
    """Test suite for calculate_fibonacci function."""

    def test_base_cases(self):
        """Test base cases F(0) and F(1)."""
        assert calculate_fibonacci(0) == 0
        assert calculate_fibonacci(1) == 1

    def test_small_values(self):
        """Test small Fibonacci values."""
        assert calculate_fibonacci(2) == 1
        assert calculate_fibonacci(3) == 2
        assert calculate_fibonacci(4) == 3
        assert calculate_fibonacci(5) == 5
        assert calculate_fibonacci(6) == 8

    def test_medium_values(self):
        """Test medium Fibonacci values."""
        assert calculate_fibonacci(10) == 55
        assert calculate_fibonacci(15) == 610
        assert calculate_fibonacci(20) == 6765

    def test_large_values(self):
        """Test large Fibonacci values."""
        assert calculate_fibonacci(30) == 832040
        assert calculate_fibonacci(50) == 12586269025
        assert calculate_fibonacci(100) == 354224848179261915075

    def test_negative_input(self):
        """Test that negative input raises ValueError."""
        with pytest.raises(ValueError, match="n must be non-negative"):
            calculate_fibonacci(-1)
        with pytest.raises(ValueError, match="n must be non-negative"):
            calculate_fibonacci(-10)

    def test_iterative_method(self):
        """Test iterative method explicitly."""
        assert calculate_fibonacci(10, method="iterative") == 55
        assert calculate_fibonacci(20, method="iterative") == 6765

    def test_memoized_method(self):
        """Test memoized method."""
        assert calculate_fibonacci(10, method="memoized") == 55
        assert calculate_fibonacci(20, method="memoized") == 6765
        assert calculate_fibonacci(30, method="memoized") == 832040

    def test_recursive_method(self):
        """Test recursive method for small values."""
        assert calculate_fibonacci(0, method="recursive") == 0
        assert calculate_fibonacci(1, method="recursive") == 1
        assert calculate_fibonacci(10, method="recursive") == 55
        assert calculate_fibonacci(20, method="recursive") == 6765

    def test_recursive_method_limit(self):
        """Test that recursive method raises error for large n."""
        with pytest.raises(ValueError, match="Recursive method not recommended"):
            calculate_fibonacci(40, method="recursive")

    def test_invalid_method(self):
        """Test that invalid method raises ValueError."""
        with pytest.raises(ValueError, match="Invalid method"):
            calculate_fibonacci(10, method="invalid")

    def test_all_methods_agree(self):
        """Test that all methods produce the same results."""
        test_values = [0, 1, 5, 10, 15, 20, 25]
        for n in test_values:
            iterative = calculate_fibonacci(n, method="iterative")
            memoized = calculate_fibonacci(n, method="memoized")
            if n <= 30:  # Only test recursive for small values
                recursive = calculate_fibonacci(n, method="recursive")
                assert iterative == memoized == recursive, f"Methods disagree at n={n}"
            else:
                assert iterative == memoized, f"Iterative and memoized disagree at n={n}"


class TestFibonacciSequence:
    """Test suite for fibonacci_sequence function."""

    def test_empty_sequence(self):
        """Test generating empty sequence."""
        assert fibonacci_sequence(0) == []
        assert fibonacci_sequence(-5) == []

    def test_single_element(self):
        """Test generating single element sequence."""
        assert fibonacci_sequence(1) == [0]

    def test_small_sequence(self):
        """Test generating small sequences."""
        assert fibonacci_sequence(2) == [0, 1]
        assert fibonacci_sequence(5) == [0, 1, 1, 2, 3]

    def test_medium_sequence(self):
        """Test generating medium sequences."""
        expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
        assert fibonacci_sequence(10) == expected

    def test_sequence_length(self):
        """Test that sequence has correct length."""
        for n in [5, 10, 15, 20]:
            sequence = fibonacci_sequence(n)
            assert len(sequence) == n, f"Expected length {n}, got {len(sequence)}"

    def test_sequence_values(self):
        """Test that sequence values are correct."""
        sequence = fibonacci_sequence(15)
        expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
        assert sequence == expected

    def test_sequence_with_methods(self):
        """Test sequence generation with different methods."""
        n = 10
        iterative_seq = fibonacci_sequence(n, method="iterative")
        memoized_seq = fibonacci_sequence(n, method="memoized")
        assert iterative_seq == memoized_seq


class TestPerformance:
    """Test suite for performance characteristics."""

    def test_iterative_performance(self):
        """Test that iterative method is fast for large n."""
        start = time.time()
        result = calculate_fibonacci(1000, method="iterative")
        elapsed = time.time() - start
        assert elapsed < 0.01, f"Iterative too slow for n=1000: {elapsed}s"
        assert result > 0  # Sanity check

    def test_memoized_performance(self):
        """Test that memoized method is reasonably fast."""
        start = time.time()
        result = calculate_fibonacci(500, method="memoized")
        elapsed = time.time() - start
        assert elapsed < 0.1, f"Memoized too slow for n=500: {elapsed}s"
        assert result > 0  # Sanity check

    def test_iterative_faster_than_memoized_for_large_n(self):
        """Test that iterative is faster than memoized for large n."""
        n = 100

        start = time.time()
        iterative_result = calculate_fibonacci(n, method="iterative")
        iterative_time = time.time() - start

        # Clear memoization cache for fair comparison
        from fibonacci import _fibonacci_memoized
        _fibonacci_memoized.cache_clear()

        start = time.time()
        memoized_result = calculate_fibonacci(n, method="memoized")
        memoized_time = time.time() - start

        assert iterative_result == memoized_result
        # Iterative should generally be faster or comparable
        assert iterative_time <= memoized_time * 2


class TestEdgeCases:
    """Test suite for edge cases and special scenarios."""

    def test_consecutive_values(self):
        """Test that consecutive Fibonacci numbers follow the rule F(n) = F(n-1) + F(n-2)."""
        for n in range(2, 30):
            f_n = calculate_fibonacci(n)
            f_n_minus_1 = calculate_fibonacci(n - 1)
            f_n_minus_2 = calculate_fibonacci(n - 2)
            assert f_n == f_n_minus_1 + f_n_minus_2, f"Rule violated at n={n}"

    def test_type_correctness(self):
        """Test that function returns integers."""
        result = calculate_fibonacci(10)
        assert isinstance(result, int)

        sequence = fibonacci_sequence(5)
        assert isinstance(sequence, list)
        assert all(isinstance(x, int) for x in sequence)

    def test_sequence_consistency(self):
        """Test that fibonacci_sequence matches individual calculations."""
        n = 20
        sequence = fibonacci_sequence(n)
        for i in range(n):
            individual = calculate_fibonacci(i)
            assert sequence[i] == individual, f"Mismatch at index {i}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
