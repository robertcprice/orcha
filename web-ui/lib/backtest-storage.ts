/**
 * Backtest Results Storage
 * Simple JSON-based storage for backtest history and performance tracking
 */

import fs from 'fs/promises';
import path from 'path';

export interface BacktestResult {
	id: string;
	timestamp: string;
	model: {
		name: string;
		version: string;
		architecture: string;
		parameters?: Record<string, any>;
	};
	dataset: {
		batch_id: number;
		name: string;
		timeframe: string;
	};
	performance: {
		total_pnl: number;
		total_trades: number;
		winning_trades: number;
		losing_trades: number;
		win_rate: number;
		avg_trade_pnl: number;
		avg_win: number;
		avg_loss: number;
		profit_factor: number;
		max_drawdown: number;
		sharpe_ratio?: number;
		trade_frequency_per_hour: number;
		avg_hold_bars: number;
		max_hold_bars: number;
		min_hold_bars: number;
		total_bars_traded: number;
		bars_in_position_pct: number;
	};
	settings: {
		threshold: number;
		min_edge: number;
		horizon: number;
	};
	duration_seconds: number;
}

const STORAGE_DIR = path.join(process.cwd(), '..', 'backtest_results');
const RESULTS_FILE = path.join(STORAGE_DIR, 'backtest_history.json');

export class BacktestStorage {

	static async ensureStorageExists() {
		try {
			await fs.mkdir(STORAGE_DIR, { recursive: true });
		} catch (error) {
			console.error('Failed to create storage directory:', error);
		}
	}

	static async loadResults(): Promise<BacktestResult[]> {
		try {
			await this.ensureStorageExists();
			const data = await fs.readFile(RESULTS_FILE, 'utf-8');
			return JSON.parse(data);
		} catch (error) {
			// File doesn't exist yet, return empty array
			return [];
		}
	}

	static async saveResult(result: BacktestResult): Promise<void> {
		try {
			await this.ensureStorageExists();

			const results = await this.loadResults();
			results.push(result);

			// Sort by timestamp descending (newest first)
			results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

			await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));

			console.log(`✅ Saved backtest result: ${result.id}`);
		} catch (error) {
			console.error('Failed to save backtest result:', error);
		}
	}

	static async getResultById(id: string): Promise<BacktestResult | null> {
		const results = await this.loadResults();
		return results.find(r => r.id === id) || null;
	}

	static async getResultsByModel(modelName: string): Promise<BacktestResult[]> {
		const results = await this.loadResults();
		return results.filter(r => r.model.name === modelName);
	}

	static async getResultsByDataset(batchId: number): Promise<BacktestResult[]> {
		const results = await this.loadResults();
		return results.filter(r => r.dataset.batch_id === batchId);
	}

	static async getPerformanceTimeSeries(): Promise<{ date: string; pnl: number; model: string }[]> {
		const results = await this.loadResults();

		return results.map(r => ({
			date: r.timestamp,
			pnl: r.performance.total_pnl,
			model: `${r.model.name} v${r.model.version}`,
			dataset: r.dataset.name,
		}));
	}

	static async deleteResult(id: string): Promise<void> {
		const results = await this.loadResults();
		const filtered = results.filter(r => r.id !== id);
		await fs.writeFile(RESULTS_FILE, JSON.stringify(filtered, null, 2));
	}
}
