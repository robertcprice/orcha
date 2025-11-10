"""
Scientific Calculator Implementation
A full-featured scientific calculator with GUI using tkinter and math module.
"""

import tkinter as tk
from tkinter import ttk
import math


class ScientificCalculator:
    """
    A comprehensive scientific calculator with GUI interface.

    Features:
    - Basic arithmetic operations (+, -, *, /)
    - Trigonometric functions (sin, cos, tan, asin, acos, atan)
    - Logarithmic functions (log, ln)
    - Exponential and power functions
    - Square root and factorial
    - Constants (pi, e)
    - Memory functions (M+, M-, MR, MC)
    - Parentheses support
    - Degree/Radian mode toggle
    """

    def __init__(self, root):
        """Initialize the calculator with GUI components."""
        self.root = root
        self.root.title("Scientific Calculator")
        self.root.geometry("400x600")
        self.root.resizable(False, False)

        # Calculator state
        self.expression = ""
        self.memory = 0
        self.angle_mode = "deg"  # deg or rad
        self.result_displayed = False

        # Create UI
        self.create_widgets()

    def create_widgets(self):
        """Create all GUI widgets."""
        # Display frame
        display_frame = tk.Frame(self.root, bg="#2b2b2b")
        display_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Mode indicator
        self.mode_label = tk.Label(
            display_frame,
            text="DEG",
            font=("Arial", 10),
            bg="#2b2b2b",
            fg="#00ff00",
            anchor="e"
        )
        self.mode_label.pack(fill=tk.X, padx=5, pady=(5, 0))

        # Expression display
        self.expression_display = tk.Label(
            display_frame,
            text="",
            font=("Arial", 12),
            bg="#2b2b2b",
            fg="#888888",
            anchor="e",
            height=2
        )
        self.expression_display.pack(fill=tk.X, padx=5)

        # Result display
        self.display = tk.Entry(
            display_frame,
            font=("Arial", 20, "bold"),
            justify="right",
            bg="#1a1a1a",
            fg="#ffffff",
            insertbackground="#ffffff",
            relief=tk.FLAT,
            bd=10
        )
        self.display.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.display.insert(0, "0")

        # Buttons frame
        buttons_frame = tk.Frame(self.root, bg="#1a1a1a")
        buttons_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        # Button definitions
        buttons = [
            # Row 1 - Memory and mode functions
            [("MC", self.memory_clear, "#4a4a4a"), ("MR", self.memory_recall, "#4a4a4a"),
             ("M+", self.memory_add, "#4a4a4a"), ("M-", self.memory_subtract, "#4a4a4a"),
             ("DEG/RAD", self.toggle_mode, "#4a4a4a")],

            # Row 2 - Advanced functions
            [("sin", lambda: self.add_function("sin("), "#ff9500"), ("cos", lambda: self.add_function("cos("), "#ff9500"),
             ("tan", lambda: self.add_function("tan("), "#ff9500"), ("π", lambda: self.add_to_expression("π"), "#ff9500"),
             ("e", lambda: self.add_to_expression("e"), "#ff9500")],

            # Row 3 - More functions
            [("asin", lambda: self.add_function("asin("), "#ff9500"), ("acos", lambda: self.add_function("acos("), "#ff9500"),
             ("atan", lambda: self.add_function("atan("), "#ff9500"), ("x²", lambda: self.add_to_expression("²"), "#ff9500"),
             ("xʸ", lambda: self.add_to_expression("^"), "#ff9500")],

            # Row 4 - Logarithmic and root functions
            [("log", lambda: self.add_function("log("), "#ff9500"), ("ln", lambda: self.add_function("ln("), "#ff9500"),
             ("√", lambda: self.add_function("√("), "#ff9500"), ("x!", lambda: self.add_to_expression("!"), "#ff9500"),
             ("(", lambda: self.add_to_expression("("), "#ff9500")],

            # Row 5
            [(")", lambda: self.add_to_expression(")"), "#ff9500"), ("C", self.clear, "#d4380d"),
             ("⌫", self.backspace, "#d4380d"), ("/", lambda: self.add_to_expression("/"), "#ff9500"),
             ("%", lambda: self.add_to_expression("%"), "#ff9500")],

            # Row 6
            [("7", lambda: self.add_to_expression("7"), "#505050"), ("8", lambda: self.add_to_expression("8"), "#505050"),
             ("9", lambda: self.add_to_expression("9"), "#505050"), ("*", lambda: self.add_to_expression("*"), "#ff9500"),
             ("1/x", self.reciprocal, "#ff9500")],

            # Row 7
            [("4", lambda: self.add_to_expression("4"), "#505050"), ("5", lambda: self.add_to_expression("5"), "#505050"),
             ("6", lambda: self.add_to_expression("6"), "#505050"), ("-", lambda: self.add_to_expression("-"), "#ff9500"),
             ("|x|", lambda: self.add_function("abs("), "#ff9500")],

            # Row 8
            [("1", lambda: self.add_to_expression("1"), "#505050"), ("2", lambda: self.add_to_expression("2"), "#505050"),
             ("3", lambda: self.add_to_expression("3"), "#505050"), ("+", lambda: self.add_to_expression("+"), "#ff9500"),
             ("±", self.negate, "#ff9500")],

            # Row 9
            [("0", lambda: self.add_to_expression("0"), "#505050"), (".", lambda: self.add_to_expression("."), "#505050"),
             ("EXP", lambda: self.add_to_expression("E"), "#505050"), ("=", self.calculate, "#00a870"),
             ("=", self.calculate, "#00a870")]
        ]

        # Create buttons
        for row_idx, row in enumerate(buttons):
            for col_idx, (text, command, color) in enumerate(row):
                btn = tk.Button(
                    buttons_frame,
                    text=text,
                    command=command,
                    font=("Arial", 12, "bold"),
                    bg=color,
                    fg="#ffffff",
                    activebackground="#666666",
                    activeforeground="#ffffff",
                    relief=tk.FLAT,
                    bd=0
                )
                btn.grid(row=row_idx, column=col_idx, sticky="nsew", padx=2, pady=2)

        # Configure grid weights for responsive layout
        for i in range(9):
            buttons_frame.rowconfigure(i, weight=1)
        for i in range(5):
            buttons_frame.columnconfigure(i, weight=1)

    def add_to_expression(self, value):
        """Add a value to the current expression."""
        if self.result_displayed:
            self.expression = ""
            self.result_displayed = False

        self.expression += str(value)
        self.update_display()

    def add_function(self, func):
        """Add a function to the expression."""
        if self.result_displayed:
            self.expression = ""
            self.result_displayed = False

        self.expression += func
        self.update_display()

    def update_display(self):
        """Update the display with current expression."""
        self.expression_display.config(text=self.expression)
        self.display.delete(0, tk.END)
        display_text = self.expression if self.expression else "0"
        self.display.insert(0, display_text)

    def clear(self):
        """Clear the expression and display."""
        self.expression = ""
        self.result_displayed = False
        self.display.delete(0, tk.END)
        self.display.insert(0, "0")
        self.expression_display.config(text="")

    def backspace(self):
        """Remove the last character from expression."""
        if not self.result_displayed and self.expression:
            self.expression = self.expression[:-1]
            self.update_display()

    def toggle_mode(self):
        """Toggle between degree and radian mode."""
        self.angle_mode = "rad" if self.angle_mode == "deg" else "deg"
        self.mode_label.config(text=self.angle_mode.upper())

    def convert_expression(self, expr):
        """Convert custom notation to Python-evaluable expression."""
        import re

        # Replace custom symbols with Python equivalents (but preserve scientific notation)
        expr = expr.replace("π", str(math.pi))

        # Handle 'e' carefully - only replace standalone 'e', not in scientific notation
        expr = re.sub(r'(?<!\d)e(?!\d)', str(math.e), expr)

        expr = expr.replace("²", "**2")
        expr = expr.replace("^", "**")
        expr = expr.replace("√", "math.sqrt")

        # Handle factorial
        while "!" in expr:
            idx = expr.index("!")
            start = idx - 1
            while start >= 0 and (expr[start].isdigit() or expr[start] == "."):
                start -= 1
            start += 1
            num = expr[start:idx]
            factorial_result = str(math.factorial(int(float(num))))
            expr = expr[:start] + factorial_result + expr[idx+1:]

        # Handle trigonometric functions with angle mode
        if self.angle_mode == "deg":
            # Replace trig functions and balance parentheses for degree mode
            for func in ['sin', 'cos', 'tan']:
                expr = expr.replace(func + '(', f'math.{func}(math.radians(')

            for func in ['asin', 'acos', 'atan']:
                expr = expr.replace(func + '(', f'math.degrees(math.{func}(')

            # Balance parentheses for regular trig functions
            for func in ['sin', 'cos', 'tan']:
                pattern = f'math.{func}(math.radians('
                offset = 0
                while True:
                    idx = expr.find(pattern, offset)
                    if idx == -1:
                        break
                    paren_count = 2
                    pos = idx + len(pattern)
                    while pos < len(expr) and paren_count > 0:
                        if expr[pos] == '(':
                            paren_count += 1
                        elif expr[pos] == ')':
                            paren_count -= 1
                            if paren_count == 1:
                                expr = expr[:pos] + ')' + expr[pos:]
                                offset = pos + 2
                                break
                        pos += 1
                    if paren_count == 0:
                        offset = pos + 1

            # Balance parentheses for inverse trig functions
            for func in ['asin', 'acos', 'atan']:
                pattern = f'math.degrees(math.{func}('
                offset = 0
                while True:
                    idx = expr.find(pattern, offset)
                    if idx == -1:
                        break
                    paren_count = 2
                    pos = idx + len(pattern)
                    while pos < len(expr) and paren_count > 0:
                        if expr[pos] == '(':
                            paren_count += 1
                        elif expr[pos] == ')':
                            paren_count -= 1
                            if paren_count == 1:
                                expr = expr[:pos] + ')' + expr[pos:]
                                offset = pos + 2
                                break
                        pos += 1
                    if paren_count == 0:
                        offset = pos + 1
        else:
            expr = expr.replace("sin(", "math.sin(")
            expr = expr.replace("cos(", "math.cos(")
            expr = expr.replace("tan(", "math.tan(")
            expr = expr.replace("asin(", "math.asin(")
            expr = expr.replace("acos(", "math.acos(")
            expr = expr.replace("atan(", "math.atan(")

        # Handle logarithms
        expr = expr.replace("log(", "math.log10(")
        expr = expr.replace("ln(", "math.log(")

        # Handle absolute value
        expr = expr.replace("abs(", "abs(")

        # Handle percentage
        expr = expr.replace("%", "/100")

        return expr

    def calculate(self):
        """Evaluate the current expression."""
        try:
            if not self.expression:
                return

            # Convert and evaluate expression
            python_expr = self.convert_expression(self.expression)
            result = eval(python_expr)

            # Format result
            if isinstance(result, float):
                if result.is_integer():
                    result = int(result)
                else:
                    # Round to 10 decimal places to avoid floating point errors
                    result = round(result, 10)

            # Update display
            self.display.delete(0, tk.END)
            self.display.insert(0, str(result))
            self.expression_display.config(text=self.expression + " =")

            # Store result for next operation
            self.expression = str(result)
            self.result_displayed = True

        except ZeroDivisionError:
            self.display.delete(0, tk.END)
            self.display.insert(0, "Error: Division by zero")
            self.expression = ""
        except ValueError as e:
            self.display.delete(0, tk.END)
            self.display.insert(0, f"Error: Math error")
            self.expression = ""
        except Exception as e:
            self.display.delete(0, tk.END)
            self.display.insert(0, "Error: Invalid expression")
            self.expression = ""

    def negate(self):
        """Negate the current value."""
        try:
            current = self.display.get()
            if current and current != "0":
                if current.startswith("-"):
                    new_value = current[1:]
                else:
                    new_value = "-" + current
                self.expression = new_value
                self.update_display()
        except:
            pass

    def reciprocal(self):
        """Calculate reciprocal (1/x)."""
        try:
            current = self.display.get()
            if current and current != "0":
                result = 1 / float(current)
                self.expression = str(result)
                self.update_display()
        except:
            self.display.delete(0, tk.END)
            self.display.insert(0, "Error: Cannot divide by zero")

    def memory_clear(self):
        """Clear memory."""
        self.memory = 0

    def memory_recall(self):
        """Recall value from memory."""
        self.expression = str(self.memory)
        self.update_display()

    def memory_add(self):
        """Add current value to memory."""
        try:
            current = float(self.display.get())
            self.memory += current
        except:
            pass

    def memory_subtract(self):
        """Subtract current value from memory."""
        try:
            current = float(self.display.get())
            self.memory -= current
        except:
            pass


def main():
    """Main function to run the calculator."""
    root = tk.Tk()
    calculator = ScientificCalculator(root)
    root.mainloop()


if __name__ == "__main__":
    main()
