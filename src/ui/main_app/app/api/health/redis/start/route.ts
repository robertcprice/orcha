import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/health/redis/start
 * Attempt to start Redis server
 */
export async function POST() {
  try {
    // First check if Redis is already running
    try {
      const { stdout } = await execAsync('redis-cli ping');
      if (stdout.trim() === 'PONG') {
        return NextResponse.json({
          success: true,
          message: 'Redis is already running',
          alreadyRunning: true,
        });
      }
    } catch {
      // Redis not running, proceed to start
    }

    // Try to start Redis server
    try {
      // Start Redis server in the background
      await execAsync('redis-server --daemonize yes');

      // Wait a moment for Redis to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it started
      const { stdout } = await execAsync('redis-cli ping');
      const isRunning = stdout.trim() === 'PONG';

      if (isRunning) {
        return NextResponse.json({
          success: true,
          message: 'Redis server started successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Redis server started but not responding',
          },
          { status: 500 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to start Redis server',
          error: error.message,
          hint: 'Make sure Redis is installed (brew install redis)',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start Redis',
      },
      { status: 500 }
    );
  }
}
