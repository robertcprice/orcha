import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
	try {
		// Check if backtest WebSocket server is running
		const { stdout } = await execAsync('pgrep -f "backtest_websocket_server.py" || echo "not_running"');

		const isRunning = stdout.trim() !== 'not_running' && stdout.trim() !== '';

		return NextResponse.json({
			running: isRunning,
			pid: isRunning ? stdout.trim().split('\n')[0] : null,
		});
	} catch (error) {
		return NextResponse.json({
			running: false,
			error: 'Failed to check status'
		}, { status: 500 });
	}
}
