#!/usr/bin/env python3
"""
Claude Code Agent - Uses Claude Code CLI for code review and tasks

This agent invokes Claude Code via the `claude` CLI and monitors
the session in real-time with full logging.
"""

import asyncio
import json
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import sys

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


@dataclass
class ReviewRequest:
    """Request for Claude Code to review code"""
    task_title: str
    task_description: str
    requirements: List[str]
    code: str
    output: str
    iteration: int


@dataclass
class ReviewResult:
    """Result from Claude Code review"""
    approved: bool
    feedback: str
    suggestions: List[str]
    quality_score: float
    issues_found: List[str]


class ClaudeCodeAgent:
    """
    Agent that uses Claude Code CLI for code review and tasks.

    Invokes `claude` CLI with prompts and monitors output in real-time.
    """

    def __init__(self, agent_id: str, project_root: Path = PROJECT_ROOT):
        self.agent_id = agent_id
        self.project_root = project_root
        self.session_dir = project_root / "logs" / "claude_sessions"
        self.session_dir.mkdir(parents=True, exist_ok=True)

    async def review(self, request: ReviewRequest) -> ReviewResult:
        """
        Review code using Claude Code CLI.

        Args:
            request: ReviewRequest with code to review

        Returns:
            ReviewResult with approval status and feedback
        """
        print(f"[Claude-Code-{self.agent_id}] Starting code review...")

        await publish_event({
            "type": "agent_started",
            "agent_id": self.agent_id,
            "agent_type": "claude_code_review",
            "task": request.task_title,
            "iteration": request.iteration
        })

        # Create review prompt
        prompt = self._create_review_prompt(request)

        # Run Claude Code session
        result = await self._run_claude_code_session(prompt, request.task_title)

        # Parse review result
        review_result = self._parse_review_result(result)

        await publish_event({
            "type": "agent_completed",
            "agent_id": self.agent_id,
            "approved": review_result.approved,
            "quality_score": review_result.quality_score,
            "issues_found": len(review_result.issues_found)
        })

        print(f"[Claude-Code-{self.agent_id}] Review complete: {'✅ APPROVED' if review_result.approved else '❌ NEEDS WORK'}")
        print(f"[Claude-Code-{self.agent_id}] Quality Score: {review_result.quality_score:.1f}/10")

        return review_result

    def _create_review_prompt(self, request: ReviewRequest) -> str:
        """Create review prompt for Claude Code"""

        requirements_text = "\n".join(f"- {req}" for req in request.requirements)

        return f"""You are reviewing code for the following task:

**Task**: {request.task_title}

**Description**: {request.task_description}

**Requirements**:
{requirements_text}

**Code to Review**:
```
{request.code}
```

**Execution Output**:
```
{request.output}
```

Please review this code comprehensively and provide:

1. **Approval Status**: START your response with either "APPROVED:" or "NEEDS WORK:"

2. **Quality Score**: Rate the code quality from 0-10 (include "QUALITY_SCORE: X/10")

3. **Analysis**:
   - Does it meet all requirements?
   - Is the code well-structured and readable?
   - Are there any bugs or issues?
   - Is error handling adequate?
   - Are best practices followed?
   - Is it secure?

4. **Issues Found** (if any): List specific problems (prefix each with "ISSUE:")

5. **Suggestions**: Specific improvements needed (prefix each with "SUGGESTION:")

Be thorough but concise. Focus on correctness and meeting requirements.

Iteration: {request.iteration + 1}
"""

    async def _run_claude_code_session(self, prompt: str, task_title: str) -> str:
        """
        Run Claude Code CLI session with live monitoring.

        Args:
            prompt: Prompt for Claude Code
            task_title: Task title for logging

        Returns:
            Claude Code's response
        """

        session_id = str(uuid.uuid4())[:8]
        session_file = self.session_dir / f"review_{session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

        print(f"[Claude-Code-{self.agent_id}] Starting session {session_id}")
        print(f"[Claude-Code-{self.agent_id}] Log: {session_file}")

        await publish_event({
            "type": "claude_session_started",
            "session_id": session_id,
            "agent_id": self.agent_id,
            "task": task_title,
            "log_file": str(session_file)
        })

        try:
            # Create prompt file
            prompt_file = self.session_dir / f"prompt_{session_id}.txt"
            with open(prompt_file, 'w') as f:
                f.write(prompt)

            # Run Claude Code with prompt
            # Using --print flag to output directly without interactive mode
            # Using --dangerously-skip-permissions to avoid permission prompts
            process = await asyncio.create_subprocess_exec(
                'claude',
                '--print',
                '--dangerously-skip-permissions',
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_root)
            )

            # Send prompt to stdin
            stdout, stderr = await process.communicate(input=prompt.encode())

            # Decode output
            output = stdout.decode('utf-8', errors='replace')
            error = stderr.decode('utf-8', errors='replace')

            # Save session log
            with open(session_file, 'w') as f:
                f.write(f"=== Claude Code Session {session_id} ===\n")
                f.write(f"Task: {task_title}\n")
                f.write(f"Started: {datetime.now().isoformat()}\n")
                f.write(f"\n=== PROMPT ===\n{prompt}\n")
                f.write(f"\n=== OUTPUT ===\n{output}\n")
                if error:
                    f.write(f"\n=== STDERR ===\n{error}\n")
                f.write(f"\n=== END SESSION ===\n")

            await publish_event({
                "type": "claude_session_completed",
                "session_id": session_id,
                "agent_id": self.agent_id,
                "output_length": len(output),
                "has_errors": bool(error)
            })

            # Clean up prompt file
            prompt_file.unlink(missing_ok=True)

            if process.returncode != 0:
                print(f"[Claude-Code-{self.agent_id}] Warning: Exit code {process.returncode}")
                if error:
                    print(f"[Claude-Code-{self.agent_id}] Stderr: {error[:200]}")

            return output

        except Exception as e:
            print(f"[Claude-Code-{self.agent_id}] Error running session: {e}")

            await publish_event({
                "type": "claude_session_failed",
                "session_id": session_id,
                "agent_id": self.agent_id,
                "error": str(e)
            })

            raise

    def _parse_review_result(self, output: str) -> ReviewResult:
        """
        Parse Claude Code output into ReviewResult.

        Args:
            output: Raw output from Claude Code

        Returns:
            Parsed ReviewResult
        """

        # Extract approval status
        approved = "APPROVED:" in output and "NEEDS WORK:" not in output

        # Extract quality score
        quality_score = 7.0  # default
        if "QUALITY_SCORE:" in output:
            try:
                score_line = [line for line in output.split('\n') if "QUALITY_SCORE:" in line][0]
                score_str = score_line.split("QUALITY_SCORE:")[1].split("/")[0].strip()
                quality_score = float(score_str)
            except:
                pass

        # Extract issues
        issues = []
        for line in output.split('\n'):
            if line.strip().startswith("ISSUE:"):
                issue = line.split("ISSUE:")[1].strip()
                if issue:
                    issues.append(issue)

        # Extract suggestions
        suggestions = []
        for line in output.split('\n'):
            if line.strip().startswith("SUGGESTION:"):
                suggestion = line.split("SUGGESTION:")[1].strip()
                if suggestion:
                    suggestions.append(suggestion)

        # Get feedback (full output)
        feedback = output.strip()

        return ReviewResult(
            approved=approved,
            feedback=feedback,
            suggestions=suggestions,
            quality_score=quality_score,
            issues_found=issues
        )


async def review_code(
    code: str,
    task_title: str,
    task_description: str,
    requirements: List[str],
    output: str = "",
    iteration: int = 0
) -> ReviewResult:
    """
    Convenience function to review code with Claude Code.

    Args:
        code: Code to review
        task_title: Task title
        task_description: Task description
        requirements: List of requirements
        output: Execution output (optional)
        iteration: Current iteration number

    Returns:
        ReviewResult
    """

    agent = ClaudeCodeAgent(
        agent_id=f"review-{uuid.uuid4().hex[:8]}"
    )

    request = ReviewRequest(
        task_title=task_title,
        task_description=task_description,
        requirements=requirements,
        code=code,
        output=output,
        iteration=iteration
    )

    return await agent.review(request)


# Test
if __name__ == "__main__":
    async def test():
        code = """
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

print(add(5, 3))
print(subtract(10, 4))
"""

        result = await review_code(
            code=code,
            task_title="Simple Calculator",
            task_description="Create basic arithmetic functions",
            requirements=[
                "Implement add and subtract functions",
                "Test the functions"
            ],
            output="8\n6\n"
        )

        print(f"\nApproved: {result.approved}")
        print(f"Quality: {result.quality_score}/10")
        print(f"Issues: {len(result.issues_found)}")
        print(f"Suggestions: {len(result.suggestions)}")

    asyncio.run(test())
