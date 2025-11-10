"""
SuperClaude Manager - Integration module for SuperClaude Framework

This module provides programmatic access to SuperClaude Framework features:
- Loading and applying personas
- Managing behavioral modes
- Enforcing SuperClaude rules
- MCP server recommendations
- Prompt enhancement with SuperClaude context
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class BehavioralMode(Enum):
    """SuperClaude behavioral modes"""
    ORCHESTRATION = "orchestration"
    TOKEN_EFFICIENCY = "token-efficiency"
    DEEP_RESEARCH = "deep-research"
    INTROSPECTION = "introspection"
    TASK_MANAGEMENT = "task-management"
    BRAINSTORMING = "brainstorming"


class Persona(Enum):
    """SuperClaude agent personas"""
    ARCHITECT = "architect"
    SECURITY = "security"
    FRONTEND = "frontend"
    BACKEND = "backend"
    PERFORMANCE = "performance"
    QA = "qa"
    DEVOPS = "devops"
    DATA = "data"
    DOCUMENTATION = "documentation"
    RESEARCH = "research"


@dataclass
class PersonaContext:
    """Persona context loaded from markdown files"""
    name: str
    expertise: str
    core_belief: str
    primary_question: str
    decision_pattern: str
    preferred_tools: List[str]
    content: str  # Full persona content


@dataclass
class ModeConfig:
    """Behavioral mode configuration"""
    mode: BehavioralMode
    description: str
    activation_triggers: List[str]
    behavioral_changes: List[str]
    output_format: Dict[str, Any]


@dataclass
class RuleSet:
    """SuperClaude rules with severity levels"""
    critical: List[str]  # 🔴 Never compromise
    important: List[str]  # 🟡 Strong preference
    recommended: List[str]  # 🟢 Apply when practical


class SuperClaudeManager:
    """
    Manager for SuperClaude Framework integration

    Provides programmatic access to:
    - Personas (expert agent contexts)
    - Behavioral modes (execution patterns)
    - Rules (governance and best practices)
    - MCP recommendations (tool selection)
    - Prompt enhancement (context injection)
    """

    def __init__(self, project_root: Optional[str] = None):
        """
        Initialize SuperClaude Manager

        Args:
            project_root: Project root directory (defaults to current working directory)
        """
        self.project_root = Path(project_root) if project_root else Path.cwd()

        # SuperClaude paths
        self.global_claude_dir = Path.home() / ".claude"
        self.project_claude_dir = self.project_root / ".claude"
        self.sc_agents_dir = self.project_claude_dir / "superclaude" / "agents"
        self.sc_commands_dir = self.project_claude_dir / "superclaude" / "commands"

        # Core SuperClaude files (global)
        self.rules_file = self.global_claude_dir / "RULES.md"
        self.flags_file = self.global_claude_dir / "FLAGS.md"
        self.principles_file = self.global_claude_dir / "PRINCIPLES.md"
        self.research_config_file = self.global_claude_dir / "RESEARCH_CONFIG.md"

        # Cache
        self._rules_cache: Optional[RuleSet] = None
        self._personas_cache: Dict[str, PersonaContext] = {}
        self._modes_cache: Dict[BehavioralMode, ModeConfig] = {}

    def is_superclaude_installed(self) -> bool:
        """Check if SuperClaude is installed"""
        return self.rules_file.exists() and self.principles_file.exists()

    def load_rules(self) -> RuleSet:
        """
        Load SuperClaude rules from RULES.md

        Returns:
            RuleSet with critical, important, and recommended rules
        """
        if self._rules_cache:
            return self._rules_cache

        if not self.rules_file.exists():
            raise FileNotFoundError(f"SuperClaude RULES.md not found at {self.rules_file}")

        content = self.rules_file.read_text()

        # Parse rules by severity
        critical_rules = []
        important_rules = []
        recommended_rules = []

        current_section = None
        for line in content.split('\n'):
            line = line.strip()

            # Detect severity markers
            if '🔴 CRITICAL' in line or '**Priority**: 🔴' in line:
                current_section = 'critical'
            elif '🟡 IMPORTANT' in line or '**Priority**: 🟡' in line:
                current_section = 'important'
            elif '🟢 RECOMMENDED' in line or '**Priority**: 🟢' in line:
                current_section = 'recommended'
            elif line.startswith('- ') or line.startswith('* '):
                # Extract rule
                rule = line.lstrip('- *').strip()
                if current_section == 'critical':
                    critical_rules.append(rule)
                elif current_section == 'important':
                    important_rules.append(rule)
                elif current_section == 'recommended':
                    recommended_rules.append(rule)

        self._rules_cache = RuleSet(
            critical=critical_rules,
            important=important_rules,
            recommended=recommended_rules
        )

        return self._rules_cache

    def load_persona(self, persona_name: str) -> PersonaContext:
        """
        Load persona context from agent files

        Args:
            persona_name: Name of persona (e.g., 'architect', 'security', 'frontend')

        Returns:
            PersonaContext with full agent context
        """
        if persona_name in self._personas_cache:
            return self._personas_cache[persona_name]

        # Try to find persona file
        persona_files = [
            self.sc_agents_dir / f"{persona_name}.md",
            self.sc_agents_dir / f"{persona_name}-expert.md",
            self.global_claude_dir / "sc-agents" / f"{persona_name}.md",
        ]

        persona_file = None
        for pf in persona_files:
            if pf.exists():
                persona_file = pf
                break

        if not persona_file:
            # Return default persona context
            return PersonaContext(
                name=persona_name.capitalize(),
                expertise=f"{persona_name} specialist",
                core_belief=f"Focus on {persona_name} best practices",
                primary_question=f"How can I optimize this for {persona_name}?",
                decision_pattern=f"Prioritize {persona_name} considerations",
                preferred_tools=["Context7", "Sequential"],
                content=f"Expert {persona_name} agent with specialized knowledge"
            )

        content = persona_file.read_text()

        # Parse persona metadata (simple extraction)
        lines = content.split('\n')
        metadata = {
            'name': persona_name.capitalize(),
            'expertise': f"{persona_name} specialist",
            'core_belief': '',
            'primary_question': '',
            'decision_pattern': '',
            'preferred_tools': []
        }

        for i, line in enumerate(lines):
            if 'Core Belief' in line and i + 1 < len(lines):
                metadata['core_belief'] = lines[i + 1].strip()
            elif 'Primary Question' in line and i + 1 < len(lines):
                metadata['primary_question'] = lines[i + 1].strip().strip('"\'')
            elif 'Decision Pattern' in line and i + 1 < len(lines):
                metadata['decision_pattern'] = lines[i + 1].strip()
            elif 'Preferred Tools' in line or 'Tools:' in line:
                # Extract tools from following lines
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip().startswith('-'):
                        tool = lines[j].strip().lstrip('- *').strip()
                        metadata['preferred_tools'].append(tool)

        persona_context = PersonaContext(
            name=metadata['name'],
            expertise=metadata['expertise'],
            core_belief=metadata['core_belief'],
            primary_question=metadata['primary_question'],
            decision_pattern=metadata['decision_pattern'],
            preferred_tools=metadata['preferred_tools'],
            content=content
        )

        self._personas_cache[persona_name] = persona_context
        return persona_context

    def apply_mode(self, mode: BehavioralMode) -> ModeConfig:
        """
        Apply behavioral mode configuration

        Args:
            mode: Behavioral mode to apply

        Returns:
            ModeConfig with mode settings
        """
        if mode in self._modes_cache:
            return self._modes_cache[mode]

        # Define mode configurations
        mode_configs = {
            BehavioralMode.ORCHESTRATION: ModeConfig(
                mode=BehavioralMode.ORCHESTRATION,
                description="Optimize parallel execution and tool selection",
                activation_triggers=["multi-agent", "parallel", "orchestrate"],
                behavioral_changes=[
                    "Identify parallelization opportunities",
                    "Optimize tool combinations",
                    "Coordinate multiple agents",
                    "Batch independent operations"
                ],
                output_format={"style": "structured", "verbosity": "medium"}
            ),
            BehavioralMode.TOKEN_EFFICIENCY: ModeConfig(
                mode=BehavioralMode.TOKEN_EFFICIENCY,
                description="Compress output by 70%, use symbolic shorthand",
                activation_triggers=["compress", "efficient", "short"],
                behavioral_changes=[
                    "Use symbolic shorthand (→, &, etc.)",
                    "Bullet points over verbose explanations",
                    "Abbreviations and acronyms",
                    "Lean, boilerplate-free code"
                ],
                output_format={"style": "compressed", "verbosity": "low"}
            ),
            BehavioralMode.DEEP_RESEARCH: ModeConfig(
                mode=BehavioralMode.DEEP_RESEARCH,
                description="Multi-source research with confidence scoring",
                activation_triggers=["research", "investigate", "analyze"],
                behavioral_changes=[
                    "Create investigation plan",
                    "Parallel searches across sources",
                    "Evidence chain maintenance",
                    "Confidence scoring (0-1)",
                    "Source citation required"
                ],
                output_format={"style": "research", "verbosity": "high", "include_sources": True}
            ),
            BehavioralMode.INTROSPECTION: ModeConfig(
                mode=BehavioralMode.INTROSPECTION,
                description="Show decision-making process transparently",
                activation_triggers=["explain", "introspect", "reasoning"],
                behavioral_changes=[
                    "Show decision tree",
                    "Explain trade-offs",
                    "Transparent reasoning",
                    "Alternative approaches considered"
                ],
                output_format={"style": "verbose", "verbosity": "high", "show_reasoning": True}
            ),
            BehavioralMode.TASK_MANAGEMENT: ModeConfig(
                mode=BehavioralMode.TASK_MANAGEMENT,
                description="Enhanced TodoWrite integration with detailed tracking",
                activation_triggers=["complex", "multi-step", "track"],
                behavioral_changes=[
                    "Detailed TodoWrite usage",
                    "Progress tracking",
                    "Dependency mapping",
                    "Milestone creation"
                ],
                output_format={"style": "structured", "verbosity": "medium", "track_progress": True}
            ),
            BehavioralMode.BRAINSTORMING: ModeConfig(
                mode=BehavioralMode.BRAINSTORMING,
                description="Transform vague ideas into clear requirements",
                activation_triggers=["brainstorm", "ideate", "explore"],
                behavioral_changes=[
                    "Divergent thinking",
                    "Idea generation",
                    "Clarifying questions",
                    "Requirement synthesis"
                ],
                output_format={"style": "exploratory", "verbosity": "high", "ask_questions": True}
            )
        }

        config = mode_configs.get(mode)
        if not config:
            # Default to orchestration mode
            config = mode_configs[BehavioralMode.ORCHESTRATION]

        self._modes_cache[mode] = config
        return config

    def get_mcp_recommendations(self, task_type: str, persona: Optional[str] = None) -> List[str]:
        """
        Get MCP server recommendations based on task type and persona

        Args:
            task_type: Type of task (e.g., 'documentation', 'reasoning', 'ui', 'testing')
            persona: Optional persona name for additional context

        Returns:
            List of recommended MCP server names
        """
        recommendations = []

        # Task-based recommendations
        task_mcps = {
            'documentation': ['context7'],
            'research': ['context7', 'sequential'],
            'reasoning': ['sequential'],
            'ui': ['magic', 'puppeteer'],
            'testing': ['puppeteer'],
            'complex': ['sequential'],
            'design': ['magic'],
        }

        # Persona-based recommendations
        persona_mcps = {
            'architect': ['sequential', 'context7'],
            'security': ['sequential'],
            'frontend': ['magic', 'puppeteer'],
            'backend': ['context7', 'sequential'],
            'performance': ['sequential'],
            'qa': ['puppeteer'],
            'documentation': ['context7'],
            'research': ['context7', 'sequential'],
        }

        # Add task-based recommendations
        for task, mcps in task_mcps.items():
            if task in task_type.lower():
                recommendations.extend(mcps)

        # Add persona-based recommendations
        if persona:
            persona_recs = persona_mcps.get(persona.lower(), [])
            recommendations.extend(persona_recs)

        # Remove duplicates while preserving order
        seen = set()
        return [mcp for mcp in recommendations if not (mcp in seen or seen.add(mcp))]

    def enhance_prompt(
        self,
        original_prompt: str,
        persona: Optional[str] = None,
        mode: Optional[BehavioralMode] = None,
        agent_preference: Optional[str] = None
    ) -> str:
        """
        Enhance prompt with SuperClaude context

        Args:
            original_prompt: Original task description
            persona: Optional persona to apply
            mode: Optional behavioral mode
            agent_preference: Optional agent type preference

        Returns:
            Enhanced prompt with SuperClaude context
        """
        enhanced = []

        # Add SuperClaude header
        enhanced.append("# SuperClaude-Enhanced Task\n")

        # Add persona context
        if persona:
            try:
                persona_ctx = self.load_persona(persona)
                enhanced.append(f"## Persona: {persona_ctx.name}\n")
                enhanced.append(f"**Expertise:** {persona_ctx.expertise}\n")
                if persona_ctx.core_belief:
                    enhanced.append(f"**Core Belief:** {persona_ctx.core_belief}\n")
                if persona_ctx.primary_question:
                    enhanced.append(f"**Guiding Question:** {persona_ctx.primary_question}\n")
                enhanced.append("")
            except Exception as e:
                print(f"Warning: Could not load persona '{persona}': {e}")

        # Add mode configuration
        if mode:
            mode_config = self.apply_mode(mode)
            enhanced.append(f"## Mode: {mode_config.mode.value}\n")
            enhanced.append(f"**Description:** {mode_config.description}\n")
            enhanced.append("**Behavioral Changes:**")
            for change in mode_config.behavioral_changes:
                enhanced.append(f"- {change}")
            enhanced.append("")

        # Add agent preference
        if agent_preference:
            enhanced.append(f"## Agent: {agent_preference}\n")
            enhanced.append(f"Execute this task using the {agent_preference} agent.\n")

        # Add rules reminder
        try:
            rules = self.load_rules()
            enhanced.append("## SuperClaude Rules (Enforced)\n")
            enhanced.append("**Critical Rules [🔴]:**")
            for rule in rules.critical[:3]:  # Top 3 critical rules
                enhanced.append(f"- {rule}")
            enhanced.append("")
        except Exception:
            pass

        # Add original task
        enhanced.append("## Task\n")
        enhanced.append(original_prompt)
        enhanced.append("")

        # Add execution instructions
        enhanced.append("## Execution Instructions\n")
        enhanced.append("- Execute autonomously with permission bypass")
        enhanced.append("- Follow SuperClaude rules throughout execution")
        enhanced.append("- Use evidence-based decision making")
        enhanced.append("- Document learnings in Obsidian vault")

        return '\n'.join(enhanced)

    def enforce_rules(self, response: str) -> Dict[str, Any]:
        """
        Check response against SuperClaude rules

        Args:
            response: Agent response to validate

        Returns:
            Dict with validation results
        """
        violations = []
        warnings = []

        # Load rules
        try:
            rules = self.load_rules()
        except Exception as e:
            return {
                'valid': True,
                'violations': [],
                'warnings': [f"Could not load rules: {e}"]
            }

        # Check for absolute language (evidence-based rule)
        absolute_terms = ['best', 'optimal', 'always', 'never', 'perfect', 'ideal']
        for term in absolute_terms:
            if f' {term} ' in response.lower():
                warnings.append(f"Absolute language detected: '{term}'. Use probabilistic language instead.")

        # Check for TODO comments (implementation completeness)
        if 'TODO:' in response or 'TODO ' in response:
            violations.append("TODO comments detected. All implementations must be complete.")

        # Check for mock/stub implementations
        stub_indicators = ['throw new Error("Not implemented")', 'NotImplementedError', 'pass  # TODO']
        for indicator in stub_indicators:
            if indicator in response:
                violations.append(f"Stub implementation detected: {indicator}. All code must be complete.")

        return {
            'valid': len(violations) == 0,
            'violations': violations,
            'warnings': warnings
        }

    def get_available_personas(self) -> List[str]:
        """Get list of available persona names"""
        return [p.value for p in Persona]

    def get_available_modes(self) -> List[str]:
        """Get list of available behavioral modes"""
        return [m.value for m in BehavioralMode]


# Convenience functions for orchestrator integration

def create_superclaude_manager(project_root: Optional[str] = None) -> SuperClaudeManager:
    """
    Create and return a SuperClaude Manager instance

    Args:
        project_root: Project root directory

    Returns:
        Initialized SuperClaudeManager
    """
    return SuperClaudeManager(project_root)


def apply_superclaude_context(
    task: str,
    persona: Optional[str] = None,
    mode: Optional[str] = None,
    agent: Optional[str] = None,
    project_root: Optional[str] = None
) -> str:
    """
    Quick function to apply SuperClaude context to a task

    Args:
        task: Original task description
        persona: Persona name (e.g., 'architect', 'security')
        mode: Mode name (e.g., 'deep-research', 'token-efficiency')
        agent: Agent preference (e.g., 'claude', 'gemini')
        project_root: Project root directory

    Returns:
        Enhanced task description with SuperClaude context
    """
    manager = SuperClaudeManager(project_root)

    # Convert mode string to enum
    mode_enum = None
    if mode:
        try:
            mode_enum = BehavioralMode(mode)
        except ValueError:
            print(f"Warning: Invalid mode '{mode}'. Using default.")

    return manager.enhance_prompt(
        original_prompt=task,
        persona=persona,
        mode=mode_enum,
        agent_preference=agent
    )


if __name__ == "__main__":
    # Test the SuperClaude Manager
    manager = SuperClaudeManager()

    print("SuperClaude Manager Test")
    print("=" * 60)

    # Check installation
    if manager.is_superclaude_installed():
        print("✓ SuperClaude is installed")
    else:
        print("✗ SuperClaude not found. Run: superclaude install")
        exit(1)

    # Load rules
    print("\nLoading rules...")
    rules = manager.load_rules()
    print(f"✓ Loaded {len(rules.critical)} critical rules")
    print(f"✓ Loaded {len(rules.important)} important rules")
    print(f"✓ Loaded {len(rules.recommended)} recommended rules")

    # Test persona loading
    print("\nLoading architect persona...")
    persona = manager.load_persona("architect")
    print(f"✓ Persona: {persona.name}")
    print(f"  Core Belief: {persona.core_belief}")

    # Test mode application
    print("\nApplying deep-research mode...")
    mode = manager.apply_mode(BehavioralMode.DEEP_RESEARCH)
    print(f"✓ Mode: {mode.mode.value}")
    print(f"  Description: {mode.description}")

    # Test MCP recommendations
    print("\nGetting MCP recommendations...")
    mcps = manager.get_mcp_recommendations("documentation", "architect")
    print(f"✓ Recommended MCPs: {', '.join(mcps)}")

    # Test prompt enhancement
    print("\nEnhancing prompt...")
    enhanced = manager.enhance_prompt(
        "Design a scalable authentication system",
        persona="architect",
        mode=BehavioralMode.DEEP_RESEARCH
    )
    print(f"✓ Enhanced prompt ({len(enhanced)} chars)")
    print("\nEnhanced prompt preview:")
    print("-" * 60)
    print(enhanced[:500] + "...")

    print("\n" + "=" * 60)
    print("SuperClaude Manager test complete!")
