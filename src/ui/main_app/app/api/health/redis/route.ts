import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/health/redis
 * Check if Redis server is running
 */
export async function GET() {
  try {
    // Check if Redis is running by attempting redis-cli ping
    try {
      const { stdout, stderr } = await execAsync('redis-cli ping');
      const isRunning = stdout.trim() === 'PONG';

      return NextResponse.json({
        isRunning,
        message: isRunning ? 'Redis is running' : 'Redis is not responding',
        stdout: stdout.trim(),
      });
    } catch (error: any) {
      // Redis is not running or not installed
      return NextResponse.json({
        isRunning: false,
        message: 'Redis is not running or not installed',
        error: error.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        isRunning: false,
        error: error.message || 'Failed to check Redis health',
      },
      { status: 500 }
    );
  }
}
