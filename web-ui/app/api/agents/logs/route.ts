/**
 * API endpoint to get agent-specific logs from Redis
 * Returns last N lines of each agent's activity
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface LogEntry {
  timestamp: string;
  role: string;
  type: 'spawn' | 'progress' | 'complete' | 'error' | 'info';
  message: string;
  metadata?: {
    sessionId?: string;
    cost?: number;
    duration?: number;
    turns?: number;
  };
}

export async function GET(request: Request) {
  const redis = createClient({ url: REDIS_URL });

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // PP, AR, IM, RD, etc. or null for all
    const limit = parseInt(searchParams.get('limit') || '20');

    await redis.connect();

    const logs: LogEntry[] = [];

    if (role) {
      // Get logs for specific agent
      const logKey = `algomind.agent.${role}.logs`;
      const agentLogs = await redis.lRange(logKey, -limit, -1);

      for (const logStr of agentLogs) {
        try {
          const logEntry = JSON.parse(logStr);
          logs.push(logEntry);
        } catch {
          // Skip malformed entries
        }
      }
    } else {
      // Get logs for all agents
      const allRoles = ['PP', 'AR', 'IM', 'RD', 'DOC', 'CODE', 'QA', 'RES', 'DATA', 'TRAIN', 'DEVOPS', 'COORD'];

      for (const agentRole of allRoles) {
        const logKey = `algomind.agent.${agentRole}.logs`;
        const agentLogs = await redis.lRange(logKey, -10, -1); // Last 10 per agent

        for (const logStr of agentLogs) {
          try {
            const logEntry = JSON.parse(logStr);
            logs.push(logEntry);
          } catch {
            // Skip malformed entries
          }
        }
      }
    }

    // Also check Direct Claude task history
    const directClaudeKeys = await redis.keys('algomind.direct.claude.*');
    for (const key of directClaudeKeys.slice(-20)) {
      const taskData = await redis.hGetAll(key);
      if (taskData && taskData.agent) {
        const agentRole = taskData.agent.toUpperCase();

        // Skip if filtering by role and doesn't match
        if (role && agentRole !== role) {
          continue;
        }

        // Create log entries from task
        const taskTime = taskData.updated_at || new Date().toISOString();

        // Spawn log
        if (taskData.created_at) {
          logs.push({
            timestamp: taskData.created_at,
            role: agentRole,
            type: 'spawn',
            message: `Started task: ${taskData.task?.substring(0, 100) || 'Unknown task'}${taskData.task && taskData.task.length > 100 ? '...' : ''}`,
            metadata: {
              sessionId: taskData.task_id,
            },
          });
        }

        // Completion/error log
        if (taskData.status === 'completed') {
          logs.push({
            timestamp: taskTime,
            role: agentRole,
            type: 'complete',
            message: 'Task completed successfully',
            metadata: {
              sessionId: taskData.task_id,
              cost: taskData.cost ? parseFloat(taskData.cost) : undefined,
              duration: taskData.duration ? parseFloat(taskData.duration) : undefined,
            },
          });
        } else if (taskData.status === 'failed') {
          logs.push({
            timestamp: taskTime,
            role: agentRole,
            type: 'error',
            message: taskData.error || 'Task failed',
            metadata: {
              sessionId: taskData.task_id,
            },
          });
        } else if (taskData.status === 'running') {
          logs.push({
            timestamp: taskTime,
            role: agentRole,
            type: 'progress',
            message: 'Task in progress...',
            metadata: {
              sessionId: taskData.task_id,
            },
          });
        }
      }
    }

    await redis.quit();

    // Sort by timestamp descending and limit
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentLogs = logs.slice(0, limit);

    return NextResponse.json({
      logs: recentLogs.reverse(), // Return oldest to newest
      total: logs.length,
    });
  } catch (error) {
    console.error('Failed to get agent logs:', error);

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
