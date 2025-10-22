/**
 * API endpoint to start the autonomous agent system
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST() {

  try {

    // Check if already running
    const { stdout: psOutput } = await execAsync('ps aux | grep "[p]ython.*redis_orchestrator.py" || true');

    if (psOutput.trim().length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Autonomous agent system is already running',
      });
    }

    // Check if Redis is running
    try {
      const { stdout: redisPing } = await execAsync('redis-cli ping 2>/dev/null');
      if (redisPing.trim() !== 'PONG') {
        return NextResponse.json({
          success: false,
          error: 'Redis is not running. Start it with: redis-server',
        });
      }
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Redis is not running. Start it with: redis-server',
      });
    }

    // Check if API keys are set
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable not set',
      });
    }

    if (!anthropicApiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY environment variable not set (required for Claude Code CLI)',
      });
    }

    // Get project root (parent of ui-agent-console)
    const projectRoot = path.resolve(process.cwd(), '..');

    // Clear ALL previous state to start fresh (files AND Redis)
    const clearStateCmd = `cd "${projectRoot}" && rm -f orchestrator_state.json && rm -f orchestrator/state/*.json && rm -f multi_agent.log && rm -f autonomous.log`;
    await execAsync(clearStateCmd);

    // Clear Redis pause state and old tasks
    try {
      // Delete pause state
      await execAsync('redis-cli DEL algomind.orchestrator.paused 2>/dev/null || true');

      // Clear task queue and current task
      await execAsync('redis-cli DEL algomind.task.queue 2>/dev/null || true');
      await execAsync('redis-cli DEL algomind.task.current 2>/dev/null || true');
      await execAsync('redis-cli DEL algomind.task.checkpoints 2>/dev/null || true');

      // Clear all task and task_result keys using for loop (macOS-compatible)
      await execAsync('for key in $(redis-cli KEYS "algomind.task.*" 2>/dev/null); do redis-cli DEL "$key" 2>/dev/null || true; done');
      await execAsync('for key in $(redis-cli KEYS "algomind.task_result.*" 2>/dev/null); do redis-cli DEL "$key" 2>/dev/null || true; done');
    } catch {
      // Ignore Redis cleanup errors
    }

    // FIRST: Start the Claude CLI Orchestrator v3 (PP→AR→IM→RD) - this processes tasks from the queue
    // Uses REAL Claude Code sessions with full tool access
    const startCLIOrchCmd = `cd "${projectRoot}" && source venv/bin/activate && export PYTHONPATH="." && export ANTHROPIC_API_KEY="${anthropicApiKey}" && export REDIS_URL="redis://localhost:6379/0" && python -u orchestrator/claude_cli_orchestrator.py --mode continuous > logs/claude_cli_orchestrator.log 2>&1 &`;

    try {
      execAsync(startCLIOrchCmd);
    } catch (error) {
      // Ignore errors from background process
    }

    // Wait for CLI orchestrator to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // SECOND: Start the orchestration coordinator (OpenAI) - this enqueues tasks and gets plans from ChatGPT
    const startCoordinatorCmd = `cd "${projectRoot}" && source venv/bin/activate && export PYTHONPATH="." && export OPENAI_API_KEY="${openaiApiKey}" && export MAX_ITERATIONS=100 && python -u -m agents.redis_orchestrator > logs/autonomous_coordinator.log 2>&1 &`;

    try {
      // Don't await - let it run in background
      execAsync(startCoordinatorCmd);
    } catch (error) {
      // Ignore errors from background process
    }

    // Wait a bit longer for both processes to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify both started
    const { stdout: cliOrchVerify } = await execAsync('ps aux | grep "[p]ython.*claude_cli_orchestrator" || true');
    const { stdout: coordinatorVerify } = await execAsync('ps aux | grep "[p]ython.*redis_orchestrator" || true');

    const cliOrchRunning = cliOrchVerify.trim().length > 0;
    const coordinatorRunning = coordinatorVerify.trim().length > 0;

    if (!cliOrchRunning && !coordinatorRunning) {
      return NextResponse.json({
        success: false,
        error: 'Failed to start both systems. Check logs/claude_cli_orchestrator.log and logs/autonomous_coordinator.log for details.',
      });
    }

    if (!cliOrchRunning) {
      return NextResponse.json({
        success: false,
        error: 'Claude CLI Orchestrator v3 failed to start. Check logs/claude_cli_orchestrator.log for details.',
      });
    }

    if (!coordinatorRunning) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI Coordinator failed to start. Check logs/autonomous_coordinator.log for details.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Autonomous agent system started successfully',
    });

  } catch (error) {
    console.error('Failed to start autonomous system:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
