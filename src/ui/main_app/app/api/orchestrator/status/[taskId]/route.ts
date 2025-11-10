/**
 * API endpoint to get orchestrator task status
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const redis = createClient({ url: REDIS_URL });

  try {
    const { taskId } = await params;

    await redis.connect();

    // Get task data from Redis
    const taskData = await redis.hGetAll(`algomind.orchestrator.${taskId}`);

    await redis.quit();

    if (!taskData || Object.keys(taskData).length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields if they exist
    let plan = null;
    let agents = null;
    let result = null;

    try {
      if (taskData.plan) plan = JSON.parse(taskData.plan);
      if (taskData.agents) agents = JSON.parse(taskData.agents);
      if (taskData.result) result = taskData.result;
    } catch (e) {
      console.error('Failed to parse task data:', e);
    }

    return NextResponse.json({
      task_id: taskData.task_id,
      task: taskData.task,
      status: taskData.status || 'unknown',
      created_at: taskData.created_at,
      updated_at: taskData.updated_at,
      plan,
      agents,
      result,
      error: taskData.error,
    });
  } catch (error) {
    console.error('Failed to get task status:', error);

    // Try to close Redis connection
    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
