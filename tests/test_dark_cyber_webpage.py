#!/usr/bin/env python3
"""
Test V5 Orchestrator - Dark Cyber Brutalist Webpage
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5


# Claude's plan for dark cyber brutalist webpage
CLAUDE_PLAN = """
# Dark Cyber Brutalist Webpage Implementation Plan

## Overview
Create a single-page dark cyber brutalist style webpage with modern web technologies.

## Step 1: HTML Structure
- Create semantic HTML5 structure
- Include proper meta tags for SEO
- Add viewport settings for responsiveness

## Step 2: CSS Styling (Brutalist Cyber Theme)
- Dark color palette (blacks, dark greys, electric blues/purples)
- Monospace fonts (Courier New, Space Mono, or similar)
- Raw, unpolished aesthetic with sharp edges
- Glitch effects and scan lines
- Matrix-style digital rain or grid backgrounds
- High contrast text
- Minimal animations with CSS

## Step 3: Interactive Elements
- Terminal-style text input
- Glitch hover effects on buttons
- Flickering neon borders
- CRT screen curvature effect (optional)

## Step 4: Content Sections
- Hero section with glitch title
- About section with monospace text
- Projects/features grid with brutalist cards
- Contact section with terminal aesthetic

## Step 5: JavaScript Enhancements
- Typing animation for hero text
- Random glitch effects on page load
- Matrix rain background animation
- Terminal command simulation

## Technologies
- Pure HTML5, CSS3, JavaScript (no frameworks)
- CSS Grid and Flexbox for layout
- CSS custom properties for theming
- Vanilla JS for interactions

## File Structure
- index.html (main page)
- style.css (brutalist cyber styling)
- script.js (interactive effects)
- README.md (documentation)
"""


async def main():
    print("=" * 70)
    print("V5 ORCHESTRATOR TEST: DARK CYBER BRUTALIST WEBPAGE")
    print("=" * 70)
    print()

    # User goal
    goal = "Create a dark cyber brutalist style webpage with glitch effects, terminal aesthetics, and modern brutalist design"

    print(f"Goal: {goal}")
    print()
    print("Claude's Plan:")
    print(CLAUDE_PLAN)
    print()
    print("=" * 70)
    print("STARTING V5 WORKFLOW")
    print("=" * 70)
    print()

    try:
        # Initialize V5 orchestrator
        orchestrator = HybridOrchestratorV5(
            project_root=PROJECT_ROOT,
            verbose=True
        )

        # Execute goal
        print("📝 Phase 1: Multi-AI Planning Enrichment")
        print("   → Claude → Best Practices → ChatGPT → DeepSeek R1 → Grok 4 → Gemini 2.5")
        print()

        result = await orchestrator.execute_goal(
            user_goal=goal,
            claude_plan=CLAUDE_PLAN,
            context={"style": "dark cyber brutalist", "type": "webpage"}
        )

        # Print results
        print()
        print("=" * 70)
        print("V5 WORKFLOW RESULTS")
        print("=" * 70)
        print(f"✅ Success: {result.success}")
        print(f"📊 Quality Score: {result.review.quality_score}/10")
        print(f"✓ Approved: {result.review.approved}")
        print(f"📁 Files Created: {len(result.implementation.files_created)}")
        print(f"🧪 Tests Created: {len(result.implementation.tests_created)}")
        print(f"🔄 Iterations: {result.total_iterations}")
        print(f"⏱️  Execution Time: {result.total_execution_time:.2f}s")
        print()
        print("Files Created:")
        for file_path in result.implementation.files_created:
            print(f"  - {file_path}")
        print()

        if result.implementation.tests_created:
            print("Tests Created:")
            for test_path in result.implementation.tests_created:
                print(f"  - {test_path}")
            print()

        print("Cost Breakdown:")
        for agent, cost in result.cost_breakdown.items():
            print(f"  - {agent}: ${cost:.3f}")
        print(f"  TOTAL: ${result.cost_breakdown.get('total', 0.0):.3f}")
        print()

        if result.documentation:
            print("Documentation Generated:")
            print(result.documentation[:500] + "..." if len(result.documentation) > 500 else result.documentation)
            print()

        print("=" * 70)
        if result.success:
            print("✅ DARK CYBER BRUTALIST WEBPAGE CREATED SUCCESSFULLY!")
        else:
            print("❌ WORKFLOW FAILED")
        print("=" * 70)

        return 0 if result.success else 1

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
