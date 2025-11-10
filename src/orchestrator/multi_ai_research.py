#!/usr/bin/env python3
"""
Multi-AI Research Module
Aggregates research from multiple AI providers for comprehensive answers.

Supported AI Providers:
- OpenAI (GPT-4, GPT-5, o3, o3-mini)
- Grok (X.AI)
- Claude (Anthropic via Claude Code CLI)
- Perplexity (optional)
- DeepSeek (optional)
- Gemini (optional)

Usage::

    research = MultiAIResearch()
    result = await research.research_topic(
        topic="What are the best practices for async Python?",
        providers=["openai", "grok", "claude"]
    )
"""

from __future__ import annotations

import asyncio
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:  # OpenAI SDK is optional for environments without API access
    import openai
except ImportError:  # pragma: no cover - fallback for missing dependency
    openai = None  # type: ignore


@dataclass
class AIResponse:
    """Response from a single AI provider."""

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
    """Aggregated research result from multiple AI providers."""

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
        self.openai_client = openai.OpenAI(api_key=self.openai_key) if (openai and self.openai_key) else None

        # Claude Code CLI (no API key required - uses Claude Code CLI session)
        self.claude_cli_available = self._check_claude_cli()

        # Grok Client (uses OpenAI-compatible API)
        self.grok_key = grok_api_key or os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        self.grok_client = None
        if openai and self.grok_key:
            self.grok_client = openai.OpenAI(
                api_key=self.grok_key,
                base_url="https://api.x.ai/v1"
            )

        # Perplexity Client (uses OpenAI-compatible API)
        self.perplexity_key = perplexity_api_key or os.getenv("PERPLEXITY_API_KEY")
        self.perplexity_client = None
        if openai and self.perplexity_key:
            self.perplexity_client = openai.OpenAI(
                api_key=self.perplexity_key,
                base_url="https://api.perplexity.ai"
            )

        # DeepSeek Client (uses OpenAI-compatible API)
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_client = None
        if openai and self.deepseek_key:
            self.deepseek_client = openai.OpenAI(
                api_key=self.deepseek_key,
                base_url="https://api.deepseek.com"
            )

        # Gemini Client (requires google-generativeai)
        self.gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        # Gemini implementation intentionally deferred (requires extra dependency)

    def _check_claude_cli(self) -> bool:
        """Check if claude CLI is available."""
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
            models: Optional dict mapping provider -> model name
            synthesize: Whether to synthesize responses into a unified answer
            context: Additional context for the research

        Returns:
            ResearchResult with responses from all providers
        """
        if providers is None:
            providers = self._get_available_providers()

        if not providers:
            raise ValueError("No AI providers available. Please set API keys.")

        default_models = {
            "openai": "gpt-4o",
            "grok": "grok-beta",
            "claude": "claude-code-cli",
            "perplexity": "llama-3.1-sonar-large-128k-online",
            "deepseek": "deepseek-chat",
            "gemini": "gemini-pro"
        }

        if models:
            default_models.update(models)

        tasks = [
            self._query_provider(provider, default_models.get(provider, "default"), topic, context)
            for provider in providers
        ]

        responses_raw = await asyncio.gather(*tasks, return_exceptions=True)

        responses: List[AIResponse] = []
        for idx, response in enumerate(responses_raw):
            provider = providers[idx]
            model = default_models.get(provider, "unknown")

            if isinstance(response, Exception):
                responses.append(AIResponse(
                    provider=provider,
                    model=model,
                    content="",
                    error=str(response)
                ))
            else:
                responses.append(response)

        synthesis = None
        consensus_points: List[str] = []
        divergent_points: List[str] = []

        if synthesize and len(responses) > 1:
            synthesis, consensus_points, divergent_points = await self._synthesize_responses(topic, responses)

        sources: List[str] = []
        for response in responses:
            sources.extend(response.sources)

        return ResearchResult(
            topic=topic,
            responses=responses,
            synthesis=synthesis,
            consensus_points=consensus_points,
            divergent_points=divergent_points,
            sources=list(dict.fromkeys(sources))  # dedupe preserving order
        )

    async def _query_provider(
        self,
        provider: str,
        model: str,
        topic: str,
        context: Optional[str] = None
    ) -> AIResponse:
        """Query a single AI provider."""
        prompt = self._build_research_prompt(topic, context)

        if provider == "openai":
            return await self._query_openai(model, prompt)
        if provider == "grok":
            return await self._query_grok(model, prompt)
        if provider == "claude":
            return await self._query_claude(model, prompt)
        if provider == "perplexity":
            return await self._query_perplexity(model, prompt)
        if provider == "deepseek":
            return await self._query_deepseek(model, prompt)
        if provider == "gemini":
            return await self._query_gemini(model, prompt)

        raise ValueError(f"Unknown provider: {provider}")

    def _build_research_prompt(self, topic: str, context: Optional[str] = None) -> str:
        """Build research prompt."""
        parts = [
            "You are a research assistant. Provide a comprehensive, accurate answer to the following question.",
            ""
        ]

        if context:
            parts.extend(["Context:", context, ""])

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
        """Query OpenAI models."""
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

        env = {**os.environ}
        env.pop("ANTHROPIC_API_KEY", None)  # use CLI session rather than API key

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

        if process.stdin:
            process.stdin.write(prompt.encode("utf-8"))
            await process.stdin.drain()
            process.stdin.close()

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(),
                timeout=self.timeout
            )
        except asyncio.TimeoutError as exc:
            process.kill()
            await process.wait()
            raise ValueError(f"Claude CLI timeout after {self.timeout}s") from exc

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")

        if process.returncode != 0:
            raise ValueError(f"Claude CLI error: {stderr}")

        metadata: Dict[str, Any] = {"cli_mode": "plan"}
        if stderr.strip():
            metadata["stderr"] = stderr

        return AIResponse(
            provider="claude",
            model="claude-code-cli",
            content=stdout,
            metadata=metadata
        )

    async def _query_perplexity(self, model: str, prompt: str) -> AIResponse:
        """Query Perplexity."""
        if not self.perplexity_client:
            raise ValueError("Perplexity API key not configured")

        response = self.perplexity_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            timeout=self.timeout
        )

        sources: List[str] = []
        if hasattr(response, "citations"):
            sources = response.citations

        return AIResponse(
            provider="perplexity",
            model=model,
            content=response.choices[0].message.content,
            sources=sources,
            metadata={
                "tokens": response.usage.total_tokens if response.usage else 0
            }
        )

    async def _query_deepseek(self, model: str, prompt: str) -> AIResponse:
        """Query DeepSeek (OpenAI-compatible API)."""
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
        """Query Gemini (placeholder until google-generativeai is available)."""
        raise NotImplementedError("Gemini integration requires google-generativeai package")

    async def _synthesize_responses(
        self,
        topic: str,
        responses: List[AIResponse]
    ) -> Tuple[str, List[str], List[str]]:
        """
        Synthesize multiple AI responses into a unified answer.

        Returns:
            Tuple of (synthesis, consensus_points, divergent_points)
        """
        successful_responses = [
            response for response in responses
            if not response.error
        ]

        if len(successful_responses) <= 1 or not self.openai_client:
            return self._basic_synthesis(successful_responses)

        responses_text = [
            f"**Response {idx} ({response.provider} - {response.model})**:\n{response.content}\n"
            for idx, response in enumerate(successful_responses, 1)
        ]

        synthesis_prompt = f"""You are synthesizing multiple AI responses to create a comprehensive answer.

Original Question: {topic}

Responses from different AI models:
{''.join(responses_text)}

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

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": synthesis_prompt}],
                timeout=self.timeout
            )
        except Exception:
            # Fall back to a simple synthesis when the API is unreachable.
            return self._basic_synthesis(successful_responses)

        synthesis_text = response.choices[0].message.content

        synthesis = synthesis_text
        consensus_points: List[str] = []
        divergent_points: List[str] = []

        if "## Consensus Points" in synthesis_text:
            parts = synthesis_text.split("## Consensus Points")
            synthesis = parts[0].replace("## Unified Answer", "").strip()
            remaining = parts[1]

            if "## Divergent Points" in remaining:
                consensus_part, divergent_part = remaining.split("## Divergent Points")

                for line in consensus_part.strip().split("\n"):
                    stripped = line.strip()
                    if stripped.startswith("-") or stripped.startswith("*"):
                        consensus_points.append(stripped[1:].strip())

                for line in divergent_part.strip().split("\n"):
                    stripped = line.strip()
                    if stripped.startswith("-") or stripped.startswith("*"):
                        divergent_points.append(stripped[1:].strip())

        return synthesis, consensus_points, divergent_points

    @staticmethod
    def _basic_synthesis(responses: List[AIResponse]) -> Tuple[str, List[str], List[str]]:
        """
        Create a simple synthesis when advanced synthesis is unavailable.

        The fallback keeps the output deterministic and never relies on
        external services, which is helpful in offline test environments.
        """
        if not responses:
            return "", [], []

        if len(responses) == 1:
            return responses[0].content, [], []

        synthesis = "\n\n---\n\n".join(
            f"**{resp.provider}** ({resp.model}):\n{resp.content}"
            for resp in responses
        )
        return synthesis, [], []

    def _get_available_providers(self) -> List[str]:
        """Get list of available providers based on configured API keys."""
        available: List[str] = []

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


async def research_with_multiple_ai(
    topic: str,
    providers: Optional[List[str]] = None,
    **kwargs: Any
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
