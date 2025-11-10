"""Tests covering AgentRegistry additions for specialized agents."""

from pathlib import Path

from orchestrator.agent_registry import AgentFactory

PROJECT_ROOT = Path(__file__).parent


def _build_factory() -> AgentFactory:
    """Return an AgentFactory rooted at the repository path."""
    return AgentFactory(PROJECT_ROOT)


def test_security_and_debugger_agents_are_registered() -> None:
    """New specialized agents should produce configs via the factory."""
    factory = _build_factory()

    security_config = factory.create_agent_config("SECURITY")
    debugger_config = factory.create_agent_config("DEBUGGER")

    assert security_config is not None
    assert debugger_config is not None

    assert "run_shell" in security_config.tools_enabled
    assert "edit_file" in debugger_config.tools_enabled


def test_specialized_agents_are_recommended_for_matching_tasks() -> None:
    """Keyword routing should include the new agents for relevant tasks."""
    factory = _build_factory()

    security_recs = factory.recommend_agent(
        "Perform a comprehensive security audit and vulnerability scan."
    )
    debugger_recs = factory.recommend_agent(
        "Analyze this failing pytest stack trace and debug the regression."
    )

    assert "SECURITY" in security_recs
    assert "DEBUGGER" in debugger_recs
