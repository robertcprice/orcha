#!/usr/bin/env python3
"""
Terminal-based Calculator Application
A simple command-line calculator with support for basic arithmetic operations.
"""

import sys
import re
from typing import Optional, Tuple
from decimal import Decimal, InvalidOperation


class Calculator:
    """A command-line calculator with basic arithmetic operations."""

    def __init__(self):
        self.result = Decimal('0')
        self.memory = Decimal('0')
        self.history = []

    def add(self, a: Decimal, b: Decimal) -> Decimal:
        """Add two numbers."""
        return a + b

    def subtract(self, a: Decimal, b: Decimal) -> Decimal:
        """Subtract b from a."""
        return a - b

    def multiply(self, a: Decimal, b: Decimal) -> Decimal:
        """Multiply two numbers."""
        return a * b

    def divide(self, a: Decimal, b: Decimal) -> Decimal:
        """Divide a by b."""
        if b == 0:
            raise ValueError("Error: Division by zero")
        return a / b

    def power(self, a: Decimal, b: Decimal) -> Decimal:
        """Raise a to the power of b."""
        return a ** b

    def modulo(self, a: Decimal, b: Decimal) -> Decimal:
        """Calculate a modulo b."""
        if b == 0:
            raise ValueError("Error: Division by zero")
        return a % b

    def evaluate_expression(self, expression: str) -> Decimal:
        """
        Evaluate a mathematical expression.
        Supports: +, -, *, /, ^, % and parentheses.
        """
        # Clean the expression
        expression = expression.replace(' ', '')
        expression = expression.replace('^', '**')

        # Check for valid characters
        if not re.match(r'^[\d\.\+\-\*\/\%\(\)]+$', expression.replace('**', '^')):
            raise ValueError("Invalid characters in expression")

        try:
            # Use eval with restricted namespace for safety
            result = eval(expression, {"__builtins__": {}}, {})
            return Decimal(str(result))
        except (SyntaxError, NameError):
            raise ValueError("Invalid expression syntax")
        except ZeroDivisionError:
            raise ValueError("Error: Division by zero")

    def memory_store(self):
        """Store current result in memory."""
        self.memory = self.result
        return f"Stored {self.result} in memory"

    def memory_recall(self) -> Decimal:
        """Recall value from memory."""
        return self.memory

    def memory_clear(self):
        """Clear memory."""
        self.memory = Decimal('0')
        return "Memory cleared"

    def memory_add(self):
        """Add current result to memory."""
        self.memory += self.result
        return f"Added {self.result} to memory (M = {self.memory})"

    def memory_subtract(self):
        """Subtract current result from memory."""
        self.memory -= self.result
        return f"Subtracted {self.result} from memory (M = {self.memory})"

    def clear(self):
        """Clear the current result."""
        self.result = Decimal('0')
        self.history.clear()
        return "Calculator cleared"

    def show_history(self) -> str:
        """Display calculation history."""
        if not self.history:
            return "No calculation history"
        return "\n".join(self.history[-10:])  # Show last 10 calculations


class CalculatorCLI:
    """Command-line interface for the calculator."""

    def __init__(self):
        self.calc = Calculator()
        self.running = True

    def display_help(self):
        """Display help information."""
        help_text = """
╔════════════════════════════════════════════════════════════╗
║                    CALCULATOR HELP                         ║
╠════════════════════════════════════════════════════════════╣
║ Basic Operations:                                          ║
║   • Enter expressions: 2+2, 10*5, 100/4, 9-3              ║
║   • Parentheses: (10+5)*2, 100/(5+5)                      ║
║   • Power: 2^3 or 2**3                                    ║
║   • Modulo: 10%3                                          ║
║                                                            ║
║ Memory Commands:                                           ║
║   • MS  - Store current result in memory                  ║
║   • MR  - Recall memory value                             ║
║   • MC  - Clear memory                                    ║
║   • M+  - Add to memory                                   ║
║   • M-  - Subtract from memory                            ║
║                                                            ║
║ Other Commands:                                            ║
║   • C or CLEAR - Clear calculator                         ║
║   • H or HISTORY - Show calculation history               ║
║   • HELP - Show this help                                 ║
║   • Q or QUIT - Exit calculator                           ║
║                                                            ║
║ Tips:                                                      ║
║   • Use ANS to refer to the previous result               ║
║   • Decimals are supported: 3.14 * 2                      ║
║   • Chain calculations: just keep typing!                 ║
╚════════════════════════════════════════════════════════════╝
        """
        print(help_text)

    def display_welcome(self):
        """Display welcome message."""
        print("\n" + "="*60)
        print("         TERMINAL CALCULATOR v1.0")
        print("="*60)
        print("Type 'HELP' for commands or 'QUIT' to exit")
        print("-"*60)

    def format_result(self, result: Decimal) -> str:
        """Format the result for display."""
        # Remove trailing zeros and decimal point if not needed
        result_str = str(result)
        if '.' in result_str:
            result_str = result_str.rstrip('0').rstrip('.')
        return result_str

    def process_input(self, user_input: str) -> Optional[str]:
        """Process user input and return result message."""
        user_input = user_input.strip().upper()

        # Check for special commands
        if user_input in ['Q', 'QUIT', 'EXIT']:
            self.running = False
            return "Goodbye!"

        if user_input in ['H', 'HELP']:
            self.display_help()
            return None

        if user_input in ['C', 'CLEAR']:
            return self.calc.clear()

        if user_input in ['HISTORY']:
            return self.calc.show_history()

        if user_input == 'MS':
            return self.calc.memory_store()

        if user_input == 'MR':
            result = self.calc.memory_recall()
            self.calc.result = result
            return f"Memory: {self.format_result(result)}"

        if user_input == 'MC':
            return self.calc.memory_clear()

        if user_input == 'M+':
            return self.calc.memory_add()

        if user_input == 'M-':
            return self.calc.memory_subtract()

        # Process mathematical expression
        try:
            # Replace ANS with previous result
            expression = user_input.replace('ANS', str(self.calc.result))

            # Evaluate the expression
            result = self.calc.evaluate_expression(expression)
            self.calc.result = result

            # Add to history
            formatted_result = self.format_result(result)
            history_entry = f"{expression.lower()} = {formatted_result}"
            self.calc.history.append(history_entry)

            return formatted_result

        except ValueError as e:
            return str(e)
        except Exception as e:
            return f"Error: {str(e)}"

    def run(self):
        """Run the calculator CLI."""
        self.display_welcome()

        while self.running:
            try:
                # Display current result and prompt
                current = self.format_result(self.calc.result)
                print(f"\n[{current}] > ", end="")

                # Get user input
                user_input = input()

                # Process input
                result = self.process_input(user_input)

                # Display result
                if result:
                    print(f"= {result}")

            except KeyboardInterrupt:
                print("\n\nInterrupted. Type 'QUIT' to exit properly.")
            except EOFError:
                self.running = False
                print("\n\nGoodbye!")


def main():
    """Main entry point."""
    # Check for command-line arguments
    if len(sys.argv) > 1:
        # Direct calculation mode
        expression = ' '.join(sys.argv[1:])
        calc = Calculator()
        try:
            result = calc.evaluate_expression(expression)
            print(f"{expression} = {result}")
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Interactive mode
        cli = CalculatorCLI()
        cli.run()


if __name__ == "__main__":
    main()