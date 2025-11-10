"""Simple greeting helper."""


def greet(name: str) -> str:
    """Return a personalized greeting for the provided ``name``."""
    return f"Hello, {name}!"


if __name__ == "__main__":
    print(greet("World"))
