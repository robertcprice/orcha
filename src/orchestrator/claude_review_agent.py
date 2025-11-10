#!/usr/bin/env python3
"""
Claude Review Agent - Reviews and improves Codex implementations

This agent:
- Receives code from Codex agents
- Reviews for quality, correctness, and best practices
- Provides detailed feedback for improvements
- Approves or requests revisions
- Iterates with Codex until implementation meets standards
"""

import os
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from anthropic import AsyncAnthropic


@dataclass
class ReviewRequest:
    """Request for Claude to review Codex output"""
    task_title: str
    task_description: str
    requirements: List[str]
    code: str
    output: str
    iteration: int = 0


@dataclass
class ReviewResult:
    """Result from Claude review"""
    approved: bool
    feedback: Optional[str] = None
    suggestions: List[str] = None
    quality_score: float = 0.0
    issues_found: List[str] = None


class ClaudeReviewAgent:
    """
    Agent that uses Claude to review and improve Codex implementations.

    Workflow:
    1. Receive code from Codex agent
    2. Analyze code for:
       - Correctness
       - Code quality
       - Best practices
       - Security issues
       - Performance concerns
       - Documentation
    3. Provide detailed feedback
    4. Approve or request revisions
    """

    def __init__(self, agent_id: str):

        self.agent_id = agent_id
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    async def review(self, request: ReviewRequest) -> ReviewResult:
        """
        Review Codex implementation.

        Args:
            request: ReviewRequest with code to review

        Returns:
            ReviewResult with approval status and feedback
        """

        print(f"[Claude-Review-{self.agent_id}] Reviewing implementation (iteration {request.iteration})...")

        try:
            # Create comprehensive review prompt
            review_prompt = self._create_review_prompt(request)

            # Get Claude's review
            response = await self.client.messages.create(
                model="claude-sonnet-4",
                max_tokens=4096,
                system="""You are an expert code reviewer. You review code for:
- Correctness and functionality
- Code quality and organization
- Best practices and design patterns
- Security vulnerabilities
- Performance optimization opportunities
- Documentation and readability
- Error handling
- Edge cases

Provide detailed, actionable feedback. Be thorough but constructive.""",
                messages=[
                    {
                        "role": "user",
                        "content": review_prompt
                    }
                ]
            )

            # Parse Claude's response
            review_text = response.content[0].text

            # Determine if approved
            approved = self._is_approved(review_text)

            # Extract feedback and suggestions
            feedback, suggestions, issues = self._parse_review(review_text)

            # Calculate quality score
            quality_score = self._calculate_quality_score(review_text, approved)

            print(f"[Claude-Review-{self.agent_id}] Review complete - {'APPROVED' if approved else 'NEEDS REVISION'}")
            print(f"[Claude-Review-{self.agent_id}] Quality score: {quality_score:.2f}/10")

            return ReviewResult(
                approved=approved,
                feedback=feedback,
                suggestions=suggestions,
                quality_score=quality_score,
                issues_found=issues
            )

        except Exception as e:
            print(f"[Claude-Review-{self.agent_id}] Error during review: {e}")
            return ReviewResult(
                approved=False,
                feedback=f"Review failed: {str(e)}",
                suggestions=[],
                quality_score=0.0,
                issues_found=[f"Review error: {str(e)}"]
            )

    def _create_review_prompt(self, request: ReviewRequest) -> str:
        """Create comprehensive review prompt for Claude."""

        return f"""Please review this code implementation:

**Task**: {request.task_title}

**Description**: {request.task_description}

**Requirements**:
{chr(10).join(f'- {req}' for req in request.requirements)}

**Code Submitted** (Iteration {request.iteration}):
```python
{request.code}
```

**Execution Output**:
```
{request.output}
```

Please provide a comprehensive review covering:

1. **Correctness**: Does the code fulfill all requirements?
2. **Quality**: Is the code well-organized and maintainable?
3. **Best Practices**: Does it follow Python best practices?
4. **Security**: Are there any security concerns?
5. **Performance**: Any performance issues or optimization opportunities?
6. **Documentation**: Is the code well-documented?
7. **Error Handling**: Are errors handled properly?
8. **Testing**: Can the code be tested? Are edge cases covered?

**Output Format**:

APPROVAL_STATUS: [APPROVED or NEEDS_REVISION]

QUALITY_SCORE: [1-10]

ISSUES_FOUND:
- [List any issues found, or "None" if code is perfect]

SUGGESTIONS:
- [List specific improvements, or "None" if approved]

DETAILED_FEEDBACK:
[Detailed explanation of issues and how to fix them, or praise if approved]

Be thorough, specific, and constructive in your feedback."""

    def _is_approved(self, review_text: str) -> bool:
        """Determine if code is approved from review text."""

        # Look for approval status in review
        if "APPROVAL_STATUS: APPROVED" in review_text:
            return True

        # Check for explicit approval language
        approval_indicators = [
            "looks good",
            "well done",
            "approved",
            "meets all requirements",
            "excellent implementation"
        ]

        review_lower = review_text.lower()

        # Must not have "needs revision"
        if "needs_revision" in review_lower or "needs revision" in review_lower:
            return False

        # Check for positive indicators
        return any(indicator in review_lower for indicator in approval_indicators)

    def _parse_review(self, review_text: str) -> tuple[str, List[str], List[str]]:
        """
        Parse review text into feedback, suggestions, and issues.

        Returns:
            (feedback, suggestions, issues)
        """

        feedback = ""
        suggestions = []
        issues = []

        # Extract detailed feedback
        if "DETAILED_FEEDBACK:" in review_text:
            parts = review_text.split("DETAILED_FEEDBACK:")
            if len(parts) > 1:
                feedback = parts[1].strip()

        # Extract suggestions
        if "SUGGESTIONS:" in review_text:
            parts = review_text.split("SUGGESTIONS:")
            if len(parts) > 1:
                suggestions_text = parts[1].split("\n\n")[0]
                for line in suggestions_text.split("\n"):
                    line = line.strip()
                    if line and line.startswith("-"):
                        suggestion = line[1:].strip()
                        if suggestion.lower() != "none":
                            suggestions.append(suggestion)

        # Extract issues
        if "ISSUES_FOUND:" in review_text:
            parts = review_text.split("ISSUES_FOUND:")
            if len(parts) > 1:
                issues_text = parts[1].split("\n\n")[0]
                for line in issues_text.split("\n"):
                    line = line.strip()
                    if line and line.startswith("-"):
                        issue = line[1:].strip()
                        if issue.lower() != "none":
                            issues.append(issue)

        # If no structured feedback, use whole review
        if not feedback:
            feedback = review_text

        return feedback, suggestions, issues

    def _calculate_quality_score(self, review_text: str, approved: bool) -> float:
        """Calculate quality score from review."""

        # Try to extract explicit score
        if "QUALITY_SCORE:" in review_text:
            parts = review_text.split("QUALITY_SCORE:")
            if len(parts) > 1:
                score_text = parts[1].split("\n")[0].strip()
                try:
                    # Extract number from text like "8/10" or "8"
                    import re
                    match = re.search(r'(\d+(?:\.\d+)?)', score_text)
                    if match:
                        score = float(match.group(1))
                        # Normalize if it's out of 10
                        if score > 10:
                            score = score / 10
                        return min(10.0, max(0.0, score))
                except:
                    pass

        # Fallback: estimate from approval status
        if approved:
            return 8.5  # Approved code gets high score
        else:
            return 5.0  # Needs revision gets medium score


# Convenience function for orchestrator
async def run_claude_review(request: ReviewRequest) -> ReviewResult:
    """
    Run a Claude review on Codex output.

    Args:
        request: ReviewRequest with code to review

    Returns:
        ReviewResult with feedback
    """

    import uuid
    agent_id = str(uuid.uuid4())[:8]
    agent = ClaudeReviewAgent(agent_id)
    return await agent.review(request)
