#!/usr/bin/env python3
"""
DeepSeek Agent - Uses DeepSeek AI for plan enrichment and code generation

DeepSeek is a cost-efficient AI model that can be used for:
1. Plan enrichment and analysis
2. Code generation (alternative to Codex)
3. Technical insights and suggestions
"""

import os
import asyncio
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
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

# Import OpenAI (DeepSeek uses OpenAI-compatible API)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None


@dataclass
class PlanEnrichmentRequest:
    """Request for DeepSeek to enrich a plan"""
    task_title: str
    task_description: str
    initial_plan: str
    previous_enrichments: List[Dict[str, str]] = field(default_factory=list)  # [{ai: content}]
    context: Optional[str] = None


@dataclass
class CodeGenerationRequest:
    """Request for DeepSeek to generate code"""
    task_title: str
    task_description: str
    requirements: List[str]
    framework: Optional[str] = None
    language: str = "python"
    style_guide: Optional[str] = None


@dataclass
class PlanEnrichmentResult:
    """Result from DeepSeek plan enrichment"""
    success: bool
    enriched_content: Optional[str] = None
    suggestions: List[str] = field(default_factory=list)
    technical_insights: List[str] = field(default_factory=list)
    risk_analysis: Optional[str] = None
    error: Optional[str] = None


@dataclass
class CodeGenerationResult:
    """Result from DeepSeek code generation"""
    success: bool
    code: Optional[str] = None
    explanation: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    usage_example: Optional[str] = None
    error: Optional[str] = None


class DeepSeekAgent:
    """
    Agent that uses DeepSeek AI for plan enrichment and code generation.

    DeepSeek provides cost-efficient AI capabilities through OpenAI-compatible API.

    Capabilities:
    - Enrich execution plans with technical insights
    - Generate code implementations
    - Provide risk analysis
    - Suggest optimizations and improvements
    """

    def __init__(
        self,
        agent_id: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: str = "https://api.deepseek.com"
    ):
        """
        Initialize DeepSeek agent.

        Args:
            agent_id: Unique identifier for this agent instance
            api_key: DeepSeek API key (or from DEEPSEEK_API_KEY env var)
            model: DeepSeek model to use (default: from DEEPSEEK_MODEL env var or deepseek-reasoner)
            base_url: DeepSeek API base URL
        """
        self.agent_id = agent_id
        self.model_name = model or os.getenv("DEEPSEEK_MODEL", "deepseek-reasoner")
        self.base_url = base_url

        # Check if using R1 reasoning model
        self.is_reasoning_model = "reasoner" in self.model_name.lower() or "r1" in self.model_name.lower()

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

        model_type = "R1 (Reasoning)" if self.is_reasoning_model else "Chat"
        print(f"[DeepSeek-{self.agent_id}] Initialized with model {self.model_name} ({model_type})")

    async def enrich_plan(self, request: PlanEnrichmentRequest) -> PlanEnrichmentResult:
        """
        Enrich an execution plan with technical insights and suggestions.

        Args:
            request: PlanEnrichmentRequest with plan and context

        Returns:
            PlanEnrichmentResult with enriched content
        """
        print(f"[DeepSeek-{self.agent_id}] Enriching plan...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "deepseek_enrichment",
            "task": request.task_title
        })

        try:
            # Create enrichment prompt
            prompt = self._create_enrichment_prompt(request)

            # Call DeepSeek API
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a technical architect and planning expert. Provide detailed, actionable insights for execution plans."},
                    {"role": "user", "content": prompt}
                ],
                # temperature removed for GPT-5 compatibility
                max_tokens=4096
            )

            # Parse response - R1 models return reasoning_content + content
            message = response.choices[0].message
            content = message.content
            reasoning = getattr(message, 'reasoning_content', None)

            # Log reasoning if available (R1 model)
            if reasoning and self.is_reasoning_model:
                print(f"[DeepSeek-{self.agent_id}] R1 Reasoning: {reasoning[:200]}...")
                # Include reasoning in the enrichment
                content = f"**Reasoning Process:**\n{reasoning}\n\n**Analysis:**\n{content}"

            result = self._parse_enrichment_response(content)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "suggestions_count": len(result.suggestions),
                "insights_count": len(result.technical_insights)
            })

            print(f"[DeepSeek-{self.agent_id}] Plan enrichment completed")
            return result

        except Exception as e:
            error_msg = f"Plan enrichment failed: {str(e)}"
            print(f"[DeepSeek-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return PlanEnrichmentResult(
                success=False,
                error=error_msg
            )

    async def generate_code(self, request: CodeGenerationRequest) -> CodeGenerationResult:
        """
        Generate code implementation based on requirements.

        Args:
            request: CodeGenerationRequest with specifications

        Returns:
            CodeGenerationResult with generated code
        """
        print(f"[DeepSeek-{self.agent_id}] Generating code...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "deepseek_codegen",
            "task": request.task_title
        })

        try:
            # Create code generation prompt
            prompt = self._create_codegen_prompt(request)

            # Call DeepSeek API
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name,
                messages=[
                    {"role": "system", "content": f"You are an expert {request.language} developer. Write clean, efficient, well-documented code following best practices."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=8192
            )

            # Parse response - R1 models return reasoning_content + content
            message = response.choices[0].message
            content = message.content
            reasoning = getattr(message, 'reasoning_content', None)

            # Log reasoning if available (R1 model)
            if reasoning and self.is_reasoning_model:
                print(f"[DeepSeek-{self.agent_id}] R1 Code Generation Reasoning: {reasoning[:200]}...")

            result = self._parse_codegen_response(content)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "code_length": len(result.code) if result.code else 0
            })

            print(f"[DeepSeek-{self.agent_id}] Code generation completed")
            return result

        except Exception as e:
            error_msg = f"Code generation failed: {str(e)}"
            print(f"[DeepSeek-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return CodeGenerationResult(
                success=False,
                error=error_msg
            )

    def _create_enrichment_prompt(self, request: PlanEnrichmentRequest) -> str:
        """Create prompt for plan enrichment."""
        prev_enrichments = "\n\n".join([
            f"**{list(e.keys())[0]} Analysis:**\n{list(e.values())[0]}"
            for e in request.previous_enrichments
        ])
        if prev_enrichments:
            previous_section = prev_enrichments
        else:
            previous_section = (
                "None yet - you're seeing this plan early in the enrichment pipeline."
            )

        context_section = ""
        if request.context:
            context_section = "\nADDITIONAL CONTEXT:\n" + request.context

        return f"""You are reviewing and enriching an execution plan. Provide deep technical insights and actionable suggestions.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

INITIAL PLAN:
{request.initial_plan}

PREVIOUS ENRICHMENTS FROM OTHER AIs:
{previous_section}
{context_section}

Please provide:

1. **ENRICHED ANALYSIS**: Your technical analysis of the plan, including:
   - Architecture considerations
   - Implementation approach validation
   - Technology stack recommendations
   - Performance implications
   - Scalability considerations

2. **ACTIONABLE SUGGESTIONS**: Specific improvements to the plan (be concise, 3-5 suggestions):
   - Better approaches or patterns
   - Missing steps or considerations
   - Optimization opportunities
   - Risk mitigation strategies

3. **TECHNICAL INSIGHTS**: Deep technical knowledge relevant to this task (2-3 insights):
   - Best practices for this type of work
   - Common pitfalls to avoid
   - Industry standards or conventions
   - Tool or library recommendations

4. **RISK ANALYSIS**: Potential risks and how to address them:
   - Technical risks
   - Integration challenges
   - Dependencies concerns
   - Edge cases to consider

5. **MISSING AGENT DETECTION**: Review the plan and verify these specialized agents are included:
   - **Documentation Agent**: Tasks for README, API docs, architecture documentation
   - **Testing Agent**: Tasks for unit tests, integration tests, E2E tests, coverage reports
   - **Security Agent**: Tasks for vulnerability scanning, auth review, input validation, OWASP compliance
   - **Code Quality Agent**: Tasks for linting, type checking, best practices enforcement

   If ANY of these are missing, add them to your suggestions with specific file names and actions.
   Example: "Add Testing Agent task: Create tests/api/auth.test.ts with 8 test cases for authentication flow"

6. **PARALLELIZATION ANALYSIS**: Identify which tasks can run simultaneously:
   - Group tasks that have no dependencies on each other
   - Estimate time savings from parallel execution
   - Suggest optimal execution stages (e.g., setup → parallel implementation → parallel QA → integration)

   Example: "Tasks 2-5 can run in parallel (component creation), saving ~60% execution time"

Format your response as JSON:
{{
    "enriched_content": "Your full technical analysis here...",
    "suggestions": ["Suggestion 1", "Suggestion 2", "Add missing agent tasks if needed", ...],
    "technical_insights": ["Insight 1", "Insight 2", ...],
    "risk_analysis": "Risk analysis here...",
    "missing_agents": ["List any missing specialized agent types"],
    "parallelization_opportunities": "Analysis of which tasks can run in parallel and estimated time savings"
}}"""

    def _create_codegen_prompt(self, request: CodeGenerationRequest) -> str:
        """Create prompt for code generation."""
        requirements_text = "\n".join([f"- {req}" for req in request.requirements])

        return f"""Generate production-ready {request.language} code for the following task.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

REQUIREMENTS:
{requirements_text}

{f"FRAMEWORK: {request.framework}" if request.framework else ""}
{f"STYLE GUIDE: {request.style_guide}" if request.style_guide else ""}

Please provide:

1. **COMPLETE CODE**: Fully functional, production-ready code with:
   - Proper error handling
   - Input validation
   - Clear documentation/comments
   - Type hints (if applicable)
   - Following best practices

2. **EXPLANATION**: Brief explanation of:
   - How the code works
   - Key design decisions
   - Why this approach was chosen

3. **DEPENDENCIES**: List any external libraries or packages required

4. **USAGE EXAMPLE**: A simple example showing how to use the code

Format your response as JSON:
{{
    "code": "Full code implementation here...",
    "explanation": "Explanation here...",
    "dependencies": ["dependency1", "dependency2", ...],
    "usage_example": "Usage example code here..."
}}"""

    def _parse_enrichment_response(self, response_text: str) -> PlanEnrichmentResult:
        """Parse DeepSeek's enrichment response."""
        try:
            # Try to extract JSON from response
            text = response_text.strip()

            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            # Parse JSON
            data = json.loads(text)

            return PlanEnrichmentResult(
                success=True,
                enriched_content=data.get("enriched_content"),
                suggestions=data.get("suggestions", []),
                technical_insights=data.get("technical_insights", []),
                risk_analysis=data.get("risk_analysis")
            )

        except json.JSONDecodeError:
            # If JSON parsing fails, treat entire response as enriched content
            return PlanEnrichmentResult(
                success=True,
                enriched_content=response_text,
                suggestions=[],
                technical_insights=[],
                risk_analysis=None
            )

    def _parse_codegen_response(self, response_text: str) -> CodeGenerationResult:
        """Parse DeepSeek's code generation response."""
        try:
            # Try to extract JSON from response
            text = response_text.strip()

            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            text = text.strip()

            # Parse JSON
            data = json.loads(text)

            return CodeGenerationResult(
                success=True,
                code=data.get("code"),
                explanation=data.get("explanation"),
                dependencies=data.get("dependencies", []),
                usage_example=data.get("usage_example")
            )

        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract code from markdown
            code = self._extract_code_from_markdown(response_text)
            return CodeGenerationResult(
                success=True,
                code=code if code else response_text,
                explanation="Code extracted from response",
                dependencies=[],
                usage_example=None
            )

    def _extract_code_from_markdown(self, text: str) -> Optional[str]:
        """Extract code from markdown code blocks."""
        import re
        # Look for code blocks
        pattern = r"```(?:python|javascript|typescript|java|cpp|go)?\n(.*?)```"
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            return matches[0].strip()
        return None


# Example usage
async def main():
    """Example usage of DeepSeek agent."""
    agent = DeepSeekAgent(agent_id="deepseek-001")

    # Example plan enrichment
    enrichment_request = PlanEnrichmentRequest(
        task_title="Build REST API",
        task_description="Create a RESTful API for user management",
        initial_plan="1. Design endpoints\n2. Implement routes\n3. Add authentication\n4. Write tests",
        previous_enrichments=[
            {"Claude": "Consider using JWT for authentication"},
            {"ChatGPT": "Implement rate limiting for security"}
        ]
    )

    enrichment_result = await agent.enrich_plan(enrichment_request)
    print(f"Enrichment completed: {enrichment_result.success}")
    print(f"Suggestions: {len(enrichment_result.suggestions)}")

    # Example code generation
    codegen_request = CodeGenerationRequest(
        task_title="JWT Token Generator",
        task_description="Function to generate JWT tokens",
        requirements=[
            "Accept user_id and expiration time",
            "Return signed JWT token",
            "Include error handling"
        ],
        language="python"
    )

    codegen_result = await agent.generate_code(codegen_request)
    print(f"Code generation completed: {codegen_result.success}")
    if codegen_result.code:
        print(f"Generated {len(codegen_result.code)} characters of code")


if __name__ == "__main__":
    asyncio.run(main())
