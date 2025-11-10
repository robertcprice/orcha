"""
P0: Interactive Intake & Budgeting Node
Confidence-driven Q&A to refine task specifications.

Uses MCP code execution to loop Q&A until confidence ≥95%.
"""
from typing import Dict, Any
import json


class IntakeNode:
    """
    Interactive task intake with confidence scoring.

    Process:
    1. Generate clarifying questions via ChatGPT MCP
    2. Collect user responses (via dialogue system)
    3. Evaluate confidence score
    4. Loop until confidence ≥95% or max rounds reached
    5. Generate task budgets and prioritization
    """

    def __init__(self, confidence_threshold: float = 95.0, max_rounds: int = 10):
        """
        Initialize intake node.

        Args:
            confidence_threshold: Required confidence to proceed
            max_rounds: Maximum Q&A rounds
        """
        self.confidence_threshold = confidence_threshold
        self.max_rounds = max_rounds

    def generate_code(self, user_task: str) -> str:
        """
        Generate MCP code for intake process.

        This code will be executed by CodeExecutor with MCP client injected.

        Args:
            user_task: Initial user-provided task description

        Returns:
            Python code string for execution
        """
        code = f'''
import json

# Initial task from user
user_task = {json.dumps(user_task)}

# Initialize Q&A state
questions = []
responses = {{}}
confidence = 0
round_count = 0
max_rounds = {self.max_rounds}
confidence_threshold = {self.confidence_threshold}

logs.append(f"Starting intake for task: {{user_task[:100]}}...")

# Main Q&A loop
while confidence < confidence_threshold and round_count < max_rounds:
    round_count += 1
    logs.append(f"\\n=== Round {{round_count}} ===")

    # Generate clarifying questions via ChatGPT
    question_result = mcp.call_tool(
        'chatgpt',
        'generate_questions',
        {{
            'task': user_task,
            'previous_responses': responses,
            'target_confidence': confidence_threshold,
            'round': round_count
        }}
    )

    questions = question_result.get('result', {{}}).get('questions', [])
    logs.append(f"Generated {{len(questions)}} questions")

    # In production, these would be sent to dialogue system
    # For now, we'll simulate with default answers
    for i, q in enumerate(questions):
        # Simulated response (in production: dialogue.ask_user(q))
        if 'stack' in q.lower() or 'technology' in q.lower():
            resp = "Python with FastAPI backend, React frontend"
        elif 'security' in q.lower() or 'auth' in q.lower():
            resp = "JWT authentication, HTTPS required, data encryption at rest"
        elif 'scale' in q.lower() or 'users' in q.lower():
            resp = "Expect 10k concurrent users, must handle 100k requests/day"
        elif 'timeline' in q.lower() or 'deadline' in q.lower():
            resp = "Target launch in 4 weeks, MVP in 2 weeks"
        elif 'database' in q.lower() or 'storage' in q.lower():
            resp = "PostgreSQL for primary data, Redis for caching"
        elif 'testing' in q.lower():
            resp = "Unit tests required, 80% coverage minimum, E2E tests for critical flows"
        else:
            resp = "Yes, please proceed with best practices"

        responses[q] = resp
        logs.append(f"  Q{{i+1}}: {{q[:80]}}...")
        logs.append(f"  A{{i+1}}: {{resp[:80]}}...")

    # Evaluate confidence with ChatGPT
    conf_result = mcp.call_tool(
        'chatgpt',
        'evaluate_confidence',
        {{
            'task': user_task,
            'responses': responses,
            'round': round_count
        }}
    )

    confidence = conf_result.get('result', {{}}).get('confidence_score', 0)
    gaps = conf_result.get('result', {{}}).get('gaps', [])

    logs.append(f"Confidence after round {{round_count}}: {{confidence:.1f}}%")

    if gaps and confidence < confidence_threshold:
        logs.append(f"Remaining gaps: {{', '.join(gaps[:3])}}")

# Generate refined task specification
logs.append(f"\\n=== Generating Refined Task ===")

refined_result = mcp.call_tool(
    'chatgpt',
    'refine_task',
    {{
        'original_task': user_task,
        'qa_responses': responses,
        'confidence': confidence
    }}
)

refined_task = refined_result.get('result', {{}})

# Generate budgets via Claude
logs.append("Estimating budgets...")

budget_result = mcp.call_tool(
    'claude',
    'estimate_budgets',
    {{
        'refined_task': refined_task,
        'qa_context': responses
    }}
)

budgets = budget_result.get('result', {{}})

# Generate TASK.md with prioritization
logs.append("Creating TASK.md...")

task_md_result = mcp.call_tool(
    'claude',
    'create_task_doc',
    {{
        'refined_task': refined_task,
        'budgets': budgets,
        'qa_transcript': responses
    }}
)

task_md = task_md_result.get('result', {{}}).get('markdown', '')

# Final result
result = {{
    'refined_task': refined_task,
    'confidence': confidence,
    'budgets': budgets,
    'qa_transcript': responses,
    'task_md': task_md,
    'rounds_completed': round_count,
    'questions_asked': len(responses),
    'status': 'success' if confidence >= confidence_threshold else 'incomplete'
}}

logs.append(f"\\n=== Intake Complete ===")
logs.append(f"Final confidence: {{confidence:.1f}}%")
logs.append(f"Rounds: {{round_count}}")
logs.append(f"Questions answered: {{len(responses)}}")
'''

        return code

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute intake node.

        Args:
            mcp_client: MCP client instance
            code_executor: Code executor instance
            inputs: Input artifacts (must contain 'task')

        Returns:
            Execution result with outputs
        """
        user_task = inputs.get('task', '')

        if not user_task:
            return {
                'success': False,
                'error': 'No task provided in inputs'
            }

        # Generate execution code
        code = self.generate_code(user_task)

        # Execute in sandboxed environment
        exec_result = code_executor.exec_code(
            code=code,
            mcp_client=mcp_client,
            imports=['json']
        )

        if not exec_result['success']:
            return {
                'success': False,
                'error': exec_result.get('error'),
                'message': exec_result.get('message', 'Execution failed')
            }

        # Extract outputs
        output = exec_result['output']

        return {
            'success': True,
            'outputs': {
                'refined_task': output.get('refined_task'),
                'budgets': output.get('budgets'),
                'transcript': output.get('qa_transcript'),
                'task_md': output.get('task_md')
            },
            'metadata': {
                'confidence': output.get('confidence', 0),
                'rounds': output.get('rounds_completed', 0),
                'questions': output.get('questions_asked', 0)
            },
            'logs': exec_result.get('logs', [])
        }


# Factory function
def create_intake_node(confidence_threshold: float = 95.0) -> IntakeNode:
    """
    Create intake node with specified threshold.

    Args:
        confidence_threshold: Required confidence (0-100)

    Returns:
        IntakeNode instance
    """
    return IntakeNode(
        confidence_threshold=confidence_threshold,
        max_rounds=10
    )
