#!/usr/bin/env python3
"""
Research Agent - Web research and information gathering

Performs web research using available search APIs and synthesizes findings.
"""

import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
import asyncio

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import aiohttp
except ImportError:
    aiohttp = None


@dataclass
class ResearchFinding:
    """Single research finding"""

    topic: str
    summary: str
    sources: List[Dict[str, str]]
    key_insights: List[str]
    recommendations: List[str]
    confidence: str  # high, medium, low
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ResearchReport:
    """Complete research report"""

    research_id: str
    topics: List[str]
    findings: List[ResearchFinding]
    overall_summary: str
    action_items: List[str]
    references: List[str]
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ResearchAgent:
    """
    Autonomous research agent that performs web research and synthesizes findings.
    """

    def __init__(self, openai_api_key: Optional[str] = None):

        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required")

        if OpenAI is None:
            raise ImportError("OpenAI library not installed")

        self.client = OpenAI(api_key=self.api_key)

    async def research(
        self,
        topics: List[str],
        context: Optional[str] = None,
        depth: str = "standard",  # quick, standard, deep
        verbose: bool = True
    ) -> ResearchReport:
        """
        Perform research on given topics.

        Args:
            topics: List of topics to research
            context: Additional context about why we're researching
            depth: Research depth (quick, standard, deep)
            verbose: Print progress

        Returns:
            ResearchReport with findings
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"RESEARCH AGENT - Starting Research")
            print(f"{'='*80}")
            print(f"\nTopics: {', '.join(topics)}")
            print(f"Depth: {depth}\n")

        findings = []

        for topic in topics:
            if verbose:
                print(f"🔍 Researching: {topic}")

            finding = await self._research_topic(topic, context, depth, verbose)
            findings.append(finding)

            if verbose:
                print(f"   ✓ Found {len(finding.key_insights)} insights")
                print()

        # Generate overall summary
        overall_summary = await self._generate_summary(findings, context)

        # Extract action items
        action_items = self._extract_action_items(findings)

        # Collect all references
        references = []
        for finding in findings:
            for source in finding.sources:
                if source.get("url") and source["url"] not in references:
                    references.append(source["url"])

        report = ResearchReport(
            research_id=f"research-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            topics=topics,
            findings=findings,
            overall_summary=overall_summary,
            action_items=action_items,
            references=references
        )

        if verbose:
            self._print_report(report)

        return report

    async def _research_topic(
        self,
        topic: str,
        context: Optional[str],
        depth: str,
        verbose: bool
    ) -> ResearchFinding:
        """Research a single topic"""

        # Perform web search
        search_results = await self._web_search(topic, depth)

        # Synthesize findings with ChatGPT
        synthesis = await self._synthesize_findings(
            topic,
            search_results,
            context
        )

        return ResearchFinding(
            topic=topic,
            summary=synthesis.get("summary", ""),
            sources=search_results.get("sources", []),
            key_insights=synthesis.get("key_insights", []),
            recommendations=synthesis.get("recommendations", []),
            confidence=synthesis.get("confidence", "medium")
        )

    async def _web_search(
        self,
        query: str,
        depth: str
    ) -> Dict[str, Any]:
        """Perform web search using available APIs"""

        if aiohttp is None:
            # Fallback: Use ChatGPT's knowledge
            return {
                "sources": [],
                "message": "Web search unavailable, using AI knowledge"
            }

        try:
            import urllib.parse

            # Use DuckDuckGo API
            encoded_query = urllib.parse.quote(query)
            url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1"

            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:

                    if response.status == 200:
                        data = await response.json()

                        sources = []

                        # Add abstract
                        if data.get("Abstract"):
                            sources.append({
                                "title": data.get("AbstractSource", "Source"),
                                "url": data.get("AbstractURL", ""),
                                "snippet": data.get("Abstract", "")[:300]
                            })

                        # Add related topics
                        for topic in data.get("RelatedTopics", [])[:5]:
                            if isinstance(topic, dict) and "Text" in topic:
                                sources.append({
                                    "title": topic.get("Text", "")[:100],
                                    "url": topic.get("FirstURL", ""),
                                    "snippet": topic.get("Text", "")
                                })

                        return {
                            "sources": sources,
                            "query": query
                        }

        except Exception as e:
            # Fallback to AI knowledge
            return {
                "sources": [],
                "message": f"Search unavailable: {e}",
                "fallback": True
            }

        return {"sources": []}

    async def _synthesize_findings(
        self,
        topic: str,
        search_results: Dict,
        context: Optional[str]
    ) -> Dict[str, Any]:
        """Synthesize research findings using ChatGPT"""

        context_str = f"\n\nCONTEXT: {context}" if context else ""

        prompt = f"""You are a research analyst synthesizing findings on a topic.

TOPIC: {topic}{context_str}

WEB SEARCH RESULTS:
{json.dumps(search_results, indent=2)}

YOUR TASK:
Synthesize the research findings into actionable insights.

OUTPUT FORMAT (JSON):
{{
  "summary": "Clear summary of what you learned",
  "key_insights": [
    "Insight 1 - specific and actionable",
    "Insight 2 - what's important to know",
    "Insight 3 - relevant findings"
  ],
  "recommendations": [
    "Recommendation 1 - what to do with this info",
    "Recommendation 2 - suggested actions"
  ],
  "confidence": "high|medium|low - based on source quality"
}}

Provide synthesis now:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert research analyst who synthesizes information clearly and actionably."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            return {
                "summary": f"Research on {topic}",
                "key_insights": ["Research synthesis unavailable"],
                "recommendations": [],
                "confidence": "low"
            }

    async def _generate_summary(
        self,
        findings: List[ResearchFinding],
        context: Optional[str]
    ) -> str:
        """Generate overall research summary"""

        findings_data = [
            {
                "topic": f.topic,
                "summary": f.summary,
                "insights": f.key_insights
            }
            for f in findings
        ]

        context_str = f"\n\nCONTEXT: {context}" if context else ""

        prompt = f"""Synthesize these research findings into one coherent summary.

FINDINGS:
{json.dumps(findings_data, indent=2)}{context_str}

Provide a clear, comprehensive summary (2-3 paragraphs) that:
1. Highlights the most important discoveries
2. Shows how the findings relate to each other
3. Provides actionable takeaways

Summary:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert research synthesizer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )

            return response.choices[0].message.content

        except:
            return "Research findings compiled from multiple topics."

    def _extract_action_items(
        self,
        findings: List[ResearchFinding]
    ) -> List[str]:
        """Extract action items from all findings"""

        action_items = []

        for finding in findings:
            action_items.extend(finding.recommendations)

        return action_items

    def _print_report(self, report: ResearchReport):
        """Print research report"""

        print(f"\n{'='*80}")
        print(f"RESEARCH REPORT COMPLETE")
        print(f"{'='*80}\n")

        print(f"📊 Research ID: {report.research_id}")
        print(f"🔍 Topics Researched: {len(report.topics)}")
        print(f"📝 Findings: {len(report.findings)}")
        print(f"🔗 References: {len(report.references)}\n")

        print(f"{'─'*80}")
        print("OVERALL SUMMARY")
        print(f"{'─'*80}\n")
        print(report.overall_summary)
        print()

        print(f"{'─'*80}")
        print("DETAILED FINDINGS")
        print(f"{'─'*80}\n")

        for i, finding in enumerate(report.findings, 1):
            print(f"{i}. {finding.topic}")
            print(f"   Confidence: {finding.confidence.upper()}")
            print(f"   {finding.summary}\n")

            if finding.key_insights:
                print(f"   Key Insights:")
                for insight in finding.key_insights:
                    print(f"      • {insight}")
                print()

        if report.action_items:
            print(f"{'─'*80}")
            print("ACTION ITEMS")
            print(f"{'─'*80}\n")

            for i, item in enumerate(report.action_items, 1):
                print(f"{i}. {item}")

            print()

        if report.references:
            print(f"{'─'*80}")
            print("REFERENCES")
            print(f"{'─'*80}\n")

            for ref in report.references[:10]:  # Limit to 10
                print(f"   - {ref}")

            if len(report.references) > 10:
                print(f"   ... and {len(report.references) - 10} more")

            print()

        print(f"{'='*80}\n")


async def main():
    """Test research agent"""

    agent = ResearchAgent()

    # Test research
    report = await agent.research(
        topics=[
            "JWT authentication best practices 2025",
            "PostgreSQL password hashing",
            "Email verification workflows"
        ],
        context="Building a user authentication system for a web application",
        depth="standard",
        verbose=True
    )

    # Save report
    output_file = "test_research_report.json"
    with open(output_file, 'w') as f:
        json.dump({
            "research_id": report.research_id,
            "topics": report.topics,
            "overall_summary": report.overall_summary,
            "findings": [
                {
                    "topic": f.topic,
                    "summary": f.summary,
                    "insights": f.key_insights,
                    "recommendations": f.recommendations,
                    "confidence": f.confidence,
                    "sources": f.sources
                }
                for f in report.findings
            ],
            "action_items": report.action_items,
            "references": report.references
        }, f, indent=2)

    print(f"✅ Research report saved to {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
