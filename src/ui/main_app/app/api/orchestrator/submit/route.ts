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

    // ✅ FIX: Use run_hybrid_task_v4.py for multi-AI planning support
    const orchestratorScript = path.join(
      process.cwd(),
      '../../..',
      'src',
      'orchestrator',
      'run_hybrid_task_v4.py'
    );

    // ✅ FIX: Use virtual environment Python interpreter
    const venvPython = path.join(
      process.cwd(),
      '../../..',
      'venv',
      'bin',
      'python'
    );

    // ✅ DEBUG: Capture subprocess output to debug why nodes aren't appearing
    const logFile = `/tmp/orchestrator-${taskId}.log`;
    const fs = require('fs');

    // Open log file synchronously to ensure fd is ready
    const logFd = fs.openSync(logFile, 'a');

    // ✅ FIX: Set working directory to project root for Python imports
    const projectRoot = path.join(process.cwd(), '../../..');

    const pythonProcess = spawn(venvPython, [
      '-u',  // Unbuffered output so logs appear immediately
      orchestratorScript,
      '--task-id',
      taskId,
      '--goal',  // V4 uses --goal instead of --task
      task,
      '--context',  // Pass empty context (task_id added in run_hybrid_task_v4.py)
      '{}',
      '--verbose',  // Enable verbose logging to see our debug logs
    ], {
      cwd: projectRoot,  // Set working directory to project root
      detached: true,
      stdio: ['ignore', logFd, logFd],  // Capture stdout and stderr to log file
      env: {
        ...process.env,
        PYTHONPATH: projectRoot,  // Set PYTHONPATH for module imports
      },
    });

    // Detach the process so it runs independently
    pythonProcess.unref();

    console.log(`[Orchestrator] Task ${taskId} logs: ${logFile}`);

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
