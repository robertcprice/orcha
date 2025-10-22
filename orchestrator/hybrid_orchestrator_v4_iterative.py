"""
Hybrid Orchestrator V4 - Iterative Dialogue Edition
Coordinates Claude Code (analysis/execution) + ChatGPT (planning/guidance) in iterative dialogue.

NEW ARCHITECTURE (V4):
    User Goal
        ↓
    Claude Analysis - Analyzes goal, identifies requirements
        ↓
    ChatGPT Creates Comprehensive Execution Plan - Detailed task breakdown
        ↓
    Iterative Dialogue Loop (for each task/stage):
        Claude executes plan → needs more info? → ChatGPT provides → Claude continues
        ↓
    Claude Final Summary
        ↓
    User Report

KEY DIFFERENCE FROM V3:
- V3: ChatGPT plans → Claude executes (one-shot, no feedback)
- V4: Claude analyzes → ChatGPT plans → iterative execution with ChatGPT guidance
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
import json

from orchestrator.chatgpt_planner import ChatGPTPlanner
from orchestrator.claude_cli_executor import ClaudeCLIExecutor


@dataclass
class InformationRequest:
    """Request for information from Claude to ChatGPT"""
    request_id: str
    requested_by: str  # Which Claude agent
    request_type: str  # "research", "context", "web_search", "advice"
    query: str
    details: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class InformationResponse:
    """Response from ChatGPT to Claude's request"""
    request_id: str
    response_type: str
    content: str
    sources: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class DialogueStage:
    """Represents one stage in the iterative dialogue"""
    stage_id: str
    stage_type: str  # "analysis", "planning", "execution", "verification"
    claude_action: str
    chatgpt_response: Optional[str] = None
    status: str = "pending"  # "pending", "in_progress", "completed", "failed"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IterativeExecutionResult:
    """Result of iterative dialogue execution"""
    goal: str
    status: str  # "completed", "partial", "failed"
    stages: List[DialogueStage]
    total_dialogue_turns: int
    total_time: float
    final_summary: str
    artifacts: List[str] = field(default_factory=list)  # Files created/modified
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class HybridOrchestratorV4:
    """
    Iterative dialogue orchestrator.
    Claude initiates and drives execution, ChatGPT provides information on demand.
    """

    def __init__(
        self,
        project_root: Path,
        openai_api_key: Optional[str] = None,
        gpt_model: str = "gpt-4"
    ):
        self.project_root = project_root
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY required for ChatGPT information provider")

        # Initialize components
        self.chatgpt = ChatGPTPlanner(openai_api_key=self.openai_key, model=gpt_model)
        self.claude_cli = ClaudeCLIExecutor(project_root)

        # Dialogue state
        self.current_execution: Optional[IterativeExecutionResult] = None
        self.dialogue_history: List[Dict[str, Any]] = []

    async def execute_goal_iterative(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None,
        max_dialogue_turns: int = 20,
        verbose: bool = True,
        progress_callback: Optional[callable] = None,
        agent_activity_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Execute a user goal using iterative Claude-ChatGPT dialogue.

        Flow:
        1. Claude analyzes goal and identifies requirements
        2. ChatGPT creates comprehensive execution plan
        3. Iterative dialogue loop:
           - Claude executes plan tasks
           - Claude requests more info if needed
           - ChatGPT provides guidance/info
           - Repeat until complete
        4. Claude generates final summary

        Args:
            user_goal: High-level description of what user wants
            context: Additional context
            max_dialogue_turns: Maximum back-and-forth iterations
            verbose: Print detailed progress

        Returns:
            Dict with execution result and dialogue history
        """

        # Helper to emit progress updates
        async def emit_progress(message: str, level: str = "info"):
            if verbose:
                print(f"[{level.upper()}] {message}")
            if progress_callback:
                await progress_callback(message, level)

        if verbose:
            print(f"\n{'='*80}")
            print("HYBRID ORCHESTRATOR V4 - Iterative Dialogue Mode")
            print("Architecture: Claude (initiates/executes) ↔ ChatGPT (provides info)")
            print(f"{'='*80}")
            print(f"\n📋 USER GOAL: {user_goal}\n")

        await emit_progress(f"Starting V4 Orchestrator for goal: {user_goal[:100]}...")
        start_time = datetime.now(timezone.utc)

        # Initialize execution result
        execution_result = IterativeExecutionResult(
            goal=user_goal,
            status="running",
            stages=[],
            total_dialogue_turns=0,
            total_time=0.0,
            final_summary=""
        )
        self.current_execution = execution_result

        # ========================================
        # STAGE 1: Claude Initial Analysis
        # ========================================

        if verbose:
            print(f"{'─'*80}")
            print("STAGE 1: Claude Initial Analysis")
            print(f"{'─'*80}\n")

        analysis_stage = DialogueStage(
            stage_id="stage-1-analysis",
            stage_type="analysis",
            claude_action="Analyze goal and identify information needs",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        analysis_stage.status = "in_progress"
        execution_result.stages.append(analysis_stage)

        # Log PP agent spawn
        if agent_activity_callback:
            await agent_activity_callback("PP", "spawn", f"Analyzing goal: {user_goal[:100]}")
            await agent_activity_callback("PP", "status", "running", {"task": "Goal analysis"})

        # Claude analyzes the goal
        info_request = await self._claude_initial_analysis(user_goal, context, verbose)

        # Log PP agent output
        if agent_activity_callback:
            await agent_activity_callback("PP", "output", f"Identified need: {info_request.query[:100]}")

        analysis_stage.metadata["info_request"] = {
            "request_id": info_request.request_id,
            "request_type": info_request.request_type,
            "query": info_request.query
        }
        analysis_stage.status = "completed"
        analysis_stage.end_time = datetime.now(timezone.utc).isoformat()

        # Log PP agent completion
        if agent_activity_callback:
            await agent_activity_callback("PP", "complete", f"Analysis complete: {info_request.request_type}")
            await agent_activity_callback("PP", "status", "completed", {"task": "Goal analysis"})

        await emit_progress(f"✓ Analysis complete - {info_request.request_type}: {info_request.query[:80]}")

        if verbose:
            print(f"✓ Claude identified information needs")
            print(f"  Request Type: {info_request.request_type}")
            print(f"  Query: {info_request.query}\n")

        # ========================================
        # STAGE 2: ChatGPT Creates Execution Plan
        # ========================================

        if verbose:
            print(f"{'─'*80}")
            print("STAGE 2: ChatGPT Creates Comprehensive Execution Plan")
            print(f"{'─'*80}\n")

        planning_stage = DialogueStage(
            stage_id="stage-2-planning",
            stage_type="planning",
            claude_action="Waiting for ChatGPT to create execution plan",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        planning_stage.status = "in_progress"
        execution_result.stages.append(planning_stage)

        # ChatGPT creates comprehensive execution plan
        execution_plan = await self.chatgpt.create_plan(user_goal, context)

        planning_stage.chatgpt_response = f"Created plan with {len(execution_plan.tasks)} tasks"
        planning_stage.metadata["plan"] = {
            "plan_id": execution_plan.plan_id,
            "num_tasks": len(execution_plan.tasks),
            "reasoning": execution_plan.reasoning[:200] + "..." if len(execution_plan.reasoning) > 200 else execution_plan.reasoning
        }
        planning_stage.status = "completed"
        planning_stage.end_time = datetime.now(timezone.utc).isoformat()

        await emit_progress(f"✓ Execution plan created - {len(execution_plan.tasks)} tasks, estimated {execution_plan.estimated_time}")

        if verbose:
            print(f"✓ ChatGPT created execution plan")
            print(f"  Plan ID: {execution_plan.plan_id}")
            print(f"  Tasks: {len(execution_plan.tasks)}")
            print(f"  Reasoning: {execution_plan.reasoning[:150]}...\n")
            print(f"  Task breakdown:")
            for i, task in enumerate(execution_plan.tasks[:5], 1):
                print(f"    {i}. [{task.get('agent', 'N/A')}] {task.get('description', 'No description')[:80]}")
            if len(execution_plan.tasks) > 5:
                print(f"    ... and {len(execution_plan.tasks) - 5} more tasks\n")

        execution_result.total_dialogue_turns += 1

        # ========================================
        # STAGE 3: Iterative Execution Loop
        # ========================================

        if verbose:
            print(f"{'─'*80}")
            print("STAGE 3: Iterative Execution Loop")
            print(f"{'─'*80}\n")

        current_turn = 1
        execution_complete = False
        current_context = {
            "goal": user_goal,
            "execution_plan": {
                "plan_id": execution_plan.plan_id,
                "reasoning": execution_plan.reasoning,
                "tasks": execution_plan.tasks,
                "dependencies": execution_plan.dependencies,
                "estimated_time": execution_plan.estimated_time,
                "risks": execution_plan.risks
            },
            "original_context": context or {}
        }

        while not execution_complete and current_turn <= max_dialogue_turns:
            if verbose:
                print(f"\n--- Dialogue Turn {current_turn}/{max_dialogue_turns} ---\n")

            await emit_progress(f"🔧 Executing turn {current_turn}/{max_dialogue_turns}...")

            exec_stage = DialogueStage(
                stage_id=f"stage-3-exec-turn-{current_turn}",
                stage_type="execution",
                claude_action=f"Execute work (turn {current_turn})",
                start_time=datetime.now(timezone.utc).isoformat()
            )
            exec_stage.status = "in_progress"
            execution_result.stages.append(exec_stage)

            # Log IM agent spawn for execution
            if current_turn == 1 and agent_activity_callback:
                await agent_activity_callback("IM", "spawn", f"Executing goal: {user_goal[:100]}")
                await agent_activity_callback("IM", "status", "running", {"task": f"Execution turn {current_turn}"})

            # Claude executes current stage
            stage_result = await self._claude_execute_stage(
                current_context,
                turn_number=current_turn,
                verbose=verbose
            )

            # Log IM agent output (both summary and full output)
            if agent_activity_callback:
                work_summary = stage_result.get('work_performed', 'Processing')[:100]
                await agent_activity_callback("IM", "output", f"Turn {current_turn}: {work_summary}")

                # Log full Claude output if available
                if stage_result.get('full_output'):
                    await agent_activity_callback("IM", "output", f"Full output:\n{stage_result['full_output'][:500]}...")

            exec_stage.metadata["stage_result"] = stage_result

            await emit_progress(f"✓ Turn {current_turn} work: {stage_result.get('work_performed', 'Processing')[:80]}")

            # Check if Claude needs more information
            if stage_result.get("needs_more_info"):
                if verbose:
                    print(f"\n🔄 Claude requests additional information:")
                    print(f"   {stage_result.get('info_request_query')}\n")

                await emit_progress(f"🔄 Requesting additional info: {stage_result.get('info_request_query', 'More information needed')[:80]}")

                # Create new information request
                new_request = InformationRequest(
                    request_id=f"req-turn-{current_turn}",
                    requested_by="claude-executor",
                    request_type=stage_result.get("info_request_type", "clarification"),
                    query=stage_result.get("info_request_query", ""),
                    details=stage_result.get("info_request_details", {})
                )

                # ChatGPT responds
                new_response = await self._chatgpt_provide_information(new_request, verbose)

                await emit_progress(f"✓ ChatGPT provided guidance")

                exec_stage.chatgpt_response = new_response.content[:300] + "..."
                exec_stage.metadata["additional_info_provided"] = True

                # Update context with new information
                current_context["additional_info"] = current_context.get("additional_info", [])
                current_context["additional_info"].append({
                    "turn": current_turn,
                    "request": new_request.query,
                    "response": new_response.content
                })

                execution_result.total_dialogue_turns += 1

            # Check if execution is complete
            if stage_result.get("status") == "complete":
                execution_complete = True
                if verbose:
                    print(f"\n✅ Execution complete after {current_turn} turns")

                await emit_progress(f"✅ Execution complete after {current_turn} turns", "success")

                # Log IM agent completion
                if agent_activity_callback:
                    await agent_activity_callback("IM", "complete", f"Execution complete after {current_turn} turns")
                    await agent_activity_callback("IM", "status", "completed", {"turns": current_turn})

                # Record artifacts
                if stage_result.get("artifacts"):
                    execution_result.artifacts.extend(stage_result["artifacts"])
                    await emit_progress(f"📝 Created {len(stage_result['artifacts'])} artifact(s)")

            elif stage_result.get("status") == "failed":
                if verbose:
                    print(f"\n❌ Execution failed: {stage_result.get('error')}")

                await emit_progress(f"❌ Execution failed: {stage_result.get('error', 'Unknown error')}", "error")

                # Log IM agent failure
                if agent_activity_callback:
                    await agent_activity_callback("IM", "error", f"Execution failed: {stage_result.get('error', 'Unknown error')}")
                    await agent_activity_callback("IM", "status", "failed", {"error": stage_result.get('error')})

                execution_result.status = "failed"
                break

            exec_stage.status = "completed" if not stage_result.get("status") == "failed" else "failed"
            exec_stage.end_time = datetime.now(timezone.utc).isoformat()

            current_turn += 1

        # ========================================
        # STAGE 3.5: AR Code Review
        # ========================================

        if execution_complete and execution_result.artifacts:
            if verbose:
                print(f"\n{'─'*80}")
                print("STAGE 3.5: AR Code Review")
                print(f"{'─'*80}\n")

            review_stage = DialogueStage(
                stage_id="stage-3.5-review",
                stage_type="review",
                claude_action="Review implementation against plan",
                start_time=datetime.now(timezone.utc).isoformat()
            )
            review_stage.status = "in_progress"
            execution_result.stages.append(review_stage)

            # Log AR agent spawn
            if agent_activity_callback:
                await agent_activity_callback("AR", "spawn", f"Reviewing implementation: {len(execution_result.artifacts)} artifact(s)")
                await agent_activity_callback("AR", "status", "running", {"task": "Code review"})

            # AR reviews the work
            review_result = await self._ar_review_implementation(
                user_goal,
                current_context.get("execution_plan", {}),
                execution_result.artifacts,
                verbose
            )

            review_stage.metadata["review"] = review_result
            review_stage.status = "completed"
            review_stage.end_time = datetime.now(timezone.utc).isoformat()

            if agent_activity_callback:
                await agent_activity_callback("AR", "output", f"Review: {review_result.get('summary', 'Review complete')[:100]}")
                await agent_activity_callback("AR", "complete", "Code review complete")
                await agent_activity_callback("AR", "status", "completed", {"artifacts_reviewed": len(execution_result.artifacts)})

            await emit_progress(f"✓ Code review complete - {review_result.get('status', 'reviewed')}")

        # ========================================
        # STAGE 4: Final Summary
        # ========================================

        if verbose:
            print(f"\n{'─'*80}")
            print("STAGE 4: Final Summary")
            print(f"{'─'*80}\n")

        summary_stage = DialogueStage(
            stage_id="stage-4-summary",
            stage_type="summary",
            claude_action="Generate final summary",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        summary_stage.status = "in_progress"
        execution_result.stages.append(summary_stage)

        await emit_progress("📝 Generating final summary...")

        # Log RD agent spawn for summary
        if agent_activity_callback:
            await agent_activity_callback("RD", "spawn", "Generating final documentation and summary")
            await agent_activity_callback("RD", "status", "running", {"task": "Final summary"})

        # Claude generates final summary
        final_summary = await self._claude_generate_summary(execution_result, verbose)

        execution_result.final_summary = final_summary
        summary_stage.metadata["summary_length"] = len(final_summary)
        summary_stage.status = "completed"
        summary_stage.end_time = datetime.now(timezone.utc).isoformat()

        await emit_progress(f"✓ Summary generated ({len(final_summary)} chars)", "success")

        # Log RD agent completion
        if agent_activity_callback:
            await agent_activity_callback("RD", "output", f"Generated {len(final_summary)} character summary")
            await agent_activity_callback("RD", "complete", "Summary documentation complete")
            await agent_activity_callback("RD", "status", "completed", {"summary_length": len(final_summary)})

        if verbose:
            print(f"✓ Summary generated\n")
            print(f"{'─'*80}")
            print("FINAL SUMMARY")
            print(f"{'─'*80}\n")
            print(final_summary)

        # ========================================
        # Finalize Results
        # ========================================

        end_time = datetime.now(timezone.utc)
        execution_result.total_time = (end_time - start_time).total_seconds()

        if execution_result.status != "failed":
            execution_result.status = "completed" if execution_complete else "partial"

        result = {
            "status": execution_result.status,
            "goal": execution_result.goal,
            "total_dialogue_turns": execution_result.total_dialogue_turns,
            "total_time": execution_result.total_time,
            "stages": [
                {
                    "stage_id": s.stage_id,
                    "stage_type": s.stage_type,
                    "status": s.status,
                    "claude_action": s.claude_action,
                    "chatgpt_response_preview": s.chatgpt_response,
                    "metadata": s.metadata
                }
                for s in execution_result.stages
            ],
            "artifacts": execution_result.artifacts,
            "final_summary": execution_result.final_summary,
            "created_at": execution_result.created_at
        }

        await emit_progress(
            f"🎉 Orchestration complete: {result['status'].upper()} - {result['total_dialogue_turns']} turns in {result['total_time']:.1f}s",
            "success" if result['status'] == "completed" else "warning"
        )

        if verbose:
            print(f"\n{'='*80}")
            print(f"ITERATIVE ORCHESTRATION COMPLETE")
            print(f"Overall Status: {result['status'].upper()}")
            print(f"Dialogue Turns: {result['total_dialogue_turns']}")
            print(f"Total Time: {result['total_time']:.1f}s")
            print(f"{'='*80}\n")

        return result

    async def _claude_initial_analysis(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]],
        verbose: bool
    ) -> InformationRequest:
        """
        Claude analyzes the user goal and identifies what information it needs.

        Returns InformationRequest describing what Claude needs from ChatGPT.
        """

        analysis_prompt = f"""You are analyzing a user's request to determine what information you need to complete it effectively.

USER GOAL:
{user_goal}

ADDITIONAL CONTEXT:
{json.dumps(context or {}, indent=2)}

YOUR TASK:
1. Analyze the goal to understand what's being asked
2. Identify what information would help you complete this goal
3. Formulate a specific request for the information system

AVAILABLE REQUEST TYPES:
- **web_search**: Search the internet for current information, documentation, tutorials, or best practices
- **research**: Deep research on technologies, concepts, or approaches
- **context**: Background information about project structure or existing code
- **advice**: Strategic guidance on implementation approach
- **examples**: Code examples or templates for similar implementations

WHEN TO USE WEB_SEARCH:
- Need current/latest information (APIs, libraries, frameworks)
- Looking for documentation or tutorials
- Researching best practices or common patterns
- Finding solutions to specific technical problems
- Discovering tools or libraries for a task

OUTPUT FORMAT (JSON):
{{
  "request_type": "web_search|research|context|advice|examples",
  "query": "Specific search query or question",
  "details": {{
    "why_needed": "Explanation of why this info is needed",
    "expected_help": "How this info will help complete the goal"
  }}
}}

IMPORTANT: Use web_search when you need current, specific information from the internet.

Respond ONLY with the JSON, no other text."""

        # Use Claude CLI for analysis
        success, output, metadata = await self.claude_cli.execute_prompt(
            analysis_prompt,
            timeout=120
        )

        if not success:
            # Fallback: create basic research request
            if verbose:
                print(f"⚠️  Analysis failed, using fallback request")

            return InformationRequest(
                request_id="req-fallback",
                requested_by="claude-analysis",
                request_type="context",
                query=f"Provide general guidance and best practices for: {user_goal}",
                details={"fallback": True}
            )

        # Parse Claude's response
        try:
            # Extract JSON from output (might have markdown code blocks)
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                request_data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in output")

            return InformationRequest(
                request_id="req-initial",
                requested_by="claude-analysis",
                request_type=request_data.get("request_type", "research"),
                query=request_data.get("query", ""),
                details=request_data.get("details", {})
            )

        except Exception as e:
            if verbose:
                print(f"⚠️  Failed to parse analysis: {e}")
                print(f"   Using fallback request")

            return InformationRequest(
                request_id="req-fallback",
                requested_by="claude-analysis",
                request_type="context",
                query=f"Provide guidance for: {user_goal}",
                details={"error": str(e)}
            )

    async def _perform_web_search(
        self,
        query: str,
        verbose: bool,
        max_results: int = 5
    ) -> Dict[str, Any]:
        """
        Perform web search using available search API.
        Returns structured search results with sources.
        """
        try:
            import aiohttp
            import urllib.parse

            # Use DuckDuckGo instant answer API (no API key required)
            encoded_query = urllib.parse.quote(query)
            url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"

            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    # DuckDuckGo can return 200 or 202 (processing)
                    if response.status in [200, 202]:
                        data = await response.json()

                        # Extract relevant information
                        results = {
                            "query": query,
                            "abstract": data.get("Abstract", ""),
                            "abstract_source": data.get("AbstractSource", ""),
                            "abstract_url": data.get("AbstractURL", ""),
                            "related_topics": [],
                            "sources": [],
                            "search_provider": "DuckDuckGo API"
                        }

                        # Add abstract as primary source if available
                        if results["abstract"]:
                            results["sources"].append({
                                "title": results["abstract_source"],
                                "url": results["abstract_url"],
                                "snippet": results["abstract"][:300]
                            })

                        # Add related topics
                        for topic in data.get("RelatedTopics", [])[:max_results]:
                            if isinstance(topic, dict) and "Text" in topic:
                                results["related_topics"].append({
                                    "text": topic.get("Text", ""),
                                    "url": topic.get("FirstURL", "")
                                })
                                results["sources"].append({
                                    "title": topic.get("Text", "")[:100],
                                    "url": topic.get("FirstURL", ""),
                                    "snippet": topic.get("Text", "")
                                })

                        # If no results from DuckDuckGo, note it but don't fail
                        if not results["sources"]:
                            results["message"] = "DuckDuckGo instant answers not available for this query. AI will use built-in knowledge."
                            if verbose:
                                print(f"ℹ️  No instant answers available, using AI knowledge")

                        return results

                    else:
                        if verbose:
                            print(f"⚠️  Search API returned status {response.status}, falling back to AI knowledge")
                        return {
                            "error": f"Search API status {response.status}",
                            "sources": [],
                            "message": "Web search unavailable, using AI knowledge",
                            "fallback": True
                        }

        except ImportError:
            if verbose:
                print("⚠️  aiohttp not available, installing...")

            # Try to install aiohttp
            import subprocess
            try:
                subprocess.check_call(["pip", "install", "aiohttp"],
                                     stdout=subprocess.DEVNULL,
                                     stderr=subprocess.DEVNULL)
                # Retry the search
                return await self._perform_web_search(query, verbose, max_results)
            except:
                return {"error": "aiohttp installation failed", "sources": []}

        except Exception as e:
            if verbose:
                print(f"⚠️  Web search error: {e}")
            return {"error": str(e), "sources": []}

    async def _chatgpt_provide_information(
        self,
        request: InformationRequest,
        verbose: bool
    ) -> InformationResponse:
        """
        ChatGPT provides information based on Claude's request.
        Supports web_search request type with actual internet search.
        """

        if verbose:
            print(f"🤖 ChatGPT processing request: {request.request_type}")

        # Handle web_search request type with actual web search
        web_search_results = None
        sources = []

        if request.request_type == "web_search":
            if verbose:
                print(f"🔍 Performing web search: {request.query}")

            try:
                # Perform actual web search using available search capability
                web_search_results = await self._perform_web_search(request.query, verbose)
                sources = web_search_results.get("sources", [])

                if verbose:
                    if sources:
                        print(f"✓ Found {len(sources)} web sources")
                    else:
                        print(f"ℹ️  No search results, will use AI knowledge")
                    print()

            except Exception as e:
                if verbose:
                    print(f"⚠️  Web search failed: {e}, falling back to AI knowledge\n")
                web_search_results = {
                    "error": str(e),
                    "message": "Web search unavailable, using AI knowledge",
                    "fallback": True
                }

        # Build information provision prompt
        if web_search_results:
            info_prompt = f"""You are an information provider supporting a Claude Code agent.

INFORMATION REQUEST:
Type: {request.request_type}
Query: {request.query}

WEB SEARCH RESULTS:
{json.dumps(web_search_results, indent=2)}

REQUEST DETAILS:
{json.dumps(request.details, indent=2)}

YOUR TASK:
Synthesize the web search results to provide comprehensive, accurate information to help Claude complete the user's goal.

GUIDELINES:
1. Summarize key findings from search results
2. Include specific details and examples
3. Cite sources from the search results
4. Organize information clearly
5. Focus on what's most relevant to the query

Provide the synthesized information now:"""
        else:
            info_prompt = f"""You are an information provider supporting a Claude Code agent.

INFORMATION REQUEST:
Type: {request.request_type}
Query: {request.query}

REQUEST DETAILS:
{json.dumps(request.details, indent=2)}

YOUR TASK:
Provide comprehensive, accurate information to help Claude complete the user's goal.

GUIDELINES:
1. Be specific and actionable
2. Include examples where helpful
3. Cite sources if referencing external information
4. Organize information clearly
5. Focus on what's most relevant to the query

Provide the information now:"""

        # Use ChatGPT to respond
        response = self.chatgpt.client.chat.completions.create(
            model=self.chatgpt.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful information provider supporting AI agents with research, context, and guidance. You have access to web search results when needed."
                },
                {
                    "role": "user",
                    "content": info_prompt
                }
            ],
            temperature=0.7
        )

        content = response.choices[0].message.content

        if verbose:
            info_type = "with web search" if web_search_results else ""
            print(f"✓ ChatGPT provided {len(content)} characters of information {info_type}\n")

        return InformationResponse(
            request_id=request.request_id,
            response_type=request.request_type,
            content=content,
            sources=sources,
            metadata={
                "model": self.chatgpt.model,
                "web_search_performed": web_search_results is not None,
                "source_count": len(sources)
            }
        )

    async def _claude_execute_stage(
        self,
        context: Dict[str, Any],
        turn_number: int,
        verbose: bool
    ) -> Dict[str, Any]:
        """
        Claude executes the current stage of work.

        Returns dict with:
        - status: "in_progress" | "complete" | "failed"
        - needs_more_info: bool
        - info_request_query: str (if needs_more_info)
        - output: str
        - artifacts: List[str]
        - error: str (if failed)
        """

        execution_prompt = f"""You are executing a multi-turn task following ChatGPT's execution plan.

ORIGINAL GOAL:
{context['goal']}

CHATGPT EXECUTION PLAN:
{json.dumps(context.get('execution_plan', {}), indent=2)}

ADDITIONAL INFORMATION (from previous turns):
{json.dumps(context.get('additional_info', []), indent=2)}

THIS IS TURN {turn_number}.

YOUR TASK:
1. Review the execution plan tasks and dependencies
2. Make progress on the current task(s)
3. Actually perform work (create files, modify code, etc.)
4. Determine if you need additional information

INFORMATION REQUEST OPTIONS:
- **web_search**: Search internet for current docs, APIs, tutorials, solutions
- **research**: Deep research on technologies or approaches
- **clarification**: Clarify requirements or ambiguities
- **examples**: Get code examples or templates
- **advice**: Get strategic guidance on approach

OUTPUT FORMAT (JSON):
{{
  "status": "in_progress|complete|failed",
  "work_performed": "Description of what you did this turn",
  "artifacts": ["list", "of", "files", "created/modified"],
  "needs_more_info": true/false,
  "info_request_type": "web_search|research|clarification|examples|advice",
  "info_request_query": "What you need (be specific for web_search)",
  "info_request_details": {{"additional": "context"}},
  "next_steps": "What you'll do next (if not complete)",
  "error": "Error message if failed"
}}

IMPORTANT:
- Follow the execution plan but adapt as needed
- Use web_search when you need current information from the internet
- If you can complete the work, set status="complete"
- If you need more info, set needs_more_info=true and specify the type
- Actually create/modify files, don't just plan
- Be specific about what information you need

Execute now and respond with JSON:"""

        # Use Claude CLI for execution
        success, output, metadata = await self.claude_cli.execute_prompt(
            execution_prompt,
            timeout=300
        )

        if not success:
            return {
                "status": "failed",
                "error": metadata.get("error", "Execution failed"),
                "needs_more_info": False,
                "full_output": output
            }

        # Parse Claude's response
        try:
            # Extract JSON
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                result = json.loads(json_str)
            else:
                raise ValueError("No JSON in output")

            # Include full output for logging
            result['full_output'] = output

            if verbose:
                print(f"  Work performed: {result.get('work_performed', 'N/A')}")
                if result.get('artifacts'):
                    print(f"  Artifacts: {', '.join(result['artifacts'])}")

            return result

        except Exception as e:
            if verbose:
                print(f"⚠️  Failed to parse execution result: {e}")

            return {
                "status": "failed",
                "error": f"Parse error: {e}",
                "needs_more_info": False
            }

    async def _ar_review_implementation(
        self,
        user_goal: str,
        execution_plan: Dict[str, Any],
        artifacts: List[str],
        verbose: bool
    ) -> Dict[str, Any]:
        """
        AR (Architect/Reviewer) reviews the implementation against the plan.
        """

        review_prompt = f"""You are the Architect/Reviewer (AR) agent reviewing an implementation.

ORIGINAL GOAL:
{user_goal}

EXECUTION PLAN:
{json.dumps(execution_plan, indent=2)}

ARTIFACTS CREATED:
{json.dumps(artifacts, indent=2)}

YOUR TASK:
Review the implementation to ensure:
1. All plan requirements were addressed
2. Code quality and best practices followed
3. Files created match the plan
4. No critical issues or gaps

OUTPUT FORMAT (JSON):
{{
  "status": "approved|approved_with_notes|needs_revision",
  "summary": "Brief summary of review findings",
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}}

Respond ONLY with the JSON, no other text."""

        # Use Claude CLI for review
        success, output, metadata = await self.claude_cli.execute_prompt(
            review_prompt,
            timeout=120
        )

        if not success:
            if verbose:
                print(f"⚠️  Review failed")
            return {
                "status": "review_failed",
                "summary": "Code review could not be completed",
                "error": metadata.get("error", "Unknown error")
            }

        # Parse review response
        try:
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                review = json.loads(json_str)
            else:
                raise ValueError("No JSON in output")

            if verbose:
                print(f"✓ Review status: {review.get('status', 'unknown')}")
                if review.get('concerns'):
                    print(f"  Concerns: {len(review['concerns'])}")

            return review

        except Exception as e:
            if verbose:
                print(f"⚠️  Failed to parse review: {e}")

            return {
                "status": "review_parse_failed",
                "summary": "Could not parse review results",
                "error": str(e)
            }

    async def _claude_generate_summary(
        self,
        execution_result: IterativeExecutionResult,
        verbose: bool
    ) -> str:
        """
        Claude generates a final summary of the work completed.
        """

        summary_prompt = f"""You completed a multi-turn collaborative task with ChatGPT.

ORIGINAL GOAL:
{execution_result.goal}

TOTAL DIALOGUE TURNS: {execution_result.total_dialogue_turns}
TOTAL TIME: {execution_result.total_time:.1f}s
STATUS: {execution_result.status}

STAGES COMPLETED:
{json.dumps([
    {
        "stage": s.stage_id,
        "type": s.stage_type,
        "status": s.status
    }
    for s in execution_result.stages
], indent=2)}

ARTIFACTS CREATED:
{json.dumps(execution_result.artifacts, indent=2)}

YOUR TASK:
Create a clear, user-friendly summary that explains:
1. What was accomplished
2. How the goal was achieved
3. What files were created/modified
4. Any important notes or next steps

Write the summary in plain language (not JSON)."""

        # Use Claude CLI for summary
        success, output, metadata = await self.claude_cli.execute_prompt(
            summary_prompt,
            timeout=120
        )

        if not success:
            return f"Summary generation failed. Goal: {execution_result.goal}. Status: {execution_result.status}."

        return output

    def clear_state(self):
        """Clear current execution state"""
        self.current_execution = None
        self.dialogue_history = []
        self.chatgpt.clear_history()


async def main():
    """Example usage of Hybrid Orchestrator V4"""

    project_root = Path(__file__).parent.parent

    # Check API key
    openai_key = os.getenv("OPENAI_API_KEY")

    if not openai_key:
        print("❌ OPENAI_API_KEY not set")
        return

    # Create orchestrator (uses Claude CLI, no Anthropic API key needed)
    orchestrator = HybridOrchestratorV4(
        project_root=project_root,
        openai_api_key=openai_key,
        gpt_model="gpt-4"
    )

    # Example goal
    user_goal = """
    Create a simple Python script in test_output/ that demonstrates
    the Fibonacci sequence. Include docstrings and comments.
    """

    # Execute with iterative dialogue
    result = await orchestrator.execute_goal_iterative(
        user_goal=user_goal,
        max_dialogue_turns=5,
        verbose=True
    )

    # Save result
    output_dir = project_root / "test_output"
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / f"iterative_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(result_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n📄 Full result saved to: {result_file}")


if __name__ == "__main__":
    asyncio.run(main())
