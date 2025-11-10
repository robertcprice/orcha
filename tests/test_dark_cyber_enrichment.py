#!/usr/bin/env python3
"""
Test Multi-AI Enrichment for Dark Cyber Brutalist Webpage
"""

import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path.cwd()))

from orchestrator.hybrid_planner import HybridPlanner

CLAUDE_PLAN = """
# Dark Cyber Brutalist Webpage Implementation Plan

## Step 1: HTML Structure
- Create semantic HTML5 with dark theme
- Meta tags for SEO
- Viewport for responsiveness

## Step 2: Brutalist CSS Styling
- Dark palette (blacks, dark greys, electric blue/purple accents)
- Monospace fonts (Courier New, Space Mono)
- Raw, sharp edges aesthetic
- Glitch effects and scan lines
- Matrix-style grid backgrounds
- High contrast, minimal animations

## Step 3: Interactive Elements
- Terminal-style input
- Glitch hover effects
- Flickering neon borders
- CRT curvature effect

## Step 4: Content Sections
- Hero with glitch title
- About with monospace text
- Brutalist project cards
- Terminal-aesthetic contact

## Step 5: JavaScript
- Typing animation
- Random glitch effects
- Matrix rain background
- Terminal simulation
"""

async def main():
    print("=" * 70)
    print("V5 MULTI-AI ENRICHMENT TEST")
    print("DARK CYBER BRUTALIST WEBPAGE")
    print("=" * 70)
    print()

    print("Testing with newest models:")
    print("  • DeepSeek R1 (reasoning)")
    print("  • Gemini 2.5 Pro")
    print("  • Grok 4")
    print("  • ChatGPT latest")
    print("  • Claude Sonnet 4.5")
    print()

    try:
        planner = HybridPlanner(verbose=True)
        print()

        result = await planner.enrich_plan(
            task_title='Dark Cyber Brutalist Webpage',
            task_description='Create a dark cyber brutalist style webpage with glitch effects, terminal aesthetics, and modern brutalist design',
            claude_plan=CLAUDE_PLAN,
            context={"style": "dark cyber brutalist", "type": "webpage"}
        )

        print()
        print("=" * 70)
        print("ENRICHMENT RESULTS")
        print("=" * 70)
        print(f"Plan ID: {result.plan_id}")
        print(f"Total Enrichments: {len(result.enrichments)}")
        print(f"Final Confidence: {result.final_confidence_score}/10")
        print(f"Risks Identified: {len(result.risks_identified)}")
        print()

        print("AI Contributions:")
        for i, enrichment in enumerate(result.enrichments, 1):
            print(f"\n{i}. {enrichment.ai_name}")
            print("   " + "="*66)
            content = enrichment.content
            if len(content) > 500:
                print(f"   {content[:500]}...")
                print(f"   ... ({len(content)} total characters)")
            else:
                print(f"   {content}")

        print()
        print("=" * 70)
        print("✅ ENRICHMENT COMPLETE!")
        print("=" * 70)
        print()
        print(f"📊 Quality Metrics:")
        print(f"   Confidence: {result.final_confidence_score}/10")
        print(f"   AI Contributors: {len(result.enrichments)}")
        print(f"   Risks: {len(result.risks_identified)}")
        print()

        if result.risks_identified:
            print("⚠️  Risks Identified:")
            for risk in result.risks_identified[:5]:
                print(f"   - {risk}")
            if len(result.risks_identified) > 5:
                print(f"   ... and {len(result.risks_identified) - 5} more")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
