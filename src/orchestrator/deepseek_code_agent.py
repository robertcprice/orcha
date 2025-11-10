#!/usr/bin/env python3
"""
DeepSeek Code Agent - Uses DeepSeek for code implementation

Wrapper around DeepSeek R1 model for direct code generation tasks.
DeepSeek is cost-efficient and provides reasoning capabilities.
"""

import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import OpenAI (DeepSeek uses OpenAI-compatible API)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


@dataclass
class CodeImplementationRequest:
    """Request for DeepSeek to implement code"""
    task_description: str
    requirements: List[str]
    existing_code: Optional[str] = None
    language: str = "python"
    framework: Optional[str] = None
    style_guide: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


@dataclass
class CodeImplementationResult:
    """Result from DeepSeek code implementation"""
    success: bool
    code: Optional[str] = None
    explanation: Optional[str] = None
    files_created: List[str] = field(default_factory=list)
    reasoning: Optional[str] = None  # DeepSeek R1 reasoning process
    dependencies: List[str] = field(default_factory=list)
    error: Optional[str] = None


class DeepSeekCodeAgent:
    """
    Agent that uses DeepSeek R1 for code implementation.

    Advantages:
    - Cost-efficient (cheaper than Claude/Codex)
    - Shows reasoning process (R1 model)
    - Good code quality
    - Fast response times
    """

    def __init__(
        self,
        agent_id: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: str = "https://api.deepseek.com"
    ):
        """
        Initialize DeepSeek code agent.

        Args:
            agent_id: Unique identifier for this agent instance
            api_key: DeepSeek API key (or from DEEPSEEK_API_KEY env var)
            model: DeepSeek model to use (default: from DEEPSEEK_MODEL env var or deepseek-coder)
            base_url: DeepSeek API base URL
        """
        self.agent_id = agent_id
        self.model_name = model or os.getenv("DEEPSEEK_MODEL", "deepseek-coder")
        self.base_url = base_url

        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package not installed. "
                "Install with: pip install openai"
            )

        # Get API key
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError(
                "DeepSeek API key required. Set DEEPSEEK_API_KEY env var or pass api_key parameter."
            )

        # Initialize OpenAI client with DeepSeek endpoint
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

        print(f"[DeepSeekCode-{self.agent_id}] Initialized with model {self.model_name}")

    async def implement_code(self, request: CodeImplementationRequest) -> CodeImplementationResult:
        """
        Implement code based on requirements.

        Args:
            request: CodeImplementationRequest with task details

        Returns:
            CodeImplementationResult with generated code
        """
        print(f"[DeepSeekCode-{self.agent_id}] Implementing code...")

        await publish_event({
            "type": "deepseek_code_started",
            "agent_id": self.agent_id,
            "task": request.task_description,
            "timestamp": datetime.now().isoformat()
        })

        try:
            # Build prompt
            prompt = self._build_implementation_prompt(request)

            # Call DeepSeek API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert {request.language} developer. Generate clean, efficient, production-ready code.

IMPORTANT:
- Provide complete, working code (no placeholders or TODOs)
- Include all necessary imports
- Add clear comments explaining complex logic
- Follow {request.language} best practices
- Use proper error handling
- Make code maintainable and testable

Output format:
1. Brief explanation of approach
2. Complete code implementation
3. Any dependencies needed
"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for more consistent code
                max_tokens=4000
            )

            # Extract response
            content = response.choices[0].message.content

            # Parse reasoning if R1 model
            reasoning = None
            if "deepseek-reasoner" in self.model_name.lower() or "r1" in self.model_name.lower():
                # R1 models often include <think> tags for reasoning
                if "<think>" in content:
                    parts = content.split("<think>")
                    if len(parts) > 1:
                        reasoning_and_rest = parts[1].split("</think>")
                        reasoning = reasoning_and_rest[0].strip()
                        content = reasoning_and_rest[1].strip() if len(reasoning_and_rest) > 1 else content

            # Extract code blocks
            code_blocks = self._extract_code_blocks(content, request.language)

            if code_blocks:
                code = "\n\n".join(code_blocks)
            else:
                # If no code blocks found, use entire content
                code = content

            # Extract dependencies
            dependencies = self._extract_dependencies(content, request.language)

            # Extract explanation (first paragraph before code)
            explanation = self._extract_explanation(content)

            print(f"[DeepSeekCode-{self.agent_id}] Code implementation completed")

            await publish_event({
                "type": "deepseek_code_completed",
                "agent_id": self.agent_id,
                "success": True,
                "code_length": len(code),
                "timestamp": datetime.now().isoformat()
            })

            return CodeImplementationResult(
                success=True,
                code=code,
                explanation=explanation,
                reasoning=reasoning,
                dependencies=dependencies
            )

        except Exception as e:
            error_msg = f"DeepSeek code implementation failed: {str(e)}"
            print(f"[DeepSeekCode-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "deepseek_code_failed",
                "agent_id": self.agent_id,
                "error": error_msg,
                "timestamp": datetime.now().isoformat()
            })

            return CodeImplementationResult(
                success=False,
                error=error_msg
            )

    def _build_implementation_prompt(self, request: CodeImplementationRequest) -> str:
        """Build prompt for code implementation"""
        prompt_parts = [
            f"Task: {request.task_description}",
            "",
            "Requirements:"
        ]

        for i, req in enumerate(request.requirements, 1):
            prompt_parts.append(f"{i}. {req}")

        if request.existing_code:
            prompt_parts.extend([
                "",
                "Existing Code to Build On:",
                "```" + request.language,
                request.existing_code,
                "```"
            ])

        if request.framework:
            prompt_parts.extend([
                "",
                f"Framework: {request.framework}"
            ])

        if request.style_guide:
            prompt_parts.extend([
                "",
                f"Style Guide: {request.style_guide}"
            ])

        if request.context:
            prompt_parts.extend([
                "",
                "Additional Context:",
                str(request.context)
            ])

        return "\n".join(prompt_parts)

    def _extract_code_blocks(self, content: str, language: str) -> List[str]:
        """Extract code blocks from markdown"""
        blocks = []

        # Look for ```language or ``` code blocks
        import re

        # Pattern for language-specific code blocks
        pattern = rf"```{language}\s*\n(.*?)\n```"
        matches = re.findall(pattern, content, re.DOTALL)
        blocks.extend(matches)

        # Pattern for generic code blocks
        if not blocks:
            pattern = r"```\s*\n(.*?)\n```"
            matches = re.findall(pattern, content, re.DOTALL)
            blocks.extend(matches)

        return blocks

    def _extract_dependencies(self, content: str, language: str) -> List[str]:
        """Extract dependency information"""
        dependencies = []

        if language == "python":
            # Look for import statements
            import re
            import_pattern = r"^(?:from|import)\s+([\w.]+)"
            imports = re.findall(import_pattern, content, re.MULTILINE)

            # Filter out standard library
            stdlib = {"os", "sys", "pathlib", "typing", "dataclasses", "datetime", "json", "asyncio"}
            external = [imp.split(".")[0] for imp in imports if imp.split(".")[0] not in stdlib]
            dependencies.extend(list(set(external)))

        elif language in ["javascript", "typescript"]:
            # Look for require/import statements
            import re
            require_pattern = r"require\(['\"]([^'\"]+)['\"]\)"
            import_pattern = r"import .* from ['\"]([^'\"]+)['\"]"

            requires = re.findall(require_pattern, content)
            imports = re.findall(import_pattern, content)

            dependencies.extend(requires + imports)

        return list(set(dependencies))

    def _extract_explanation(self, content: str) -> Optional[str]:
        """Extract explanation from content"""
        lines = content.split("\n")

        explanation_lines = []
        found_code = False

        for line in lines:
            if line.strip().startswith("```"):
                found_code = True
                break
            if line.strip():
                explanation_lines.append(line.strip())

        if explanation_lines and not found_code:
            return " ".join(explanation_lines[:3])  # First 3 lines as explanation

        return None


async def main():
    """Test the DeepSeek code agent"""
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    print("Testing DeepSeek Code Agent...")
    print()

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("❌ DEEPSEEK_API_KEY not set")
        return

    agent = DeepSeekCodeAgent(agent_id="test-deepseek-code")

    request = CodeImplementationRequest(
        task_description="Create a simple calculator class",
        requirements=[
            "Implement add, subtract, multiply, divide methods",
            "Add error handling for division by zero",
            "Include docstrings"
        ],
        language="python"
    )

    result = await agent.implement_code(request)

    print("=" * 70)
    print("RESULT")
    print("=" * 70)
    print(f"Success: {result.success}")

    if result.success:
        print(f"\nExplanation: {result.explanation}")
        if result.reasoning:
            print(f"\nReasoning Process:")
            print(result.reasoning[:200] + "...")
        print(f"\nGenerated Code:")
        print("-" * 70)
        print(result.code)
        print("-" * 70)
        if result.dependencies:
            print(f"\nDependencies: {', '.join(result.dependencies)}")
    else:
        print(f"Error: {result.error}")


if __name__ == "__main__":
    asyncio.run(main())
