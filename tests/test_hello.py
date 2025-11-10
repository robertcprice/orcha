from hello import hello


def test_hello():
    """Test that hello function returns 'Hello, World!'"""
    result = hello()
    assert result == "Hello, World!", f"Expected 'Hello, World!' but got '{result}'"


if __name__ == "__main__":
    # Run the test
    test_hello()
    print("✓ Test passed: hello() returns 'Hello, World!'")
