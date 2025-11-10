import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * POST /api/health/websocket/start
 * Attempt to start WebSocket server
 */
export async function POST() {
  try {
    // Check if already running
    try {
      const checkResponse = await fetch('http://localhost:4000/events');
      if (checkResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'WebSocket server is already running',
          alreadyRunning: true,
        });
      }
    } catch {
      // Server not running, proceed to start
    }

    // Start WebSocket server
    const webUiRoot = process.cwd();
    const serverScript = path.join(webUiRoot, 'server', 'websocket-server.ts');

    const wsProcess = spawn('npx', ['tsx', serverScript], {
      cwd: webUiRoot,
      detached: true,
      stdio: 'ignore',
    });

    wsProcess.unref(); // Allow parent to exit independently

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify it started
    try {
      const verifyResponse = await fetch('http://localhost:4000/events');
      if (verifyResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'WebSocket server started successfully',
        });
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'WebSocket server started but not responding',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to start WebSocket server',
      },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start WebSocket server',
      },
      { status: 500 }
    );
  }
}
