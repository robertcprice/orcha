/**
 * API endpoint to get live agent output
 * Returns progressive stdout from Claude CLI --print
 */

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET(request: Request) {
  const redis = createClient({ url: REDIS_URL });

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    await redis.connect();

    // Try Direct Claude output key
    const outputKey = `algomind.direct.claude.${taskId}.output`;
    const outputData = await redis.hGetAll(outputKey);

    let stdout = '';
    let lastUpdate = '';

    if (outputData && Object.keys(outputData).length > 0) {
      stdout = outputData.stdout || '';
      lastUpdate = outputData.last_update || '';
    } else {
      // Fallback: try to get from task result
      const taskKey = `algomind.direct.claude.${taskId}`;
      const taskData = await redis.hGetAll(taskKey);

      if (taskData && taskData.result) {
        // Extract stdout from result
        const resultLines = taskData.result.split('\n');
        const stdoutStart = resultLines.findIndex(line => line.includes('--- Agent Output ---'));

        if (stdoutStart !== -1) {
          stdout = resultLines.slice(stdoutStart + 1).join('\n');
        } else {
          stdout = taskData.result;
        }

        lastUpdate = taskData.updated_at || '';
      }
    }

    await redis.quit();

    return NextResponse.json({
      taskId,
      stdout,
      lastUpdate,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get agent output:', error);

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
