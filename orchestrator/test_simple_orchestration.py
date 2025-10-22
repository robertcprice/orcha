#!/usr/bin/env python3
"""
Simple test script to debug orchestration issues
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from .env
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded .env from {env_path}\n")
else:
    print(f"⚠️  No .env file found at {env_path}\n")

def check_environment():
    """Check if all required environment variables are set"""
    print("=" * 80)
    print("ENVIRONMENT CHECK")
    print("=" * 80)

    required_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0")
    }

    all_set = True
    for var, value in required_vars.items():
        if value:
            masked = value[:8] + "***" if len(value) > 8 else "***"
            print(f"✅ {var}: {masked}")
        else:
            print(f"❌ {var}: NOT SET")
            all_set = False

    print()
    return all_set

def check_packages():
    """Check if required packages are installed"""
    print("=" * 80)
    print("PACKAGE CHECK")
    print("=" * 80)

    packages = {
        "openai": None,
        "anthropic": None,
        "redis": None
    }

    all_installed = True
    for pkg in packages:
        try:
            mod = __import__(pkg)
            version = getattr(mod, "__version__", "unknown")
            print(f"✅ {pkg}: {version}")
            packages[pkg] = version
        except ImportError:
            print(f"❌ {pkg}: NOT INSTALLED")
            all_installed = False

    print()
    return all_installed, packages

def check_redis():
    """Check Redis connectivity"""
    print("=" * 80)
    print("REDIS CHECK")
    print("=" * 80)

    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
        print(f"✅ Redis connected: {redis_url}")

        # Check for any existing tasks
        keys = r.keys("algomind.*")
        print(f"   Found {len(keys)} existing keys in Redis")
        print()
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print()
        return False

async def test_chatgpt_planner():
    """Test ChatGPT planner"""
    print("=" * 80)
    print("CHATGPT PLANNER TEST")
    print("=" * 80)

    try:
        from orchestrator.chatgpt_planner import ChatGPTPlanner

        planner = ChatGPTPlanner()
        print("✅ ChatGPT planner initialized")

        # Test a simple plan
        print("   Testing plan creation...")
        plan = await planner.create_plan(
            user_goal="Create a simple test file in test_output/ with 'Hello World'",
            context={"test": True}
        )

        print(f"   Plan ID: {plan.plan_id}")
        print(f"   Goal: {plan.goal}")
        print(f"   Tasks: {len(plan.tasks)}")
        print(f"   ✅ Plan created successfully")
        print()
        return True

    except Exception as e:
        print(f"❌ ChatGPT planner test failed: {e}")
        import traceback
        traceback.print_exc()
        print()
        return False

async def test_agent_sdk():
    """Test Agent SDK Manager"""
    print("=" * 80)
    print("AGENT SDK TEST")
    print("=" * 80)

    try:
        from orchestrator.agent_sdk_manager import AgentSDKManager, AgentConfig, AgentTask

        manager = AgentSDKManager(project_root, max_concurrent=1)
        print("✅ AgentSDKManager initialized")

        # Create a simple config
        config = AgentConfig(
            role="TEST",
            system_prompt="You are a test agent. Complete tasks concisely.",
            tools_enabled=["read_file", "write_file"]
        )

        print("   ✅ Agent config created")
        print()
        return True

    except Exception as e:
        print(f"❌ Agent SDK test failed: {e}")
        import traceback
        traceback.print_exc()
        print()
        return False

async def test_hybrid_orchestrator():
    """Test Hybrid Orchestrator V4"""
    print("=" * 80)
    print("HYBRID ORCHESTRATOR V4 TEST")
    print("=" * 80)

    try:
        from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4

        orchestrator = HybridOrchestratorV4(
            project_root=project_root,
            gpt_model="gpt-4"
        )
        print("✅ HybridOrchestratorV4 initialized")
        print()
        return True

    except Exception as e:
        print(f"❌ Hybrid orchestrator test failed: {e}")
        import traceback
        traceback.print_exc()
        print()
        return False

async def main():
    """Run all diagnostic tests"""
    print("\n🔍 ORCHESTRATION DIAGNOSTIC TEST\n")

    # Step 1: Environment
    env_ok = check_environment()
    if not env_ok:
        print("⚠️  Some environment variables are missing. Set them in .env or export them.")
        print("   You can continue, but orchestration may fail.\n")

    # Step 2: Packages
    pkg_ok, packages = check_packages()
    if not pkg_ok:
        print("❌ Some required packages are missing. Install with:")
        print("   pip install openai anthropic redis\n")
        return

    # Step 3: Redis
    redis_ok = check_redis()
    if not redis_ok:
        print("⚠️  Redis is not running. Start with: brew services start redis\n")

    # Step 4: ChatGPT Planner
    chatgpt_ok = await test_chatgpt_planner()

    # Step 5: Agent SDK
    agent_ok = await test_agent_sdk()

    # Step 6: Hybrid Orchestrator
    hybrid_ok = await test_hybrid_orchestrator()

    # Summary
    print("=" * 80)
    print("DIAGNOSTIC SUMMARY")
    print("=" * 80)
    print(f"Environment:          {'✅ OK' if env_ok else '⚠️  WARNINGS'}")
    print(f"Packages:             {'✅ OK' if pkg_ok else '❌ FAILED'}")
    print(f"Redis:                {'✅ OK' if redis_ok else '⚠️  WARNINGS'}")
    print(f"ChatGPT Planner:      {'✅ OK' if chatgpt_ok else '❌ FAILED'}")
    print(f"Agent SDK:            {'✅ OK' if agent_ok else '❌ FAILED'}")
    print(f"Hybrid Orchestrator:  {'✅ OK' if hybrid_ok else '❌ FAILED'}")
    print("=" * 80)

    if all([pkg_ok, chatgpt_ok, agent_ok, hybrid_ok]):
        print("\n✅ All core components are working!")
        print("\nYou can now run orchestration tasks with:")
        print("  python orchestrator/run_hybrid_task_v4.py --task-id test-001 --goal 'Your goal here'\n")
    else:
        print("\n❌ Some components failed. Review the errors above.\n")

if __name__ == "__main__":
    asyncio.run(main())
