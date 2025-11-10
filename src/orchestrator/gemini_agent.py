#!/usr/bin/env python3
"""
Gemini Agent - Uses Google Gemini for documentation and final review

This agent uses Google's Generative AI SDK to:
1. Review completed work from other agents
2. Generate comprehensive documentation
3. Provide final quality assessment
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

# Import Google Generative AI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None


@dataclass
class DocumentationRequest:
    """Request for Gemini to generate documentation"""
    task_title: str
    task_description: str
    code_files: Dict[str, str]  # filename -> content
    test_files: Dict[str, str]  # filename -> content
    implementation_notes: str
    review_feedback: Optional[str] = None


@dataclass
class ReviewRequest:
    """Request for Gemini to review all work"""
    task_title: str
    task_description: str
    implementation_summary: str
    code_summary: str
    test_summary: str
    previous_feedback: List[str] = field(default_factory=list)


@dataclass
class DocumentationResult:
    """Result from Gemini documentation generation"""
    success: bool
    documentation: Optional[str] = None
    readme_content: Optional[str] = None
    architecture_notes: Optional[str] = None
    usage_examples: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class ReviewResult:
    """Result from Gemini final review"""
    success: bool
    approved: bool
    overall_quality_score: float
    feedback: str
    strengths: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)
    concerns: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class TaskOrganizationRequest:
    """Request for Gemini to organize all enrichments into structured JSON"""
    task_title: str
    task_description: str
    all_enrichments: List[Dict[str, Any]]  # All AI enrichments (Claude, ChatGPT, DeepSeek, Grok, Gemini)


@dataclass
class TaskOrganizationResult:
    """Result from Gemini task organization"""
    success: bool
    structured_tasks: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class GeminiAgent:
    """
    Agent that uses Google Gemini for documentation and final review.

    Capabilities:
    - Generate comprehensive documentation
    - Create README files
    - Write architecture notes
    - Provide final quality review
    - Assess overall project quality
    """

    def __init__(
        self,
        agent_id: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        """
        Initialize Gemini agent.

        Args:
            agent_id: Unique identifier for this agent instance
            api_key: Google Gemini API key (or from GEMINI_API_KEY env var)
            model: Gemini model to use (default: from GEMINI_MODEL env var or gemini-2.5-pro)
        """
        self.agent_id = agent_id
        self.model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai package not installed. "
                "Install with: pip install google-generativeai"
            )

        # Get API key
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Gemini API key required. Set GEMINI_API_KEY env var or pass api_key parameter."
            )

        # Configure Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)

        print(f"[Gemini-{self.agent_id}] Initialized with model {self.model_name}")

    async def document(self, request: DocumentationRequest) -> DocumentationResult:
        """
        Generate comprehensive documentation for completed work.

        Args:
            request: DocumentationRequest with code and context

        Returns:
            DocumentationResult with generated documentation
        """
        print(f"[Gemini-{self.agent_id}] Generating documentation...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "gemini_documentation",
            "task": request.task_title
        })

        try:
            # Create documentation prompt
            prompt = self._create_documentation_prompt(request)

            # Generate documentation using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            # Parse the response
            result = self._parse_documentation_response(response.text)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "sections_generated": len([
                    x for x in [result.documentation, result.readme_content, result.architecture_notes]
                    if x
                ])
            })

            print(f"[Gemini-{self.agent_id}] Documentation generated successfully")
            return result

        except Exception as e:
            error_msg = f"Documentation generation failed: {str(e)}"
            print(f"[Gemini-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return DocumentationResult(
                success=False,
                error=error_msg
            )

    async def review(self, request: ReviewRequest) -> ReviewResult:
        """
        Perform final comprehensive review of all work.

        Args:
            request: ReviewRequest with all work summaries

        Returns:
            ReviewResult with final assessment
        """
        print(f"[Gemini-{self.agent_id}] Performing final review...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "gemini_review",
            "task": request.task_title
        })

        try:
            # Create review prompt
            prompt = self._create_review_prompt(request)

            # Generate review using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            # Parse the response
            result = self._parse_review_response(response.text)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "approved": result.approved,
                "quality_score": result.overall_quality_score,
                "concerns": len(result.concerns)
            })

            print(f"[Gemini-{self.agent_id}] Review completed - Quality: {result.overall_quality_score}/10")
            return result

        except Exception as e:
            error_msg = f"Review failed: {str(e)}"
            print(f"[Gemini-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return ReviewResult(
                success=False,
                approved=False,
                overall_quality_score=0.0,
                feedback="Review failed due to error",
                error=error_msg
            )

    async def organize_final_tasks(self, request: TaskOrganizationRequest) -> TaskOrganizationResult:
        """
        Organize all AI enrichments into structured JSON format for orchestrator execution.

        This is the FINAL step after all 5 AIs have contributed. Gemini will:
        1. Consolidate ALL content from previous AIs (NO truncation or summarization)
        2. Organize tasks with parallelization markers
        3. Assign tasks to appropriate agent types
        4. Include documentation, testing, and security agents
        5. Create structured execution order

        Args:
            request: TaskOrganizationRequest with all enrichments

        Returns:
            TaskOrganizationResult with structured JSON task breakdown
        """
        print(f"[Gemini-{self.agent_id}] Organizing final task structure...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "gemini_task_organization",
            "task": request.task_title
        })

        try:
            # Create task organization prompt
            prompt = self._create_task_organization_prompt(request)

            # Generate structured tasks using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            # Parse the response
            result = self._parse_task_organization_response(response.text)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "total_tasks": result.structured_tasks.get("total_tasks", 0) if result.structured_tasks else 0
            })

            print(f"[Gemini-{self.agent_id}] Task organization completed successfully")
            return result

        except Exception as e:
            error_msg = f"Task organization failed: {str(e)}"
            print(f"[Gemini-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return TaskOrganizationResult(
                success=False,
                error=error_msg
            )

    def _create_documentation_prompt(self, request: DocumentationRequest) -> str:
        """Create prompt for documentation generation."""
        code_summary = "\n\n".join([
            f"**{filename}**:\n```\n{content[:500]}...\n```"
            for filename, content in list(request.code_files.items())[:3]
        ])

        test_summary = "\n\n".join([
            f"**{filename}**:\n```\n{content[:300]}...\n```"
            for filename, content in list(request.test_files.items())[:2]
        ])

        review_feedback_section = ""
        if request.review_feedback:
            review_feedback_section = "\nPREVIOUS REVIEW FEEDBACK:\n" + request.review_feedback

        return f"""You are a technical documentation expert. Generate comprehensive documentation for the following completed work.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

IMPLEMENTATION NOTES:
{request.implementation_notes}

CODE FILES:
{code_summary}

TEST FILES:
{test_summary}

{review_feedback_section}

Please generate:

1. **COMPREHENSIVE DOCUMENTATION**: A complete technical document explaining:
   - Overview of what was built
   - Architecture and design decisions
   - Key components and their interactions
   - API/Interface documentation
   - Configuration and setup

2. **README CONTENT**: A user-friendly README.md including:
   - Project description
   - Installation instructions
   - Usage examples
   - Configuration guide
   - Troubleshooting tips

3. **ARCHITECTURE NOTES**: Technical notes covering:
   - System architecture
   - Design patterns used
   - Technology choices and rationale
   - Future extension points

4. **USAGE EXAMPLES**: At least 3 practical code examples showing common use cases

Format your response as JSON:
{{
    "documentation": "Full technical documentation here...",
    "readme_content": "README.md content here...",
    "architecture_notes": "Architecture notes here...",
    "usage_examples": ["Example 1...", "Example 2...", "Example 3..."]
}}"""

    def _create_review_prompt(self, request: ReviewRequest) -> str:
        """Create prompt for final review."""
        prev_feedback = "\n".join([f"- {fb}" for fb in request.previous_feedback])

        return f"""You are an expert software architect and quality reviewer. Perform a final comprehensive review of all completed work.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

IMPLEMENTATION SUMMARY:
{request.implementation_summary}

CODE SUMMARY:
{request.code_summary}

TEST SUMMARY:
{request.test_summary}

PREVIOUS FEEDBACK FROM OTHER AGENTS:
{prev_feedback}

Please provide a thorough final review with:

1. **OVERALL QUALITY SCORE** (1-10): Based on code quality, testing, documentation, best practices
2. **APPROVAL STATUS**: Whether this work meets production standards
3. **STRENGTHS**: What was done particularly well
4. **IMPROVEMENTS**: Suggestions for enhancement (not blocking, but valuable)
5. **CONCERNS**: Any critical issues that should be addressed before deployment

Consider:
- Code quality and maintainability
- Test coverage and quality
- Security implications
- Performance considerations
- Scalability
- Documentation completeness
- Best practices adherence

Format your response as JSON:
{{
    "approved": true/false,
    "overall_quality_score": 8.5,
    "feedback": "Overall assessment...",
    "strengths": ["Strength 1", "Strength 2", ...],
    "improvements": ["Improvement 1", "Improvement 2", ...],
    "concerns": ["Concern 1", "Concern 2", ...]
}}"""

    def _parse_documentation_response(self, response_text: str) -> DocumentationResult:
        """Parse Gemini's documentation response."""
        try:
            # Try to extract JSON from response
            # Gemini sometimes wraps JSON in markdown code blocks
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

            return DocumentationResult(
                success=True,
                documentation=data.get("documentation"),
                readme_content=data.get("readme_content"),
                architecture_notes=data.get("architecture_notes"),
                usage_examples=data.get("usage_examples", [])
            )

        except json.JSONDecodeError:
            # If JSON parsing fails, treat entire response as documentation
            return DocumentationResult(
                success=True,
                documentation=response_text,
                readme_content=None,
                architecture_notes=None,
                usage_examples=[]
            )

    def _parse_review_response(self, response_text: str) -> ReviewResult:
        """Parse Gemini's review response."""
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

            return ReviewResult(
                success=True,
                approved=data.get("approved", False),
                overall_quality_score=float(data.get("overall_quality_score", 0.0)),
                feedback=data.get("feedback", ""),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                concerns=data.get("concerns", [])
            )

        except (json.JSONDecodeError, ValueError) as e:
            # If parsing fails, create a basic review from the text
            return ReviewResult(
                success=True,
                approved=False,
                overall_quality_score=5.0,
                feedback=response_text,
                strengths=[],
                improvements=[],
                concerns=["Unable to parse structured review"]
            )

    def _create_task_organization_prompt(self, request: TaskOrganizationRequest) -> str:
        """Create prompt for organizing tasks into structured JSON."""

        # Extract content from each AI enrichment
        enrichment_content = []
        for enrichment in request.all_enrichments:
            ai_name = enrichment.get("ai", "Unknown")
            content = enrichment.get("content", "")
            enrichment_content.append(f"## {ai_name}'s Contribution\n{content}\n")

        all_enrichments_text = "\n".join(enrichment_content)

        return f"""You are the 5th and FINAL AI in a multi-AI planning pipeline. Your role is to organize ALL the work from the previous AIs into a structured, executable JSON format.

**CRITICAL RULES:**
1. **NO TRUNCATION**: Include EVERY task and subtask from previous AIs
2. **NO SUMMARIZATION**: Do not shorten or compress any AI's contributions
3. **ONLY ADD/IMPROVE**: You may add improvements or fix issues, but NEVER remove content
4. **COMPLETE PRESERVATION**: All details from ChatGPT's plan must be fully included

**ORIGINAL TASK:**
{request.task_title}

**TASK DESCRIPTION:**
{request.task_description}

**ALL AI CONTRIBUTIONS (YOU MUST PRESERVE ALL OF THIS):**
{all_enrichments_text}

**YOUR JOB:**
Create a structured JSON task breakdown that:
1. Includes ALL tasks and subtasks from ChatGPT (and other AIs)
2. Marks which tasks can run in parallel
3. Assigns tasks to appropriate agent types:
   - code_agent: For implementation
   - ui_agent: For UI/frontend work
   - testing_agent: For writing tests
   - documentation_agent: For documentation
   - security_agent: For security review
   - code_quality_agent: For linting/best practices

4. REQUIRES these agent types in EVERY plan:
   - documentation_agent: For README, API docs, architecture docs
   - testing_agent: For unit tests, integration tests, E2E tests
   - security_agent: For vulnerability scanning, auth review, input validation
   - code_quality_agent: For linting, type checking, best practices

5. Organize tasks into execution stages (setup, implementation, quality_assurance)
6. Specify dependencies clearly
7. Include estimated time for each task
8. Provide execution order

**OUTPUT FORMAT (STRICT JSON):**
{{
  "task_title": "{request.task_title}",
  "final_plan_version": "v1.0",
  "total_tasks": 15,
  "parallelization_score": 8.5,
  "task_groups": [
    {{
      "group_id": "setup",
      "parallel": false,
      "tasks": [
        {{
          "task_id": "task_1",
          "title": "Initialize Project Structure",
          "assigned_agent": "code_agent",
          "subtasks": [
            "Create directory structure",
            "Initialize package.json",
            "Setup TypeScript config"
          ],
          "dependencies": [],
          "can_parallelize": false,
          "estimated_time": "5 minutes"
        }}
      ]
    }},
    {{
      "group_id": "implementation",
      "parallel": true,
      "tasks": [
        {{
          "task_id": "task_2",
          "title": "Implement Core Logic",
          "assigned_agent": "code_agent",
          "subtasks": ["..."],
          "dependencies": ["task_1"],
          "can_parallelize": true,
          "parallel_with": ["task_3", "task_4"]
        }},
        {{
          "task_id": "task_3",
          "title": "Create UI Components",
          "assigned_agent": "ui_agent",
          "subtasks": ["..."],
          "dependencies": ["task_1"],
          "can_parallelize": true,
          "parallel_with": ["task_2", "task_4"]
        }}
      ]
    }},
    {{
      "group_id": "quality_assurance",
      "parallel": true,
      "tasks": [
        {{
          "task_id": "task_10",
          "title": "Write Unit Tests",
          "assigned_agent": "testing_agent",
          "subtasks": ["..."],
          "dependencies": ["task_2", "task_3"],
          "can_parallelize": true
        }},
        {{
          "task_id": "task_11",
          "title": "Security Audit",
          "assigned_agent": "security_agent",
          "subtasks": ["..."],
          "dependencies": ["task_2", "task_3"],
          "can_parallelize": true
        }},
        {{
          "task_id": "task_12",
          "title": "Generate Documentation",
          "assigned_agent": "documentation_agent",
          "subtasks": ["..."],
          "dependencies": ["task_2", "task_3"],
          "can_parallelize": true
        }},
        {{
          "task_id": "task_13",
          "title": "Code Quality Review",
          "assigned_agent": "code_quality_agent",
          "subtasks": ["..."],
          "dependencies": ["task_2", "task_3"],
          "can_parallelize": true
        }}
      ]
    }}
  ],
  "agent_allocations": {{
    "code_agent": ["task_1", "task_2"],
    "ui_agent": ["task_3"],
    "testing_agent": ["task_10"],
    "security_agent": ["task_11"],
    "documentation_agent": ["task_12"],
    "code_quality_agent": ["task_13"]
  }},
  "execution_order": [
    {{
      "stage": 1,
      "tasks": ["task_1"],
      "note": "Setup phase - sequential"
    }},
    {{
      "stage": 2,
      "tasks": ["task_2", "task_3", "task_4"],
      "note": "Implementation phase - parallel"
    }},
    {{
      "stage": 3,
      "tasks": ["task_10", "task_11", "task_12", "task_13"],
      "note": "QA phase - parallel"
    }}
  ]
}}

**REMEMBER:**
- Include ALL content from previous AIs (especially ChatGPT's detailed plan)
- Every plan MUST have documentation_agent, testing_agent, security_agent, code_quality_agent
- Mark parallelization opportunities clearly
- Assign appropriate agent types
- Provide complete subtask breakdowns

Return ONLY valid JSON, no additional text."""

    def _parse_task_organization_response(self, response_text: str) -> TaskOrganizationResult:
        """Parse Gemini's task organization response."""
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
            structured_tasks = json.loads(text)

            # Validate that required agent types are present
            agent_allocations = structured_tasks.get("agent_allocations", {})
            required_agents = ["documentation_agent", "testing_agent", "security_agent", "code_quality_agent"]
            missing_agents = [agent for agent in required_agents if agent not in agent_allocations]

            if missing_agents:
                print(f"⚠️ Warning: Missing required agents: {missing_agents}")

            return TaskOrganizationResult(
                success=True,
                structured_tasks=structured_tasks
            )

        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse JSON: {str(e)}"
            print(f"❌ JSON parsing failed: {error_msg}")
            return TaskOrganizationResult(
                success=False,
                error=error_msg
            )


# Example usage
async def main():
    """Example usage of Gemini agent."""
    agent = GeminiAgent(agent_id="gemini-001")

    # Example documentation request
    doc_request = DocumentationRequest(
        task_title="User Authentication System",
        task_description="Implement JWT-based authentication with refresh tokens",
        code_files={
            "auth.py": "def authenticate(username, password): ...",
            "tokens.py": "def generate_jwt(user_id): ..."
        },
        test_files={
            "test_auth.py": "def test_authenticate(): ..."
        },
        implementation_notes="Used PyJWT library, implemented refresh token rotation"
    )

    doc_result = await agent.document(doc_request)
    print(f"Documentation generated: {doc_result.success}")

    # Example review request
    review_request = ReviewRequest(
        task_title="User Authentication System",
        task_description="Implement JWT-based authentication with refresh tokens",
        implementation_summary="Completed JWT auth with refresh tokens",
        code_summary="2 files, 150 lines of code",
        test_summary="12 tests, 95% coverage",
        previous_feedback=["Code quality looks good", "Tests are comprehensive"]
    )

    review_result = await agent.review(review_request)
    print(f"Review completed: Approved={review_result.approved}, Score={review_result.overall_quality_score}/10")


if __name__ == "__main__":
    asyncio.run(main())
