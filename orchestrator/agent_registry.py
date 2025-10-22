"""
Agent Registry
Defines all available agents, their capabilities, tools, and configurations.
"""

from typing import Dict, List, Optional
from pathlib import Path
from dataclasses import dataclass, field
from orchestrator.agent_sdk_manager import AgentConfig, ToolPermission


@dataclass
class AgentRole:
    """Definition of an agent role"""
    role: str
    name: str
    description: str
    capabilities: List[str]
    tools_enabled: List[str]
    tool_permissions: Dict[str, ToolPermission] = field(default_factory=dict)
    model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 8192
    temperature: float = 1.0
    system_prompt_file: Optional[str] = None


class AgentRegistry:
    """
    Central registry of all available agents.
    Provides agent discovery, configuration, and instantiation.
    """

    def __init__(self, agents_dir: Path):
        self.agents_dir = agents_dir
        self._agents: Dict[str, AgentRole] = {}
        self._register_core_agents()
        self._register_specialist_agents()

    def _register_core_agents(self):
        """Register core development team agents"""

        # Product Planner (PP)
        self._agents["PP"] = AgentRole(
            role="PP",
            name="Product Planner",
            description="Analyzes requirements, creates implementation plans, breaks down complex tasks",
            capabilities=[
                "Requirement analysis",
                "Task decomposition",
                "Implementation planning",
                "Acceptance criteria definition",
                "Risk assessment"
            ],
            tools_enabled=[
                "read_file",
                "search_files",
                "list_files",
            ],
            system_prompt_file="agents/PP_SYSTEM.md"
        )

        # Architect/Reviewer (AR)
        self._agents["AR"] = AgentRole(
            role="AR",
            name="Architect & Code Reviewer",
            description="Reviews architecture, validates code quality, ensures best practices",
            capabilities=[
                "Architecture review",
                "Code review",
                "Design pattern validation",
                "Security assessment",
                "Performance analysis"
            ],
            tools_enabled=[
                "read_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/AR_SYSTEM.md"
        )

        # Implementer (IM)
        self._agents["IM"] = AgentRole(
            role="IM",
            name="Implementer",
            description="Writes code, implements features, makes file changes",
            capabilities=[
                "Code implementation",
                "Feature development",
                "Bug fixes",
                "Refactoring",
                "Test writing"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/IM_SYSTEM.md"
        )

        # Researcher/Documenter (RD)
        self._agents["RD"] = AgentRole(
            role="RD",
            name="Researcher & Documenter",
            description="Updates documentation, conducts research, maintains knowledge base",
            capabilities=[
                "Documentation writing",
                "Research & investigation",
                "Knowledge base maintenance",
                "ADR creation",
                "API documentation"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files"
            ],
            system_prompt_file="agents/RD_SYSTEM.md"
        )

    def _register_specialist_agents(self):
        """Register specialized agents for specific tasks"""

        # Documentation Specialist (DOC)
        self._agents["DOC"] = AgentRole(
            role="DOC",
            name="Documentation Specialist",
            description="Expert in technical writing, API docs, ADRs, and user guides",
            capabilities=[
                "Technical writing",
                "API documentation",
                "Architecture Decision Records",
                "User guides & tutorials",
                "Markdown formatting",
                "Obsidian vault organization"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files"
            ],
            system_prompt_file="agents/specialists/DOC_SYSTEM.md"
        )

        # Coding Specialist (CODE)
        self._agents["CODE"] = AgentRole(
            role="CODE",
            name="Coding Specialist",
            description="Expert developer focused on clean, efficient code implementation",
            capabilities=[
                "Feature implementation",
                "Code refactoring",
                "Design patterns",
                "Performance optimization",
                "Type safety",
                "Error handling"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/CODE_SYSTEM.md"
        )

        # Quality Assurance (QA)
        self._agents["QA"] = AgentRole(
            role="QA",
            name="Quality Assurance Specialist",
            description="Expert in testing, debugging, and code quality",
            capabilities=[
                "Code review",
                "Test writing",
                "Bug investigation",
                "Performance testing",
                "Security analysis",
                "Linting & formatting"
            ],
            tools_enabled=[
                "read_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/QA_SYSTEM.md"
        )

        # Research Specialist (RES)
        self._agents["RES"] = AgentRole(
            role="RES",
            name="Research Specialist",
            description="Expert in web research, API exploration, and literature review",
            capabilities=[
                "Web research",
                "API investigation",
                "Literature review",
                "Technology evaluation",
                "Competitive analysis",
                "Best practices research"
            ],
            tools_enabled=[
                "read_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/RES_SYSTEM.md",
            # Note: Web access would be added via custom tool
        )

        # Data Engineer (DATA)
        self._agents["DATA"] = AgentRole(
            role="DATA",
            name="Data Engineer",
            description="Expert in data pipelines, processing, and ETL workflows",
            capabilities=[
                "Data pipeline development",
                "ETL workflows",
                "Data validation",
                "Schema design",
                "Performance optimization",
                "Batch processing"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/DATA_SYSTEM.md"
        )

        # ML Training Specialist (TRAIN)
        self._agents["TRAIN"] = AgentRole(
            role="TRAIN",
            name="ML Training Specialist",
            description="Expert in model training, hyperparameter tuning, and evaluation",
            capabilities=[
                "Model training",
                "Hyperparameter optimization",
                "Model evaluation",
                "Experiment tracking",
                "Performance analysis",
                "Model debugging"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/TRAIN_SYSTEM.md"
        )

        # DevOps Specialist (DEVOPS)
        self._agents["DEVOPS"] = AgentRole(
            role="DEVOPS",
            name="DevOps Specialist",
            description="Expert in deployment, monitoring, and infrastructure",
            capabilities=[
                "Deployment automation",
                "CI/CD pipelines",
                "Monitoring setup",
                "Infrastructure as code",
                "Container orchestration",
                "Performance monitoring"
            ],
            tools_enabled=[
                "read_file",
                "write_file",
                "edit_file",
                "search_files",
                "list_files",
                "run_shell"
            ],
            system_prompt_file="agents/specialists/DEVOPS_SYSTEM.md"
        )

        # Coordinator (COORD)
        self._agents["COORD"] = AgentRole(
            role="COORD",
            name="Task Coordinator",
            description="Routes tasks to appropriate agents, manages dependencies",
            capabilities=[
                "Task routing",
                "Dependency management",
                "Agent selection",
                "Workflow orchestration",
                "Priority management",
                "Resource allocation"
            ],
            tools_enabled=[
                "read_file",
                "search_files",
                "list_files"
            ],
            system_prompt_file="agents/specialists/COORD_SYSTEM.md",
            temperature=0.7  # Lower temperature for more consistent routing
        )

    def get_agent(self, role: str) -> Optional[AgentRole]:
        """Get agent definition by role"""
        return self._agents.get(role)

    def get_all_agents(self) -> Dict[str, AgentRole]:
        """Get all registered agents"""
        return self._agents.copy()

    def get_agents_by_capability(self, capability: str) -> List[AgentRole]:
        """Find agents that have a specific capability"""
        return [
            agent for agent in self._agents.values()
            if capability.lower() in [c.lower() for c in agent.capabilities]
        ]

    def list_roles(self) -> List[str]:
        """Get list of all agent roles"""
        return list(self._agents.keys())

    def create_config(self, role: str, project_root: Path) -> Optional[AgentConfig]:
        """Create an AgentConfig for the specified role"""
        agent = self.get_agent(role)
        if not agent:
            return None

        # Load system prompt
        system_prompt = self._load_system_prompt(agent, project_root)

        return AgentConfig(
            role=agent.role,
            system_prompt=system_prompt,
            model=agent.model,
            max_tokens=agent.max_tokens,
            temperature=agent.temperature,
            tools_enabled=agent.tools_enabled.copy(),
            tool_permissions=agent.tool_permissions.copy(),
        )

    def _load_system_prompt(self, agent: AgentRole, project_root: Path) -> str:
        """Load system prompt from file or generate default"""
        if agent.system_prompt_file:
            prompt_path = project_root / agent.system_prompt_file
            if prompt_path.exists():
                return prompt_path.read_text()

        # Generate default system prompt
        return self._generate_default_prompt(agent)

    def _generate_default_prompt(self, agent: AgentRole) -> str:
        """Generate a default system prompt for an agent"""
        return f"""You are {agent.name} ({agent.role}), a specialized AI agent.

# Role Description
{agent.description}

# Capabilities
{chr(10).join(f"- {cap}" for cap in agent.capabilities)}

# Available Tools
{chr(10).join(f"- {tool}" for tool in agent.tools_enabled)}

# Guidelines
1. Focus on your specialized role and capabilities
2. Use tools efficiently and only when necessary
3. Provide clear explanations of your actions
4. Follow best practices for your domain
5. Communicate clearly and concisely
6. When your task is complete, include "TASK COMPLETE" in your response

# VERBOSE OUTPUT REQUIREMENTS (CRITICAL)
**You MUST provide detailed, verbose output for all actions:**

- 📋 **Before each action**: Explain what you're about to do and why
- 🔧 **During tool use**: Describe which tool you're using and what parameters
- ✅ **After each action**: Summarize what was accomplished and any findings
- 📊 **Progress updates**: Provide status updates for long-running operations
- 🔍 **Debugging info**: Include relevant details that help track your work
- 💭 **Reasoning**: Share your thought process and decision-making

**Example verbose output:**
```
📋 Starting analysis of requirements...
   - Reading project structure to understand current state
   - Goal: Identify all files related to data processing

🔧 Using read_file tool on algomind/models/datasets.py
   - Purpose: Check current dataset implementation
   - Looking for: Class definitions and data loading logic

✅ File read complete - Found 3 key classes:
   - BinaryDataset (lines 45-120)
   - SequenceDataset (lines 122-180)
   - Uses lazy loading for memory efficiency

📊 Progress: 1/3 files analyzed
   - Next: Check training scripts for usage patterns
```

**This verbose logging is MANDATORY for all agents to ensure visibility in activity feeds and terminals.**

# Working Directory
All file paths are relative to the project root directory.

Begin your work when given a task.
"""


class AgentFactory:
    """Factory for creating configured agent instances"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.registry = AgentRegistry(project_root)

    def create_agent_config(self, role: str) -> Optional[AgentConfig]:
        """Create a configured agent for the specified role"""
        return self.registry.create_config(role, self.project_root)

    def get_available_agents(self) -> List[Dict[str, any]]:
        """Get list of available agents with their metadata"""
        agents = []
        for role, agent in self.registry.get_all_agents().items():
            agents.append({
                "role": agent.role,
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
                "tools": agent.tools_enabled
            })
        return agents

    def recommend_agent(self, task_description: str) -> List[str]:
        """
        Recommend agents for a task based on description.
        This is a simple keyword-based implementation.
        Could be enhanced with embeddings/LLM in the future.
        """
        task_lower = task_description.lower()
        recommendations = []

        # Keyword mappings
        keywords_to_agents = {
            "DOC": ["document", "docs", "readme", "adr", "guide", "tutorial"],
            "CODE": ["implement", "code", "function", "class", "refactor", "feature"],
            "QA": ["test", "debug", "bug", "fix", "review", "quality"],
            "RES": ["research", "investigate", "find", "explore", "learn"],
            "DATA": ["data", "pipeline", "etl", "process", "batch"],
            "TRAIN": ["train", "model", "ml", "hyperparameter", "evaluate"],
            "DEVOPS": ["deploy", "monitor", "infra", "ci/cd", "docker"],
            "PP": ["plan", "analyze", "requirement", "design"],
            "AR": ["architecture", "review", "validate", "assess"],
            "IM": ["implement", "build", "create", "develop"],
            "RD": ["document", "research", "knowledge"]
        }

        for role, keywords in keywords_to_agents.items():
            if any(keyword in task_lower for keyword in keywords):
                recommendations.append(role)

        # Default to core team if no matches
        if not recommendations:
            recommendations = ["PP", "AR", "IM", "RD"]

        return recommendations
