#!/usr/bin/env python3
"""
Feedback Validator - Gets ChatGPT-5 feedback on completed work

After implementation, submits work to ChatGPT-5 for validation and feedback.
"""

import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


@dataclass
class ValidationFeedback:
    """Feedback from ChatGPT on completed work"""

    validation_id: str
    status: str  # approved, approved_with_suggestions, needs_revision, rejected
    overall_assessment: str
    strengths: List[str]
    concerns: List[str]
    suggestions: List[str]
    alignment_score: float  # 0.0 to 1.0 - how well work matches requirements
    next_steps: List[str]
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FeedbackValidator:
    """
    Validates completed work against original requirements using ChatGPT-5.
    """

    def __init__(self, openai_api_key: Optional[str] = None):

        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required")

        if OpenAI is None:
            raise ImportError("OpenAI library not installed")

        self.client = OpenAI(api_key=self.api_key)

    async def validate(
        self,
        original_task: Dict[str, Any],
        work_completed: Dict[str, Any],
        artifacts: List[str],
        verbose: bool = True
    ) -> ValidationFeedback:
        """
        Validate completed work against original requirements.

        Args:
            original_task: The original task requirements
            work_completed: Description of work completed
            artifacts: List of files created/modified
            verbose: Print feedback

        Returns:
            ValidationFeedback with assessment
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"FEEDBACK VALIDATION - Using ChatGPT-5")
            print(f"{'='*80}")
            print(f"\nValidating: {original_task.get('title', 'Task')}")
            print(f"Artifacts: {len(artifacts)} file(s)")
            print(f"\nGetting feedback from ChatGPT-5...\n")

        # Build validation prompt
        prompt = self._build_validation_prompt(
            original_task,
            work_completed,
            artifacts
        )

        # Get feedback from ChatGPT
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",  # Will use gpt-5 when available
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert code reviewer and quality assurance specialist. You provide constructive, detailed feedback on completed work."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            feedback_json = response.choices[0].message.content
            feedback_data = json.loads(feedback_json)

        except Exception as e:
            if verbose:
                print(f"❌ Validation failed: {e}")
            raise

        # Parse feedback
        feedback = self._parse_feedback(feedback_data)

        if verbose:
            self._print_feedback(feedback)

        return feedback

    def _build_validation_prompt(
        self,
        original_task: Dict,
        work_completed: Dict,
        artifacts: List[str]
    ) -> str:
        """Build validation prompt"""

        prompt = f"""You are reviewing completed work against original requirements.

ORIGINAL TASK:
Title: {original_task.get('title', 'N/A')}
Description: {original_task.get('description', 'N/A')}

{self._format_requirements(original_task)}

WORK COMPLETED:
{json.dumps(work_completed, indent=2)}

ARTIFACTS CREATED/MODIFIED:
{json.dumps(artifacts, indent=2)}

YOUR TASK:
Evaluate if the work:
1. Meets all requirements
2. Is complete and functional
3. Follows best practices
4. Has any gaps or issues
5. Needs any improvements

VALIDATION CRITERIA:
- **Completeness**: All requirements addressed?
- **Quality**: Code quality, documentation, tests?
- **Alignment**: Matches original intent?
- **Gaps**: Missing anything?
- **Risks**: Any concerns or issues?

OUTPUT FORMAT (JSON):
{{
  "status": "approved|approved_with_suggestions|needs_revision|rejected",
  "overall_assessment": "Summary of the evaluation",
  "strengths": [
    "What was done well",
    "Positive aspects"
  ],
  "concerns": [
    "Issues found",
    "Problems or gaps"
  ],
  "suggestions": [
    "Improvement suggestions",
    "Enhancement ideas"
  ],
  "alignment_score": 0.0-1.0,
  "next_steps": [
    "What to do next",
    "Follow-up actions if needed"
  ]
}}

IMPORTANT:
- Be specific and constructive
- Point out both strengths and concerns
- Provide actionable suggestions
- Use "approved" if requirements are met (even if minor suggestions)
- Use "needs_revision" only for significant issues

Provide validation now:"""

        return prompt

    def _format_requirements(self, original_task: Dict) -> str:
        """Format requirements from original task"""

        sections = []

        if original_task.get("context"):
            sections.append(f"CONTEXT:\n{json.dumps(original_task['context'], indent=2)}")

        if original_task.get("acceptance_criteria"):
            criteria = "\n".join(f"  - {c}" for c in original_task["acceptance_criteria"])
            sections.append(f"ACCEPTANCE CRITERIA:\n{criteria}")

        if original_task.get("success_criteria"):
            criteria = "\n".join(f"  - {c}" for c in original_task["success_criteria"])
            sections.append(f"SUCCESS CRITERIA:\n{criteria}")

        return "\n\n".join(sections) if sections else ""

    def _parse_feedback(self, data: Dict) -> ValidationFeedback:
        """Parse ChatGPT response into ValidationFeedback"""

        validation_id = f"validation-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        return ValidationFeedback(
            validation_id=validation_id,
            status=data.get("status", "needs_revision"),
            overall_assessment=data.get("overall_assessment", ""),
            strengths=data.get("strengths", []),
            concerns=data.get("concerns", []),
            suggestions=data.get("suggestions", []),
            alignment_score=data.get("alignment_score", 0.5),
            next_steps=data.get("next_steps", [])
        )

    def _print_feedback(self, feedback: ValidationFeedback):
        """Print validation feedback"""

        # Status colors
        status_display = {
            "approved": "🟢 APPROVED",
            "approved_with_suggestions": "🟡 APPROVED WITH SUGGESTIONS",
            "needs_revision": "🟠 NEEDS REVISION",
            "rejected": "🔴 REJECTED"
        }

        print(f"\n{'='*80}")
        print(f"VALIDATION FEEDBACK")
        print(f"{'='*80}\n")

        print(f"Status: {status_display.get(feedback.status, feedback.status)}")
        print(f"Alignment Score: {feedback.alignment_score:.1%}")
        print(f"Validation ID: {feedback.validation_id}\n")

        print(f"{'─'*80}")
        print("OVERALL ASSESSMENT")
        print(f"{'─'*80}\n")
        print(feedback.overall_assessment)
        print()

        if feedback.strengths:
            print(f"{'─'*80}")
            print("✅ STRENGTHS")
            print(f"{'─'*80}\n")

            for strength in feedback.strengths:
                print(f"   • {strength}")

            print()

        if feedback.concerns:
            print(f"{'─'*80}")
            print("⚠️  CONCERNS")
            print(f"{'─'*80}\n")

            for concern in feedback.concerns:
                print(f"   • {concern}")

            print()

        if feedback.suggestions:
            print(f"{'─'*80}")
            print("💡 SUGGESTIONS")
            print(f"{'─'*80}\n")

            for suggestion in feedback.suggestions:
                print(f"   • {suggestion}")

            print()

        if feedback.next_steps:
            print(f"{'─'*80}")
            print("🎯 NEXT STEPS")
            print(f"{'─'*80}\n")

            for i, step in enumerate(feedback.next_steps, 1):
                print(f"   {i}. {step}")

            print()

        print(f"{'='*80}\n")


async def main():
    """Test feedback validator"""

    validator = FeedbackValidator()

    # Test validation
    original_task = {
        "title": "Implement User Authentication",
        "description": "Create JWT-based authentication with login and registration",
        "acceptance_criteria": [
            "Users can register with email/password",
            "Users can login and receive JWT token",
            "Passwords are securely hashed",
            "Tokens expire after 24 hours"
        ]
    }

    work_completed = {
        "summary": "Implemented complete authentication system",
        "details": "Created registration and login endpoints, JWT token generation, password hashing with bcrypt",
        "testing": "Manual testing completed, all endpoints working"
    }

    artifacts = [
        "server/auth/register.ts",
        "server/auth/login.ts",
        "server/middleware/auth.ts",
        "server/utils/jwt.ts"
    ]

    feedback = await validator.validate(
        original_task=original_task,
        work_completed=work_completed,
        artifacts=artifacts,
        verbose=True
    )

    # Save feedback
    output_file = "test_validation_feedback.json"
    with open(output_file, 'w') as f:
        json.dump({
            "validation_id": feedback.validation_id,
            "status": feedback.status,
            "assessment": feedback.overall_assessment,
            "strengths": feedback.strengths,
            "concerns": feedback.concerns,
            "suggestions": feedback.suggestions,
            "alignment_score": feedback.alignment_score,
            "next_steps": feedback.next_steps
        }, f, indent=2)

    print(f"✅ Feedback saved to {output_file}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
