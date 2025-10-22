/**
 * API endpoint to stop the autonomous agent system
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {

  try {

    // Stop BOTH processes: orchestration coordinator and multi-agent orchestrator

    // 1. Find and stop the orchestration coordinator (redis_orchestrator)
    const { stdout: coordinatorPs } = await execAsync('ps aux | grep "[p]ython.*redis_orchestrator" || true');
    let coordinatorStopped = false;

    if (coordinatorPs.trim().length > 0) {
      const matches = coordinatorPs.match(/^\S+\s+(\d+)/);
      if (matches) {
        const pid = matches[1];
        await execAsync(`kill ${pid}`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force kill if still running
        const { stdout: verify } = await execAsync('ps aux | grep "[p]ython.*redis_orchestrator" || true');
        if (verify.trim().length > 0) {
          await execAsync(`kill -9 ${pid}`);
        }
        coordinatorStopped = true;
      }
    }

    // 2. Find and stop the Claude CLI Orchestrator v3 (claude_cli_orchestrator.py)
    const { stdout: cliOrchPs } = await execAsync('ps aux | grep "[p]ython.*claude_cli_orchestrator" || true');
    let cliOrchStopped = false;

    if (cliOrchPs.trim().length > 0) {
      const matches = cliOrchPs.match(/^\S+\s+(\d+)/);
      if (matches) {
        const pid = matches[1];
        await execAsync(`kill ${pid}`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force kill if still running
        const { stdout: verify } = await execAsync('ps aux | grep "[p]ython.*claude_cli_orchestrator" || true');
        if (verify.trim().length > 0) {
          await execAsync(`kill -9 ${pid}`);
        }
        cliOrchStopped = true;
      }
    }

    if (!coordinatorStopped && !cliOrchStopped) {
      return NextResponse.json({
        success: false,
        error: 'No orchestration processes are running',
      });
    }

    const stoppedMessages = [];
    if (coordinatorStopped) stoppedMessages.push('OpenAI Coordinator');
    if (cliOrchStopped) stoppedMessages.push('Claude CLI Orchestrator v3');

    return NextResponse.json({
      success: true,
      message: `Stopped: ${stoppedMessages.join(' and ')}`,
    });

  } catch (error) {
    console.error('Failed to stop autonomous system:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
