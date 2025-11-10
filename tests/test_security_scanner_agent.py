"""Tests for SecurityScannerAgent path exclusion logic."""

from pathlib import Path

import pytest

from orchestrator.security_scanner_agent import SecurityScannerAgent


@pytest.fixture(scope="module")
def scanner() -> SecurityScannerAgent:
    """Return a scanner instance reused across tests."""
    return SecurityScannerAgent(agent_id="unit-test", verbose=False)


def _touch_file(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("print('test')")
    return path


def test_excludes_exact_directory_match(scanner: SecurityScannerAgent, tmp_path: Path) -> None:
    """Files inside a named exclude directory should be skipped."""
    target = _touch_file(tmp_path / "venv" / "secrets.py")
    assert scanner._should_skip_path(target, tmp_path, ["venv"])


def test_does_not_exclude_partial_name_match(scanner: SecurityScannerAgent, tmp_path: Path) -> None:
    """Directory names that merely contain the token should not be skipped."""
    target = _touch_file(tmp_path / "convenience" / "module.py")
    assert not scanner._should_skip_path(target, tmp_path, ["venv"])


def test_supports_nested_path_tokens(scanner: SecurityScannerAgent, tmp_path: Path) -> None:
    """Exclude entries with nested paths match contiguous components."""
    target = _touch_file(tmp_path / "src" / "generated" / "file.py")
    assert scanner._should_skip_path(target, tmp_path, ["src/generated"])


def test_supports_glob_patterns(scanner: SecurityScannerAgent, tmp_path: Path) -> None:
    """Glob patterns in exclude entries are honoured."""
    target = _touch_file(tmp_path / "tmp" / "artifacts" / "file.py")
    assert scanner._should_skip_path(target, tmp_path, ["**/artifacts/*"])
