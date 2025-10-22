import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { batch = 3 } = body;

		// Path to project root
		const projectRoot = path.join(process.cwd(), '..');

		console.log('🚀 Starting backtest WebSocket server...');
		console.log('Project root:', projectRoot);
		console.log('Batch:', batch);

		// Start WebSocket server for browser-embedded visualization
		const command = `cd "${projectRoot}" && source venv/bin/activate && PYTHONUNBUFFERED=1 python scripts/backtest_websocket_server.py --batch ${batch} --port 8765 > logs/backtest_ws_$(date +%Y%m%d_%H%M%S).log 2>&1 &`;

		console.log('Command:', command);

		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error('❌ Failed to start backtest server:', error);
				console.error('stderr:', stderr);
			} else {
				console.log('✅ Backtest WebSocket server started');
				console.log('stdout:', stdout);
			}
		});

		return NextResponse.json({
			success: true,
			message: `Starting backtest server for batch ${batch}`,
			batch,
			websocket_url: 'ws://localhost:8765'
		});
	} catch (error) {
		console.error('❌ API error:', error);
		return NextResponse.json({
			success: false,
			error: 'Failed to start backtest',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}
