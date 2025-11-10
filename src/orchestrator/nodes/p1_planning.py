"""
P1: Multi-AI Planning Committee Node
Orchestrates multiple AI models to create comprehensive execution plan.

Uses sequential AI chain: Best Practices → ChatGPT → DeepSeek → Grok → Gemini
All coordinated by Claude via MCP code execution.
"""
from typing import Dict, Any
import json


class PlanningNode:
    """
    Multi-AI planning committee with progressive refinement.

    Chain of AIs:
    1. Best Practices DB - Inject domain knowledge
    2. ChatGPT - Create structured execution plan
    3. DeepSeek - Add technical insights and optimizations
    4. Grok - Creative review and alternatives
    5. Gemini - Final review and task organization

    Claude orchestrates the entire process via code execution.
    """

    def __init__(self, confidence_threshold: float = 95.0, max_iterations: int = 3):
        """
        Initialize planning node.

        Args:
            confidence_threshold: Required confidence to proceed
            max_iterations: Max refinement iterations
        """
        self.confidence_threshold = confidence_threshold
        self.max_iterations = max_iterations

    def generate_code(self, refined_task: Dict[str, Any]) -> str:
        """
        Generate MCP code for multi-AI planning process.

        Args:
            refined_task: Refined task from P0

        Returns:
            Python code for execution
        """
        code = f'''
import json
import os

# Load refined task
refined_task = {json.dumps(refined_task)}
confidence_threshold = {self.confidence_threshold}
max_iterations = {self.max_iterations}

logs.append("=== Multi-AI Planning Committee ===")
logs.append(f"Task: {{refined_task.get('title', 'Untitled')[:100]}}")

# Phase 1: Best Practices Injection
logs.append("\\n--- Phase 1: Best Practices Lookup ---")

# Search for relevant best practices via filesystem
# In production, this would query best_practices.py or knowledge base
best_practices_context = {{
    'security': ['Use HTTPS', 'Validate all inputs', 'Implement CSRF protection'],
    'performance': ['Use caching', 'Optimize queries', 'Implement pagination'],
    'testing': ['80% code coverage', 'Unit + integration tests', 'E2E for critical flows']
}}

logs.append(f"Loaded {{sum(len(v) for v in best_practices_context.values())}} best practices")

# Phase 2: ChatGPT - Structured Planning
logs.append("\\n--- Phase 2: ChatGPT - Structured Planning ---")

chatgpt_plan = mcp.call_tool(
    'chatgpt',
    'create_plan',
    {{
        'task': refined_task,
        'best_practices': best_practices_context,
        'format': 'structured'
    }}
)

plan = chatgpt_plan.get('result', {{}})
logs.append(f"ChatGPT generated plan with {{len(plan.get('steps', []))}} steps")

# Phase 3: DeepSeek - Technical Insights
logs.append("\\n--- Phase 3: DeepSeek - Technical Insights ---")

deepseek_insights = mcp.call_tool(
    'deepseek',
    'contribute_plan',
    {{
        'current_plan': plan,
        'task': refined_task,
        'focus': 'technical_optimization'
    }}
)

technical_insights = deepseek_insights.get('result', {{}})
logs.append(f"DeepSeek added {{len(technical_insights.get('optimizations', []))}} optimizations")

# Merge insights into plan
plan['technical_insights'] = technical_insights
plan['optimizations'] = technical_insights.get('optimizations', [])

# Phase 4: Grok - Creative Review
logs.append("\\n--- Phase 4: Grok - Creative Alternatives ---")

grok_review = mcp.call_tool(
    'grok',
    'creative_review',
    {{
        'plan': plan,
        'task': refined_task
    }}
)

creative_review = grok_review.get('result', {{}})
logs.append(f"Grok suggested {{len(creative_review.get('alternatives', []))}} alternatives")

# Add to plan
plan['creative_alternatives'] = creative_review.get('alternatives', [])
plan['risks_identified'] = creative_review.get('risks', [])

# Phase 5: Gemini - Final Review & Organization
logs.append("\\n--- Phase 5: Gemini - Final Review ---")

gemini_final = mcp.call_tool(
    'gemini',
    'finalize_plan',
    {{
        'plan': plan,
        'task': refined_task,
        'all_contributions': {{
            'chatgpt': plan.get('steps', []),
            'deepseek': technical_insights,
            'grok': creative_review
        }}
    }}
)

final_plan = gemini_final.get('result', {{}})
logs.append(f"Gemini finalized plan structure")

# Phase 6: Claude - Confidence Scoring
logs.append("\\n--- Phase 6: Claude - Confidence Scoring ---")

confidence_result = mcp.call_tool(
    'claude',
    'score_confidence',
    {{
        'plan': final_plan,
        'task': refined_task,
        'criteria': [
            'traceability',
            'testability',
            'risk_coverage',
            'cost_estimation',
            'token_efficiency'
        ]
    }}
)

confidence_score = confidence_result.get('result', {{}}).get('score', 0)
confidence_breakdown = confidence_result.get('result', {{}}).get('breakdown', {{}})

logs.append(f"Confidence: {{confidence_score:.1f}}%")
logs.append(f"Breakdown: {{confidence_breakdown}}")

# Refinement loop if needed
iteration = 0
while confidence_score < confidence_threshold and iteration < max_iterations:
    iteration += 1
    logs.append(f"\\n--- Refinement Iteration {{iteration}} ---")

    # Get insights from ReflexionMemory (if available)
    # In production, this would query state.memory.get_insights('planning')

    # Refine with Claude
    refinement_result = mcp.call_tool(
        'claude',
        'refine_with_insights',
        {{
            'plan': final_plan,
            'confidence_breakdown': confidence_breakdown,
            'target_score': confidence_threshold
        }}
    )

    final_plan = refinement_result.get('result', {{}}).get('refined_plan', final_plan)

    # Re-score
    confidence_result = mcp.call_tool(
        'claude',
        'score_confidence',
        {{
            'plan': final_plan,
            'task': refined_task,
            'criteria': [
                'traceability',
                'testability',
                'risk_coverage',
                'cost_estimation',
                'token_efficiency'
            ]
        }}
    )

    confidence_score = confidence_result.get('result', {{}}).get('score', 0)
    confidence_breakdown = confidence_result.get('result', {{}}).get('breakdown', {{}})

    logs.append(f"Updated confidence: {{confidence_score:.1f}}%")

# Generate artifacts
logs.append("\\n--- Generating Artifacts ---")

# PLAN_FINAL.md
plan_md = f"""# Execution Plan

## Overview
{{final_plan.get('overview', '')}}

## Steps
{{chr(10).join(f"{{i+1}}. {{step}}" for i, step in enumerate(final_plan.get('steps', [])))}}

## Technical Insights
{{chr(10).join(f"- {{insight}}" for insight in final_plan.get('optimizations', []))}}

## Risks
{{chr(10).join(f"- {{risk}}" for risk in final_plan.get('risks_identified', []))}}

## Confidence
- Score: {{confidence_score:.1f}}%
- Breakdown: {{confidence_breakdown}}
"""

# PLAN_risks.md
risks_md = f"""# Risk Assessment

{{chr(10).join(f"## {{risk.get('category', 'Unknown')}}\\n{{risk.get('description', '')}}\\n" for risk in final_plan.get('risks_identified', []))}}
"""

# Token usage tracking
tokens_used = sum([
    chatgpt_plan.get('tokens_used', 0),
    deepseek_insights.get('tokens_used', 0),
    grok_review.get('tokens_used', 0),
    gemini_final.get('tokens_used', 0),
    confidence_result.get('tokens_used', 0)
])

logs.append(f"Total tokens used: {{tokens_used:,}}")

# Final result
result = {{
    'plan': final_plan,
    'plan_md': plan_md,
    'risks_md': risks_md,
    'confidence_score': confidence_score,
    'confidence_breakdown': confidence_breakdown,
    'iterations': iteration,
    'tokens_used': tokens_used,
    'contributions': {{
        'chatgpt': len(plan.get('steps', [])),
        'deepseek': len(technical_insights.get('optimizations', [])),
        'grok': len(creative_review.get('alternatives', [])),
        'gemini': 'final_organization'
    }}
}}

logs.append(f"\\n=== Planning Complete ===")
logs.append(f"Confidence: {{confidence_score:.1f}}%")
logs.append(f"Iterations: {{iteration}}")
'''

        return code

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute planning node.

        Args:
            mcp_client: MCP client instance
            code_executor: Code executor instance
            inputs: Must contain 'refined_task' from P0

        Returns:
            Execution result with plan artifacts
        """
        refined_task = inputs.get('refined_task')

        if not refined_task:
            return {
                'success': False,
                'error': 'No refined_task provided from P0'
            }

        # Generate execution code
        code = self.generate_code(refined_task)

        # Execute in sandboxed environment
        exec_result = code_executor.exec_code(
            code=code,
            mcp_client=mcp_client,
            imports=['json', 'os']
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
                'plan': output.get('plan'),
                'plan_md': output.get('plan_md'),
                'risks_md': output.get('risks_md'),
                'checks': output.get('plan', {}).get('validation_checks', [])
            },
            'metadata': {
                'confidence': output.get('confidence_score', 0),
                'confidence_breakdown': output.get('confidence_breakdown', {}),
                'iterations': output.get('iterations', 0),
                'tokens_used': output.get('tokens_used', 0),
                'contributions': output.get('contributions', {})
            },
            'logs': exec_result.get('logs', [])
        }


# Factory function
def create_planning_node(confidence_threshold: float = 95.0) -> PlanningNode:
    """
    Create planning node with specified threshold.

    Args:
        confidence_threshold: Required confidence (0-100)

    Returns:
        PlanningNode instance
    """
    return PlanningNode(
        confidence_threshold=confidence_threshold,
        max_iterations=3
    )
