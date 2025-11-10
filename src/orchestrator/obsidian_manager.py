"""
Obsidian Documentation Manager

Manages documentation storage in Obsidian vault for:
- Agent-generated documentation
- Task execution history
- Project knowledge base
- Enables memory persistence across tasks
"""

import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import json


class ObsidianManager:
    """
    Manages documentation in Obsidian vault with:
    - Proper frontmatter (YAML)
    - Tags for categorization
    - Bidirectional links
    - Project-based organization
    """

    def __init__(self, vault_path: Optional[Path] = None):
        """
        Initialize Obsidian manager.

        Args:
            vault_path: Path to Obsidian vault (default: ../obsidian-vault)
        """
        if vault_path is None:
            # Default to obsidian-vault in parent directory
            vault_path = Path(__file__).parent.parent / "obsidian-vault"

        self.vault_path = Path(vault_path)
        self.ensure_structure()

    def ensure_structure(self):
        """Ensure Obsidian vault directory structure exists."""
        directories = [
            self.vault_path,
            self.vault_path / "Projects",
            self.vault_path / "Tasks",
            self.vault_path / "Agents",
            self.vault_path / "Documentation",
            self.vault_path / "Templates",
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        print(f"✅ Obsidian vault initialized at: {self.vault_path}")

    def create_frontmatter(
        self,
        title: str,
        doc_type: str,
        tags: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create YAML frontmatter for markdown file.

        Args:
            title: Document title
            doc_type: Type of document (task, agent, documentation, etc.)
            tags: List of tags
            metadata: Additional metadata

        Returns:
            Formatted frontmatter string
        """
        metadata = metadata or {}

        frontmatter = {
            "title": title,
            "type": doc_type,
            "tags": tags,
            "created": datetime.now().isoformat(),
            **metadata
        }

        lines = ["---"]
        for key, value in frontmatter.items():
            if isinstance(value, list):
                lines.append(f"{key}: [{', '.join(value)}]")
            elif isinstance(value, dict):
                lines.append(f"{key}: {json.dumps(value)}")
            else:
                lines.append(f"{key}: {value}")
        lines.append("---\n")

        return "\n".join(lines)

    def save_task_documentation(
        self,
        task_id: str,
        goal: str,
        result: Dict[str, Any],
        project_name: Optional[str] = None
    ) -> Path:
        """
        Save task execution documentation.

        Args:
            task_id: Task identifier
            goal: Task goal
            result: Task execution result
            project_name: Optional project name

        Returns:
            Path to saved document
        """
        # Create filename from task_id
        filename = f"{task_id}.md"
        if project_name:
            doc_path = self.vault_path / "Projects" / project_name / "Tasks" / filename
            doc_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            doc_path = self.vault_path / "Tasks" / filename

        # Create frontmatter
        tags = ["task", "orchestration"]
        if project_name:
            tags.append(project_name.lower().replace(" ", "-"))

        metadata = {
            "task_id": task_id,
            "success": result.get("success", False),
            "quality_score": result.get("quality_score", 0),
            "cost": result.get("cost", 0.0)
        }

        frontmatter = self.create_frontmatter(
            title=f"Task: {goal[:50]}",
            doc_type="task",
            tags=tags,
            metadata=metadata
        )

        # Create content
        content = [
            frontmatter,
            f"# {goal}\n",
            f"**Task ID:** `{task_id}`\n",
            f"**Status:** {'✅ Success' if result.get('success') else '❌ Failed'}\n",
            f"**Quality Score:** {result.get('quality_score', 0)}/10\n",
            f"**Cost:** ${result.get('cost', 0.0):.4f}\n",
            "\n## Enrichment\n",
            f"**Confidence:** {result['enrichment']['confidence']}/10\n",
            f"**AI Contributors:** {result['enrichment']['ai_contributors']}\n",
            f"**Risks:** {len(result['enrichment']['risks'])}\n",
        ]

        # Add implementation details
        if result.get('implementation'):
            content.append("\n## Implementation\n")
            for file in result['implementation'].get('files_created', []):
                content.append(f"- [[{file}]]\n")

        # Add review details
        if result.get('review'):
            content.append("\n## Review\n")
            content.append(f"**Quality:** {result['review']['quality_score']}/10\n")
            content.append(f"**Approved:** {result['review']['approved']}\n")
            if result['review'].get('issues'):
                content.append("\n### Issues\n")
                for issue in result['review']['issues']:
                    content.append(f"- {issue}\n")

        # Add refinement info
        if result.get('refinement'):
            content.append("\n## Refinement\n")
            content.append(f"**Iterations:** {result['refinement']['iterations']}\n")

        # Add documentation links
        if result.get('documentation'):
            content.append("\n## Documentation\n")
            for doc_file in result['documentation'].keys():
                content.append(f"- [[{doc_file}]]\n")

        # Write file
        doc_path.write_text("".join(content))
        print(f"📚 Task documentation saved: {doc_path}")

        return doc_path

    def save_agent_documentation(
        self,
        agent_id: str,
        agent_type: str,
        task_description: str,
        result: str,
        project_name: Optional[str] = None
    ) -> Path:
        """
        Save agent execution documentation.

        Args:
            agent_id: Agent identifier
            agent_type: Type of agent (codex, claude, gemini)
            task_description: What the agent was asked to do
            result: Agent execution result
            project_name: Optional project name

        Returns:
            Path to saved document
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{agent_type}_{timestamp}.md"

        if project_name:
            doc_path = self.vault_path / "Projects" / project_name / "Agents" / filename
            doc_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            doc_path = self.vault_path / "Agents" / filename

        # Create frontmatter
        tags = ["agent", agent_type]
        if project_name:
            tags.append(project_name.lower().replace(" ", "-"))

        metadata = {
            "agent_id": agent_id,
            "agent_type": agent_type
        }

        frontmatter = self.create_frontmatter(
            title=f"{agent_type.title()} Agent: {task_description[:40]}",
            doc_type="agent",
            tags=tags,
            metadata=metadata
        )

        # Create content
        content = [
            frontmatter,
            f"# {agent_type.title()} Agent Execution\n",
            f"**Agent ID:** `{agent_id}`\n",
            f"**Type:** {agent_type}\n",
            f"**Task:** {task_description}\n",
            "\n## Result\n",
            f"{result}\n"
        ]

        # Write file
        doc_path.write_text("".join(content))
        print(f"🤖 Agent documentation saved: {doc_path}")

        return doc_path

    def save_generated_documentation(
        self,
        doc_name: str,
        content: str,
        project_name: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Path:
        """
        Save AI-generated documentation (README, API docs, etc.).

        Args:
            doc_name: Document name (e.g., "README.md")
            content: Documentation content
            project_name: Optional project name
            tags: Optional tags

        Returns:
            Path to saved document
        """
        if project_name:
            doc_path = self.vault_path / "Projects" / project_name / "Documentation" / doc_name
            doc_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            doc_path = self.vault_path / "Documentation" / doc_name

        # Create frontmatter
        tags = tags or ["documentation", "ai-generated"]
        if project_name:
            tags.append(project_name.lower().replace(" ", "-"))

        frontmatter = self.create_frontmatter(
            title=doc_name.replace(".md", "").replace("_", " ").title(),
            doc_type="documentation",
            tags=tags,
            metadata={"generated_by": "AI"}
        )

        # Combine frontmatter with content
        full_content = frontmatter + "\n" + content

        # Write file
        doc_path.write_text(full_content)
        print(f"📖 Documentation saved: {doc_path}")

        return doc_path

    def create_project_index(
        self,
        project_name: str,
        description: str,
        technologies: List[str]
    ) -> Path:
        """
        Create an index page for a project.

        Args:
            project_name: Project name
            description: Project description
            technologies: List of technologies used

        Returns:
            Path to project index
        """
        project_dir = self.vault_path / "Projects" / project_name
        project_dir.mkdir(parents=True, exist_ok=True)

        index_path = project_dir / "README.md"

        # Create frontmatter
        frontmatter = self.create_frontmatter(
            title=project_name,
            doc_type="project",
            tags=["project"] + [tech.lower() for tech in technologies],
            metadata={
                "technologies": technologies,
                "description": description
            }
        )

        # Create content
        content = [
            frontmatter,
            f"# {project_name}\n",
            f"{description}\n",
            "\n## Technologies\n",
        ]

        for tech in technologies:
            content.append(f"- {tech}\n")

        content.append("\n## Tasks\n")
        content.append("See [[Tasks]] folder for task history.\n")
        content.append("\n## Agents\n")
        content.append("See [[Agents]] folder for agent execution logs.\n")
        content.append("\n## Documentation\n")
        content.append("See [[Documentation]] folder for generated docs.\n")

        # Write file
        index_path.write_text("".join(content))
        print(f"📁 Project index created: {index_path}")

        return index_path


# Global singleton instance
_global_manager = None


def get_obsidian_manager() -> ObsidianManager:
    """Get or create the global Obsidian manager instance."""
    global _global_manager
    if _global_manager is None:
        _global_manager = ObsidianManager()
    return _global_manager
