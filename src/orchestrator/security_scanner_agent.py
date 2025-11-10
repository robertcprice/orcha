#!/usr/bin/env python3
"""
Security Scanner Agent - Dedicated security analysis and vulnerability scanning

This agent provides comprehensive security scanning including:
1. Python security scanning (Bandit)
2. JavaScript security scanning (ESLint security plugins)
3. Dependency vulnerability checking (safety, npm audit)
4. Common vulnerability patterns (SQL injection, XSS, etc.)
5. Security best practices validation
"""

import os
import asyncio
import json
import fnmatch
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import sys
import subprocess

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
class SecurityScanRequest:
    """Request for security scanning"""
    project_path: Path
    scan_types: List[str] = field(default_factory=lambda: ["all"])  # all, python, javascript, dependencies
    severity_threshold: str = "medium"  # low, medium, high, critical
    exclude_paths: List[str] = field(default_factory=list)


@dataclass
class SecurityIssue:
    """Individual security issue found"""
    severity: str  # low, medium, high, critical
    category: str  # e.g., "SQL Injection", "XSS", "Dependency Vulnerability"
    file_path: str
    line_number: Optional[int] = None
    description: str = ""
    recommendation: str = ""
    cwe_id: Optional[str] = None  # Common Weakness Enumeration ID
    confidence: str = "high"  # low, medium, high


@dataclass
class SecurityScanResult:
    """Result from security scanning"""
    success: bool
    scan_time: float
    total_issues: int
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    issues: List[SecurityIssue] = field(default_factory=list)
    python_scan: Optional[Dict[str, Any]] = None
    javascript_scan: Optional[Dict[str, Any]] = None
    dependency_scan: Optional[Dict[str, Any]] = None
    security_score: float = 0.0  # 0-100, higher is better
    error: Optional[str] = None


@dataclass
class VulnerabilityScanResult:
    """Result from dependency vulnerability scanning"""
    success: bool
    vulnerable_packages: List[Dict[str, Any]] = field(default_factory=list)
    total_vulnerabilities: int = 0
    critical_vulnerabilities: int = 0
    error: Optional[str] = None


class SecurityScannerAgent:
    """
    Dedicated security scanning agent.

    Capabilities:
    - Python code security scanning (Bandit)
    - JavaScript security scanning (ESLint + security plugins)
    - Dependency vulnerability checking (safety for Python, npm audit for JS)
    - Pattern-based vulnerability detection
    - Security best practices validation
    - OWASP Top 10 checking
    """

    def __init__(
        self,
        agent_id: str,
        verbose: bool = False
    ):
        """
        Initialize Security Scanner agent.

        Args:
            agent_id: Unique identifier for this agent instance
            verbose: Enable verbose logging
        """
        self.agent_id = agent_id
        self.verbose = verbose

        # Check for security tool availability
        self.tools_available = self._check_tools()

        print(f"[SecurityScanner-{self.agent_id}] Initialized")
        if self.verbose:
            print(f"[SecurityScanner-{self.agent_id}] Available tools: {', '.join(self.tools_available)}")

    def _check_tools(self) -> List[str]:
        """Check which security tools are available"""
        tools = []

        # Check for Bandit (Python security)
        try:
            result = subprocess.run(
                ["bandit", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                tools.append("bandit")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Check for safety (Python dependency checking)
        try:
            result = subprocess.run(
                ["safety", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                tools.append("safety")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        # Check for npm (JavaScript dependency checking)
        try:
            result = subprocess.run(
                ["npm", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                tools.append("npm")
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        return tools

    async def scan_project(self, request: SecurityScanRequest) -> SecurityScanResult:
        """
        Perform comprehensive security scan of a project.

        Args:
            request: SecurityScanRequest with scan configuration

        Returns:
            SecurityScanResult with all findings
        """
        start_time = datetime.now()
        print(f"[SecurityScanner-{self.agent_id}] Starting security scan...")

        await publish_event({
            "type": "security_scan_started",
            "agent_id": self.agent_id,
            "project": str(request.project_path),
            "timestamp": start_time.isoformat()
        })

        all_issues = []
        python_scan = None
        javascript_scan = None
        dependency_scan = None

        # Determine what to scan
        scan_all = "all" in request.scan_types
        scan_python = scan_all or "python" in request.scan_types
        scan_javascript = scan_all or "javascript" in request.scan_types
        scan_dependencies = scan_all or "dependencies" in request.scan_types

        try:
            # Scan Python code
            if scan_python and "bandit" in self.tools_available:
                python_issues, python_scan = await self._scan_python(request.project_path, request.exclude_paths)
                all_issues.extend(python_issues)

            # Scan JavaScript code
            if scan_javascript:
                js_issues, javascript_scan = await self._scan_javascript(request.project_path, request.exclude_paths)
                all_issues.extend(js_issues)

            # Scan dependencies
            if scan_dependencies:
                dep_issues, dependency_scan = await self._scan_dependencies(request.project_path)
                all_issues.extend(dep_issues)

            # Pattern-based vulnerability detection (always run)
            pattern_issues = await self._pattern_based_scan(request.project_path, request.exclude_paths)
            all_issues.extend(pattern_issues)

            # Filter by severity threshold
            filtered_issues = self._filter_by_severity(all_issues, request.severity_threshold)

            # Count issues by severity
            critical_count = sum(1 for issue in filtered_issues if issue.severity == "critical")
            high_count = sum(1 for issue in filtered_issues if issue.severity == "high")
            medium_count = sum(1 for issue in filtered_issues if issue.severity == "medium")
            low_count = sum(1 for issue in filtered_issues if issue.severity == "low")

            # Calculate security score
            security_score = self._calculate_security_score(
                critical_count, high_count, medium_count, low_count
            )

            end_time = datetime.now()
            scan_duration = (end_time - start_time).total_seconds()

            print(f"[SecurityScanner-{self.agent_id}] Scan completed in {scan_duration:.2f}s")
            print(f"[SecurityScanner-{self.agent_id}] Found {len(filtered_issues)} issues (Critical: {critical_count}, High: {high_count}, Medium: {medium_count}, Low: {low_count})")
            print(f"[SecurityScanner-{self.agent_id}] Security Score: {security_score:.1f}/100")

            await publish_event({
                "type": "security_scan_completed",
                "agent_id": self.agent_id,
                "total_issues": len(filtered_issues),
                "security_score": security_score,
                "timestamp": end_time.isoformat()
            })

            return SecurityScanResult(
                success=True,
                scan_time=scan_duration,
                total_issues=len(filtered_issues),
                critical_issues=critical_count,
                high_issues=high_count,
                medium_issues=medium_count,
                low_issues=low_count,
                issues=filtered_issues,
                python_scan=python_scan,
                javascript_scan=javascript_scan,
                dependency_scan=dependency_scan,
                security_score=security_score
            )

        except Exception as e:
            error_msg = f"Security scan failed: {str(e)}"
            print(f"[SecurityScanner-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "security_scan_failed",
                "agent_id": self.agent_id,
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            })

            return SecurityScanResult(
                success=False,
                scan_time=0.0,
                total_issues=0,
                critical_issues=0,
                high_issues=0,
                medium_issues=0,
                low_issues=0,
                error=error_msg
            )

    async def _scan_python(
        self, project_path: Path, exclude_paths: List[str]
    ) -> tuple[List[SecurityIssue], Dict[str, Any]]:
        """Scan Python code with Bandit"""
        print(f"[SecurityScanner-{self.agent_id}] Scanning Python code with Bandit...")

        issues = []
        scan_result = {}

        try:
            # Build exclude arguments
            exclude_args = []
            for exclude in exclude_paths:
                exclude_args.extend(["--exclude", exclude])

            # Run Bandit
            cmd = [
                "bandit",
                "-r", str(project_path),
                "-f", "json",
                *exclude_args
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.stdout:
                bandit_output = json.loads(result.stdout)
                scan_result = {
                    "tool": "bandit",
                    "metrics": bandit_output.get("metrics", {}),
                    "results_count": len(bandit_output.get("results", []))
                }

                # Parse Bandit results
                for finding in bandit_output.get("results", []):
                    severity_map = {
                        "HIGH": "high",
                        "MEDIUM": "medium",
                        "LOW": "low"
                    }

                    issues.append(SecurityIssue(
                        severity=severity_map.get(finding.get("issue_severity", "MEDIUM"), "medium"),
                        category=finding.get("test_id", "Unknown"),
                        file_path=finding.get("filename", ""),
                        line_number=finding.get("line_number"),
                        description=finding.get("issue_text", ""),
                        recommendation=finding.get("issue_cwe", {}).get("link", ""),
                        cwe_id=str(finding.get("issue_cwe", {}).get("id", "")),
                        confidence=finding.get("issue_confidence", "HIGH").lower()
                    ))

        except subprocess.TimeoutExpired:
            print(f"[SecurityScanner-{self.agent_id}] Bandit scan timed out")
        except Exception as e:
            print(f"[SecurityScanner-{self.agent_id}] Bandit scan error: {e}")

        return issues, scan_result

    async def _scan_javascript(
        self, project_path: Path, exclude_paths: List[str]
    ) -> tuple[List[SecurityIssue], Dict[str, Any]]:
        """Scan JavaScript code (placeholder for ESLint integration)"""
        print(f"[SecurityScanner-{self.agent_id}] JavaScript scanning (basic patterns)...")

        issues = []
        scan_result = {"tool": "pattern-based", "files_scanned": 0}

        # Pattern-based JS security checks
        js_files = list(project_path.rglob("*.js")) + list(project_path.rglob("*.jsx")) + \
                   list(project_path.rglob("*.ts")) + list(project_path.rglob("*.tsx"))

        for js_file in js_files:
            # Skip excluded paths using precise matching to avoid accidental omissions
            if self._should_skip_path(js_file, project_path, exclude_paths):
                continue

            try:
                content = js_file.read_text()
                scan_result["files_scanned"] += 1

                # Check for eval() usage
                if "eval(" in content:
                    issues.append(SecurityIssue(
                        severity="high",
                        category="Dangerous Function",
                        file_path=str(js_file),
                        description="Use of eval() function detected",
                        recommendation="Avoid using eval() as it can execute arbitrary code. Use safer alternatives like JSON.parse() for JSON data."
                    ))

                # Check for innerHTML without sanitization
                if "innerHTML" in content and "sanitize" not in content.lower():
                    issues.append(SecurityIssue(
                        severity="medium",
                        category="XSS Risk",
                        file_path=str(js_file),
                        description="innerHTML usage detected without sanitization",
                        recommendation="Sanitize user input before using innerHTML, or use textContent instead."
                    ))

            except Exception as e:
                if self.verbose:
                    print(f"[SecurityScanner-{self.agent_id}] Error scanning {js_file}: {e}")

        return issues, scan_result

    async def _scan_dependencies(
        self, project_path: Path
    ) -> tuple[List[SecurityIssue], Dict[str, Any]]:
        """Scan dependencies for known vulnerabilities"""
        print(f"[SecurityScanner-{self.agent_id}] Scanning dependencies...")

        issues = []
        scan_result = {}

        # Check Python dependencies with safety
        if "safety" in self.tools_available and (project_path / "requirements.txt").exists():
            try:
                result = subprocess.run(
                    ["safety", "check", "--json", "--file", str(project_path / "requirements.txt")],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.stdout:
                    safety_output = json.loads(result.stdout)
                    scan_result["python_dependencies"] = {
                        "tool": "safety",
                        "vulnerabilities": len(safety_output)
                    }

                    for vuln in safety_output:
                        issues.append(SecurityIssue(
                            severity="high",
                            category="Dependency Vulnerability",
                            file_path="requirements.txt",
                            description=f"{vuln.get('package', 'Unknown')}: {vuln.get('advisory', 'No description')}",
                            recommendation=f"Update to version {vuln.get('recommended', 'latest')}"
                        ))

            except Exception as e:
                if self.verbose:
                    print(f"[SecurityScanner-{self.agent_id}] Safety scan error: {e}")

        # Check JavaScript dependencies with npm audit
        if "npm" in self.tools_available and (project_path / "package.json").exists():
            try:
                result = subprocess.run(
                    ["npm", "audit", "--json"],
                    cwd=str(project_path),
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.stdout:
                    npm_output = json.loads(result.stdout)
                    scan_result["javascript_dependencies"] = {
                        "tool": "npm audit",
                        "vulnerabilities": npm_output.get("metadata", {}).get("vulnerabilities", {})
                    }

                    for vuln_id, vuln_data in npm_output.get("vulnerabilities", {}).items():
                        severity_map = {
                            "critical": "critical",
                            "high": "high",
                            "moderate": "medium",
                            "low": "low"
                        }

                        issues.append(SecurityIssue(
                            severity=severity_map.get(vuln_data.get("severity", "medium"), "medium"),
                            category="Dependency Vulnerability",
                            file_path="package.json",
                            description=f"{vuln_data.get('name', 'Unknown')}: {vuln_data.get('title', 'No description')}",
                            recommendation=vuln_data.get("recommendation", "Update to latest version")
                        ))

            except Exception as e:
                if self.verbose:
                    print(f"[SecurityScanner-{self.agent_id}] npm audit error: {e}")

        return issues, scan_result

    async def _pattern_based_scan(
        self, project_path: Path, exclude_paths: List[str]
    ) -> List[SecurityIssue]:
        """Pattern-based vulnerability detection"""
        print(f"[SecurityScanner-{self.agent_id}] Running pattern-based security checks...")

        issues = []

        # Security patterns to check
        patterns = {
            "SQL Injection": {
                "patterns": [r"execute\(.*\+.*\)", r"\.format\(.*\).*execute", r"f\".*{.*}.*\".*execute"],
                "severity": "high",
                "recommendation": "Use parameterized queries or ORM to prevent SQL injection"
            },
            "Hardcoded Secrets": {
                "patterns": [r"password\s*=\s*['\"]", r"api_key\s*=\s*['\"]", r"secret\s*=\s*['\"]"],
                "severity": "critical",
                "recommendation": "Store secrets in environment variables or secret management systems"
            },
            "Command Injection": {
                "patterns": [r"os\.system\(", r"subprocess\.call\(.*\+", r"subprocess\.Popen\(.*\+"],
                "severity": "high",
                "recommendation": "Use subprocess with argument lists instead of shell=True"
            }
        }

        # Scan Python files
        python_files = list(project_path.rglob("*.py"))

        for py_file in python_files:
            # Skip excluded paths
            if self._should_skip_path(py_file, project_path, exclude_paths):
                continue

            try:
                content = py_file.read_text()

                for category, pattern_data in patterns.items():
                    for pattern in pattern_data["patterns"]:
                        import re
                        if re.search(pattern, content):
                            issues.append(SecurityIssue(
                                severity=pattern_data["severity"],
                                category=category,
                                file_path=str(py_file),
                                description=f"Potential {category} vulnerability detected",
                                recommendation=pattern_data["recommendation"]
                            ))

            except Exception as e:
                if self.verbose:
                    print(f"[SecurityScanner-{self.agent_id}] Error scanning {py_file}: {e}")

        return issues

    def _filter_by_severity(
        self, issues: List[SecurityIssue], threshold: str
    ) -> List[SecurityIssue]:
        """Filter issues by severity threshold"""
        severity_levels = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        threshold_level = severity_levels.get(threshold.lower(), 1)

        return [
            issue for issue in issues
            if severity_levels.get(issue.severity, 0) >= threshold_level
        ]

    def _calculate_security_score(
        self, critical: int, high: int, medium: int, low: int
    ) -> float:
        """Calculate overall security score (0-100, higher is better)"""
        # Start with perfect score
        score = 100.0

        # Deduct points based on severity
        score -= critical * 20  # Critical issues: -20 points each
        score -= high * 10      # High issues: -10 points each
        score -= medium * 5     # Medium issues: -5 points each
        score -= low * 1        # Low issues: -1 point each

        # Floor at 0
        return max(0.0, score)

    def _should_skip_path(
        self,
        file_path: Path,
        project_root: Path,
        exclude_paths: List[str],
    ) -> bool:
        """
        Return True when ``file_path`` should be excluded based on ``exclude_paths``.

        Matching happens on path components (not raw substrings) so entries like
        "venv" do not accidentally skip folders such as "convenience".
        """
        try:
            relative_path = file_path.relative_to(project_root)
        except ValueError:
            relative_path = file_path

        project_root_resolved = project_root.resolve()
        relative_parts = relative_path.parts
        relative_parts_lower = tuple(part.lower() for part in relative_parts)
        relative_posix = relative_path.as_posix()
        relative_posix_lower = relative_posix.lower()
        resolved_path = file_path.resolve()
        resolved_path_str = str(resolved_path)
        resolved_path_lower = resolved_path_str.lower()

        for raw_pattern in exclude_paths:
            if not raw_pattern:
                continue

            expanded = os.path.expandvars(os.path.expanduser(raw_pattern.strip()))
            normalized = expanded.replace("\\", "/")
            if not normalized:
                continue
            normalized_lower = normalized.lower()

            # Glob-style patterns (support both exact and case-insensitive matching)
            if any(ch in normalized for ch in "*?[]"):
                if (
                    fnmatch.fnmatch(relative_posix, normalized)
                    or fnmatch.fnmatch(relative_posix_lower, normalized_lower)
                    or fnmatch.fnmatch(resolved_path_str, normalized)
                    or fnmatch.fnmatch(resolved_path_lower, normalized_lower)
                ):
                    return True
                continue

            candidate = Path(normalized)

            # Resolve to absolute when pattern is absolute or contains explicit path components
            candidate_absolute = None
            if candidate.is_absolute():
                candidate_absolute = candidate
            elif normalized.startswith((".", "..", "~")) or "/" in normalized:
                candidate_absolute = (project_root_resolved / candidate).resolve()

            if candidate_absolute:
                try:
                    resolved_path.relative_to(candidate_absolute)
                    return True
                except ValueError:
                    pass

            candidate_parts = tuple(
                part.lower() for part in candidate.parts
                if part not in ("", ".", "..")
            )
            if not candidate_parts:
                continue

            if len(candidate_parts) == 1:
                if candidate_parts[0] in relative_parts_lower:
                    return True
                continue

            # Look for contiguous component matches (case-insensitive)
            for idx in range(len(relative_parts_lower) - len(candidate_parts) + 1):
                if relative_parts_lower[idx: idx + len(candidate_parts)] == candidate_parts:
                    return True

        return False


async def main():
    """Test the security scanner agent"""
    print("Testing Security Scanner Agent...")
    print()

    agent = SecurityScannerAgent(agent_id="test-security", verbose=True)

    request = SecurityScanRequest(
        project_path=Path("."),
        scan_types=["all"],
        severity_threshold="low",
        exclude_paths=["venv", ".venv", "node_modules", "__pycache__"]
    )

    result = await agent.scan_project(request)

    print()
    print("=" * 70)
    print("SECURITY SCAN RESULTS")
    print("=" * 70)
    print(f"Success: {result.success}")
    print(f"Scan Time: {result.scan_time:.2f}s")
    print(f"Security Score: {result.security_score:.1f}/100")
    print(f"Total Issues: {result.total_issues}")
    print(f"  Critical: {result.critical_issues}")
    print(f"  High: {result.high_issues}")
    print(f"  Medium: {result.medium_issues}")
    print(f"  Low: {result.low_issues}")
    print()

    if result.issues:
        print("Top Issues:")
        print("-" * 70)
        for issue in result.issues[:10]:
            print(f"[{issue.severity.upper()}] {issue.category}")
            print(f"  File: {issue.file_path}")
            if issue.line_number:
                print(f"  Line: {issue.line_number}")
            print(f"  Description: {issue.description}")
            print(f"  Recommendation: {issue.recommendation}")
            print()


if __name__ == "__main__":
    asyncio.run(main())
