/**
 * Unified Agent Logs API
 * Aggregates all agent activity from Redis into a single chronological feed
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const ALL_AGENT_ROLES = ['PP', 'AR', 'IM', 'RD', 'CODE', 'QA', 'DATA', 'TRAIN', 'DOC', 'DEVOPS'];

interface UnifiedLogEntry {
  timestamp: string;
  agent: string;
  type: 'spawn' | 'output' | 'complete' | 'error' | 'status';
  message: string;
  task_id?: string;
  session_id?: string;
  details?: any;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const redis = createClient({ url: REDIS_URL });

  try {
    await redis.connect();

    const allLogs: UnifiedLogEntry[] = [];

    // Get Direct Claude tasks (orchestrator delegations)
    const directClaudeKeys = await redis.keys('algomind.direct.claude.*');
    const taskKeys = directClaudeKeys.filter(key => !key.endsWith('.output'));

    for (const key of taskKeys) {
      // Check key type before reading - only process hash types
      const keyType = await redis.type(key);
      if (keyType !== 'hash') continue;

      const taskData = await redis.hGetAll(key);

      if (!taskData || !taskData.task_id) continue;

      const taskId = taskData.task_id;
      const agent = taskData.agent || 'IM';
      const status = taskData.status || 'unknown';
      const createdAt = taskData.created_at || new Date().toISOString();
      const updatedAt = taskData.updated_at || createdAt;
      const task = taskData.task || '';

      // Add spawn event
      allLogs.push({
        timestamp: createdAt,
        agent,
        type: 'spawn',
        message: `[${agent}] Spawned: ${task.substring(0, 100)}`,
        task_id: taskId,
        session_id: taskId,
        details: { task, status }
      });

      // Add output if available
      const outputKey = `algomind.direct.claude.${taskId}.output`;
      const outputKeyType = await redis.type(outputKey);
      if (outputKeyType === 'hash') {
        const outputData = await redis.hGetAll(outputKey);
        if (outputData && outputData.stdout) {
        const stdout = outputData.stdout;
        const lastUpdate = outputData.last_update || updatedAt;

        // Get last few lines of output
        const lines = stdout.split('\n').filter(l => l.trim());
        const preview = lines.slice(-3).join('\n');

        if (preview) {
          allLogs.push({
            timestamp: lastUpdate,
            agent,
            type: 'output',
            message: `[${agent}] Output: ${preview.substring(0, 150)}...`,
            task_id: taskId,
            session_id: taskId,
            details: { full_output: stdout }
          });
        }
        }
      }

      // Add completion/error event
      if (status === 'completed') {
        allLogs.push({
          timestamp: updatedAt,
          agent,
          type: 'complete',
          message: `[${agent}] ✓ Completed: ${task.substring(0, 100)}`,
          task_id: taskId,
          session_id: taskId,
          details: { result: taskData.result }
        });
      } else if (status === 'failed') {
        allLogs.push({
          timestamp: updatedAt,
          agent,
          type: 'error',
          message: `[${agent}] ✗ Failed: ${taskData.error || 'Unknown error'}`,
          task_id: taskId,
          session_id: taskId,
          details: { error: taskData.error }
        });
      }
    }

    // Get orchestrator tasks
    const orchestratorKeys = await redis.keys('algomind.orchestrator.*');
    const orchTaskKeys = orchestratorKeys.filter(key => !key.endsWith('.logs'));

    for (const key of orchTaskKeys) {
      // Check key type before reading - only process hash types
      const keyType = await redis.type(key);
      if (keyType !== 'hash') continue;

      const taskData = await redis.hGetAll(key);

      if (!taskData || !taskData.task_id) continue;

      const taskId = taskData.task_id;
      const status = taskData.status || 'unknown';
      const createdAt = taskData.created_at || new Date().toISOString();
      const updatedAt = taskData.updated_at || createdAt;
      const task = taskData.task || '';

      allLogs.push({
        timestamp: createdAt,
        agent: 'ORCHESTRATOR',
        type: 'spawn',
        message: `[ORCHESTRATOR] Planning task: ${task.substring(0, 100)}`,
        task_id: taskId,
        details: { task, status }
      });

      if (status === 'completed') {
        allLogs.push({
          timestamp: updatedAt,
          agent: 'ORCHESTRATOR',
          type: 'complete',
          message: `[ORCHESTRATOR] ✓ Task completed successfully`,
          task_id: taskId,
          details: { result: taskData.result }
        });
      } else if (status === 'failed') {
        allLogs.push({
          timestamp: updatedAt,
          agent: 'ORCHESTRATOR',
          type: 'error',
          message: `[ORCHESTRATOR] ✗ Task failed: ${taskData.error || 'Unknown error'}`,
          task_id: taskId,
          details: { error: taskData.error }
        });
      }
    }

    // Get agent log entries
    for (const role of ALL_AGENT_ROLES) {
      const logKey = `algomind.agent.${role}.logs`;
      const agentLogs = await redis.lRange(logKey, 0, -1);

      for (const logStr of agentLogs) {
        try {
          const log = JSON.parse(logStr);

          const logType = log.type === 'spawn' ? 'spawn' :
                         log.type === 'complete' ? 'complete' :
                         log.type === 'error' ? 'error' : 'status';

          allLogs.push({
            timestamp: log.timestamp,
            agent: role,
            type: logType,
            message: `[${role}] ${log.message}`,
            task_id: log.metadata?.taskId,
            session_id: log.metadata?.sessionId,
            details: log.metadata
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit results
    const limitedLogs = allLogs.slice(0, limit);

    await redis.quit();

    return NextResponse.json({
      ok: true,
      logs: limitedLogs,
      total: allLogs.length,
    });
  } catch (error) {
    console.error('Failed to fetch unified agent logs:', error);

    try {
      await redis.quit();
    } catch {}

    return NextResponse.json(
      { ok: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
