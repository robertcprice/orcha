#!/usr/bin/env python3
"""
Example: Twitter-like Social Media Platform Orchestration

Demonstrates the complete enhanced orchestration flow:
1. User submits request: "Build a Twitter-like social media platform"
2. PlanningLayer analyzes and creates architectural plan
3. ChatGPT receives detailed plan and returns hyper-specific tasks
4. Manager agents group related tasks (Database, Frontend, Backend, etc.)
5. Manager agents assign 1-2 Claude agents per specific function
6. Claude agents execute actual implementation
7. Results validated and reported

This example shows how the orchestration system handles a complex web application
request with extreme specificity at every level.

Author: AlgoMind Orchestration System
Date: 2025-10-11
"""

import asyncio
import sys
import os
from pathlib import Path

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent / "orchestrator"))

from enhanced_orchestrator import EnhancedOrchestrator


async def main():
    """
    Example: User requests Twitter-like social media platform
    """

    print("="*80)
    print("ORCHESTRATION EXAMPLE: Twitter-like Social Media Platform")
    print("="*80)
    print()
    print("This example demonstrates the complete orchestration flow:")
    print("  1. Architectural Planning (PlanningLayer)")
    print("  2. Task Decomposition (ChatGPT with hyper-specific prompts)")
    print("  3. Manager Agent Assignment (Domain-specific grouping)")
    print("  4. Claude Agent Execution (1-2 agents per function)")
    print("  5. Validation and Reporting")
    print()
    print("="*80)
    print()

    # User's request
    task = {
        "title": "Twitter-like Social Media Platform",
        "description": """
Build a web application similar to Twitter where users can:

- Create an account and login
- Post short messages (up to 280 characters)
- View a feed of posts from users they follow
- Like and comment on posts
- Follow and unfollow other users
- View user profiles with their posts and followers
- Receive real-time notifications

The application should be production-ready with:
- Responsive design (mobile, tablet, desktop)
- Secure authentication
- Fast performance
- Comprehensive testing
        """,
        "context": {
            "tech_stack": "React, TypeScript, Node.js, Express, PostgreSQL",
            "requirements": [
                "RESTful API design",
                "JWT authentication",
                "Real-time updates with WebSockets",
                "Responsive UI with Tailwind CSS",
                "Test coverage > 80%"
            ]
        },
        "config": {
            "max_agent_depth": 3,
            "timeout_minutes": 120  # 2 hours for complex task
        }
    }

    print("USER REQUEST:")
    print(f"Title: {task['title']}")
    print(f"\nDescription: {task['description']}")
    print(f"\nTech Stack: {task['context']['tech_stack']}")
    print()
    print("="*80)
    print()

    # Create orchestrator
    try:
        orchestrator = EnhancedOrchestrator(
            task_id="twitter-example-001",
            title=task["title"],
            description=task["description"],
            context=task["context"],
            config=task["config"]
        )

        print("STARTING ORCHESTRATION...")
        print()
        print("EXPECTED FLOW:")
        print()
        print("Phase 0: Architectural Planning")
        print("  → PlanningLayer analyzes request")
        print("  → Identifies components: Frontend, Backend, Database, Auth, Testing, Docs")
        print("  → Generates specific requirements for each component")
        print()
        print("Phase 1: Task Decomposition")
        print("  → ChatGPT receives architectural plan")
        print("  → Returns hyper-specific tasks like:")
        print("    • Database: 'Create Posts table with exact schema: id UUID, user_id UUID...'")
        print("    • API: 'Implement POST /api/posts with validation: content 1-280 chars...'")
        print("    • Frontend: 'Create PostCard.tsx with props: { post: { id, content, ... }}'")
        print()
        print("Phase 2: Manager Agent Assignment")
        print("  → DatabaseManager groups all database tasks")
        print("  → FrontendManager groups all UI tasks")
        print("  → BackendManager groups all API tasks")
        print("  → InfrastructureManager groups deployment tasks")
        print("  → Each manager assigns 1-2 Claude agents per function")
        print()
        print("Phase 3: Claude Agent Execution")
        print("  → Agents receive hyper-specific prompts")
        print("  → Agents implement exact specifications")
        print("  → No ambiguity - everything is precisely defined")
        print()
        print("Phase 4: Validation")
        print("  → ChatGPT validates completed work")
        print("  → Checks against success criteria")
        print("  → Provides feedback and suggestions")
        print()
        print("="*80)
        print()

        # Execute orchestration
        result = await orchestrator.execute(verbose=True)

        # Print summary
        print()
        print("="*80)
        print("ORCHESTRATION COMPLETE")
        print("="*80)
        print()
        print(f"Status: {result.overall_status}")
        print(f"Execution Time: {result.total_execution_time:.1f}s ({result.total_execution_time/60:.1f} minutes)")
        print()

        # Show architectural plan components
        if result.architectural_plan:
            print("ARCHITECTURAL PLAN:")
            print(f"  Components Identified: {len(result.architectural_plan.components)}")
            for comp in result.architectural_plan.components:
                print(f"    • {comp.component_type.value}: {comp.name}")
            print()

        # Show decomposition
        if result.decomposition:
            print("TASK DECOMPOSITION:")
            print(f"  Main Tasks: {len(result.decomposition.main_tasks)}")
            for task in result.decomposition.main_tasks:
                print(f"    • {task.title} ({len(task.subtasks)} subtasks)")
            print()

        # Show execution results
        print("EXECUTION RESULTS:")
        print(f"  Main Tasks Completed: {len([r for r in result.main_task_results if r.status == 'completed'])}/{len(result.main_task_results)}")

        total_subtasks = sum(len(r.subtask_results) for r in result.main_task_results)
        completed_subtasks = sum(
            len([s for s in r.subtask_results if s.status == 'completed'])
            for r in result.main_task_results
        )
        print(f"  Subtasks Completed: {completed_subtasks}/{total_subtasks}")
        print(f"  Artifacts Created: {len(result.all_artifacts)}")
        print()

        # Show validation
        if result.final_validation:
            print("VALIDATION:")
            print(f"  Status: {result.final_validation.status}")
            print(f"  Alignment Score: {result.final_validation.alignment_score:.1%}")
            print(f"  Assessment: {result.final_validation.overall_assessment}")
            print()

        print("="*80)
        print()
        print("KEY TAKEAWAYS:")
        print()
        print("1. PLANNING LAYER provides structured analysis before ChatGPT")
        print("   → Identifies all necessary components")
        print("   → Defines technical constraints and success criteria")
        print()
        print("2. HYPER-SPECIFIC PROMPTS ensure ChatGPT returns detailed tasks")
        print("   → Exact database schemas (column names, types, constraints)")
        print("   → Exact API specifications (endpoints, validation, errors)")
        print("   → Exact component structures (props, state, styling)")
        print()
        print("3. MANAGER AGENTS organize execution efficiently")
        print("   → Group related tasks by domain (database, frontend, backend)")
        print("   → Assign 1-2 Claude agents per specific function")
        print("   → Parallel execution where possible")
        print()
        print("4. CLAUDE AGENTS execute with precision")
        print("   → No ambiguity in requirements")
        print("   → Complete specifications provided")
        print("   → Results validated automatically")
        print()
        print("="*80)

        return result

    except ValueError as e:
        print(f"\n❌ ERROR: {e}")
        print()
        print("This example requires OPENAI_API_KEY to be set.")
        print("Export your API key: export OPENAI_API_KEY='your-key-here'")
        print()
        return None

    except Exception as e:
        print(f"\n❌ ORCHESTRATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None


def show_twitter_breakdown():
    """
    Show detailed breakdown of how Twitter example would be orchestrated.

    This demonstrates the expected output at each stage WITHOUT actually running
    the full orchestration (useful for testing without API costs).
    """

    print("="*80)
    print("TWITTER EXAMPLE - EXPECTED ORCHESTRATION BREAKDOWN")
    print("="*80)
    print()

    print("PHASE 0: ARCHITECTURAL PLANNING")
    print("-" * 80)
    print()
    print("PlanningLayer analyzes 'Twitter-like Social Media Platform' and identifies:")
    print()
    print("1. FRONTEND Component:")
    print("   - React 18+ with TypeScript")
    print("   - Components: PostFeed, PostCard, CreatePost, UserProfile, FollowButton")
    print("   - State management (Redux/Context)")
    print("   - Routing (React Router)")
    print()
    print("2. BACKEND Component:")
    print("   - Node.js with Express/Fastify")
    print("   - API Endpoints:")
    print("     • POST /api/posts - Create post")
    print("     • GET /api/posts - Get feed")
    print("     • POST /api/posts/:id/like - Like post")
    print("     • POST /api/users/:id/follow - Follow user")
    print()
    print("3. DATABASE Component:")
    print("   - PostgreSQL 14+")
    print("   - Tables:")
    print("     • users (id, username, email, bio, avatar_url, created_at)")
    print("     • posts (id, user_id, content, created_at, likes_count)")
    print("     • followers (id, follower_id, following_id, created_at)")
    print("     • likes (id, user_id, post_id, created_at)")
    print()
    print("4. AUTHENTICATION Component:")
    print("   - JWT token generation")
    print("   - POST /api/auth/register")
    print("   - POST /api/auth/login")
    print("   - Password hashing (bcrypt)")
    print()
    print("5. REAL-TIME Component:")
    print("   - WebSocket server (Socket.io)")
    print("   - Real-time notifications")
    print("   - Live feed updates")
    print()
    print("6. TESTING Component:")
    print("   - Unit tests (Jest)")
    print("   - Integration tests")
    print("   - E2E tests (Playwright)")
    print()

    print()
    print("PHASE 1: TASK DECOMPOSITION (ChatGPT with Architectural Plan)")
    print("-" * 80)
    print()
    print("ChatGPT receives architectural plan and returns HYPER-SPECIFIC tasks:")
    print()
    print("MAIN TASK 1: Database Schema Implementation")
    print("  Subtask 1.1: Create Users table")
    print("    → HYPER-SPECIFIC: 'CREATE TABLE users (")
    print("         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
    print("         username VARCHAR(50) NOT NULL UNIQUE,")
    print("         email VARCHAR(255) NOT NULL UNIQUE,")
    print("         password_hash VARCHAR(255) NOT NULL,")
    print("         bio TEXT DEFAULT '',")
    print("         avatar_url VARCHAR(500),")
    print("         created_at TIMESTAMP NOT NULL DEFAULT NOW()")
    print("       );")
    print("       CREATE INDEX idx_users_username ON users(username);'")
    print()
    print("  Subtask 1.2: Create Posts table")
    print("    → HYPER-SPECIFIC: 'CREATE TABLE posts (")
    print("         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
    print("         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,")
    print("         content VARCHAR(280) NOT NULL CHECK (char_length(content) > 0),")
    print("         created_at TIMESTAMP NOT NULL DEFAULT NOW(),")
    print("         likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0)")
    print("       );")
    print("       CREATE INDEX idx_posts_user_id ON posts(user_id);")
    print("       CREATE INDEX idx_posts_created_at ON posts(created_at DESC);'")
    print()
    print("MAIN TASK 2: Authentication API")
    print("  Subtask 2.1: Implement POST /api/auth/register")
    print("    → HYPER-SPECIFIC: 'Implement registration endpoint:")
    print("         - Request: { username: string, email: string, password: string }")
    print("         - Validation: username 3-50 chars, email valid format, password 8+ chars")
    print("         - Hash password: bcrypt.hash(password, 10)")
    print("         - Insert: INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)")
    print("         - Response: 201 with { id, username, email, created_at }")
    print("         - Errors: 400 for validation, 409 for duplicate username/email'")
    print()
    print("MAIN TASK 3: Posts API")
    print("  Subtask 3.1: Implement POST /api/posts")
    print("    → HYPER-SPECIFIC: 'Implement create post endpoint:")
    print("         - Auth: Require JWT in Authorization header")
    print("         - Request: { content: string }")
    print("         - Validation: content 1-280 chars, trim whitespace")
    print("         - Insert: INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *")
    print("         - Response: 201 with full post object")
    print("         - Errors: 400 if invalid, 401 if not authenticated'")
    print()
    print("MAIN TASK 4: Frontend Components")
    print("  Subtask 4.1: Create PostCard.tsx component")
    print("    → HYPER-SPECIFIC: 'Create PostCard React component:")
    print("         - Props: { post: { id: string, user_id: string, username: string,")
    print("                    content: string, created_at: string, likes_count: number,")
    print("                    is_liked: boolean }, onLike: (id: string) => void }")
    print("         - Layout: User avatar (40x40), username (bold), timestamp (gray),")
    print("                   content (word-wrap), like button with count")
    print("         - Styling: Tailwind classes - 'flex gap-3 p-4 border-b hover:bg-gray-50'")
    print("         - State: Optimistic like updates (toggle is_liked, update count)")
    print("         - Export: export default PostCard;'")
    print()

    print()
    print("PHASE 2: MANAGER AGENT ASSIGNMENT")
    print("-" * 80)
    print()
    print("DatabaseManager receives subtasks 1.1, 1.2 and:")
    print("  → Groups: 'Table Creation' (users, posts, followers, likes)")
    print("  → Assigns: 2 Claude agents (parallel execution)")
    print("    - Agent 1: Users + Followers tables")
    print("    - Agent 2: Posts + Likes tables")
    print()
    print("BackendManager receives subtasks 2.1, 3.1 and:")
    print("  → Groups: 'Authentication' (register, login) + 'Posts API' (create, get)")
    print("  → Assigns: 2 Claude agents")
    print("    - Agent 1: Authentication endpoints")
    print("    - Agent 2: Posts endpoints")
    print()
    print("FrontendManager receives subtask 4.1 and:")
    print("  → Groups: 'Core Components' (PostCard, PostFeed, CreatePost)")
    print("  → Assigns: 1 Claude agent (all related)")
    print()

    print()
    print("PHASE 3: CLAUDE AGENT EXECUTION")
    print("-" * 80)
    print()
    print("Each Claude agent receives combined prompt with all its grouped tasks.")
    print("Example for DatabaseManager Agent 1:")
    print()
    print("  'You are a coding agent working on: Table Creation (Part 1)")
    print()
    print("   You have been assigned 2 related tasks to complete:")
    print()
    print("   TASK 1: Create Users table")
    print("   [Full hyper-specific description with exact SQL...]")
    print()
    print("   TASK 2: Create Followers table")
    print("   [Full hyper-specific description with exact SQL...]")
    print()
    print("   Complete both tasks in order and verify they work correctly.'")
    print()
    print("Agent executes, creates files, tests, reports completion.")
    print()

    print()
    print("="*80)
    print()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--breakdown":
        # Show breakdown without running
        show_twitter_breakdown()
    else:
        # Run full orchestration
        print()
        print("NOTE: This will use OpenAI API (costs money).")
        print("To see the expected flow without running, use: python example_twitter_orchestration.py --breakdown")
        print()
        input("Press Enter to continue or Ctrl+C to cancel...")
        print()

        result = asyncio.run(main())

        if result:
            print("\n✅ Example completed successfully!")
        else:
            print("\n❌ Example failed. See errors above.")
