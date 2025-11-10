#!/usr/bin/env python3
"""
Debugger Agent - Intelligent error analysis and automated fixing

This agent provides:
1. Test failure parsing and analysis
2. Stack trace interpretation
3. Error pattern recognition
4. Automated fix suggestions
5. Common issue auto-fixing
"""

import os
import asyncio
import json
import re
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


@dataclass
class TestFailure:
    """Individual test failure"""
    test_name: str
    test_file: str
    error_type: str
    error_message: str
    stack_trace: List[str] = field(default_factory=list)
    line_number: Optional[int] = None
    column_number: Optional[int] = None


@dataclass
class DebugAnalysis:
    """Analysis of an error or test failure"""
    error_category: str  # e.g., "TypeError", "AssertionError", "ImportError"
    root_cause: str
    affected_files: List[str] = field(default_factory=list)
    suggested_fixes: List[str] = field(default_factory=list)
    code_snippets: Dict[str, str] = field(default_factory=dict)  # file -> problematic code
    confidence: float = 0.0  # 0-1, how confident we are in the analysis


@dataclass
class AutoFix:
    """Automated fix that can be applied"""
    file_path: str
    fix_type: str  # e.g., "import_addition", "type_correction", "syntax_fix"
    description: str
    old_content: str
    new_content: str
    confidence: float
    can_auto_apply: bool = False


@dataclass
class DebugResult:
    """Result from debugging analysis"""
    success: bool
    failures_analyzed: int
    analyses: List[DebugAnalysis] = field(default_factory=list)
    auto_fixes: List[AutoFix] = field(default_factory=list)
    manual_steps: List[str] = field(default_factory=list)
    error: Optional[str] = None


class DebuggerAgent:
    """
    Intelligent debugging agent.

    Capabilities:
    - Parse pytest/jest test failures
    - Analyze stack traces
    - Identify error patterns
    - Suggest fixes
    - Generate auto-fix patches
    - Provide step-by-step debugging guidance
    """

    def __init__(
        self,
        agent_id: str,
        verbose: bool = False
    ):
        """
        Initialize Debugger agent.

        Args:
            agent_id: Unique identifier for this agent instance
            verbose: Enable verbose logging
        """
        self.agent_id = agent_id
        self.verbose = verbose

        # Common error patterns and fixes
        self.error_patterns = self._initialize_error_patterns()

        print(f"[Debugger-{self.agent_id}] Initialized with {len(self.error_patterns)} error patterns")

    def _initialize_error_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize common error patterns and their fixes"""
        return {
            "ModuleNotFoundError": {
                "pattern": r"No module named '(\w+)'",
                "category": "Missing Dependency",
                "fix_template": "Install missing package: pip install {module}",
                "confidence": 0.9
            },
            "ImportError": {
                "pattern": r"cannot import name '(\w+)' from '([\w.]+)'",
                "category": "Import Error",
                "fix_template": "Check if '{name}' exists in '{module}'. Verify spelling and module structure.",
                "confidence": 0.8
            },
            "AttributeError": {
                "pattern": r"'(\w+)' object has no attribute '(\w+)'",
                "category": "Attribute Error",
                "fix_template": "Object type '{obj}' doesn't have attribute '{attr}'. Check object type and attribute name.",
                "confidence": 0.7
            },
            "TypeError": {
                "pattern": r"(\w+)\(\) (missing|got) (\d+) (required )?positional argument",
                "category": "Function Signature",
                "fix_template": "Function called with wrong number of arguments. Check function signature and parameters.",
                "confidence": 0.8
            },
            "SyntaxError": {
                "pattern": r"invalid syntax",
                "category": "Syntax Error",
                "fix_template": "Fix syntax error at line {line}. Common causes: missing parentheses, colons, or quotes.",
                "confidence": 0.9
            },
            "IndentationError": {
                "pattern": r"(unexpected indent|expected an indented block)",
                "category": "Indentation Error",
                "fix_template": "Fix indentation at line {line}. Python requires consistent indentation.",
                "confidence": 0.95
            },
            "KeyError": {
                "pattern": r"KeyError: '(\w+)'",
                "category": "Missing Key",
                "fix_template": "Key '{key}' not found in dictionary. Add key or use .get() with default value.",
                "confidence": 0.8
            },
            "ValueError": {
                "pattern": r"ValueError: (.+)",
                "category": "Value Error",
                "fix_template": "Invalid value provided. Check input validation and type conversion.",
                "confidence": 0.6
            },
            "FileNotFoundError": {
                "pattern": r"No such file or directory: '(.+)'",
                "category": "Missing File",
                "fix_template": "File '{file}' not found. Check file path and ensure file exists.",
                "confidence": 0.9
            },
            "AssertionError": {
                "pattern": r"AssertionError: (.+)",
                "category": "Test Assertion",
                "fix_template": "Assertion failed: {message}. Review test expectations and actual output.",
                "confidence": 0.7
            }
        }

    async def analyze_test_failures(
        self, test_output: str, test_framework: str = "pytest"
    ) -> DebugResult:
        """
        Analyze test failures and provide debugging guidance.

        Args:
            test_output: Raw output from test run
            test_framework: Test framework used (pytest, jest, etc.)

        Returns:
            DebugResult with analysis and fixes
        """
        print(f"[Debugger-{self.agent_id}] Analyzing test failures...")

        await publish_event({
            "type": "debug_analysis_started",
            "agent_id": self.agent_id,
            "timestamp": datetime.now().isoformat()
        })

        try:
            # Parse test failures
            if test_framework == "pytest":
                failures = self._parse_pytest_output(test_output)
            elif test_framework == "jest":
                failures = self._parse_jest_output(test_output)
            else:
                return DebugResult(
                    success=False,
                    failures_analyzed=0,
                    error=f"Unsupported test framework: {test_framework}"
                )

            print(f"[Debugger-{self.agent_id}] Found {len(failures)} test failures")

            # Analyze each failure
            analyses = []
            auto_fixes = []
            manual_steps = []

            for failure in failures:
                analysis = await self._analyze_failure(failure)
                analyses.append(analysis)

                # Generate auto-fixes if possible
                fixes = self._generate_auto_fixes(failure, analysis)
                auto_fixes.extend(fixes)

                # Add manual steps for complex issues
                if analysis.confidence < 0.7:
                    manual_steps.extend(analysis.suggested_fixes)

            print(f"[Debugger-{self.agent_id}] Analysis complete: {len(analyses)} analyses, {len(auto_fixes)} auto-fixes")

            await publish_event({
                "type": "debug_analysis_completed",
                "agent_id": self.agent_id,
                "failures_analyzed": len(failures),
                "auto_fixes_generated": len(auto_fixes),
                "timestamp": datetime.now().isoformat()
            })

            return DebugResult(
                success=True,
                failures_analyzed=len(failures),
                analyses=analyses,
                auto_fixes=auto_fixes,
                manual_steps=manual_steps
            )

        except Exception as e:
            error_msg = f"Debug analysis failed: {str(e)}"
            print(f"[Debugger-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "debug_analysis_failed",
                "agent_id": self.agent_id,
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            })

            return DebugResult(
                success=False,
                failures_analyzed=0,
                error=error_msg
            )

    def _parse_pytest_output(self, output: str) -> List[TestFailure]:
        """Parse pytest output to extract failures"""
        failures = []

        # Split into sections by test failures
        failure_sections = re.split(r"_{20,} .+ _{20,}", output)

        for section in failure_sections:
            # Extract test name
            test_match = re.search(r"^(test_\w+)", section, re.MULTILINE)
            test_file_match = re.search(r"([a-zA-Z0-9_/]+\.py):(\d+)", section)

            if test_match and test_file_match:
                test_name = test_match.group(1)
                test_file = test_file_match.group(1)
                line_number = int(test_file_match.group(2))

                # Extract error type and message
                error_match = re.search(r"(\w+Error): (.+?)(?:\n|$)", section)
                if error_match:
                    error_type = error_match.group(1)
                    error_message = error_match.group(2)

                    # Extract stack trace
                    stack_trace = []
                    for line in section.split("\n"):
                        if line.strip().startswith("E "):
                            stack_trace.append(line.strip()[2:])

                    failures.append(TestFailure(
                        test_name=test_name,
                        test_file=test_file,
                        error_type=error_type,
                        error_message=error_message,
                        stack_trace=stack_trace,
                        line_number=line_number
                    ))

        return failures

    def _parse_jest_output(self, output: str) -> List[TestFailure]:
        """Parse jest output to extract failures"""
        failures = []

        # Jest failure pattern: "● Test suite name › test name"
        failure_sections = re.split(r"● .+ › .+", output)

        for section in failure_sections[1:]:  # Skip first empty section
            # Extract test info
            test_match = re.search(r"at .+\.test\.[jt]sx?:(\d+):(\d+)", section)
            error_match = re.search(r"(Error): (.+?)(?:\n|$)", section)

            if test_match and error_match:
                line_number = int(test_match.group(1))
                column_number = int(test_match.group(2))
                error_type = error_match.group(1)
                error_message = error_match.group(2)

                # Extract stack trace
                stack_trace = []
                in_stack = False
                for line in section.split("\n"):
                    if "at " in line:
                        in_stack = True
                    if in_stack and line.strip():
                        stack_trace.append(line.strip())

                failures.append(TestFailure(
                    test_name="Unknown",  # Jest format doesn't always show test name clearly
                    test_file="Unknown",
                    error_type=error_type,
                    error_message=error_message,
                    stack_trace=stack_trace,
                    line_number=line_number,
                    column_number=column_number
                ))

        return failures

    async def _analyze_failure(self, failure: TestFailure) -> DebugAnalysis:
        """Analyze a single test failure"""
        print(f"[Debugger-{self.agent_id}] Analyzing: {failure.test_name} - {failure.error_type}")

        # Match error pattern
        pattern_data = self.error_patterns.get(failure.error_type, {})
        pattern = pattern_data.get("pattern", "")

        # Extract details from error message
        suggested_fixes = []
        confidence = pattern_data.get("confidence", 0.5)

        if pattern:
            match = re.search(pattern, failure.error_message)
            if match:
                # Generate fix based on pattern
                fix_template = pattern_data.get("fix_template", "")
                if "{module}" in fix_template and match.lastindex >= 1:
                    suggested_fixes.append(fix_template.format(module=match.group(1)))
                elif "{name}" in fix_template and match.lastindex >= 2:
                    suggested_fixes.append(fix_template.format(
                        name=match.group(1),
                        module=match.group(2)
                    ))
                elif "{obj}" in fix_template and match.lastindex >= 2:
                    suggested_fixes.append(fix_template.format(
                        obj=match.group(1),
                        attr=match.group(2)
                    ))
                elif "{key}" in fix_template:
                    suggested_fixes.append(fix_template.format(key=match.group(1)))
                elif "{file}" in fix_template:
                    suggested_fixes.append(fix_template.format(file=match.group(1)))
                else:
                    suggested_fixes.append(fix_template.format(line=failure.line_number or "unknown"))

        # Add generic suggestions if no specific fix found
        if not suggested_fixes:
            suggested_fixes.append(f"Review {failure.error_type} at {failure.test_file}:{failure.line_number}")
            suggested_fixes.append(f"Error message: {failure.error_message}")
            suggested_fixes.append("Check recent code changes that might have caused this issue")

        return DebugAnalysis(
            error_category=pattern_data.get("category", failure.error_type),
            root_cause=failure.error_message,
            affected_files=[failure.test_file],
            suggested_fixes=suggested_fixes,
            confidence=confidence
        )

    def _generate_auto_fixes(
        self, failure: TestFailure, analysis: DebugAnalysis
    ) -> List[AutoFix]:
        """Generate automated fixes for common issues"""
        auto_fixes = []

        # Auto-fix for missing imports
        if failure.error_type == "ModuleNotFoundError":
            module_match = re.search(r"No module named '(\w+)'", failure.error_message)
            if module_match:
                module_name = module_match.group(1)
                auto_fixes.append(AutoFix(
                    file_path="requirements.txt",
                    fix_type="dependency_addition",
                    description=f"Add {module_name} to requirements.txt",
                    old_content="",
                    new_content=f"{module_name}\n",
                    confidence=0.9,
                    can_auto_apply=True
                ))

        # Auto-fix for common import errors
        elif failure.error_type == "ImportError":
            import_match = re.search(r"cannot import name '(\w+)' from '([\w.]+)'", failure.error_message)
            if import_match:
                name = import_match.group(1)
                module = import_match.group(2)
                auto_fixes.append(AutoFix(
                    file_path=failure.test_file,
                    fix_type="import_correction",
                    description=f"Verify import of '{name}' from '{module}'",
                    old_content=f"from {module} import {name}",
                    new_content=f"# TODO: Fix import - from {module} import {name}",
                    confidence=0.6,
                    can_auto_apply=False
                ))

        return auto_fixes

    async def analyze_stack_trace(self, stack_trace: str) -> Dict[str, Any]:
        """
        Analyze a raw stack trace and provide insights.

        Args:
            stack_trace: Raw stack trace string

        Returns:
            Dictionary with analysis results
        """
        print(f"[Debugger-{self.agent_id}] Analyzing stack trace...")

        # Extract file paths and line numbers
        file_references = re.findall(r'File "(.+?)", line (\d+)', stack_trace)

        # Find the most relevant file (usually the last user file, not library files)
        relevant_files = [
            (file, line) for file, line in file_references
            if not any(lib in file for lib in ["site-packages", "lib/python", "venv"])
        ]

        # Extract error type and message
        error_match = re.search(r"(\w+Error): (.+?)$", stack_trace, re.MULTILINE)

        analysis = {
            "error_type": error_match.group(1) if error_match else "Unknown",
            "error_message": error_match.group(2) if error_match else "Unknown",
            "relevant_files": relevant_files[-3:] if relevant_files else [],
            "stack_depth": len(file_references),
            "is_library_error": len(relevant_files) == 0
        }

        return analysis


async def main():
    """Test the debugger agent"""
    print("Testing Debugger Agent...")
    print()

    agent = DebuggerAgent(agent_id="test-debugger", verbose=True)

    # Sample pytest failure
    sample_output = """
============================== FAILURES ===============================
____________________________ test_calculator __________________________

test_calculator.py:10: in test_calculator
    result = add(2, 3)
E   TypeError: add() missing 1 required positional argument: 'b'

============================== short test summary info ================
FAILED test_calculator.py::test_calculator - TypeError: add() missing 1 required positional argument: 'b'
"""

    result = await agent.analyze_test_failures(sample_output, test_framework="pytest")

    print()
    print("=" * 70)
    print("DEBUG ANALYSIS RESULTS")
    print("=" * 70)
    print(f"Success: {result.success}")
    print(f"Failures Analyzed: {result.failures_analyzed}")
    print()

    for i, analysis in enumerate(result.analyses, 1):
        print(f"Analysis {i}:")
        print(f"  Category: {analysis.error_category}")
        print(f"  Root Cause: {analysis.root_cause}")
        print(f"  Confidence: {analysis.confidence:.1%}")
        print(f"  Suggested Fixes:")
        for fix in analysis.suggested_fixes:
            print(f"    - {fix}")
        print()

    if result.auto_fixes:
        print("Auto-Fixes:")
        for fix in result.auto_fixes:
            print(f"  [{fix.fix_type}] {fix.description}")
            print(f"    Confidence: {fix.confidence:.1%}")
            print(f"    Can Auto-Apply: {fix.can_auto_apply}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
