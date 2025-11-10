"""
Simple Python Calculator Function

Provides basic arithmetic operations: addition, subtraction, multiplication, and division.
"""

def calculator(operation, num1, num2):
    """
    Perform basic arithmetic operations on two numbers.

    Args:
        operation (str): The operation to perform. Options: 'add', 'subtract', 'multiply', 'divide'
        num1 (float): The first number
        num2 (float): The second number

    Returns:
        float: The result of the operation

    Raises:
        ValueError: If operation is not recognized or if division by zero is attempted
        TypeError: If num1 or num2 are not numeric types

    Examples:
        >>> calculator('add', 5, 3)
        8.0
        >>> calculator('subtract', 10, 4)
        6.0
        >>> calculator('multiply', 3, 7)
        21.0
        >>> calculator('divide', 15, 3)
        5.0
    """
    # Input validation
    try:
        num1 = float(num1)
        num2 = float(num2)
    except (ValueError, TypeError) as e:
        raise TypeError(f"Both arguments must be numeric types. Error: {str(e)}")

    # Normalize operation to lowercase for case-insensitive matching
    operation = operation.lower().strip()

    # Perform the requested operation
    if operation == 'add' or operation == '+':
        return num1 + num2
    elif operation == 'subtract' or operation == '-':
        return num1 - num2
    elif operation == 'multiply' or operation == '*':
        return num1 * num2
    elif operation == 'divide' or operation == '/':
        if num2 == 0:
            raise ValueError("Cannot divide by zero")
        return num1 / num2
    else:
        raise ValueError(f"Unknown operation: '{operation}'. Valid operations are: 'add', 'subtract', 'multiply', 'divide'")


if __name__ == "__main__":
    # Example usage
    print("Calculator Examples:")
    print(f"5 + 3 = {calculator('add', 5, 3)}")
    print(f"10 - 4 = {calculator('subtract', 10, 4)}")
    print(f"3 * 7 = {calculator('multiply', 3, 7)}")
    print(f"15 / 3 = {calculator('divide', 15, 3)}")

    # Demonstrate error handling
    try:
        calculator('divide', 10, 0)
    except ValueError as e:
        print(f"Error caught: {e}")
