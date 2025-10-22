import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

const PROJECT_ROOT = path.join(process.cwd(), '..');

// POST - Start/stop orchestrator or agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, target } = body; // action: 'start' | 'stop', target: 'orchestrator' | 'all'

    if (!action || !target) {
      return NextResponse.json(
        { ok: false, error: 'Action and target are required' },
        { status: 400 }
      );
    }

    if (target === 'orchestrator') {
      if (action === 'start') {
        // Start session orchestrator
        const scriptPath = path.join(PROJECT_ROOT, 'start_session_orchestrator.sh');

        const child = spawn('bash', [scriptPath], {
          cwd: PROJECT_ROOT,
          detached: true,
          stdio: 'ignore',
        });

        child.unref();

        return NextResponse.json({
          ok: true,
          message: 'Session orchestrator starting',
          note: 'Individual agents must be started separately in Claude Code sessions',
        });
      } else if (action === 'stop') {
        // Stop session orchestrator
        const child = spawn('pkill', ['-f', 'session_orchestrator.py'], {
          cwd: PROJECT_ROOT,
        });

        return new Promise<NextResponse>((resolve) => {
          child.on('close', (code) => {
            resolve(
              NextResponse.json({
                ok: true,
                message: 'Session orchestrator stopped',
              })
            );
          });
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid action or target' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error controlling agents:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to control agents' },
      { status: 500 }
    );
  }
}

// GET - Get orchestrator status
export async function GET() {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Check if session orchestrator is running
    try {
      const { stdout } = await execPromise('pgrep -f session_orchestrator.py');
      const pid = stdout.trim();

      return NextResponse.json({
        ok: true,
        orchestrator: {
          running: !!pid,
          pid: pid || null,
        },
      });
    } catch (error) {
      // pgrep returns non-zero exit code if no process found
      return NextResponse.json({
        ok: true,
        orchestrator: {
          running: false,
          pid: null,
        },
      });
    }
  } catch (error) {
    console.error('Error getting orchestrator status:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to get orchestrator status' },
      { status: 500 }
    );
  }
}
