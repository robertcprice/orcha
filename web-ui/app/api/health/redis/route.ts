import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkRedisRunning(): Promise<boolean> {
  try {
    // Try to ping Redis
    const { stdout } = await execAsync('redis-cli ping 2>&1');
    return stdout.trim() === 'PONG';
  } catch (error) {
    return false;
  }
}

async function startRedis(): Promise<{ success: boolean; message: string }> {
  try {
    // Try brew services first (macOS)
    try {
      await execAsync('brew services start redis 2>&1');

      // Wait a moment for Redis to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if it's running
      const isRunning = await checkRedisRunning();
      if (isRunning) {
        return { success: true, message: 'Redis started successfully via brew services' };
      }
    } catch (brewError) {
      // Brew might not be available, try direct redis-server
    }

    // Try redis-server directly
    try {
      await execAsync('redis-server --daemonize yes 2>&1');

      // Wait for Redis to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isRunning = await checkRedisRunning();
      if (isRunning) {
        return { success: true, message: 'Redis started successfully via redis-server' };
      }
    } catch (directError) {
      // Could not start via redis-server either
    }

    return {
      success: false,
      message: 'Could not start Redis. Please start it manually with: brew services start redis'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start Redis: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function GET() {
  try {
    const isRunning = await checkRedisRunning();

    if (!isRunning) {
      // Auto-start Redis if not running
      console.log('🔄 Redis not running, attempting to start...');
      const startResult = await startRedis();

      if (startResult.success) {
        console.log('✅ Redis started successfully');
        return NextResponse.json({
          isRunning: true,
          autoStarted: true,
          message: startResult.message
        });
      } else {
        console.error('❌ Failed to auto-start Redis');
        return NextResponse.json({
          isRunning: false,
          autoStarted: false,
          message: startResult.message,
          error: 'Redis is not running and could not be auto-started'
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      isRunning: true,
      autoStarted: false,
      message: 'Redis is running'
    });
  } catch (error) {
    console.error('Redis health check error:', error);
    return NextResponse.json({
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
