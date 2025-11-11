#!/usr/bin/env python3
"""
Hybrid Planner - Multi-AI Sequential Enrichment Pipeline

Implements the workflow:
Claude Plan → Hybrid → ChatGPT → DeepSeek → Grok → Gemini

Each AI receives all previous messages and adds enrichment, creating
a comprehensively reviewed and enhanced execution plan.
"""

import os
import asyncio
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import agents
from orchestrator.chatgpt_planner import ChatGPTPlanner, ExecutionPlan
from orchestrator.deepseek_agent import DeepSeekAgent, PlanEnrichmentRequest
from orchestrator.grok_agent import GrokAgent, PlanReviewRequest
from orchestrator.gemini_agent import GeminiAgent, ReviewRequest as GeminiReviewRequest
from orchestrator.best_practices import get_best_practices_db

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


@dataclass
class EnrichmentContribution:
    """A single AI's contribution to plan enrichment"""
    ai_name: str
    content: str
    suggestions: List[str] = field(default_factory=list)
    insights: List[str] = field(default_factory=list)
    concerns: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class EnrichedPlan:
    """Fully enriched execution plan from multi-AI pipeline"""
    plan_id: str
    original_plan: str  # Claude's initial plan
    execution_plan: ExecutionPlan  # ChatGPT's structured plan
    enrichments: List[EnrichmentContribution]  # All AI contributions
    best_practices: List[str] = field(default_factory=list)
    final_confidence_score: float = 0.0
    risks_identified: List[str] = field(default_factory=list)
    structured_tasks: Optional[Dict[str, Any]] = None  # Gemini's structured JSON task breakdown
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class HybridPlanner:
    """
    Multi-AI sequential enrichment pipeline for plan generation.

    Workflow:
    1. Receives Claude's initial plan (from plan mode)
    2. Adds best practices from knowledge base
    3. ChatGPT creates structured execution plan
    4. DeepSeek enriches with technical insights
    5. Grok reviews with creative alternatives
    6. Gemini provides final comprehensive review
    7. Returns fully enriched plan

    Each AI sees the full conversation history from all previous AIs.
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        deepseek_api_key: Optional[str] = None,
        grok_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        chatgpt_model: str = "gpt-4o",
        enable_best_practices: bool = True,
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None
    ):
        """
        Initialize Hybrid Planner.

        Args:
            openai_api_key: OpenAI API key for ChatGPT
            deepseek_api_key: DeepSeek API key
            grok_api_key: Grok/xAI API key
            gemini_api_key: Google Gemini API key
            chatgpt_model: ChatGPT model to use
            enable_best_practices: Whether to inject best practices
            verbose: Enable verbose logging
            agent_activity_callback: Callback for agent activity events (for UI visualization)
        """
        self.verbose = verbose
        self.enable_best_practices = enable_best_practices
        self.agent_activity_callback = agent_activity_callback

        # Initialize best practices database
        self.best_practices_db = get_best_practices_db() if enable_best_practices else None

        # Initialize AI agents
        try:
            self.chatgpt = ChatGPTPlanner(
                openai_api_key=openai_api_key,
                model=chatgpt_model
            )
            self._log("✓ ChatGPT planner initialized")
        except Exception as e:
            self._log(f"✗ ChatGPT initialization failed: {e}")
            self.chatgpt = None

        try:
            self.deepseek = DeepSeekAgent(
                agent_id="deepseek-planner",
                api_key=deepseek_api_key
            )
            self._log("✓ DeepSeek agent initialized")
        except Exception as e:
            self._log(f"✗ DeepSeek initialization failed: {e}")
            self.deepseek = None

        try:
            self.grok = GrokAgent(
                agent_id="grok-reviewer",
                api_key=grok_api_key
            )
            self._log("✓ Grok agent initialized")
        except Exception as e:
            self._log(f"✗ Grok initialization failed: {e}")
            self.grok = None

        try:
            self.gemini = GeminiAgent(
                agent_id="gemini-reviewer",
                api_key=gemini_api_key
            )
            self._log("✓ Gemini agent initialized")
        except Exception as e:
            self._log(f"✗ Gemini initialization failed: {e}")
            self.gemini = None

    def _log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            print(f"[HybridPlanner] {message}")

    async def _emit_spawn_event(self, agent_role: str, agent_label: str, plan_id: str = None, task_id: str = None):
        """Emit spawn event for an AI agent node"""
        # ✅ FIX: Publish agent_spawned event to Redis so frontend can create node
        await publish_event({
            "type": "agent_spawned",
            "hook_event_type": "agent_spawned",
            "plan_id": plan_id,
            "session_id": task_id or plan_id,
            "agent": agent_role,
            "agent_label": agent_label,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "agent": agent_role,
                "agent_label": agent_label,
                "plan_id": plan_id
            }
        })
        self._log(f"📤 Published agent_spawned event for {agent_label}")

        # Also call the callback if it exists (for compatibility)
        if self.agent_activity_callback:
            await self.agent_activity_callback(
                agent_role=agent_role,
                log_type="spawn",
                message=f"{agent_label} starting analysis",
                metadata={
                    "agent_label": agent_label,
                    "task": "Multi-AI Planning",
                    "stage": "planning"
                }
            )

    async def enrich_plan(
        self,
        task_title: str,
        task_description: str,
        claude_plan: str,
        context: Optional[Dict[str, Any]] = None,
        task_id: Optional[str] = None
    ) -> EnrichedPlan:
        """
        Run the full multi-AI enrichment pipeline.

        Args:
            task_title: Title of the task
            task_description: Detailed task description
            claude_plan: Claude's initial plan from plan mode
            context: Additional context
            task_id: Task/session ID for event tracking

        Returns:
            EnrichedPlan with all AI contributions
        """
        plan_id = f"plan-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        self._log("=" * 60)
        self._log(f"Starting Multi-AI Enrichment Pipeline for: {task_title}")
        self._log("=" * 60)

        # ✅ FIX: Include session_id (task_id) so frontend can track the plan
        event_payload = {
            "type": "enrichment_pipeline_started",
            "plan_id": plan_id,
            "session_id": task_id or plan_id,  # Use task_id if available, fallback to plan_id
            "task": task_title
        }
        await publish_event(event_payload)

        # Debug logging to verify session_id is included
        self._log(f"📤 Published enrichment_pipeline_started event:")
        self._log(f"   plan_id: {event_payload['plan_id']}")
        self._log(f"   session_id: {event_payload['session_id']}")
        self._log(f"   task_id param: {task_id}")

        enrichments: List[EnrichmentContribution] = []
        conversation_history = []

        # Step 0: Claude's Initial Creative Analysis (FIRST AI - sets the foundation)
        self._log("\n📝 Step 0: Claude's Initial Creative Analysis (FIRST)")
        self._log("-" * 60)

        # Emit spawn event for Claude
        await self._emit_spawn_event("CLAUDE", "Claude (Creative Analysis)", plan_id, task_id)

        # ✅ ENHANCED: Create thorough analysis if claude_plan is minimal or just task verbatim
        # Claude should expand minimal requests and provide creative, detailed analysis
        if not claude_plan or len(claude_plan.strip()) < 100 or claude_plan.strip() == task_description.strip():
            # Claude plan is too minimal - enhance with proper analysis structure
            claude_analysis = f"""# Initial Analysis and Creative Expansion

## User Request Understanding
{task_description}

## What We're Building
This task requires us to create {task_title}. Based on the request, I'm interpreting this as:

1. **Core Functionality**: The essential features needed to fulfill the user's request
2. **Creative Enhancements**: If the user's request is minimal, I'm taking creative liberty to expand it into something robust and well-designed
3. **Technical Approach**: The frameworks, languages, and architectural patterns that would best serve this project

## Detailed Analysis

### Scope and Requirements
- The primary goal is to {task_title.lower()}
- Key considerations include usability, maintainability, and extensibility
- This should be production-ready and follow best practices

### Potential Features and Enhancements
- Core features directly addressing the user's request
- Quality-of-life improvements that make the solution more robust
- Error handling and edge case management
- User experience considerations

### Technical Considerations
- Choice of technology stack based on project requirements
- Architectural patterns for scalability
- Code organization and structure
- Testing and validation approach

## Initial Recommendations
Based on this analysis, I recommend we proceed with a well-structured implementation that balances simplicity with robustness. The next AI (ChatGPT) should create a detailed plan with specific tasks, subtasks, code structure, and file organization.
"""
            self._log(f"✨ Enhanced minimal Claude plan with creative analysis")
        else:
            # Use the provided Claude plan as-is
            claude_analysis = claude_plan
            self._log(f"✅ Using provided Claude analysis")

        # ✅ FIX: Publish Claude enrichment request event
        await publish_event({
            "type": "ai_enrichment_request",
            "plan_id": plan_id,
            "session_id": plan_id,
            "ai_name": "Claude",
            "ai_provider": "anthropic",
            "request_data": f"Task: {task_title}\n\n{task_description}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        claude_contribution = EnrichmentContribution(
            ai_name="Claude",
            content=claude_analysis,
            suggestions=[],
            insights=[]
        )
        enrichments.append(claude_contribution)
        conversation_history.append({
            "ai": "Claude",
            "content": claude_analysis
        })

        # ✅ FIX: Publish Claude enrichment response event
        await publish_event({
            "type": "ai_enrichment_response",
            "plan_id": plan_id,
            "session_id": plan_id,
            "ai_name": "Claude",
            "ai_provider": "anthropic",
            "response_data": claude_analysis,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        # ✅ FIX: Add delay after Claude completes before starting next AI
        await asyncio.sleep(1.5)

        # Step 0.5: Inject Best Practices
        best_practices_applied = []
        if self.enable_best_practices and self.best_practices_db:
            self._log("\n📚 Step 0.5: Injecting Best Practices")
            self._log("-" * 60)
            recommendations = self.best_practices_db.get_recommendations(task_description)

            if recommendations['practices'] or recommendations['patterns']:
                bp_content = self._format_best_practices(recommendations)
                best_practices_contribution = EnrichmentContribution(
                    ai_name="Best Practices DB",
                    content=bp_content,
                    suggestions=[p.title for p in recommendations['practices'][:3]],
                    insights=[pat.name for pat in recommendations['patterns'][:2]]
                )
                enrichments.append(best_practices_contribution)
                conversation_history.append({
                    "ai": "Best Practices",
                    "content": bp_content
                })
                best_practices_applied = [p.title for p in recommendations['practices']]
                self._log(f"  Applied {len(recommendations['practices'])} best practices")

        # Step 1: ChatGPT Creates Structured Plan
        self._log("\n🤖 Step 1: ChatGPT - Creating Structured Execution Plan")
        self._log("-" * 60)

        # Emit spawn event for ChatGPT
        await self._emit_spawn_event("CHATGPT", "ChatGPT (Structured Plan)", plan_id, task_id)

        execution_plan = None
        if self.chatgpt:
            try:
                # Build context with all previous messages
                full_context = self._build_context(conversation_history, context)

                # Publish AI request event
                request_data = f"{task_title}\n\n{task_description}\n\nClaude's Plan:\n{claude_plan}"
                await publish_event({
                    "type": "ai_enrichment_request",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "ChatGPT",
                    "ai_provider": "openai",
                    "request_data": request_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

                execution_plan = await self.chatgpt.create_plan(
                    user_goal=request_data,
                    context=full_context
                )

                chatgpt_content = json.dumps({
                    "plan_id": execution_plan.plan_id,
                    "goal": execution_plan.goal,
                    "reasoning": execution_plan.reasoning,
                    "tasks_count": len(execution_plan.tasks),
                    "tasks": execution_plan.tasks,  # ✅ INCLUDE FULL TASKS ARRAY
                    "dependencies": execution_plan.dependencies,
                    "estimated_time": execution_plan.estimated_time,
                    "risks": execution_plan.risks
                }, indent=2)

                # Publish AI response event
                await publish_event({
                    "type": "ai_enrichment_response",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "ChatGPT",
                    "ai_provider": "openai",
                    "response_data": chatgpt_content,
                    "success": True,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

                chatgpt_contribution = EnrichmentContribution(
                    ai_name="ChatGPT",
                    content=chatgpt_content,
                    suggestions=[],
                    insights=[task['agent'] for task in execution_plan.tasks[:5]],  # Agent assignments
                    concerns=execution_plan.risks
                )
                enrichments.append(chatgpt_contribution)
                conversation_history.append({
                    "ai": "ChatGPT",
                    "content": chatgpt_content
                })

                self._log(f"  ✓ Created plan with {len(execution_plan.tasks)} tasks")

                # ✅ FIX: Add delay after ChatGPT completes before starting DeepSeek
                await asyncio.sleep(1.5)

            except Exception as e:
                self._log(f"  ✗ ChatGPT failed: {e}")
                await publish_event({
                    "type": "ai_enrichment_response",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "ChatGPT",
                    "ai_provider": "openai",
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

        if execution_plan is None:
            self._log("  ⚠ ChatGPT unavailable - generating offline fallback plan")
            execution_plan = self._generate_fallback_execution_plan(
                plan_id=plan_id,
                task_title=task_title,
                task_description=task_description,
                claude_plan=claude_plan,
                context=context or {}
            )

            fallback_summary = json.dumps({
                "plan_id": execution_plan.plan_id,
                "goal": execution_plan.goal,
                "tasks": [
                    {
                        "task_id": task["task_id"],
                        "agent": task["agent"],
                        "description": task["description"],
                        "depends_on": task.get("depends_on", [])
                    }
                    for task in execution_plan.tasks
                ],
                "note": "Generated locally due to missing ChatGPT planner"
            }, indent=2)

            fallback_contribution = EnrichmentContribution(
                ai_name="Offline Planner",
                content=fallback_summary,
                suggestions=[task["description"] for task in execution_plan.tasks[:3]],
                insights=[f"{len(execution_plan.tasks)} deterministic steps synthesized"],
                concerns=["Plan generated without external AI validation"]
            )
            enrichments.append(fallback_contribution)
            conversation_history.append({
                "ai": "Offline Planner",
                "content": fallback_summary
            })

        # Step 2: DeepSeek Enriches with Technical Insights
        self._log("\n🧠 Step 2: DeepSeek - Technical Analysis & Insights")
        self._log("-" * 60)

        # Emit spawn event for DeepSeek
        await self._emit_spawn_event("DEEPSEEK", "DeepSeek (Technical Analysis)", plan_id, task_id)

        if self.deepseek:
            try:
                deepseek_request = PlanEnrichmentRequest(
                    task_title=task_title,
                    task_description=task_description,
                    initial_plan=claude_plan,
                    previous_enrichments=[
                        {"Claude": claude_plan},
                        *([{"ChatGPT": chatgpt_content}] if execution_plan else [])
                    ]
                )

                # Publish AI request event
                deepseek_request_data = f"""Task: {task_title}
{task_description}

Claude's Analysis:
{claude_plan}

ChatGPT's Execution Plan:
{chatgpt_content if execution_plan else 'N/A'}"""

                await publish_event({
                    "type": "ai_enrichment_request",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "DeepSeek",
                    "ai_provider": "deepseek",
                    "request_data": deepseek_request_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

                deepseek_result = await self.deepseek.enrich_plan(deepseek_request)

                if deepseek_result.success:
                    # Publish AI response event
                    await publish_event({
                        "type": "ai_enrichment_response",
                        "plan_id": plan_id,
                        "session_id": plan_id,
                        "ai_name": "DeepSeek",
                        "ai_provider": "deepseek",
                        "response_data": deepseek_result.enriched_content or "",
                        "suggestions": deepseek_result.suggestions,
                        "insights": deepseek_result.technical_insights,
                        "success": True,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                    deepseek_contribution = EnrichmentContribution(
                        ai_name="DeepSeek",
                        content=deepseek_result.enriched_content or "",
                        suggestions=deepseek_result.suggestions,
                        insights=deepseek_result.technical_insights,
                        concerns=[deepseek_result.risk_analysis] if deepseek_result.risk_analysis else []
                    )
                    enrichments.append(deepseek_contribution)
                    conversation_history.append({
                        "ai": "DeepSeek",
                        "content": deepseek_result.enriched_content or ""
                    })

                    self._log(f"  ✓ Added {len(deepseek_result.suggestions)} suggestions, {len(deepseek_result.technical_insights)} insights")

                    # ✅ FIX: Add delay after DeepSeek completes before starting Grok
                    await asyncio.sleep(1.5)
                else:
                    self._log(f"  ✗ DeepSeek enrichment failed: {deepseek_result.error}")
                    await publish_event({
                        "type": "ai_enrichment_response",
                        "plan_id": plan_id,
                        "session_id": plan_id,
                        "ai_name": "DeepSeek",
                        "ai_provider": "deepseek",
                        "success": False,
                        "error": deepseek_result.error,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

            except Exception as e:
                self._log(f"  ✗ DeepSeek failed: {e}")
                await publish_event({
                    "type": "ai_enrichment_response",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "DeepSeek",
                    "ai_provider": "deepseek",
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

        # Step 3: Grok Reviews with Creative Alternatives
        self._log("\n🌟 Step 3: Grok - Creative Review & Alternatives")
        self._log("-" * 60)

        # Emit spawn event for Grok
        await self._emit_spawn_event("GROK", "Grok (Critical Review)", plan_id, task_id)

        if self.grok:
            try:
                grok_request = PlanReviewRequest(
                    task_title=task_title,
                    task_description=task_description,
                    initial_plan=claude_plan,
                    enrichments=[
                        {e.ai_name: e.content} for e in enrichments
                    ]
                )

                # Build complete context for Grok - FULL CONTENT, NO TRUNCATION
                grok_request_data = f"""Task: {task_title}
{task_description}

Previous AI Contributions:
"""
                for enrichment in enrichments:
                    # ✅ FIX: Include FULL content from each AI, not truncated
                    grok_request_data += f"\n{enrichment.ai_name}:\n{enrichment.content}\n\n{'='*80}\n\n"

                await publish_event({"type": "ai_enrichment_request", "plan_id": plan_id, "session_id": plan_id, "ai_name": "Grok", "ai_provider": "xai", "request_data": grok_request_data, "timestamp": datetime.now(timezone.utc).isoformat()})

                grok_result = await self.grok.review_plan(grok_request)

                if grok_result.success:
                    await publish_event({"type": "ai_enrichment_response", "plan_id": plan_id, "session_id": plan_id, "ai_name": "Grok", "ai_provider": "xai", "response_data": grok_result.review_summary or "", "success": True, "timestamp": datetime.now(timezone.utc).isoformat()})
                    grok_contribution = EnrichmentContribution(
                        ai_name="Grok",
                        content=grok_result.review_summary or "",
                        suggestions=grok_result.alternative_approaches,
                        insights=grok_result.creative_insights,
                        concerns=grok_result.weaknesses
                    )
                    enrichments.append(grok_contribution)
                    conversation_history.append({
                        "ai": "Grok",
                        "content": grok_result.review_summary or ""
                    })

                    self._log(f"  ✓ Confidence: {grok_result.confidence_score}/10, {len(grok_result.alternative_approaches)} alternatives")

                    # ✅ FIX: Add delay after Grok completes before starting Gemini
                    await asyncio.sleep(1.5)
                else:
                    self._log(f"  ✗ Grok review failed: {grok_result.error}")
                    await publish_event({"type": "ai_enrichment_response", "plan_id": plan_id, "session_id": plan_id, "ai_name": "Grok", "ai_provider": "xai", "success": False, "error": grok_result.error, "timestamp": datetime.now(timezone.utc).isoformat()})

            except Exception as e:
                self._log(f"  ✗ Grok failed: {e}")
                await publish_event({"type": "ai_enrichment_response", "plan_id": plan_id, "session_id": plan_id, "ai_name": "Grok", "ai_provider": "xai", "success": False, "error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()})

        # Initialize structured tasks (will be populated by Gemini if available)
        structured_tasks_json = None

        # Step 4: Gemini Final Comprehensive Review
        self._log("\n💎 Step 4: Gemini - Final Comprehensive Review")
        self._log("-" * 60)

        # Emit spawn event for Gemini
        await self._emit_spawn_event("GEMINI", "Gemini (Final Assessment)", plan_id, task_id)

        final_confidence_score = 7.0  # Default
        if self.gemini:
            try:
                # Build comprehensive summary for Gemini
                implementation_summary = self._build_implementation_summary(enrichments)

                gemini_request = GeminiReviewRequest(
                    task_title=task_title,
                    task_description=task_description,
                    implementation_summary=implementation_summary,
                    code_summary="Plan enrichment stage - no code yet",
                    test_summary="Testing will occur during execution",
                    previous_feedback=[e.content for e in enrichments]
                )

                await publish_event({
                    "type": "ai_enrichment_request",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "Gemini",
                    "ai_provider": "google",
                    "request_data": implementation_summary,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

                gemini_result = await self.gemini.review(gemini_request)

                if gemini_result.success:
                    await publish_event({
                        "type": "ai_enrichment_response",
                        "plan_id": plan_id,
                        "session_id": plan_id,
                        "ai_name": "Gemini",
                        "ai_provider": "google",
                        "response_data": gemini_result.feedback,
                        "strengths": gemini_result.strengths,
                        "suggestions": gemini_result.improvements,
                        "concerns": gemini_result.concerns,
                        "quality_score": gemini_result.overall_quality_score,
                        "approved": gemini_result.approved,
                        "success": True,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    gemini_contribution = EnrichmentContribution(
                        ai_name="Gemini",
                        content=gemini_result.feedback,
                        suggestions=gemini_result.improvements,
                        insights=gemini_result.strengths,
                        concerns=gemini_result.concerns
                    )
                    enrichments.append(gemini_contribution)
                    conversation_history.append({
                        "ai": "Gemini",
                        "content": gemini_result.feedback
                    })

                    final_confidence_score = gemini_result.overall_quality_score
                    self._log(f"  ✓ Final Quality Score: {final_confidence_score}/10")
                    self._log(f"  {'✓ APPROVED' if gemini_result.approved else '⚠ NEEDS ATTENTION'}")

                    # ✅ NEW: Have Gemini organize all enrichments into structured JSON
                    self._log("\n📊 Step 5b: Gemini Task Organization")
                    self._log("-" * 60)
                    self._log("  Having Gemini organize tasks into structured JSON format...")

                    from orchestrator.gemini_agent import TaskOrganizationRequest

                    task_org_request = TaskOrganizationRequest(
                        task_title=task_title,
                        task_description=task_description,
                        all_enrichments=conversation_history
                    )

                    task_org_result = await self.gemini.organize_final_tasks(task_org_request)

                    if task_org_result.success:
                        self._log(f"  ✓ Task organization complete")
                        self._log(f"  Total tasks: {task_org_result.structured_tasks.get('total_tasks', 0)}")

                        # ✅ FIX: Pretty print the structured tasks for visibility
                        self._log("\n" + "=" * 60)
                        self._log("📋 STRUCTURED TASK BREAKDOWN (JSON)")
                        self._log("=" * 60)
                        self._log(json.dumps(task_org_result.structured_tasks, indent=2))
                        self._log("=" * 60)

                        await publish_event({
                            "type": "task_organization_complete",
                            "plan_id": plan_id,
                            "session_id": plan_id,
                            "total_tasks": task_org_result.structured_tasks.get("total_tasks", 0),
                            "structured_tasks": task_org_result.structured_tasks,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })

                        # Store structured tasks in the enriched plan (will be added to enriched_plan later)
                        structured_tasks_json = task_org_result.structured_tasks
                    else:
                        self._log(f"  ⚠ Task organization failed: {task_org_result.error}")
                        self._log(f"  Error details: {task_org_result.error}")
                        structured_tasks_json = None
                else:
                    self._log(f"  ✗ Gemini review failed: {gemini_result.error}")
                    await publish_event({
                        "type": "ai_enrichment_response",
                        "plan_id": plan_id,
                        "session_id": plan_id,
                        "ai_name": "Gemini",
                        "ai_provider": "google",
                        "success": False,
                        "error": gemini_result.error,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

            except Exception as e:
                self._log(f"  ✗ Gemini failed: {e}")
                await publish_event({
                    "type": "ai_enrichment_response",
                    "plan_id": plan_id,
                    "session_id": plan_id,
                    "ai_name": "Gemini",
                    "ai_provider": "google",
                    "success": False,
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

        # Aggregate all risks
        all_risks = []
        for enrichment in enrichments:
            all_risks.extend(enrichment.concerns)

        # Create final enriched plan
        enriched_plan = EnrichedPlan(
            plan_id=plan_id,
            original_plan=claude_plan,
            execution_plan=execution_plan,
            enrichments=enrichments,
            best_practices=best_practices_applied,
            final_confidence_score=final_confidence_score,
            risks_identified=all_risks,
            structured_tasks=structured_tasks_json  # Gemini's structured JSON task breakdown
        )

        self._log("\n" + "=" * 60)
        self._log("✅ Multi-AI Enrichment Pipeline Complete")
        self._log(f"   Total AI Contributions: {len(enrichments)}")
        self._log(f"   Final Confidence: {final_confidence_score}/10")
        self._log(f"   Risks Identified: {len(all_risks)}")
        self._log("=" * 60)

        await publish_event({
            "type": "enrichment_pipeline_completed",
            "plan_id": plan_id,
            "enrichments_count": len(enrichments),
            "confidence_score": final_confidence_score,
            "risks_count": len(all_risks)
        })

        # ✅ FIX: Notify frontend that planning is complete, ready to start orchestrator
        await publish_event({
            "type": "planning_complete",
            "event_type": "planning_complete",
            "plan_id": plan_id,
            "session_id": plan_id,
            "task_id": context.get("task_id", "unknown") if context else "unknown",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_app": "hybrid_planner"
        })

        return enriched_plan

    def _build_context(self, conversation_history: List[Dict[str, str]], additional_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Build context from conversation history."""
        context = {
            "conversation_history": conversation_history
        }
        if additional_context:
            context.update(additional_context)
        return context

    def _generate_fallback_execution_plan(
        self,
        plan_id: str,
        task_title: str,
        task_description: str,
        claude_plan: str,
        context: Dict[str, Any]
    ) -> ExecutionPlan:
        """
        Generate a deterministic execution plan when ChatGPT is unavailable.

        The fallback keeps downstream components working during offline tests.
        """
        task_context = context.get("type") if context else None
        extracted_steps = self._extract_plan_steps(claude_plan)
        if not extracted_steps:
            extracted_steps = [
                "Analyze the requirements and outline the solution",
                "Implement the primary functionality",
                "Add automated tests covering the main paths",
                "Document usage, caveats, and follow-up work"
            ]
        elif task_context == "documentation" and not any("document" in s.lower() for s in extracted_steps):
            extracted_steps.append("Prepare reference documentation for the delivered work")

        tasks: List[Dict[str, Any]] = []
        dependencies: Dict[str, List[str]] = {}

        for idx, step in enumerate(extracted_steps, start=1):
            task_id = f"task-{idx}"
            agent = self._infer_agent_from_step(step)
            depends_on = [f"task-{idx-1}"] if idx > 1 else []
            if depends_on:
                dependencies[task_id] = depends_on

            estimated_time = "20 minutes" if agent in {"QA", "DOC"} else "30 minutes"

            tasks.append({
                "task_id": task_id,
                "agent": agent,
                "description": step,
                "acceptance_criteria": self._fallback_acceptance_criteria(agent, step),
                "depends_on": depends_on,
                "priority": "high" if idx == 1 else ("medium" if idx <= 3 else "low"),
                "estimated_time": estimated_time
            })

        reasoning = (
            "ChatGPT planner unavailable. Parsed Claude's outline and applied "
            "best-practice defaults to keep the workflow moving offline."
        )
        risks = [
            "Plan has not been independently reviewed by other AI agents",
            "Acceptance criteria generated heuristically—confirm before execution"
        ]

        goal = task_title or (task_description.strip() or "Autonomous workflow task")
        estimated_total_time = f"{len(tasks) * 15} minutes"

        return ExecutionPlan(
            plan_id=f"{plan_id}-offline",
            goal=goal,
            reasoning=reasoning,
            tasks=tasks,
            dependencies=dependencies,
            estimated_time=estimated_total_time,
            risks=risks
        )

    def _extract_plan_steps(self, claude_plan: str) -> List[str]:
        """Extract step descriptions from Claude's initial plan."""
        steps: List[str] = []
        for line in claude_plan.splitlines():
            stripped = line.strip()
            if not stripped:
                continue

            if stripped.startswith("##"):
                candidate = stripped.lstrip("#").strip(" :")
                if candidate:
                    steps.append(candidate)
                continue

            match = re.match(r"^(?:\d+\.|[-*])\s+(.*)", stripped)
            if match:
                candidate = match.group(1).strip()
                if candidate:
                    steps.append(candidate)

        return steps

    def _infer_agent_from_step(self, step: str) -> str:
        """Infer the best-fit agent role for the provided step text."""
        lowercase = step.lower()
        keyword_map = [
            ({"test", "validate", "qa", "assert"}, "QA"),
            ({"document", "docs", "readme", "guide"}, "DOC"),
            ({"research", "investigate", "explore"}, "RES"),
            ({"data", "etl", "pipeline"}, "DATA"),
            ({"train", "model", "ml", "tuning"}, "TRAIN"),
            ({"deploy", "infrastructure", "ci/cd", "devops"}, "DEVOPS"),
            ({"security", "vulnerability", "owasp", "audit"}, "SECURITY"),
            ({"debug", "traceback", "stack trace"}, "DEBUGGER"),
            ({"plan", "design", "analysis"}, "PP")
        ]

        for keywords, agent in keyword_map:
            if any(keyword in lowercase for keyword in keywords):
                return agent

        return "CODE"

    def _fallback_acceptance_criteria(self, agent: str, step: str) -> List[str]:
        """Create lightweight acceptance criteria used by the offline planner."""
        normalized = step.rstrip(".")

        if agent == "QA":
            return [
                f"Tests exercise the scenario: {normalized}",
                "All tests pass locally with clear output"
            ]
        if agent == "DOC":
            return [
                f"Documentation explains how to {normalized.lower()}",
                "Include at least one usage example"
            ]
        if agent == "RES":
            return [
                f"Summarize research findings about: {normalized}",
                "Highlight concrete recommendations or references"
            ]
        if agent == "SECURITY":
            return [
                "Identify high-risk areas and justify each finding",
                "Provide remediation steps for critical issues"
            ]
        if agent == "DEBUGGER":
            return [
                "Pinpoint the root cause of the failure",
                "Outline a clear fix or next diagnostic step"
            ]
        if agent == "DEVOPS":
            return [
                "Provide repeatable deployment or automation steps",
                "List post-deployment verification commands"
            ]

        return [
            f"Complete the step: {normalized}",
            "Add automated validation (tests, type checks, or scripts) where practical"
        ]

    def _format_best_practices(self, recommendations: Dict) -> str:
        """Format best practices recommendations."""
        content = "# Relevant Best Practices\n\n"

        if recommendations['practices']:
            content += "## Recommended Practices:\n"
            for practice in recommendations['practices']:
                content += f"\n### {practice.title}\n"
                content += f"{practice.description}\n"
                content += f"**When to apply:** {practice.when_to_apply}\n"
                if practice.pitfalls_to_avoid:
                    content += f"**Avoid:** {', '.join(practice.pitfalls_to_avoid[:2])}\n"

        if recommendations['patterns']:
            content += "\n## Design Patterns:\n"
            for pattern in recommendations['patterns']:
                content += f"\n### {pattern.name}\n"
                content += f"{pattern.description}\n"
                if pattern.use_cases:
                    content += f"**Use cases:** {pattern.use_cases[0]}\n"

        return content

    def _build_implementation_summary(self, enrichments: List[EnrichmentContribution]) -> str:
        """Build implementation summary from all enrichments."""
        summary = "# Multi-AI Plan Enrichment Summary\n\n"

        for enrichment in enrichments:
            summary += f"## {enrichment.ai_name}\n"
            summary += f"{enrichment.content}\n\n"  # NO TRUNCATION - show full content

            if enrichment.suggestions:
                summary += f"**Suggestions:** {len(enrichment.suggestions)} provided\n"
            if enrichment.insights:
                summary += f"**Insights:** {len(enrichment.insights)} provided\n"
            if enrichment.concerns:
                summary += f"**Concerns:** {len(enrichment.concerns)} raised\n"
            summary += "\n"

        return summary


# Example usage
async def main():
    """Example usage of Hybrid Planner."""
    planner = HybridPlanner(verbose=True)

    claude_plan = """
    # Build User Authentication System

    1. Design database schema for users and sessions
    2. Implement JWT token generation and validation
    3. Create registration endpoint
    4. Create login endpoint
    5. Add password hashing with bcrypt
    6. Implement refresh token rotation
    7. Write comprehensive tests
    8. Document API endpoints
    """

    enriched_plan = await planner.enrich_plan(
        task_title="Build User Authentication System",
        task_description="Create a secure JWT-based authentication system with refresh tokens",
        claude_plan=claude_plan
    )

    print(f"\n✅ Final Plan ID: {enriched_plan.plan_id}")
    print(f"   Confidence: {enriched_plan.final_confidence_score}/10")
    print(f"   AI Contributors: {len(enriched_plan.enrichments)}")
    print(f"   Total Risks: {len(enriched_plan.risks_identified)}")


if __name__ == "__main__":
    asyncio.run(main())
