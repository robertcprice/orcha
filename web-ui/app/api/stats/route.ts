/**
 * API endpoint to get real-time system statistics
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const dynamic = 'force-dynamic';

export async function GET() {
  const redis = createClient({ url: REDIS_URL });

  try {
    await redis.connect();

    // Get all Direct Claude tasks
    const directClaudeKeys = await redis.keys('algomind.direct.claude.*');

    let tasksCompleted = 0;
    let tasksFailed = 0;
    let tasksRunning = 0;
    let totalTasks = directClaudeKeys.length;

    for (const key of directClaudeKeys) {
      const taskData = await redis.hGetAll(key);
      if (taskData && taskData.status) {
        if (taskData.status === 'completed') tasksCompleted++;
        else if (taskData.status === 'failed') tasksFailed++;
        else if (taskData.status === 'running' || taskData.status === 'executing') tasksRunning++;
      }
    }

    // Get all Hybrid Orchestrator tasks
    const hybridKeys = await redis.keys('algomind.hybrid.task.*');
    for (const key of hybridKeys) {
      const taskData = await redis.hGetAll(key);
      if (taskData && taskData.status) {
        totalTasks++;
        if (taskData.status === 'completed') tasksCompleted++;
        else if (taskData.status === 'failed') tasksFailed++;
        else if (taskData.status === 'running' || taskData.status === 'executing') tasksRunning++;
      }
    }

    // Count active agent sessions
    const agentRoles = ['PP', 'AR', 'IM', 'RD', 'DOC', 'CODE', 'QA', 'RES', 'DATA', 'TRAIN', 'DEVOPS', 'COORD'];
    let activeSessions = 0;

    for (const role of agentRoles) {
      const agentKey = `algomind.agent.${role}.current`;
      const agentData = await redis.hGetAll(agentKey);
      if (agentData && agentData.status === 'running') {
        activeSessions++;
      }
    }

    // Calculate completion rate
    const completionRate = totalTasks > 0
      ? Math.round((tasksCompleted / totalTasks) * 100)
      : 0;

    // Get system uptime (from first task or use current session)
    let uptimeSeconds = 0;
    if (directClaudeKeys.length > 0) {
      // Find oldest task
      let oldestTimestamp: Date | null = null;
      for (const key of directClaudeKeys.slice(0, 50)) { // Check first 50 for performance
        const taskData = await redis.hGetAll(key);
        if (taskData && taskData.created_at) {
          const taskTime = new Date(taskData.created_at);
          if (!oldestTimestamp || taskTime < oldestTimestamp) {
            oldestTimestamp = taskTime;
          }
        }
      }

      if (oldestTimestamp) {
        uptimeSeconds = Math.floor((Date.now() - oldestTimestamp.getTime()) / 1000);
      }
    }

    await redis.quit();

    return NextResponse.json({
      tasksCompleted,
      tasksFailed,
      tasksRunning,
      tasksTotal: totalTasks,
      completionRate,
      activeSessions,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get stats:', error);

    // Try to close Redis connection
    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
