/**
 * API endpoint to submit a task to the Claude orchestrator
 * The orchestrator analyzes the task, creates a plan, and delegates to agents
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function POST(request: Request) {
  const redis = createClient({ url: REDIS_URL });

  try {
    const body = await request.json();
    const { task } = body;

    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Task is required' },
        { status: 400 }
      );
    }

    await redis.connect();

    // Generate unique task ID
    const taskId = `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store task in Redis
    await redis.hSet(`algomind.orchestrator.${taskId}`, {
      task_id: taskId,
      task,
      status: 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set expiry (24 hours)
    await redis.expire(`algomind.orchestrator.${taskId}`, 86400);

    // Spawn orchestrator process
    const orchestratorScript = path.join(
      process.cwd(),
      '..',
      'orchestrator',
      'run_claude_orchestrator.py'
    );

    const pythonProcess = spawn('python3', [
      orchestratorScript,
      '--task-id',
      taskId,
      '--task',
      task,
    ], {
      detached: true,
      stdio: 'ignore',
    });

    // Detach the process so it runs independently
    pythonProcess.unref();

    console.log(`[Orchestrator] Started task ${taskId}`);

    await redis.quit();

    return NextResponse.json({
      ok: true,
      task_id: taskId,
      status: 'planning',
      message: 'Orchestration started',
    });
  } catch (error) {
    console.error('Failed to submit orchestrator task:', error);

    // Try to close Redis connection
    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    );
  }
}
