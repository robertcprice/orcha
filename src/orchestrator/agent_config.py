#!/usr/bin/env python3
"""
Agent Configuration System

Manages configurable agent selection for coding tasks with fallback chains.
Allows users to choose their primary and fallback coding agents.
"""

import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum


class CodingAgent(Enum):
    """Available coding agents"""
    CODEX = "codex"           # Codex MCP - Fast, cost-efficient
    DEEPSEEK = "deepseek"     # DeepSeek R1 - Reasoning, cost-efficient
    CLAUDE = "claude"         # Claude Code - High quality, expensive
    CHATGPT = "chatgpt"       # ChatGPT - Balanced


@dataclass
class AgentCosts:
    """Cost estimates per 1K tokens (approximate)"""
    codex: float = 0.002      # $0.002 per 1K tokens
    deepseek: float = 0.001   # $0.001 per 1K tokens
    claude: float = 0.010     # $0.010 per 1K tokens
    chatgpt: float = 0.003    # $0.003 per 1K tokens
    gemini: float = 0.001     # $0.001 per 1K tokens
    grok: float = 0.005       # $0.005 per 1K tokens


@dataclass
class AgentConfiguration:
    """Complete agent configuration"""

    # Primary coding agent (for implementation tasks)
    primary_coder: CodingAgent = CodingAgent.CODEX

    # Fallback chain (try in order if primary fails)
    fallback_chain: List[CodingAgent] = field(default_factory=lambda: [
        CodingAgent.DEEPSEEK,
        CodingAgent.CLAUDE
    ])

    # Review agent (for code review tasks)
    review_agent: CodingAgent = CodingAgent.CLAUDE

    # Documentation agent
    documentation_agent: str = "gemini"

    # Maximum retries per agent before falling back
    max_retries_per_agent: int = 2

    # Enable cost tracking
    enable_cost_tracking: bool = True

    # Enable fallback on failure
    enable_fallback: bool = True

    # Cost estimates
    costs: AgentCosts = field(default_factory=AgentCosts)

    # Verbose logging
    verbose: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "primary_coder": self.primary_coder.value,
            "fallback_chain": [agent.value for agent in self.fallback_chain],
            "review_agent": self.review_agent.value,
            "documentation_agent": self.documentation_agent,
            "max_retries_per_agent": self.max_retries_per_agent,
            "enable_cost_tracking": self.enable_cost_tracking,
            "enable_fallback": self.enable_fallback,
            "costs": asdict(self.costs),
            "verbose": self.verbose
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentConfiguration":
        """Create from dictionary"""
        config = cls()

        if "primary_coder" in data:
            config.primary_coder = CodingAgent(data["primary_coder"])

        if "fallback_chain" in data:
            config.fallback_chain = [CodingAgent(agent) for agent in data["fallback_chain"]]

        if "review_agent" in data:
            config.review_agent = CodingAgent(data["review_agent"])

        if "documentation_agent" in data:
            config.documentation_agent = data["documentation_agent"]

        if "max_retries_per_agent" in data:
            config.max_retries_per_agent = data["max_retries_per_agent"]

        if "enable_cost_tracking" in data:
            config.enable_cost_tracking = data["enable_cost_tracking"]

        if "enable_fallback" in data:
            config.enable_fallback = data["enable_fallback"]

        if "costs" in data:
            config.costs = AgentCosts(**data["costs"])

        if "verbose" in data:
            config.verbose = data["verbose"]

        return config


class AgentConfigurationManager:
    """
    Manages agent configuration with file persistence.

    Configuration can be set via:
    1. Environment variables
    2. Configuration file (agent_config.json)
    3. Programmatic API
    4. Web UI settings
    """

    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize configuration manager.

        Args:
            config_path: Path to config file (default: project_root/agent_config.json)
        """
        if config_path is None:
            project_root = Path(__file__).parent.parent
            config_path = project_root / "agent_config.json"

        self.config_path = config_path
        self._config: Optional[AgentConfiguration] = None

    def load_config(self) -> AgentConfiguration:
        """
        Load configuration from file or create default.

        Priority:
        1. Environment variables (highest)
        2. Configuration file
        3. Default configuration (lowest)

        Returns:
            AgentConfiguration instance
        """
        # Start with default
        config = AgentConfiguration()

        # Load from file if exists
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                config = AgentConfiguration.from_dict(data)
            except Exception as e:
                print(f"[AgentConfig] Warning: Could not load config file: {e}")
                print(f"[AgentConfig] Using default configuration")

        # Override with environment variables
        if os.getenv("PRIMARY_CODER"):
            try:
                config.primary_coder = CodingAgent(os.getenv("PRIMARY_CODER"))
            except ValueError:
                print(f"[AgentConfig] Warning: Invalid PRIMARY_CODER value")

        if os.getenv("FALLBACK_CHAIN"):
            try:
                fallback_agents = os.getenv("FALLBACK_CHAIN", "").split(",")
                config.fallback_chain = [CodingAgent(agent.strip()) for agent in fallback_agents if agent.strip()]
            except ValueError:
                print(f"[AgentConfig] Warning: Invalid FALLBACK_CHAIN value")

        if os.getenv("REVIEW_AGENT"):
            try:
                config.review_agent = CodingAgent(os.getenv("REVIEW_AGENT"))
            except ValueError:
                print(f"[AgentConfig] Warning: Invalid REVIEW_AGENT value")

        if os.getenv("ENABLE_FALLBACK"):
            config.enable_fallback = os.getenv("ENABLE_FALLBACK", "true").lower() == "true"

        if os.getenv("MAX_RETRIES_PER_AGENT"):
            try:
                config.max_retries_per_agent = int(os.getenv("MAX_RETRIES_PER_AGENT", "2"))
            except ValueError:
                pass

        self._config = config
        return config

    def save_config(self, config: AgentConfiguration) -> bool:
        """
        Save configuration to file.

        Args:
            config: AgentConfiguration to save

        Returns:
            True if saved successfully
        """
        try:
            with open(self.config_path, 'w') as f:
                json.dump(config.to_dict(), f, indent=2)
            self._config = config
            return True
        except Exception as e:
            print(f"[AgentConfig] Error saving config: {e}")
            return False

    def get_config(self) -> AgentConfiguration:
        """
        Get current configuration (loads if not already loaded).

        Returns:
            Current AgentConfiguration
        """
        if self._config is None:
            return self.load_config()
        return self._config

    def update_primary_coder(self, coder: CodingAgent) -> bool:
        """
        Update primary coding agent.

        Args:
            coder: New primary coding agent

        Returns:
            True if updated successfully
        """
        config = self.get_config()
        config.primary_coder = coder
        return self.save_config(config)

    def update_fallback_chain(self, chain: List[CodingAgent]) -> bool:
        """
        Update fallback chain.

        Args:
            chain: New fallback chain

        Returns:
            True if updated successfully
        """
        config = self.get_config()
        config.fallback_chain = chain
        return self.save_config(config)

    def update_review_agent(self, agent: CodingAgent) -> bool:
        """
        Update review agent.

        Args:
            agent: New review agent

        Returns:
            True if updated successfully
        """
        config = self.get_config()
        config.review_agent = agent
        return self.save_config(config)

    def get_fallback_chain(self, primary: CodingAgent) -> List[CodingAgent]:
        """
        Get complete fallback chain for a primary agent.

        Args:
            primary: Primary agent

        Returns:
            List of agents to try in order (excluding primary)
        """
        config = self.get_config()

        # Start with configured fallback chain
        chain = list(config.fallback_chain)

        # Remove primary from chain if present
        chain = [agent for agent in chain if agent != primary]

        # Ensure we have at least one fallback
        if not chain:
            # Default fallback: try all agents except primary
            all_agents = [CodingAgent.CODEX, CodingAgent.DEEPSEEK, CodingAgent.CLAUDE, CodingAgent.CHATGPT]
            chain = [agent for agent in all_agents if agent != primary]

        return chain

    def estimate_cost(self, agent: CodingAgent, tokens: int = 1000) -> float:
        """
        Estimate cost for using an agent.

        Args:
            agent: Agent to estimate cost for
            tokens: Number of tokens (default: 1000)

        Returns:
            Estimated cost in dollars
        """
        config = self.get_config()

        cost_map = {
            CodingAgent.CODEX: config.costs.codex,
            CodingAgent.DEEPSEEK: config.costs.deepseek,
            CodingAgent.CLAUDE: config.costs.claude,
            CodingAgent.CHATGPT: config.costs.chatgpt
        }

        cost_per_1k = cost_map.get(agent, 0.005)
        return (tokens / 1000) * cost_per_1k

    def get_cheapest_agent(self) -> CodingAgent:
        """Get the cheapest coding agent."""
        config = self.get_config()
        costs = config.costs

        agent_costs = {
            CodingAgent.CODEX: costs.codex,
            CodingAgent.DEEPSEEK: costs.deepseek,
            CodingAgent.CLAUDE: costs.claude,
            CodingAgent.CHATGPT: costs.chatgpt
        }

        return min(agent_costs.items(), key=lambda x: x[1])[0]

    def get_best_quality_agent(self) -> CodingAgent:
        """Get the highest quality coding agent (typically most expensive)."""
        return CodingAgent.CLAUDE


# Global instance
_config_manager: Optional[AgentConfigurationManager] = None


def get_agent_config_manager() -> AgentConfigurationManager:
    """Get global agent configuration manager instance."""
    global _config_manager
    if _config_manager is None:
        _config_manager = AgentConfigurationManager()
    return _config_manager


def get_agent_config() -> AgentConfiguration:
    """Get current agent configuration."""
    return get_agent_config_manager().get_config()


# Example usage
if __name__ == "__main__":
    print("Agent Configuration System Test")
    print("=" * 70)

    manager = AgentConfigurationManager()
    config = manager.load_config()

    print(f"\nCurrent Configuration:")
    print(f"  Primary Coder: {config.primary_coder.value}")
    print(f"  Fallback Chain: {[agent.value for agent in config.fallback_chain]}")
    print(f"  Review Agent: {config.review_agent.value}")
    print(f"  Documentation Agent: {config.documentation_agent}")
    print(f"  Enable Fallback: {config.enable_fallback}")
    print(f"  Max Retries Per Agent: {config.max_retries_per_agent}")

    print(f"\nCost Estimates (per 1K tokens):")
    print(f"  Codex: ${config.costs.codex:.4f}")
    print(f"  DeepSeek: ${config.costs.deepseek:.4f}")
    print(f"  Claude: ${config.costs.claude:.4f}")
    print(f"  ChatGPT: ${config.costs.chatgpt:.4f}")

    print(f"\nCheapest Agent: {manager.get_cheapest_agent().value}")
    print(f"Best Quality Agent: {manager.get_best_quality_agent().value}")

    print(f"\nFallback Chain for Codex:")
    chain = manager.get_fallback_chain(CodingAgent.CODEX)
    print(f"  {' → '.join([agent.value for agent in chain])}")

    print("\n✅ Configuration system is working!")
