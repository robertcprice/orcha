#!/usr/bin/env python3
"""
Multi-AI Research Module
Aggregates research from multiple AI providers for comprehensive answers.

Supported AI Providers:
- OpenAI (GPT-4, GPT-5, o3, o3-mini)
- Grok (X.AI)
- Claude (Anthropic)
- Perplexity (optional)
- Gemini (Google, optional)

Usage:
    research = MultiAIResearch()
    result = await research.research_topic(
        topic="What are the best practices for async Python?",
        providers=["openai", "grok", "claude"]
    )
"""

import os
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import openai


@dataclass
class AIResponse:
    """Response from a single AI provider"""
    provider: str
    model: str
    content: str
    confidence: Optional[float] = None
    sources: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ResearchResult:
    """Aggregated research result from multiple AI providers"""
    topic: str
    responses: List[AIResponse]
    synthesis: Optional[str] = None
    consensus_points: List[str] = field(default_factory=list)
    divergent_points: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MultiAIResearch:
    """
    Orchestrates research across multiple AI providers.

    Provides:
    - Parallel querying of multiple AI models
    - Response aggregation and synthesis
    - Consensus and divergence analysis
    - Source compilation
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        grok_api_key: Optional[str] = None,
        perplexity_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        project_root: Optional[Path] = None,
        timeout: float = 60.0
    ):
        """
        Initialize Multi-AI Research.

        Args:
            openai_api_key: OpenAI API key
            grok_api_key: X.AI Grok API key
            perplexity_api_key: Perplexity API key (optional)
            gemini_api_key: Google Gemini API key (optional)
            project_root: Project root for Claude Code CLI (optional)
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.project_root = project_root or Path.cwd()

        # OpenAI Client
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.openai_client = openai.OpenAI(api_key=self.openai_key) if self.openai_key else None

        # Claude Code CLI (no API key required - uses Claude Code CLI session)
        # Check if claude command is available
        self.claude_cli_available = self._check_claude_cli()

        # Grok Client (uses OpenAI-compatible API)
        self.grok_key = grok_api_key or os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        self.grok_client = None
        if self.grok_key:
            self.grok_client = openai.OpenAI(
                api_key=self.grok_key,
                base_url="https://api.x.ai/v1"
            )

        # Perplexity Client (uses OpenAI-compatible API)
        self.perplexity_key = perplexity_api_key or os.getenv("PERPLEXITY_API_KEY")
        self.perplexity_client = None
        if self.perplexity_key:
            self.perplexity_client = openai.OpenAI(
                api_key=self.perplexity_key,
                base_url="https://api.perplexity.ai"
            )

        # DeepSeek Client (uses OpenAI-compatible API)
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_client = None
        if self.deepseek_key:
            self.deepseek_client = openai.OpenAI(
                api_key=self.deepseek_key,
                base_url="https://api.deepseek.com"
            )

        # Gemini Client (would need google-generativeai package)
        self.gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        # Note: Gemini requires google-generativeai package
        # Uncomment if you add the dependency:
        # if self.gemini_key:
        #     import google.generativeai as genai
        #     genai.configure(api_key=self.gemini_key)
        #     self.gemini_client = genai

    def _check_claude_cli(self) -> bool:
        """Check if claude CLI is available."""
        import shutil
        return shutil.which("claude") is not None

    async def research_topic(
        self,
        topic: str,
        providers: Optional[List[str]] = None,
        models: Optional[Dict[str, str]] = None,
        synthesize: bool = True,
        context: Optional[str] = None
    ) -> ResearchResult:
        """
        Research a topic across multiple AI providers.

        Args:
            topic: Research question or topic
            providers: List of providers to use (default: all available)
                      Options: "openai", "grok", "claude", "perplexity", "gemini"
            models: Optional dict mapping provider -> model name
                   e.g., {"openai": "gpt-4o", "grok": "grok-beta"}
            synthesize: Whether to synthesize responses into a unified answer
            context: Additional context for the research

        Returns:
            ResearchResult with responses from all providers
        """

        # Default providers: all available
        if providers is None:
            providers = self._get_available_providers()

        if not providers:
            raise ValueError("No AI providers available. Please set API keys.")

        print(f"🔍 Researching: {topic}")
        print(f"📡 Querying {len(providers)} AI provider(s): {', '.join(providers)}")

        # Default models
        default_models = {
            "openai": "gpt-4o",
            "grok": "grok-beta",
            "claude": "claude-code-cli",
            "perplexity": "llama-3.1-sonar-large-128k-online",
            "deepseek": "deepseek-chat",
            "gemini": "gemini-pro"
        }

        # Override with user-specified models
        if models:
            default_models.update(models)

        # Create tasks for parallel execution
        tasks = []
        for provider in providers:
            model = default_models.get(provider, "default")
            tasks.append(self._query_provider(provider, model, topic, context))

        # Execute all queries in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and convert to AIResponse objects
        valid_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                provider = providers[i]
                print(f"  ❌ {provider}: {str(response)}")
                valid_responses.append(AIResponse(
                    provider=provider,
                    model=default_models.get(provider, "unknown"),
                    content="",
                    error=str(response)
                ))
            else:
                valid_responses.append(response)
                print(f"  ✅ {response.provider}: {len(response.content)} chars")

        # Synthesize if requested
        synthesis = None
        consensus_points = []
        divergent_points = []

        if synthesize and len(valid_responses) > 1:
            print(f"🧠 Synthesizing responses...")
            synthesis, consensus_points, divergent_points = await self._synthesize_responses(
                topic, valid_responses
            )

        # Collect all sources
        all_sources = []
        for response in valid_responses:
            all_sources.extend(response.sources)

        return ResearchResult(
            topic=topic,
            responses=valid_responses,
            synthesis=synthesis,
            consensus_points=consensus_points,
            divergent_points=divergent_points,
            sources=list(set(all_sources))  # Deduplicate
        )

    async def _query_provider(
        self,
        provider: str,
        model: str,
        topic: str,
        context: Optional[str] = None
    ) -> AIResponse:
        """Query a single AI provider."""

        # Build prompt
        prompt = self._build_research_prompt(topic, context)

        try:
            if provider == "openai":
                return await self._query_openai(model, prompt)
            elif provider == "grok":
                return await self._query_grok(model, prompt)
            elif provider == "claude":
                return await self._query_claude(model, prompt)
            elif provider == "perplexity":
                return await self._query_perplexity(model, prompt)
            elif provider == "deepseek":
                return await self._query_deepseek(model, prompt)
            elif provider == "gemini":
                return await self._query_gemini(model, prompt)
            else:
                raise ValueError(f"Unknown provider: {provider}")

        except Exception as e:
            return AIResponse(
                provider=provider,
                model=model,
                content="",
                error=str(e)
            )

    def _build_research_prompt(self, topic: str, context: Optional[str] = None) -> str:
        """Build research prompt."""

        parts = [
            "You are a research assistant. Provide a comprehensive, accurate answer to the following question.",
            ""
        ]

        if context:
            parts.extend([
                "Context:",
                context,
                ""
            ])

        parts.extend([
            "Question:",
            topic,
            "",
            "Provide:",
            "1. A clear, comprehensive answer",
            "2. Key points and insights",
            "3. Relevant examples or best practices",
            "4. Any important caveats or considerations",
            "",
            "If you reference specific sources or facts, please mention them."
        ])

        return "\n".join(parts)

    async def _query_openai(self, model: str, prompt: str) -> AIResponse:
        """Query OpenAI."""

        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")

        response = self.openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=self.timeout
        )

        return AIResponse(
            provider="openai",
            model=model,
            content=response.choices[0].message.content,
            metadata={
                "tokens": response.usage.total_tokens if response.usage else 0
            }
        )

    async def _query_grok(self, model: str, prompt: str) -> AIResponse:
        """Query Grok (X.AI)."""

        if not self.grok_client:
            raise ValueError("Grok API key not configured")

        response = self.grok_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=self.timeout
        )

        return AIResponse(
            provider="grok",
            model=model,
            content=response.choices[0].message.content,
            metadata={
                "tokens": response.usage.total_tokens if response.usage else 0
            }
        )

    async def _query_claude(self, model: str, prompt: str) -> AIResponse:
        """Query Claude using Claude Code CLI (plan mode)."""

        if not self.claude_cli_available:
            raise ValueError("Claude CLI not available. Install with: npm install -g @anthropic-ai/claude-code")

        try:
            # Use Claude Code CLI in plan mode for research
            # The --print flag outputs the response
            # --dangerously-skip-permissions skips permission prompts
            env = {**os.environ}
            env.pop('ANTHROPIC_API_KEY', None)  # Don't use API key, use CLI session

            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--dangerously-skip-permissions",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
                env=env
            )

            # Write prompt to stdin
            if process.stdin:
                process.stdin.write(prompt.encode('utf-8'))
                process.stdin.close()

            # Read output with timeout
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise ValueError(f"Claude CLI timeout after {self.timeout}s")

            stdout = stdout_bytes.decode('utf-8', errors='replace')
            stderr = stderr_bytes.decode('utf-8', errors='replace')

            if process.returncode != 0:
                raise ValueError(f"Claude CLI error: {stderr}")

            return AIResponse(
                provider="claude",
                model="claude-code-cli",  # Using CLI, not specific model
                content=stdout,
                metadata={
                    "cli_mode": "plan",
                    "stderr": stderr if stderr.strip() else None
                }
            )

        except Exception as e:
            raise ValueError(f"Claude CLI execution failed: {str(e)}")

    async def _query_perplexity(self, model: str, prompt: str) -> AIResponse:
        """Query Perplexity."""

        if not self.perplexity_client:
            raise ValueError("Perplexity API key not configured")

        response = self.perplexity_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=self.timeout
        )

        # Perplexity includes citations
        content = response.choices[0].message.content
        sources = []

        # Extract citations if present
        if hasattr(response, 'citations'):
            sources = response.citations

        return AIResponse(
            provider="perplexity",
            model=model,
            content=content,
            sources=sources,
            metadata={
                "tokens": response.usage.total_tokens if response.usage else 0
            }
        )

    async def _query_deepseek(self, model: str, prompt: str) -> AIResponse:
        """Query DeepSeek."""

        if not self.deepseek_client:
            raise ValueError("DeepSeek API key not configured")

        response = self.deepseek_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=self.timeout
        )

        return AIResponse(
            provider="deepseek",
            model=model,
            content=response.choices[0].message.content,
            metadata={
                "tokens": response.usage.total_tokens if response.usage else 0
            }
        )

    async def _query_gemini(self, model: str, prompt: str) -> AIResponse:
        """Query Gemini (Google)."""

        if not self.gemini_client:
            raise ValueError("Gemini API key not configured or google-generativeai not installed")

        # This would require google-generativeai package
        # Placeholder implementation:
        raise NotImplementedError("Gemini integration requires google-generativeai package")

    async def _synthesize_responses(
        self,
        topic: str,
        responses: List[AIResponse]
    ) -> tuple[str, List[str], List[str]]:
        """
        Synthesize multiple AI responses into a unified answer.

        Returns:
            Tuple of (synthesis, consensus_points, divergent_points)
        """

        # Use OpenAI to synthesize (or whichever provider is available)
        if not self.openai_client:
            # Return simple concatenation if no synthesis available
            synthesis = "\n\n---\n\n".join([
                f"**{r.provider}**: {r.content}"
                for r in responses if not r.error
            ])
            return synthesis, [], []

        # Build synthesis prompt
        responses_text = []
        for i, response in enumerate(responses, 1):
            if response.error:
                continue
            responses_text.append(f"""
**Response {i} ({response.provider} - {response.model})**:
{response.content}
""")

        synthesis_prompt = f"""You are synthesizing multiple AI responses to create a comprehensive answer.

Original Question: {topic}

Responses from different AI models:
{"".join(responses_text)}

Task:
1. Create a unified, comprehensive answer that combines insights from all responses
2. Identify key points where the responses agree (consensus points)
3. Identify areas where responses differ or provide unique insights (divergent points)

Output format:
## Unified Answer
[Your synthesized answer here]

## Consensus Points
- Point 1
- Point 2

## Divergent Points
- Different perspective 1
- Different perspective 2
"""

        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": synthesis_prompt}],
            timeout=self.timeout
        )

        synthesis_text = response.choices[0].message.content

        # Parse out sections
        synthesis = synthesis_text
        consensus_points = []
        divergent_points = []

        # Simple parsing (could be improved with structured output)
        if "## Consensus Points" in synthesis_text:
            parts = synthesis_text.split("## Consensus Points")
            synthesis = parts[0].replace("## Unified Answer", "").strip()

            remaining = parts[1]
            if "## Divergent Points" in remaining:
                consensus_part, divergent_part = remaining.split("## Divergent Points")

                # Extract bullet points
                for line in consensus_part.strip().split("\n"):
                    line = line.strip()
                    if line.startswith("-") or line.startswith("*"):
                        consensus_points.append(line[1:].strip())

                for line in divergent_part.strip().split("\n"):
                    line = line.strip()
                    if line.startswith("-") or line.startswith("*"):
                        divergent_points.append(line[1:].strip())

        return synthesis, consensus_points, divergent_points

    def _get_available_providers(self) -> List[str]:
        """Get list of available providers based on configured API keys."""

        available = []

        if self.openai_client:
            available.append("openai")
        if self.grok_client:
            available.append("grok")
        if self.claude_cli_available:
            available.append("claude")
        if self.deepseek_client:
            available.append("deepseek")
        if self.perplexity_client:
            available.append("perplexity")
        if self.gemini_client:
            available.append("gemini")

        return available

    def get_provider_status(self) -> Dict[str, bool]:
        """Get status of all AI providers."""

        return {
            "openai": self.openai_client is not None,
            "grok": self.grok_client is not None,
            "claude": self.claude_cli_available,
            "deepseek": self.deepseek_client is not None,
            "perplexity": self.perplexity_client is not None,
            "gemini": self.gemini_client is not None
        }


# Convenience function
async def research_with_multiple_ai(
    topic: str,
    providers: Optional[List[str]] = None,
    **kwargs
) -> ResearchResult:
    """
    Convenience function to research a topic with multiple AI providers.

    Args:
        topic: Research question
        providers: List of providers to use (default: all available)
        **kwargs: Additional arguments for MultiAIResearch

    Returns:
        ResearchResult
    """
    research = MultiAIResearch(**kwargs)
    return await research.research_topic(topic, providers=providers)
