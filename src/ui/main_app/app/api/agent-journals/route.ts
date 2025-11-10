/**
 * API endpoint for retrieving agent journal entries
 * Updated to read from Redis instead of old .jsonl files
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface JournalStep {
  agent: string;
  task_id: string;
  timestamp: string;
  action: string;
  status: string;
  details?: Record<string, any>;
  error?: string;
}

interface AgentJournal {
  agent: string;
  task_id: string;
  date: string;
  file: string;
  steps: JournalStep[];
  summary: {
    total_steps: number;
    status_counts: Record<string, number>;
    start_time: string | null;
    last_updated: string | null;
  };
}

export async function GET(request: Request) {
  const redis = createClient({ url: REDIS_URL });

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    await redis.connect();

    // Get all Direct Claude tasks from Redis
    const directClaudeKeys = await redis.keys('algomind.direct.claude.*');
    const taskKeys = directClaudeKeys.filter(key => !key.endsWith('.output'));

    // Get task data for each key
    const journals: AgentJournal[] = [];

    for (const key of taskKeys.slice(0, limit)) {
      const taskData = await redis.hGetAll(key);

      if (!taskData || !taskData.task_id) continue;

      const taskId = taskData.task_id;
      const agent = taskData.agent || 'IM';
      const status = taskData.status || 'unknown';
      const createdAt = taskData.created_at || new Date().toISOString();
      const updatedAt = taskData.updated_at || createdAt;

      // Get agent logs for this task
      const agentLogsKey = `algomind.agent.${agent}.logs`;
      const allLogs = await redis.lRange(agentLogsKey, 0, -1);

      const steps: JournalStep[] = allLogs
        .map(log => {
          try {
            return JSON.parse(log);
          } catch {
            return null;
          }
        })
        .filter(log => log && log.metadata?.sessionId === taskId)
        .map(log => ({
          agent,
          task_id: taskId,
          timestamp: log.timestamp,
          action: log.message,
          status: log.type === 'complete' ? 'completed' :
                  log.type === 'error' ? 'failed' :
                  log.type === 'spawn' ? 'in_progress' : 'pending',
          details: log.metadata,
          error: log.type === 'error' ? log.message : undefined,
        }));

      // If no steps from logs, create one from task data
      if (steps.length === 0) {
        steps.push({
          agent,
          task_id: taskId,
          timestamp: createdAt,
          action: taskData.task || 'Task execution',
          status: status === 'completed' ? 'completed' :
                  status === 'failed' ? 'failed' :
                  status === 'executing' ? 'in_progress' : 'pending',
          details: {
            duration: taskData.duration,
            result: taskData.result,
          },
          error: taskData.error,
        });
      }

      // Calculate summary
      const statusCounts: Record<string, number> = {};
      for (const step of steps) {
        statusCounts[step.status] = (statusCounts[step.status] || 0) + 1;
      }

      const date = new Date(createdAt);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

      journals.push({
        agent,
        task_id: taskId,
        date: dateStr,
        file: `${dateStr}_${taskId}_${agent}.redis`,
        steps,
        summary: {
          total_steps: steps.length,
          status_counts: statusCounts,
          start_time: steps[0]?.timestamp || null,
          last_updated: steps[steps.length - 1]?.timestamp || updatedAt,
        },
      });
    }

    // Sort by date (most recent first)
    journals.sort((a, b) => {
      const timeA = a.summary.last_updated || a.summary.start_time || '';
      const timeB = b.summary.last_updated || b.summary.start_time || '';
      return timeB.localeCompare(timeA);
    });

    await redis.quit();

    return NextResponse.json({
      ok: true,
      journals: journals.slice(0, limit),
    });
  } catch (error) {
    console.error('Failed to load agent journals from Redis:', error);

    // Try to close Redis connection
    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      { ok: false, error: 'Failed to load journals' },
      { status: 500 }
    );
  }
}
