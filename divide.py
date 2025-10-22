def divide(a, b):
    """
    Return the quotient of dividing a by b.

    Raises:
        ZeroDivisionError: If b is zero; the error is intercepted to provide a clearer message.
    """
    try:
        return a / b
    except ZeroDivisionError as exc:
        raise ZeroDivisionError("Cannot divide by zero.") from exc
