import { NextResponse } from 'next/server';
import { BacktestStorage, BacktestResult } from '@/lib/backtest-storage';

export const dynamic = 'force-dynamic';

// GET - Load all backtest results
export async function GET() {
	try {
		const results = await BacktestStorage.loadResults();

		return NextResponse.json({
			success: true,
			results,
			count: results.length,
		});
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: 'Failed to load results',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}

// POST - Save a new backtest result
export async function POST(request: Request) {
	try {
		const result: BacktestResult = await request.json();

		// Generate ID if not provided
		if (!result.id) {
			result.id = `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		}

		// Set timestamp if not provided
		if (!result.timestamp) {
			result.timestamp = new Date().toISOString();
		}

		await BacktestStorage.saveResult(result);

		return NextResponse.json({
			success: true,
			result_id: result.id,
		});
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: 'Failed to save result',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}

// DELETE - Delete a backtest result
export async function DELETE(request: Request) {
	try {
		const { id } = await request.json();

		await BacktestStorage.deleteResult(id);

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		return NextResponse.json({
			success: false,
			error: 'Failed to delete result',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}
