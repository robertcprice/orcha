#!/usr/bin/env python3
"""
Grok Agent - Uses xAI's Grok for plan review and creative insights

Grok provides unique perspectives and creative problem-solving for:
1. Plan review and validation
2. Creative alternative approaches
3. Pattern recognition and insights
4. Risk identification
"""

import os
import asyncio
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import sys

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass

# Import OpenAI (Grok uses OpenAI-compatible API)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None


@dataclass
class PlanReviewRequest:
    """Request for Grok to review an enriched plan"""
    task_title: str
    task_description: str
    initial_plan: str
    enrichments: List[Dict[str, str]] = field(default_factory=list)  # [{ai: content}]
    context: Optional[str] = None


@dataclass
class CreativeInsightsRequest:
    """Request for Grok to provide creative insights"""
    task_title: str
    task_description: str
    current_approach: str
    constraints: List[str] = field(default_factory=list)


@dataclass
class PlanReviewResult:
    """Result from Grok plan review"""
    success: bool
    review_summary: Optional[str] = None
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    alternative_approaches: List[str] = field(default_factory=list)
    creative_insights: List[str] = field(default_factory=list)
    risk_assessment: Optional[str] = None
    confidence_score: float = 0.0
    error: Optional[str] = None


@dataclass
class CreativeInsightsResult:
    """Result from Grok creative insights"""
    success: bool
    insights: List[str] = field(default_factory=list)
    alternative_solutions: List[str] = field(default_factory=list)
    innovative_patterns: List[str] = field(default_factory=list)
    unconventional_ideas: List[str] = field(default_factory=list)
    error: Optional[str] = None


class GrokAgent:
    """
    Agent that uses xAI's Grok for plan review and creative insights.

    Grok excels at:
    - Identifying patterns and connections
    - Providing creative alternative approaches
    - Offering unique perspectives
    - Risk assessment with unconventional thinking
    - Critical review with constructive feedback
    """

    def __init__(
        self,
        agent_id: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: str = "https://api.x.ai/v1"
    ):
        """
        Initialize Grok agent.

        Args:
            agent_id: Unique identifier for this agent instance
            api_key: xAI Grok API key (or from GROK_API_KEY or XAI_API_KEY env var)
            model: Grok model to use (default: from GROK_MODEL env var or grok-4)
            base_url: xAI API base URL
        """
        self.agent_id = agent_id
        self.model_name = model or os.getenv("GROK_MODEL", "grok-4")
        self.base_url = base_url

        if not OPENAI_AVAILABLE:
            raise ImportError(
                "openai package not installed. "
                "Install with: pip install openai"
            )

        # Get API key (try both GROK_API_KEY and XAI_API_KEY)
        self.api_key = api_key or os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Grok API key required. Set GROK_API_KEY or XAI_API_KEY env var or pass api_key parameter."
            )

        # Initialize OpenAI client with xAI endpoint
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

        print(f"[Grok-{self.agent_id}] Initialized with model {self.model_name}")

    async def review_plan(self, request: PlanReviewRequest) -> PlanReviewResult:
        """
        Review an enriched execution plan with creative insights.

        Args:
            request: PlanReviewRequest with plan and enrichments

        Returns:
            PlanReviewResult with review and insights
        """
        print(f"[Grok-{self.agent_id}] Reviewing plan...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "grok_review",
            "task": request.task_title
        })

        try:
            # Create review prompt
            prompt = self._create_review_prompt(request)

            # Call Grok API
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are Grok, an AI with a unique perspective on problem-solving. Provide insightful, creative, and sometimes unconventional analysis. Be direct, honest, and helpful."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,  # Higher temperature for more creative responses
                max_tokens=4096
            )

            # Parse response
            content = response.choices[0].message.content
            result = self._parse_review_response(content)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "confidence_score": result.confidence_score,
                "alternatives_found": len(result.alternative_approaches)
            })

            print(f"[Grok-{self.agent_id}] Plan review completed (confidence: {result.confidence_score}/10)")
            return result

        except Exception as e:
            error_msg = f"Plan review failed: {str(e)}"
            print(f"[Grok-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return PlanReviewResult(
                success=False,
                error=error_msg
            )

    async def get_creative_insights(self, request: CreativeInsightsRequest) -> CreativeInsightsResult:
        """
        Get creative insights and alternative approaches.

        Args:
            request: CreativeInsightsRequest with task details

        Returns:
            CreativeInsightsResult with creative suggestions
        """
        print(f"[Grok-{self.agent_id}] Generating creative insights...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "grok_creative",
            "task": request.task_title
        })

        try:
            # Create insights prompt
            prompt = self._create_insights_prompt(request)

            # Call Grok API
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are Grok, an AI that excels at creative problem-solving and thinking outside the box. Provide innovative, unconventional, yet practical insights."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,  # Higher temperature for creativity
                max_tokens=4096
            )

            # Parse response
            content = response.choices[0].message.content
            result = self._parse_insights_response(content)

            await publish_event({
                "type": "agent_completed",
                "agent_id": self.agent_id,
                "success": result.success,
                "insights_count": len(result.insights),
                "alternatives_count": len(result.alternative_solutions)
            })

            print(f"[Grok-{self.agent_id}] Creative insights generated")
            return result

        except Exception as e:
            error_msg = f"Creative insights generation failed: {str(e)}"
            print(f"[Grok-{self.agent_id}] ERROR: {error_msg}")

            await publish_event({
                "type": "agent_error",
                "agent_id": self.agent_id,
                "error": error_msg
            })

            return CreativeInsightsResult(
                success=False,
                error=error_msg
            )

    def _create_review_prompt(self, request: PlanReviewRequest) -> str:
        """Create prompt for plan review."""
        enrichments_text = "\n\n".join([
            f"**{list(e.keys())[0]}:**\n{list(e.values())[0]}"
            for e in request.enrichments
        ])
        if enrichments_text:
            enrichments_section = enrichments_text
        else:
            enrichments_section = "No enrichments from other AIs yet."

        context_section = ""
        if request.context:
            context_section = "\nCONTEXT:\n" + request.context

        return f"""You're reviewing a plan that has already been enriched by multiple AI systems. Provide your unique perspective and creative insights.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

INITIAL PLAN:
{request.initial_plan}

ENRICHMENTS FROM OTHER AIs:
{enrichments_section}
{context_section}

As Grok, provide your honest, insightful review. Don't just agree - add value with:

1. **REVIEW SUMMARY**: Your overall assessment of the plan and enrichments
   - What's working well?
   - What's been overlooked?
   - Is this the best approach?

2. **STRENGTHS**: What's genuinely good about this plan (be specific)

3. **WEAKNESSES**: What concerns you or what's missing (be direct but constructive)

4. **ALTERNATIVE APPROACHES**: Creative alternatives or better ways to achieve the goal
   - Different architectures
   - Simpler solutions
   - More innovative approaches

5. **CREATIVE INSIGHTS**: Unique perspectives that others might have missed
   - Patterns you recognize
   - Non-obvious connections
   - Future-proofing considerations
   - Unconventional optimizations

6. **RISK ASSESSMENT**: What could go wrong and how to prevent it
   - Technical risks
   - Complexity risks
   - Integration challenges
   - Edge cases

7. **SPECIALIZED AGENT VERIFICATION**: Confirm the plan includes ALL required specialized agents:
   - **Documentation Agent**: For README, API docs, architecture documentation
   - **Testing Agent**: For unit tests, integration tests, E2E tests
   - **Security Agent**: For vulnerability scanning, auth review, OWASP compliance
   - **Code Quality Agent**: For linting, type checking, best practices

   If ANY are missing, flag this as a WEAKNESS and suggest specific tasks to add.
   Be specific with file names. Example: "Missing: Testing Agent should create tests/services/payment.test.ts"

8. **PARALLELIZATION REVIEW**: Evaluate if parallel execution is maximized:
   - Are independent tasks properly grouped for parallel execution?
   - Is the execution order optimal?
   - Could more tasks run simultaneously?
   - What's the estimated time savings from parallelization?

   Example: "Good parallelization in implementation phase, but QA tasks should also run in parallel"

9. **CONFIDENCE SCORE** (1-10): How confident are you this plan will succeed?

Format your response as JSON:
{{
    "review_summary": "Your assessment...",
    "strengths": ["Strength 1", "Strength 2", ...],
    "weaknesses": ["Weakness 1", "Weakness 2", "Missing specialized agents if applicable", ...],
    "alternative_approaches": ["Alternative 1", "Alternative 2", ...],
    "creative_insights": ["Insight 1", "Insight 2", ...],
    "risk_assessment": "Risk analysis...",
    "missing_specialized_agents": ["List any missing agent types with suggested tasks"],
    "parallelization_review": "Evaluation of parallelization strategy and optimization suggestions",
    "confidence_score": 8.5
}}"""

    def _create_insights_prompt(self, request: CreativeInsightsRequest) -> str:
        """Create prompt for creative insights."""
        constraints_text = "\n".join([f"- {c}" for c in request.constraints])

        return f"""Think creatively about this task. Provide innovative insights and alternative solutions.

TASK: {request.task_title}

DESCRIPTION: {request.task_description}

CURRENT APPROACH:
{request.current_approach}

CONSTRAINTS:
{constraints_text if constraints_text else "None specified"}

As Grok, think outside the box and provide:

1. **CREATIVE INSIGHTS**: Unique perspectives and non-obvious observations
   - What patterns do you see?
   - What's the underlying problem we're really solving?
   - What innovative techniques could apply here?

2. **ALTERNATIVE SOLUTIONS**: Different ways to solve this problem
   - Simpler approaches
   - More scalable designs
   - Novel architectures
   - Technology alternatives

3. **INNOVATIVE PATTERNS**: Interesting patterns or paradigms to consider
   - Design patterns from other domains
   - Cross-industry inspiration
   - Emerging best practices

4. **UNCONVENTIONAL IDEAS**: Wild ideas that might actually work
   - Challenge assumptions
   - Question the requirements
   - Suggest radical simplifications
   - Propose future-forward approaches

Don't hold back - be creative, be bold, but stay practical.

Format your response as JSON:
{{
    "insights": ["Insight 1", "Insight 2", ...],
    "alternative_solutions": ["Solution 1", "Solution 2", ...],
    "innovative_patterns": ["Pattern 1", "Pattern 2", ...],
    "unconventional_ideas": ["Idea 1", "Idea 2", ...]
}}"""

    def _parse_review_response(self, response_text: str) -> PlanReviewResult:
        """Parse Grok's review response."""
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

            return PlanReviewResult(
                success=True,
                review_summary=data.get("review_summary"),
                strengths=data.get("strengths", []),
                weaknesses=data.get("weaknesses", []),
                alternative_approaches=data.get("alternative_approaches", []),
                creative_insights=data.get("creative_insights", []),
                risk_assessment=data.get("risk_assessment"),
                confidence_score=float(data.get("confidence_score", 0.0))
            )

        except (json.JSONDecodeError, ValueError):
            # If JSON parsing fails, treat entire response as review summary
            return PlanReviewResult(
                success=True,
                review_summary=response_text,
                strengths=[],
                weaknesses=[],
                alternative_approaches=[],
                creative_insights=[],
                risk_assessment=None,
                confidence_score=5.0
            )

    def _parse_insights_response(self, response_text: str) -> CreativeInsightsResult:
        """Parse Grok's creative insights response."""
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

            return CreativeInsightsResult(
                success=True,
                insights=data.get("insights", []),
                alternative_solutions=data.get("alternative_solutions", []),
                innovative_patterns=data.get("innovative_patterns", []),
                unconventional_ideas=data.get("unconventional_ideas", [])
            )

        except json.JSONDecodeError:
            # If JSON parsing fails, treat response as single insight
            return CreativeInsightsResult(
                success=True,
                insights=[response_text],
                alternative_solutions=[],
                innovative_patterns=[],
                unconventional_ideas=[]
            )


# Example usage
async def main():
    """Example usage of Grok agent."""
    agent = GrokAgent(agent_id="grok-001")

    # Example plan review
    review_request = PlanReviewRequest(
        task_title="Build Microservices Architecture",
        task_description="Design and implement microservices for e-commerce platform",
        initial_plan="1. Service decomposition\n2. API Gateway\n3. Service mesh\n4. Deploy to K8s",
        enrichments=[
            {"Claude": "Consider event-driven architecture for async operations"},
            {"ChatGPT": "Implement circuit breakers and retry logic"},
            {"DeepSeek": "Use gRPC for inter-service communication"}
        ]
    )

    review_result = await agent.review_plan(review_request)
    print(f"Review completed: {review_result.success}")
    print(f"Confidence: {review_result.confidence_score}/10")
    print(f"Alternatives found: {len(review_result.alternative_approaches)}")

    # Example creative insights
    insights_request = CreativeInsightsRequest(
        task_title="Optimize Database Queries",
        task_description="Improve database performance for high-traffic application",
        current_approach="Add indexes and optimize queries",
        constraints=["Cannot change database engine", "Limited downtime window"]
    )

    insights_result = await agent.get_creative_insights(insights_request)
    print(f"Insights generated: {insights_result.success}")
    print(f"Creative ideas: {len(insights_result.insights)}")


if __name__ == "__main__":
    asyncio.run(main())
