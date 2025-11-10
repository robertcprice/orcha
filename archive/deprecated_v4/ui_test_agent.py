#!/usr/bin/env python3
"""
UI Test Agent - Automated UI validation for web applications

This agent tests web applications created by the orchestrator to ensure:
- Server is running and accessible
- Pages load without errors
- Critical elements are present
- No runtime errors
"""

import asyncio
import subprocess
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import re


@dataclass
class UITestResult:
    """Result from a single UI test"""

    test_name: str
    status: str  # passed, failed, skipped
    message: str
    response_time_ms: Optional[float] = None
    http_status: Optional[int] = None
    error_details: Optional[str] = None


@dataclass
class UITestReport:
    """Complete UI testing report"""

    app_url: str
    tests_run: int
    tests_passed: int
    tests_failed: int
    tests_skipped: int
    test_results: List[UITestResult]
    overall_status: str  # passed, failed, partial
    timestamp: str
    total_time_seconds: float


class UITestAgent:
    """
    Automated UI testing agent for web applications.

    Tests pages for:
    - HTTP accessibility
    - Error-free loading
    - Presence of key elements
    - Proper redirects
    """

    def __init__(self, app_url: str, timeout_seconds: int = 30):
        self.app_url = app_url.rstrip('/')
        self.timeout = timeout_seconds

    async def test_application(
        self,
        pages_to_test: Optional[List[Dict[str, any]]] = None,
        verbose: bool = True
    ) -> UITestReport:
        """
        Test the web application UI.

        Args:
            pages_to_test: List of pages with test specs:
                [
                    {
                        "path": "/",
                        "name": "Homepage",
                        "expected_status": [200, 307],  # Allow redirects
                        "required_elements": ["<title>", "App Name"],
                        "should_not_contain": ["Error", "500"]
                    }
                ]
            verbose: Print progress

        Returns:
            UITestReport with test results
        """

        start_time = datetime.now()

        if verbose:
            print(f"\n{'='*80}")
            print("UI TEST AGENT - Automated UI Validation")
            print(f"{'='*80}\n")
            print(f"Target: {self.app_url}")
            print(f"Timeout: {self.timeout}s\n")

        # Default pages if none specified
        if pages_to_test is None:
            pages_to_test = [
                {
                    "path": "/",
                    "name": "Homepage",
                    "expected_status": [200, 301, 302, 307, 308],  # Allow redirects
                    "required_elements": [],
                    "should_not_contain": ["500 Internal Server Error", "Cannot GET"]
                }
            ]

        test_results = []

        # Test 1: Server accessibility
        server_test = await self._test_server_running(verbose)
        test_results.append(server_test)

        if server_test.status != "passed":
            # Server not accessible, skip page tests
            if verbose:
                print(f"⚠️  Server not accessible, skipping page tests\n")

            skipped_count = len(pages_to_test)
            for page in pages_to_test:
                test_results.append(UITestResult(
                    test_name=f"Page: {page['name']}",
                    status="skipped",
                    message="Skipped due to server inaccessibility"
                ))
        else:
            # Test each page
            for page_config in pages_to_test:
                page_test = await self._test_page(page_config, verbose)
                test_results.append(page_test)

        # Calculate results
        tests_passed = sum(1 for r in test_results if r.status == "passed")
        tests_failed = sum(1 for r in test_results if r.status == "failed")
        tests_skipped = sum(1 for r in test_results if r.status == "skipped")

        if tests_failed == 0 and tests_passed > 0:
            overall_status = "passed"
        elif tests_passed > 0:
            overall_status = "partial"
        else:
            overall_status = "failed"

        execution_time = (datetime.now() - start_time).total_seconds()

        report = UITestReport(
            app_url=self.app_url,
            tests_run=len(test_results),
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            tests_skipped=tests_skipped,
            test_results=test_results,
            overall_status=overall_status,
            timestamp=datetime.now().isoformat(),
            total_time_seconds=execution_time
        )

        if verbose:
            self._print_report(report)

        return report

    async def _test_server_running(self, verbose: bool) -> UITestResult:
        """Test if server is accessible"""

        if verbose:
            print("🌐 Testing server accessibility...")

        start_time = datetime.now()

        try:
            # Use curl to test server with timeout
            process = await asyncio.create_subprocess_exec(
                "curl",
                "-I",  # HEAD request
                "-s",  # Silent
                "-o", "/dev/null",  # Discard output
                "-w", "%{http_code}",  # Output status code only
                "--max-time", str(self.timeout),
                self.app_url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()
            response_time = (datetime.now() - start_time).total_seconds() * 1000

            if process.returncode == 0:
                status_code = int(stdout.decode().strip())

                if status_code < 500:  # Any status < 500 means server is running
                    if verbose:
                        print(f"   ✅ Server accessible (HTTP {status_code}) - {response_time:.0f}ms\n")

                    return UITestResult(
                        test_name="Server Accessibility",
                        status="passed",
                        message=f"Server responding with HTTP {status_code}",
                        response_time_ms=response_time,
                        http_status=status_code
                    )
                else:
                    if verbose:
                        print(f"   ❌ Server error (HTTP {status_code})\n")

                    return UITestResult(
                        test_name="Server Accessibility",
                        status="failed",
                        message=f"Server returned error status {status_code}",
                        response_time_ms=response_time,
                        http_status=status_code
                    )
            else:
                error_msg = stderr.decode().strip() if stderr else "Connection failed"

                if verbose:
                    print(f"   ❌ Server not accessible: {error_msg}\n")

                return UITestResult(
                    test_name="Server Accessibility",
                    status="failed",
                    message="Server not accessible",
                    error_details=error_msg
                )

        except Exception as e:
            if verbose:
                print(f"   ❌ Test error: {e}\n")

            return UITestResult(
                test_name="Server Accessibility",
                status="failed",
                message="Test execution error",
                error_details=str(e)
            )

    async def _test_page(
        self,
        page_config: Dict[str, any],
        verbose: bool
    ) -> UITestResult:
        """Test a single page"""

        path = page_config.get("path", "/")
        name = page_config.get("name", path)
        expected_status = page_config.get("expected_status", [200])
        required_elements = page_config.get("required_elements", [])
        should_not_contain = page_config.get("should_not_contain", [])

        url = f"{self.app_url}{path}"

        if verbose:
            print(f"📄 Testing page: {name} ({path})")

        start_time = datetime.now()

        try:
            # Fetch page content
            process = await asyncio.create_subprocess_exec(
                "curl",
                "-s",  # Silent
                "-w", "\n%{http_code}",  # Append status code
                "-L",  # Follow redirects
                "--max-time", str(self.timeout),
                url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()
            response_time = (datetime.now() - start_time).total_seconds() * 1000

            if process.returncode != 0:
                error_msg = stderr.decode().strip() if stderr else "Request failed"

                if verbose:
                    print(f"   ❌ Request failed: {error_msg}\n")

                return UITestResult(
                    test_name=f"Page: {name}",
                    status="failed",
                    message="Failed to fetch page",
                    error_details=error_msg
                )

            # Parse response
            output = stdout.decode()
            lines = output.rsplit('\n', 1)
            content = lines[0] if len(lines) > 1 else ""
            status_code = int(lines[-1]) if len(lines) > 1 else 0

            # Check status code
            if status_code not in expected_status:
                if verbose:
                    print(f"   ❌ Unexpected status: {status_code} (expected {expected_status})\n")

                return UITestResult(
                    test_name=f"Page: {name}",
                    status="failed",
                    message=f"Unexpected HTTP status {status_code}",
                    response_time_ms=response_time,
                    http_status=status_code
                )

            # Check required elements
            for element in required_elements:
                if element not in content:
                    if verbose:
                        print(f"   ❌ Missing required element: {element}\n")

                    return UITestResult(
                        test_name=f"Page: {name}",
                        status="failed",
                        message=f"Missing required element: {element}",
                        response_time_ms=response_time,
                        http_status=status_code
                    )

            # Check for forbidden content
            for forbidden in should_not_contain:
                if forbidden in content:
                    if verbose:
                        print(f"   ❌ Found forbidden content: {forbidden}\n")

                    return UITestResult(
                        test_name=f"Page: {name}",
                        status="failed",
                        message=f"Page contains forbidden content: {forbidden}",
                        response_time_ms=response_time,
                        http_status=status_code,
                        error_details=f"Found: {forbidden}"
                    )

            # All checks passed
            if verbose:
                print(f"   ✅ Page OK (HTTP {status_code}) - {response_time:.0f}ms")
                if required_elements:
                    print(f"      ✓ {len(required_elements)} required element(s) found")
                print()

            return UITestResult(
                test_name=f"Page: {name}",
                status="passed",
                message=f"Page loaded successfully (HTTP {status_code})",
                response_time_ms=response_time,
                http_status=status_code
            )

        except Exception as e:
            if verbose:
                print(f"   ❌ Test error: {e}\n")

            return UITestResult(
                test_name=f"Page: {name}",
                status="failed",
                message="Test execution error",
                error_details=str(e)
            )

    def _print_report(self, report: UITestReport):
        """Print test report"""

        status_icon = {
            "passed": "✅",
            "partial": "⚠️",
            "failed": "❌"
        }

        print(f"{'─'*80}")
        print("UI TEST REPORT")
        print(f"{'─'*80}\n")

        print(f"{status_icon.get(report.overall_status, '•')} Overall: {report.overall_status.upper()}")
        print(f"⏱️  Total Time: {report.total_time_seconds:.2f}s")
        print(f"📊 Tests: {report.tests_run} total")
        print(f"   ✅ Passed: {report.tests_passed}")

        if report.tests_failed > 0:
            print(f"   ❌ Failed: {report.tests_failed}")

        if report.tests_skipped > 0:
            print(f"   ⏭️  Skipped: {report.tests_skipped}")

        # Show failed tests details
        if report.tests_failed > 0:
            print(f"\n{'─'*80}")
            print("FAILED TESTS")
            print(f"{'─'*80}\n")

            for result in report.test_results:
                if result.status == "failed":
                    print(f"❌ {result.test_name}")
                    print(f"   Message: {result.message}")
                    if result.error_details:
                        print(f"   Details: {result.error_details}")
                    if result.http_status:
                        print(f"   HTTP Status: {result.http_status}")
                    print()

        print(f"{'='*80}\n")


async def main():
    """Test UI testing agent"""

    # Example: Test a Next.js app
    agent = UITestAgent(
        app_url="http://localhost:3002",
        timeout_seconds=10
    )

    pages = [
        {
            "path": "/",
            "name": "Homepage",
            "expected_status": [200, 307],  # May redirect
            "should_not_contain": ["500", "Cannot GET", "Error"]
        },
        {
            "path": "/auth/signin",
            "name": "Sign In Page",
            "expected_status": [200],
            "required_elements": ["Sign in", "Google"],
            "should_not_contain": ["404", "500"]
        },
        {
            "path": "/dashboard",
            "name": "Dashboard",
            "expected_status": [200, 307],  # May redirect to signin
            "should_not_contain": ["500", "Cannot GET"]
        }
    ]

    report = await agent.test_application(pages_to_test=pages, verbose=True)

    print(f"\n✅ UI testing complete!")
    print(f"Status: {report.overall_status}")
    print(f"Passed: {report.tests_passed}/{report.tests_run}")


if __name__ == "__main__":
    asyncio.run(main())
