import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkRedisRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('redis-cli ping 2>&1');
    return stdout.trim() === 'PONG';
  } catch (error) {
    return false;
  }
}

export async function POST() {
  try {
    // Check if already running
    const alreadyRunning = await checkRedisRunning();
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        message: 'Redis is already running',
        alreadyRunning: true
      });
    }

    // Try to start with brew services
    try {
      await execAsync('brew services start redis 2>&1');
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (await checkRedisRunning()) {
        return NextResponse.json({
          success: true,
          message: 'Redis started successfully via brew services'
        });
      }
    } catch (brewError) {
      console.log('Brew services not available, trying redis-server directly...');
    }

    // Try redis-server directly
    try {
      await execAsync('redis-server --daemonize yes 2>&1');
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (await checkRedisRunning()) {
        return NextResponse.json({
          success: true,
          message: 'Redis started successfully via redis-server'
        });
      }
    } catch (serverError) {
      console.error('Failed to start redis-server:', serverError);
    }

    return NextResponse.json({
      success: false,
      message: 'Could not start Redis. Please install Redis and start it manually with: brew services start redis'
    }, { status: 500 });
  } catch (error) {
    console.error('Error starting Redis:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: String(error)
    }, { status: 500 });
  }
}
