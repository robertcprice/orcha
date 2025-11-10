"""
Simple test script for Fibonacci function (no pytest required).
"""

from fibonacci import calculate_fibonacci, fibonacci_sequence
import time


def test_basic_correctness():
    """Test basic correctness of Fibonacci calculations."""
    print("Testing basic correctness...")

    # Known Fibonacci values
    test_cases = [
        (0, 0),
        (1, 1),
        (2, 1),
        (3, 2),
        (4, 3),
        (5, 5),
        (6, 8),
        (10, 55),
        (15, 610),
        (20, 6765),
        (30, 832040),
        (50, 12586269025),
    ]

    passed = 0
    failed = 0

    for n, expected in test_cases:
        result = calculate_fibonacci(n)
        if result == expected:
            passed += 1
            print(f"  ✓ F({n}) = {result}")
        else:
            failed += 1
            print(f"  ✗ F({n}): expected {expected}, got {result}")

    print(f"\nBasic correctness: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def test_all_methods_agree():
    """Test that all methods produce the same results."""
    print("Testing method agreement...")

    test_values = [0, 1, 5, 10, 15, 20, 25, 30]
    passed = 0
    failed = 0

    for n in test_values:
        iterative = calculate_fibonacci(n, method="iterative")
        memoized = calculate_fibonacci(n, method="memoized")
        recursive = calculate_fibonacci(n, method="recursive") if n <= 30 else None

        if recursive is not None:
            if iterative == memoized == recursive:
                passed += 1
                print(f"  ✓ F({n}) = {iterative} (all methods agree)")
            else:
                failed += 1
                print(f"  ✗ F({n}): methods disagree - iterative={iterative}, memoized={memoized}, recursive={recursive}")
        else:
            if iterative == memoized:
                passed += 1
                print(f"  ✓ F({n}) = {iterative} (iterative & memoized agree)")
            else:
                failed += 1
                print(f"  ✗ F({n}): methods disagree - iterative={iterative}, memoized={memoized}")

    print(f"\nMethod agreement: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def test_sequence_generation():
    """Test fibonacci_sequence function."""
    print("Testing sequence generation...")

    test_cases = [
        (0, []),
        (1, [0]),
        (2, [0, 1]),
        (5, [0, 1, 1, 2, 3]),
        (10, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]),
    ]

    passed = 0
    failed = 0

    for n, expected in test_cases:
        result = fibonacci_sequence(n)
        if result == expected:
            passed += 1
            print(f"  ✓ fibonacci_sequence({n}) = {result}")
        else:
            failed += 1
            print(f"  ✗ fibonacci_sequence({n}): expected {expected}, got {result}")

    print(f"\nSequence generation: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def test_error_handling():
    """Test error handling."""
    print("Testing error handling...")

    passed = 0
    failed = 0

    # Test negative input
    try:
        calculate_fibonacci(-1)
        failed += 1
        print("  ✗ Should raise ValueError for negative input")
    except ValueError:
        passed += 1
        print("  ✓ Correctly raises ValueError for negative input")

    # Test invalid method
    try:
        calculate_fibonacci(10, method="invalid")
        failed += 1
        print("  ✗ Should raise ValueError for invalid method")
    except ValueError:
        passed += 1
        print("  ✓ Correctly raises ValueError for invalid method")

    # Test recursive with large n
    try:
        calculate_fibonacci(40, method="recursive")
        failed += 1
        print("  ✗ Should raise ValueError for recursive with n > 35")
    except ValueError:
        passed += 1
        print("  ✓ Correctly raises ValueError for recursive with n > 35")

    print(f"\nError handling: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def test_performance():
    """Test performance characteristics."""
    print("Testing performance...")

    test_cases = [
        (100, "iterative", 0.001),  # Should be very fast
        (500, "iterative", 0.01),   # Should still be fast
        (1000, "iterative", 0.02),  # Should be reasonably fast
    ]

    passed = 0
    failed = 0

    for n, method, max_time in test_cases:
        start = time.time()
        result = calculate_fibonacci(n, method=method)
        elapsed = time.time() - start

        if elapsed < max_time:
            passed += 1
            print(f"  ✓ F({n}) with {method}: {elapsed*1000:.4f}ms (< {max_time*1000}ms)")
        else:
            failed += 1
            print(f"  ✗ F({n}) with {method}: {elapsed*1000:.4f}ms (expected < {max_time*1000}ms)")

    print(f"\nPerformance: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def test_fibonacci_property():
    """Test that Fibonacci property holds: F(n) = F(n-1) + F(n-2)."""
    print("Testing Fibonacci property...")

    passed = 0
    failed = 0

    for n in range(2, 30):
        f_n = calculate_fibonacci(n)
        f_n_minus_1 = calculate_fibonacci(n - 1)
        f_n_minus_2 = calculate_fibonacci(n - 2)

        if f_n == f_n_minus_1 + f_n_minus_2:
            passed += 1
        else:
            failed += 1
            print(f"  ✗ F({n}) = {f_n}, but F({n-1}) + F({n-2}) = {f_n_minus_1} + {f_n_minus_2} = {f_n_minus_1 + f_n_minus_2}")

    if failed == 0:
        print(f"  ✓ Property F(n) = F(n-1) + F(n-2) holds for all n in [2, 30)")

    print(f"\nFibonacci property: {passed}/{passed+failed} tests passed\n")
    return failed == 0


def main():
    """Run all tests."""
    print("=" * 60)
    print("FIBONACCI FUNCTION TEST SUITE")
    print("=" * 60)
    print()

    results = []
    results.append(("Basic Correctness", test_basic_correctness()))
    results.append(("Method Agreement", test_all_methods_agree()))
    results.append(("Sequence Generation", test_sequence_generation()))
    results.append(("Error Handling", test_error_handling()))
    results.append(("Performance", test_performance()))
    results.append(("Fibonacci Property", test_fibonacci_property()))

    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)

    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)

    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")

    print()
    print(f"Overall: {total_passed}/{total_tests} test suites passed")

    if total_passed == total_tests:
        print("\n🎉 All tests passed successfully!")
        return 0
    else:
        print(f"\n❌ {total_tests - total_passed} test suite(s) failed")
        return 1


if __name__ == "__main__":
    exit(main())
