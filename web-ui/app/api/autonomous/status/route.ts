/**
 * API endpoint to check autonomous agent system status
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {

  try {

    // Check orchestration coordinator (redis_orchestrator)
    const { stdout: coordinatorPs } = await execAsync('ps aux | grep "[p]ython.*redis_orchestrator" || true');
    const coordinatorRunning = coordinatorPs.trim().length > 0;
    let coordinatorPid = null;
    if (coordinatorRunning) {
      const matches = coordinatorPs.match(/^\S+\s+(\d+)/);
      coordinatorPid = matches ? parseInt(matches[1]) : null;
    }

    // Check Claude CLI Orchestrator v3 (claude_cli_orchestrator.py)
    const { stdout: cliOrchPs } = await execAsync('ps aux | grep "[p]ython.*claude_cli_orchestrator" || true');
    const cliOrchRunning = cliOrchPs.trim().length > 0;
    let cliOrchPid = null;
    if (cliOrchRunning) {
      const matches = cliOrchPs.match(/^\S+\s+(\d+)/);
      cliOrchPid = matches ? parseInt(matches[1]) : null;
    }

    // System is running if BOTH processes are running
    const isRunning = coordinatorRunning && cliOrchRunning;

    // Try to connect to Redis
    let redisConnected = false;
    try {
      const { stdout: redisPing } = await execAsync('redis-cli ping 2>/dev/null || echo "FAILED"');
      redisConnected = redisPing.trim() === 'PONG';
    } catch {
      redisConnected = false;
    }

    return NextResponse.json({
      running: isRunning,
      coordinator: {
        running: coordinatorRunning,
        pid: coordinatorPid,
      },
      cliOrchestrator: {
        running: cliOrchRunning,
        pid: cliOrchPid,
      },
      redis: {
        connected: redisConnected,
      },
    });
  } catch (error) {
    console.error('Failed to check autonomous status:', error);
    return NextResponse.json(
      {
        running: false,
        coordinator: { running: false },
        cliOrchestrator: { running: false },
        redis: { connected: false },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
